import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapGoogleGenAiError,
  toHttpException,
} from '../../common/errors/provider-error.mapper';
import {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
} from '../interfaces/ai-provider.interface';
import { ProviderRegistryService } from '../provider-registry.service';

@Injectable()
export class GoogleAdapter implements AIProvider, OnModuleInit {
  private client: GoogleGenAI;
  private readonly logger: LoggingService;

  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistryService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'GoogleAdapter' });
    const apiKey = this.configService.get<string>('providers.google.apiKey');

    if (!apiKey) throw new Error('[GoogleAdapter] API key not configured');

    this.client = new GoogleGenAI({ apiKey });
    this.logger.info('Google adapter initialized');
  }

  onModuleInit() {
    this.registry.register('google', this);
  }

  private prepareContents(messages: Record<string, string>[]) {
    return messages.map((m) => {
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      };
    });
  }

  async complete(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderChatResponse> {
    this.logger.debug('Calling model', {
      model: modelId,
      messagesCount: input.messages.length,
    });

    try {
      const response = await this.client.models.generateContent({
        model: modelId,
        contents: this.prepareContents(input.messages),
        config: {
          ...(input.system?.trim() ? { systemInstruction: input.system } : {}),
          temperature: options?.temperature ?? undefined,
          maxOutputTokens: options?.maxOutputTokens ?? 1024,
        },
      });

      return {
        text: response.text ?? '',
        model: modelId,
        usage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount ?? 0,
              outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.warn('Error completing', {
        message: error instanceof Error ? error.message : String(error),
        model: modelId,
      });
      throw toHttpException(mapGoogleGenAiError(error));
    }
  }

  async *stream(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): AsyncIterable<string> {
    try {
      this.logger.debug('Streaming', {
        model: modelId,
        messagesCount: input.messages.length,
      });

      const stream = await this.client.models.generateContentStream({
        model: modelId,
        contents: this.prepareContents(input.messages),
        config: {
          ...(input.system?.trim() ? { systemInstruction: input.system } : {}),
          temperature: options?.temperature ?? undefined,
          maxOutputTokens: options?.maxOutputTokens ?? 1024,
        },
      });

      for await (const event of stream) {
        if (event.text) {
          yield event.text;
        }
      }
    } catch (error) {
      this.logger.warn('Error streaming', {
        message: error instanceof Error ? error.message : String(error),
        model: modelId,
      });
      throw toHttpException(mapGoogleGenAiError(error));
    }
  }
}
