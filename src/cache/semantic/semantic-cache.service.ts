import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../config/typed-config';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { LoggingService } from '../../logging/logging.service';
import { asModelAlias, type ClientId } from '../../common/types/branded.types';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import {
  lastUserMessageText,
  isSingleTurnUserRequest,
} from './last-user-message';
import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';
import { computeSystemSignature, hashCallParams } from '../cache-identity';
import {
  EMBEDDING_CIRCUIT_COOLDOWN_MS,
  EMBEDDING_CIRCUIT_OPEN_AFTER,
  embeddingProbeTimeoutMs,
} from './semantic-cache.constants';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { EmbeddingBackend } from './embedding-backend.interface';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
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

  private recordLookupSkip(modelAlias: string): SemanticLookupResult {
    this.appMetrics.recordSemanticCacheLookup(asModelAlias(modelAlias), 'skip');
    return EMBED_NOT_ATTEMPTED;
  }

  async lookup(
    request: ChatRequestDto,
    clientId: ClientId,
    options?: ProviderCallOptions,
  ): Promise<SemanticLookupResult> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return this.recordLookupSkip(request.modelAlias);
    if (!isSingleTurnUserRequest(request.messages)) {
      return this.recordLookupSkip(request.modelAlias);
    }
    const text = lastUserMessageText(request);
    if (!text) return this.recordLookupSkip(request.modelAlias);

    const prompts = getAppConfigOrThrow(this.config, 'resolvedSystemPrompts');
    const systemSig = computeSystemSignature(prompts, request.modelAlias);
    const callParamsSig = hashCallParams(options);

    const identityReply = await this.vectorStore.getByTextIdentity({
      text,
      modelAlias: asModelAlias(request.modelAlias),
      clientId,
      systemSignature: systemSig,
      callParams: callParamsSig,
    });
    if (identityReply) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'hash-hit',
      );
      return { reply: identityReply, vector: null, embedAttempted: false };
    }

    if (this.circuit.shouldSkipEmbed()) {
      return this.recordLookupSkip(request.modelAlias);
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
        systemSignature: systemSig,
        callParams: callParamsSig,
        k: cfg.k,
      });
      const best = hits.find((hit) => hit.similarity >= cfg.minSimilarity);
      if (!best) {
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
    options?: ProviderCallOptions,
    embedState: SemanticStoreEmbedState = { embedAttempted: false },
  ): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    if (!isSingleTurnUserRequest(request.messages)) return;
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

    const prompts = getAppConfigOrThrow(this.config, 'resolvedSystemPrompts');
    const systemSig = computeSystemSignature(prompts, request.modelAlias);
    const callParamsSig = hashCallParams(options);

    try {
      await this.vectorStore.upsert({
        vector,
        text,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        systemSignature: systemSig,
        callParams: callParamsSig,
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
      // Observation only — must not close the circuit or clear half-open trial.
      await this.embedding.embed('ping', budget);
      return true;
    } catch {
      return false;
    }
  }
}
