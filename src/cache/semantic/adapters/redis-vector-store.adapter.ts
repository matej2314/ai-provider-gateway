import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { LoggingService } from '../../../logging/logging.service';
import { RedisConnectionService } from '../../adapters/redis-cache/redis-connection.service';
import { parseCachedChatResponse } from '../../schemas/cached-chat-response.schema';
import { isUnservableCachedReply } from '../../../chat/helpers/cache-policy';
import { semanticIndexName } from '../index-name';
import { semanticSchemaFtCreateArgs } from '../semantic-cache.constants';
import type {
  VectorStore,
  VectorSearchHit,
  VectorStoreKnnInput,
  VectorStoreProbeResult,
  VectorStoreUpsertInput,
} from '../vector-store.interface';
import { unbrand } from '../../../common/types/branded.types';
import { isSemanticCacheTtlSeconds } from '../../../common/types/branded.guards';
import { escapeRedisSearchTag } from '../escape-tag';

@Injectable()
export class RedisVectorStoreAdapter implements VectorStore, OnModuleInit {
  private indexCreated = false;
  private ensureIndexInFlight: Promise<void> | null = null;
  private readonly logger: LoggingService;

  constructor(
    private readonly redis: RedisConnectionService,
    private readonly config: ConfigService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'RedisVectorStoreAdapter' });
  }

  private indexName(): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    return semanticIndexName(semCache.embeddingModel, semCache.embeddingDim);
  }

  /**
   * Escape TAG specials for FT.SEARCH query syntax only.
   * HASH field values stay raw (IDs are validated without commas / braces);
   * escaping hyphens into the stored value would break KNN matching.
   */
  private escapeTag(value: string): string {
    return escapeRedisSearchTag(value);
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private isIndexAlreadyExistsError(err: unknown): boolean {
    return /already exists/i.test(this.errorMessage(err));
  }

  private isMissingIndexError(err: unknown): boolean {
    const msg = this.errorMessage(err);
    return /unknown index|no such index/i.test(msg);
  }

  private isSearchModuleMissingError(err: unknown): boolean {
    return /unknown command/i.test(this.errorMessage(err));
  }

  private vectorBlob(vector: number[]): Buffer {
    const floats = new Float32Array(vector);
    return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
  }

  private asString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString('utf8');
    if (typeof value === 'number') return String(value);
    return '';
  }

  /**
   * Parse FT.SEARCH RESP2 hits. Corrupt reply payloads are collected for DEL
   * (same hygiene as exact cache invalid entries) — missing dist alone does not delete.
   */
  private parseKnnHits(raw: unknown): {
    hits: VectorSearchHit[];
    corruptKeys: string[];
  } {
    if (!Array.isArray(raw) || raw.length < 3) {
      return { hits: [], corruptKeys: [] };
    }

    const items = raw as unknown[];
    const count = Number(raw[0]);
    if (!Number.isFinite(count) || count < 1) {
      return { hits: [], corruptKeys: [] };
    }

    const hits: VectorSearchHit[] = [];
    const corruptKeys: string[] = [];
    for (let i = 1; i + 1 < items.length; i += 2) {
      const key = this.asString(items[i]);
      const fields = items[i + 1];
      if (!Array.isArray(fields)) continue;

      const map = new Map<string, string>();
      for (let j = 0; j + 1 < fields.length; j += 2) {
        map.set(this.asString(fields[j]), this.asString(fields[j + 1]));
      }

      const replyRaw = map.get('reply');
      if (!replyRaw) {
        if (key) corruptKeys.push(key);
        continue;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(replyRaw);
      } catch {
        if (key) corruptKeys.push(key);
        continue;
      }

      const reply = parseCachedChatResponse(parsedJson);
      if (!reply || isUnservableCachedReply(reply)) {
        if (key) corruptKeys.push(key);
        continue;
      }

      const dist = Number.parseFloat(map.get('dist') ?? '');
      if (!Number.isFinite(dist)) continue;

      hits.push({
        similarity: 1 - dist,
        reply,
      });
    }

    return { hits, corruptKeys };
  }

  /** Fail-open delete of a semantic HASH with invalid reply (exact-cache parity). */
  private async deleteCorruptEntry(key: string): Promise<void> {
    const redisClient = this.redis.getClient();
    if (!redisClient || !key) return;
    try {
      await redisClient.del(key);
      this.logger.warn(`Invalid semantic cache reply — deleted key: ${key}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Semantic cache DEL failed for key ${key}: ${this.errorMessage(err)}`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex();
  }

  async ensureIndex(): Promise<void> {
    if (this.indexCreated) return;
    if (this.ensureIndexInFlight) return this.ensureIndexInFlight;

    this.ensureIndexInFlight = this.createIndexIfNeeded().finally(() => {
      this.ensureIndexInFlight = null;
    });
    return this.ensureIndexInFlight;
  }

  private async createIndexIfNeeded(): Promise<void> {
    if (this.indexCreated) return;

    const redisClient = this.redis.getClient();
    if (!redisClient) {
      this.logger.warn(
        'Redis client unavailable — skipping vector index ensure (fail-open)',
      );
      return;
    }

    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const index = this.indexName();

    try {
      await redisClient.call('FT.INFO', index);
      this.indexCreated = true;
      return;
    } catch (infoErr: unknown) {
      if (this.isSearchModuleMissingError(infoErr)) {
        this.logger.warn(
          'Redis Search module unavailable (FT.* commands missing — use Redis Stack)',
          { message: this.errorMessage(infoErr) },
        );
        return;
      }
      /* missing index — create below */
    }

    try {
      await redisClient.call(
        'FT.CREATE',
        index,
        'ON',
        'HASH',
        'PREFIX',
        '1',
        `${index}:`,
        'SCHEMA',
        ...semanticSchemaFtCreateArgs(semCache.embeddingDim),
      );
      this.indexCreated = true;
    } catch (createErr: unknown) {
      if (this.isIndexAlreadyExistsError(createErr)) {
        this.indexCreated = true;
        return;
      }
      this.logger.warn(
        'Failed to create Redis Search vector index (fail-open)',
        {
          index,
          message: this.errorMessage(createErr),
        },
      );
    }
  }

  async probeIndex(): Promise<VectorStoreProbeResult> {
    const redisClient = this.redis.getClient();
    if (!redisClient) {
      return {
        available: false,
        message: 'Redis client unavailable for vector index probe',
      };
    }

    try {
      await this.ensureIndex();
      const index = this.indexName();
      await redisClient.call('FT.INFO', index);
      return {
        available: true,
        message: 'Redis Search index available',
      };
    } catch (err: unknown) {
      if (this.isSearchModuleMissingError(err)) {
        return {
          available: false,
          message:
            'Redis Search module unavailable (FT.* commands missing — use Redis Stack)',
        };
      }
      return {
        available: false,
        message: `Vector index unavailable: ${this.errorMessage(err)}`,
      };
    }
  }

  private buildKnnQuery(input: VectorStoreKnnInput): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const modelAlias = this.escapeTag(input.modelAlias);
    const clientId = this.escapeTag(input.clientId);
    const embeddingModel = this.escapeTag(semCache.embeddingModel);
    const systemSig = this.escapeTag(input.systemSignature);
    const callParams = this.escapeTag(input.callParams);
    return `(@modelAlias:{${modelAlias}} @clientId:{${clientId}} @embeddingModel:{${embeddingModel}} @systemSignature:{${systemSig}} @callParams:{${callParams}})=>[KNN ${input.k} @vector $blob AS dist]`;
  }

  private async searchKnn(
    input: VectorStoreKnnInput,
  ): Promise<VectorSearchHit[]> {
    const redisClient = this.redis.getClient();
    if (!redisClient) return [];

    const index = this.indexName();
    const query = this.buildKnnQuery(input);

    const raw = await redisClient.call(
      'FT.SEARCH',
      index,
      query,
      'PARAMS',
      '2',
      'blob',
      this.vectorBlob(input.vector),
      'SORTBY',
      'dist',
      'LIMIT',
      '0',
      String(input.k),
      'RETURN',
      '2',
      'reply',
      'dist',
      'DIALECT',
      '2',
    );

    const { hits, corruptKeys } = this.parseKnnHits(raw);
    for (const key of corruptKeys) {
      await this.deleteCorruptEntry(key);
    }
    return hits;
  }

  async knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]> {
    const redisClient = this.redis.getClient();
    if (!redisClient) {
      this.logger.warn(
        'Redis client unavailable — semantic KNN skipped (fail-open)',
      );
      return [];
    }

    await this.ensureIndex();

    try {
      return await this.searchKnn(input);
    } catch (err: unknown) {
      if (this.isMissingIndexError(err)) {
        this.indexCreated = false;
        await this.ensureIndex();
        try {
          return await this.searchKnn(input);
        } catch (retryErr: unknown) {
          this.logger.warn(
            'Semantic KNN failed after index recreate (fail-open)',
            {
              message: this.errorMessage(retryErr),
            },
          );
          return [];
        }
      }
      throw err;
    }
  }

  private entryKey(
    clientId: string,
    modelAlias: string,
    text: string,
    systemSignature: string,
    callParams: string,
  ): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const hash = createHash('sha256')
      .update(clientId)
      .update('|')
      .update(modelAlias)
      .update('|')
      .update(semCache.embeddingModel)
      .update('|')
      .update(systemSignature)
      .update('|')
      .update(callParams)
      .update('|')
      .update(text)
      .digest('hex')
      .slice(0, 32);
    return `${this.indexName()}:${hash}`;
  }

  async upsert(input: VectorStoreUpsertInput): Promise<void> {
    const redisClient = this.redis.getClient();
    if (!redisClient) {
      this.logger.warn(
        'Redis client unavailable — semantic upsert skipped (fail-open)',
      );
      return;
    }

    const ttl = unbrand(input.ttlSeconds);
    if (!isSemanticCacheTtlSeconds(ttl)) {
      this.logger.warn(
        'Semantic upsert skipped — ttlSeconds must be >= 1 (no eternal vectors)',
        { ttlSeconds: ttl },
      );
      return;
    }

    await this.ensureIndex();

    const write = async (): Promise<void> => {
      const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
      const key = this.entryKey(
        input.clientId,
        input.modelAlias,
        input.text,
        input.systemSignature,
        input.callParams,
      );

      await redisClient
        .multi()
        .hset(key, {
          modelAlias: input.modelAlias,
          clientId: input.clientId,
          embeddingModel: semCache.embeddingModel,
          systemSignature: input.systemSignature,
          callParams: input.callParams,
          reply: JSON.stringify(input.reply),
          vector: this.vectorBlob(input.vector),
        })
        .expire(key, ttl)
        .exec();
    };

    try {
      await write();
    } catch (err: unknown) {
      if (this.isMissingIndexError(err)) {
        this.indexCreated = false;
        await this.ensureIndex();
        await write();
        return;
      }
      throw err;
    }
  }
}
