import { Module } from '@nestjs/common';
import { AppMetricsModule } from '../../observability/app-metrics/app-metrics.module';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import { OllamaEmbeddingAdapter } from './adapters/ollama-embedding.adapter';
import { RedisVectorStoreAdapter } from './adapters/redis-vector-store.adapter';
import { SemanticCacheService } from './semantic-cache.service';

@Module({
  imports: [AppMetricsModule],
  providers: [
    OllamaEmbeddingAdapter,
    RedisVectorStoreAdapter,
    { provide: EMBEDDING_BACKEND, useExisting: OllamaEmbeddingAdapter },
    { provide: VECTOR_STORE, useExisting: RedisVectorStoreAdapter },
    SemanticCacheService,
  ],
  exports: [SemanticCacheService, EMBEDDING_BACKEND, VECTOR_STORE],
})
export class SemanticCacheModule {}
