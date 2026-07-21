import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  assertOpenAiProviderType,
  type GatewayProviderType,
} from '../../config/provider-types';
import { createChatCompletionsAdapter } from '../openai/adapters/chat-completions.adapter';
import { createResponsesAdapter } from '../openai/adapters/responses.adapter';
import type { AIProvider } from '../interfaces/ai-provider.interface';
import type { OpenAiProviderConfig } from '../openai/openai-provider.types';

export function createOpenAiProviderCore(
  providerType: GatewayProviderType,
  config: OpenAiProviderConfig,
  loggingService: LoggingService,
): AIProvider {
  assertOpenAiProviderType(providerType);

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    ...(config.defaultHeaders && { defaultHeaders: config.defaultHeaders }),
  });

  const logger = loggingService.child({
    module: 'OpenAiProviderCore',
    providerType,
  });

  const chatCompletions = createChatCompletionsAdapter(client, logger, {
    includeStreamUsage: providerType === 'openai-compatible',
  });
  const responses = createResponsesAdapter(client, logger);

  return {
    async complete(input, modelId, options) {
      if (providerType === 'openai') {
        return responses.complete(input, modelId, options);
      }
      return chatCompletions.complete(input, modelId, options);
    },
    stream(input, modelId, options) {
      if (providerType === 'openai') {
        return responses.stream(input, modelId, options);
      }
      return chatCompletions.stream(input, modelId, options);
    },
  };
}
