import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { LoggingService } from '../../../logging/logging.service';
import { RedisConnectionService } from '../../adapters/redis-cache/redis-connection.service';
import { parseCachedChatResponse } from '../../schemas/cached-chat-response.schema';
import { isUnservableCachedReply } from '../../helpers/is-unservable-cached-reply';
import { semanticIndexName } from '../index-name';
import { semanticSchemaFtCreateArgs } from '../semantic-cache.constants';
import type { CachedChatResponse } from '../../types/cached-chat-response.type';
import type {
  VectorStore,
  VectorSearchHit,
  VectorStoreKnnInput,
  VectorStoreProbeResult,
  VectorStoreTextIdentityInput,
  VectorStoreUpsertInput,
} from '../vector-store.interface';
import { unbrand } from '../../../common/types/branded.types';
import { isSemanticCacheTtlSeconds } from '../../../common/types/branded.guards';
import { escapeRedisSearchTag } from '../escape-tag';
import { asString, parseKnnHits } from '../parse-knn-hits';
import {
  isRedisSearchIndexAlreadyExistsError,
  isRedisSearchMissingIndexError,
  isRedisSearchModuleMissingError,
  redisSearchErrorMessage,
} from '../redis-search-error';

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

  private vectorBlob(vector: number[]): Buffer {
    const floats = new Float32Array(vector);
    return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
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
        `Semantic cache DEL failed for key ${key}: ${redisSearchErrorMessage(err)}`,
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
      if (isRedisSearchModuleMissingError(infoErr)) {
        this.logger.warn(
          'Redis Search module unavailable (FT.* commands missing — use Redis Stack)',
          { message: redisSearchErrorMessage(infoErr) },
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
      if (isRedisSearchIndexAlreadyExistsError(createErr)) {
        this.indexCreated = true;
        return;
      }
      this.logger.warn(
        'Failed to create Redis Search vector index (fail-open)',
        {
          index,
          message: redisSearchErrorMessage(createErr),
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
      if (isRedisSearchModuleMissingError(err)) {
        return {
          available: false,
          message:
            'Redis Search module unavailable (FT.* commands missing — use Redis Stack)',
        };
      }
      return {
        available: false,
        message: `Vector index unavailable: ${redisSearchErrorMessage(err)}`,
      };
    }
  }

  private buildKnnQuery(input: VectorStoreKnnInput): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const modelAlias = escapeRedisSearchTag(input.modelAlias);
    const clientId = escapeRedisSearchTag(input.clientId);
    const embeddingModel = escapeRedisSearchTag(semCache.embeddingModel);
    const systemSig = escapeRedisSearchTag(input.systemSignature);
    const callParams = escapeRedisSearchTag(input.callParams);
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

    const { hits, corruptKeys } = parseKnnHits(raw);
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
      if (isRedisSearchMissingIndexError(err)) {
        this.indexCreated = false;
        await this.ensureIndex();
        try {
          return await this.searchKnn(input);
        } catch (retryErr: unknown) {
          this.logger.warn(
            'Semantic KNN failed after index recreate (fail-open)',
            {
              message: redisSearchErrorMessage(retryErr),
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

  async getByTextIdentity(
    input: VectorStoreTextIdentityInput,
  ): Promise<CachedChatResponse | null> {
    const redisClient = this.redis.getClient();
    if (!redisClient) return null;

    const key = this.entryKey(
      input.clientId,
      input.modelAlias,
      input.text,
      input.systemSignature,
      input.callParams,
    );

    try {
      // Require vector too — orphan HASH (reply-only after crashed upsert) is unservable.
      const [replyRaw, vectorRaw] = await redisClient.hmget(
        key,
        'reply',
        'vector',
      );
      if (!replyRaw) return null;
      if (vectorRaw == null || vectorRaw === '') {
        // Incomplete / in-flight upsert — miss without DEL (avoid racing MULTI after HSETNX).
        // Orphans are healed on the next upsert (hexists/ttl check).
        return null;
      }
      const parsedJson: unknown = JSON.parse(asString(replyRaw));
      const reply = parseCachedChatResponse(parsedJson);
      if (!reply || isUnservableCachedReply(reply)) {
        await this.deleteCorruptEntry(key);
        return null;
      }
      return reply;
    } catch {
      // Same hygiene as invalid schema / unservable reply (exact-cache parity).
      await this.deleteCorruptEntry(key);
      return null;
    }
  }

  /**
   * Meta + vector fields written after HSETNX claim (never overwrites `reply`).
   */
  private metaFields(
    input: VectorStoreUpsertInput,
    embeddingModel: string,
  ): Record<string, string | Buffer> {
    return {
      modelAlias: input.modelAlias,
      clientId: input.clientId,
      embeddingModel,
      systemSignature: input.systemSignature,
      callParams: input.callParams,
      vector: this.vectorBlob(input.vector),
    };
  }

  /**
   * Completes an orphan HASH (reply claimed, missing vector and/or TTL).
   * Preserves first-writer `reply` (SPEC-CHAT F-8d). No Lua — same HSETNX+MULTI shape.
   */
  private async healIncompleteEntry(
    key: string,
    fields: Record<string, string | Buffer>,
    ttl: number,
  ): Promise<void> {
    const redisClient = this.redis.getClient();
    if (!redisClient) return;
    await redisClient.multi().hset(key, fields).expire(key, ttl).exec();
    this.logger.warn(
      `Semantic upsert healed incomplete entry (missing vector and/or TTL): ${key}`,
    );
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
      const fields = this.metaFields(input, semCache.embeddingModel);

      // First-writer-wins: `reply` as content-identity sentinel (SPEC-CHAT F-8d).
      // Window between HSETNX and MULTI can leave reply-only orphans — heal below.
      const claimed = await redisClient.hsetnx(
        key,
        'reply',
        JSON.stringify(input.reply),
      );

      if (claimed === 1) {
        await redisClient.multi().hset(key, fields).expire(key, ttl).exec();
        return;
      }

      const [hasVector, keyTtl] = await Promise.all([
        redisClient.hexists(key, 'vector'),
        redisClient.ttl(key),
      ]);
      // TTL -1 = no expiry; -2 = missing (race) — both need heal / recreate path.
      const incomplete = hasVector === 0 || keyTtl < 0;
      if (incomplete) {
        await this.healIncompleteEntry(key, fields, ttl);
        return;
      }

      this.logger.debug(
        `Semantic upsert NX noop (entry already exists): ${key}`,
      );
    };

    try {
      await write();
    } catch (err: unknown) {
      if (isRedisSearchMissingIndexError(err)) {
        this.indexCreated = false;
        await this.ensureIndex();
        await write();
        return;
      }
      throw err;
    }
  }
}
