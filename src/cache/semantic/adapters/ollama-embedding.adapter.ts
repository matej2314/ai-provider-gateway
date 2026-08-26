import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { LoggingService } from '../../../logging/logging.service';
import type { EmbeddingBackend } from '../embedding-backend.interface';

@Injectable()
export class OllamaEmbeddingAdapter implements EmbeddingBackend, OnModuleInit {
  private readonly logger: LoggingService;

  constructor(
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'OllamaEmbeddingAdapter' });
  }

  async onModuleInit(): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    try {
      await this.embed('warmup');
      this.logger.info('Embedding model warmed up successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Embedding warmup failed: ${msg}`);
    }
  }

  isAvailable(): boolean {
    return getAppConfigOrThrow(this.config, 'semanticCache').enabled;
  }

  async embed(text: string, timeoutMs?: number): Promise<number[]> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    const url = `${cfg.embeddingBaseUrl.replace(/\/$/, '')}/api/embed`;
    const budget = timeoutMs ?? cfg.embeddingTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budget);
    try {
      const embedResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.embeddingModel, input: text }),
        signal: controller.signal,
      });
      if (!embedResponse.ok) {
        throw new Error(`embed request failed: ${embedResponse.status}`);
      }
      const body = (await embedResponse.json()) as { embeddings?: number[][] };
      const vector = body.embeddings?.[0];
      if (!vector || vector.length !== cfg.embeddingDim) {
        throw new Error(
          `Embedding dimensions mismatch: got ${vector?.length ?? 0}, expected ${cfg.embeddingDim}`,
        );
      }
      return vector;
    } finally {
      clearTimeout(timer);
    }
  }
}
