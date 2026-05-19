import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  mapAnthropicSdkError,
  toHttpException,
} from '../../common/errors/provider-error.mapper';
import {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../interfaces/ai-provider.interface';
import { ProviderRegistryService } from '../provider-registry.service';
import { LoggingService } from 'src/logging/logging.service';

@Injectable()
export class AnthropicAdapter implements AIProvider, OnModuleInit {
  private client: Anthropic;
  private readonly logger: LoggingService;

  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistryService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'AnthropicAdapter' });
    const apiKey = this.configService.get<string>('providers.anthropic.apiKey');

    if (!apiKey) throw new Error('[AnthropicAdapter] API key not configured');

    this.client = new Anthropic({ apiKey });
    this.logger.info('Anthropic adapter initialized');
  }

  onModuleInit() {
    this.registry.register('anthropic', this);
  }

  async complete(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderChatResponse> {
    this.logger.debug('Calling model', {
      model: modelId,
    });

    try {
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: options?.maxOutputTokens ?? 1024,
        temperature: options?.temperature ?? undefined,
        system: input.system,
        messages: input.messages,
      });

      let text = '';

      for (const c of response.content) {
        if (c.type === 'text') text += c.text;
      }

      return {
        text,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.warn('Error completing', {
        message: error instanceof Error ? error.message : String(error),
        model: modelId,
      });
      throw toHttpException(mapAnthropicSdkError(error));
    }
  }

  stream(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): StreamResult {
    const self = this;
    let streamObject:
      | ReturnType<typeof self.client.messages.stream>
      | undefined;

    async function* textStream(): AsyncIterable<string> {
      try {
        self.logger.debug('Streaming', { model: modelId });

        streamObject = self.client.messages.stream({
          model: modelId,
          max_tokens: options?.maxOutputTokens ?? 1024,
          temperature: options?.temperature ?? undefined,
          system: input.system,
          messages: input.messages,
          stream: true,
        });

        for await (const event of streamObject) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield event.delta.text;
          }
        }
      } catch (error) {
        self.logger.warn('Error streaming', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapAnthropicSdkError(error));
      }
    }

    async function getUsageMetadata() {
      if (!streamObject) return undefined;

      try {
        const finalMessage = await streamObject.finalMessage();
        return {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          model: finalMessage.model,
        };
      } catch (error) {
        self.logger.warn('Error getting stream usage metadata', {
          message: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    }
    return {
      textStream: textStream(),
      getUsageMetadata: getUsageMetadata,
    };
  }
}
