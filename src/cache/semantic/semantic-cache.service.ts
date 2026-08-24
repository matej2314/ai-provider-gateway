import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../config/typed-config';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { LoggingService } from '../../logging/logging.service';
import { asModelAlias, type ClientId } from '../../common/types/branded.types';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import { lastUserMessageText } from './last-user-message';
import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { EmbeddingBackend } from './embedding-backend.interface';
import type { VectorStore } from './vector-store.interface';

@Injectable()
export class SemanticCacheService {
  private readonly circuit = new EmbeddingCircuitBreaker(3);
  private readonly logger: LoggingService;

  constructor(
    @Inject(EMBEDDING_BACKEND) private readonly embedding: EmbeddingBackend,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
    private readonly config: ConfigService,
    private readonly appMetrics: AppMetricsService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.child({ module: 'SemanticCacheService' });
  }

  async lookup(
    request: ChatRequestDto,
    clientId: ClientId,
  ): Promise<CachedChatResponse | null> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return null;
    const text = lastUserMessageText(request);
    if (!text) return null;
    if (this.circuit.isCircuitOpen()) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return null;
    }
    try {
      const vector = await this.embedding.embed(text);
      this.circuit.recordEmbedSuccess();
      const hits = await this.vectorStore.knn({
        vector,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        k: cfg.k,
      });
      const best = hits[0];
      if (!best || best.similarity < cfg.minSimilarity) {
        this.appMetrics.recordSemanticCacheLookup(
          asModelAlias(request.modelAlias),
          'below-threshold',
        );
        return null;
      }
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'hit',
      );
      return best.reply;
    } catch (err: unknown) {
      this.circuit.recordEmbedFailure();
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache lookup failed (fail-open): ${msg}`);
      return null;
    }
  }

  /** G1: caller MUST await. Optional reusedVector avoids a second embed after lookup miss. */
  async storeReply(
    request: ChatRequestDto,
    reply: CachedChatResponse,
    clientId: ClientId,
    reusedVector?: number[],
  ): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    const text = lastUserMessageText(request);
    if (!text) return;
    if (this.circuit.isCircuitOpen()) return;
    try {
      const vector = reusedVector ?? (await this.embedding.embed(text));
      this.circuit.recordEmbedSuccess();
      await this.vectorStore.upsert({
        vector,
        text,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        reply,
        ttlSeconds: cfg.ttl,
      });
    } catch (err: unknown) {
      this.circuit.recordEmbedFailure();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache store failed (fail-open): ${msg}`);
    }
  }

  async probeEmbedding(): Promise<boolean> {
    try {
      await this.embedding.embed('ping');
      return true;
    } catch {
      return false;
    }
  }
}
