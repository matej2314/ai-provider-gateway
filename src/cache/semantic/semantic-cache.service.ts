import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../config/typed-config';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { LoggingService } from '../../logging/logging.service';
import { asModelAlias, type ClientId } from '../../common/types/branded.types';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import { lastUserMessageText } from './last-user-message';
import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';
import {
  EMBEDDING_CIRCUIT_COOLDOWN_MS,
  EMBEDDING_CIRCUIT_OPEN_AFTER,
  embeddingProbeTimeoutMs,
} from './semantic-cache.constants';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { EmbeddingBackend } from './embedding-backend.interface';
import type { VectorStore } from './vector-store.interface';

export type SemanticLookupResult = {
  reply: CachedChatResponse | null;
  vector: number[] | null;
  embedAttempted: boolean;
};

export type SemanticStoreEmbedState = {
  vector?: number[];
  embedAttempted: boolean;
};

const EMBED_NOT_ATTEMPTED: SemanticLookupResult = {
  reply: null,
  vector: null,
  embedAttempted: false,
};

@Injectable()
export class SemanticCacheService {
  private readonly circuit = new EmbeddingCircuitBreaker(
    EMBEDDING_CIRCUIT_OPEN_AFTER,
    EMBEDDING_CIRCUIT_COOLDOWN_MS,
  );
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
  ): Promise<SemanticLookupResult> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return EMBED_NOT_ATTEMPTED;
    const text = lastUserMessageText(request);
    if (!text) return EMBED_NOT_ATTEMPTED;
    if (this.circuit.shouldSkipEmbed()) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return EMBED_NOT_ATTEMPTED;
    }
    let vector: number[];

    try {
      vector = await this.embedding.embed(text);
      this.circuit.recordEmbedSuccess();
    } catch (err: unknown) {
      this.circuit.recordEmbedFailure();
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache lookup failed (fail-open): ${msg}`);
      return { reply: null, vector: null, embedAttempted: true };
    }
    try {
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
        return { reply: null, vector, embedAttempted: true };
      }
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'hit',
      );
      return { reply: best.reply, vector, embedAttempted: true };
    } catch (err: unknown) {
      // Redis Search — fail-open; NIE recordEmbedFailure; wektor zostaje na SET
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache KNN failed (fail-open): ${msg}`);
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return { reply: null, vector, embedAttempted: true };
    }
  }

  async storeReply(
    request: ChatRequestDto,
    reply: CachedChatResponse,
    clientId: ClientId,
    embedState: SemanticStoreEmbedState = { embedAttempted: false },
  ): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    const text = lastUserMessageText(request);
    if (!text) return;

    let vector = embedState.vector;
    if (!vector) {
      if (embedState.embedAttempted) return;
      if (this.circuit.shouldSkipEmbed()) return;
      try {
        vector = await this.embedding.embed(text);
        this.circuit.recordEmbedSuccess();
      } catch (err: unknown) {
        this.circuit.recordEmbedFailure();
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Semantic cache store embed failed (fail-open): ${msg}`,
        );
        return;
      }
    }

    try {
      await this.vectorStore.upsert({
        vector,
        text,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        reply,
        ttlSeconds: cfg.ttl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache store failed (fail-open): ${msg}`);
    }
  }

  async probeEmbedding(): Promise<boolean> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    const budget = embeddingProbeTimeoutMs(cfg.embeddingTimeoutMs);
    try {
      await this.embedding.embed('ping', budget);
      this.circuit.recordEmbedSuccess();
      return true;
    } catch {
      return false;
    }
  }
}
