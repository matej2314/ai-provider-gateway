import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { RedisConnectionService } from '../../adapters/redis-cache/redis-connection.service';
import { LoggingService } from '../../../logging/logging.service';
import { parseCachedChatResponse } from '../../schemas/cached-chat-response.schema';
import { semanticIndexName } from '../index-name';
import type {
  VectorStore,
  VectorSearchHit,
  VectorStoreKnnInput,
  VectorStoreUpsertInput,
} from '../vector-store.interface';

@Injectable()
export class RedisVectorStoreAdapter implements VectorStore, OnModuleInit {
  private indexCreated = false;

  constructor(
    private readonly redis: RedisConnectionService,
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  private indexName(): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    return semanticIndexName(semCache.embeddingModel, semCache.embeddingDim);
  }

  /** Escape RediSearch TAG special chars (e.g. `-` in modelAlias). */
  private escapeTag(value: string): string {
    return value.replace(/([,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\ ])/g, '\\$1');
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

  private parseKnnHits(raw: unknown): VectorSearchHit[] {
    if (!Array.isArray(raw) || raw.length < 3) return [];

    const count = Number(raw[0]);
    if (!Number.isFinite(count) || count < 1) return [];

    const hits: VectorSearchHit[] = [];
    for (let i = 1; i + 1 < raw.length; i += 2) {
      const fields = raw[i + 1];
      if (!Array.isArray(fields)) continue;

      const map = new Map<string, string>();
      for (let j = 0; j + 1 < fields.length; j += 2) {
        map.set(this.asString(fields[j]), this.asString(fields[j + 1]));
      }

      const replyRaw = map.get('reply');
      if (!replyRaw) continue;

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(replyRaw);
      } catch {
        continue;
      }

      const reply = parseCachedChatResponse(parsedJson);
      if (!reply) continue;

      const dist = Number.parseFloat(map.get('dist') ?? '');
      if (!Number.isFinite(dist)) continue;

      hits.push({
        similarity: 1 - dist,
        reply,
      });
    }

    return hits;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex();
  }

  async ensureIndex(): Promise<void> {
    if (this.indexCreated) return;
    const redisClient = this.redis.getClient();
    if (!redisClient) throw new Error('Redis client unavailable.');
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const index = this.indexName();
    try {
      await redisClient.call('FT.INFO', index);
      this.indexCreated = true;
      return;
    } catch {
      /* missing index — create */
    }
    await redisClient.call(
      'FT.CREATE',
      index,
      'ON',
      'HASH',
      'PREFIX',
      '1',
      `aigw:sem:${index}:`,
      'SCHEMA',
      'modelAlias',
      'TAG',
      'clientId',
      'TAG',
      'embeddingModel',
      'TAG',
      'reply',
      'TEXT',
      'vector',
      'VECTOR',
      'FLAT',
      '6',
      'TYPE',
      'FLOAT32',
      'DIM',
      String(semCache.embeddingDim),
      'DISTANCE_METRIC',
      'COSINE',
    );
    this.indexCreated = true;
  }

  async knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]> {
    const redisClient = this.redis.getClient();
    if (!redisClient) throw new Error('Redis client unavailable.');

    const index = this.indexName();
    const modelAlias = this.escapeTag(input.modelAlias);
    const clientId = this.escapeTag(input.clientId);
    const query = `(@modelAlias:{${modelAlias}} @clientId:{${clientId}})=>[KNN ${input.k} @vector $blob AS dist]`;

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
      'RETURN',
      '2',
      'reply',
      'dist',
      'DIALECT',
      '2',
    );

    return this.parseKnnHits(raw);
  }

  /**
   * Klucz deterministyczny: hash(clientId + modelAlias + embeddingModel + text).
   * Identyczny prompt = atomowy overwrite (brak duplikatów w KNN top-K).
   */
  private entryKey(clientId: string, modelAlias: string, text: string): string {
    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const hash = createHash('sha256')
      .update(clientId)
      .update('|')
      .update(modelAlias)
      .update('|')
      .update(semCache.embeddingModel)
      .update('|')
      .update(text)
      .digest('hex')
      .slice(0, 32);
    return `aigw:sem:${this.indexName()}:${hash}`;
  }

  async upsert(input: VectorStoreUpsertInput): Promise<void> {
    const redisClient = this.redis.getClient();
    if (!redisClient) throw new Error('Redis client unavailable.');

    const semCache = getAppConfigOrThrow(this.config, 'semanticCache');
    const key = this.entryKey(input.clientId, input.modelAlias, input.text);

    await redisClient.hset(key, {
      modelAlias: input.modelAlias,
      clientId: input.clientId,
      embeddingModel: semCache.embeddingModel,
      reply: JSON.stringify(input.reply),
      vector: this.vectorBlob(input.vector),
    });

    if (input.ttlSeconds > 0) {
      await redisClient.expire(key, input.ttlSeconds);
    }
  }
}
