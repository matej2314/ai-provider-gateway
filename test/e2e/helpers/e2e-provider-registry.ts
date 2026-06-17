import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProviderRegistryService } from '../../../src/providers/provider-registry.service';
import type {
  AIProvider,
  ProviderChatResponse,
  StreamResult,
} from '../../../src/providers/interfaces/ai-provider.interface';
import {
  TEST_MODEL_ALIAS,
  TEST_PROVIDER_INSTANCE,
} from '../../../src/common/mocks/test-constants';

const E2E_DEFAULT_ALLOW_OVERRIDES = [
  'temperature',
  'maxOutputTokens',
  'topP',
  'topK',
  'stop',
  'frequencyPenalty',
  'presencePenalty',
  'seed',
  'responseFormat',
  'thinkingEnabled',
  'thinkingBudget',
] as const;

function createDefaultParams() {
  return {
    defaults: {},
    allowOverrides: [...E2E_DEFAULT_ALLOW_OVERRIDES],
    bounds: {},
  };
}

export type E2eProviderRegistryOptions = {
  modelAlias?: string;
  fallbackAlias?: string;
  providerName?: string;
  modelId?: string;
  completeResponse?: Partial<ProviderChatResponse>;
  streamChunks?: string[];
  hangStream?: boolean;
};

export type E2eProviderRegistryMock = Partial<ProviderRegistryService> & {
  provider: AIProvider;
  resolveMock: jest.Mock;
};

function createDefaultCompleteResponse(
  overrides: Partial<ProviderChatResponse> = {},
): ProviderChatResponse {
  return {
    text: 'Mocked response from provider',
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 20 },
    ...overrides,
  };
}

function createStreamResult(chunks: string[], hang = false): StreamResult {
  async function* textStream() {
    if (hang) {
      await new Promise<void>(() => undefined);
      yield 'never';
      return;
    }

    for (const chunk of chunks) {
      yield chunk;
    }
  }

  return {
    textStream: textStream(),
    getUsageMetadata: jest.fn().mockResolvedValue({
      inputTokens: 5,
      outputTokens: 10,
    }),
    getStopReason: jest.fn().mockResolvedValue('end_turn' as const),
  };
}

export function createE2eProviderRegistry(
  options: E2eProviderRegistryOptions = {},
): E2eProviderRegistryMock {
  const primaryAlias = options.modelAlias ?? TEST_MODEL_ALIAS;
  const streamChunks = options.streamChunks ?? ['Hello', ' world'];

  const provider: AIProvider = {
    complete: jest
      .fn()
      .mockResolvedValue(
        createDefaultCompleteResponse(options.completeResponse),
      ),
    stream: jest
      .fn()
      .mockReturnValue(
        createStreamResult(streamChunks, options.hangStream === true),
      ),
  };

  const resolveMock = jest.fn((alias: string) => ({
    provider,
    providerName: options.providerName ?? TEST_PROVIDER_INSTANCE,
    modelId: options.modelId ?? 'claude-sonnet-4-5',
    modelAlias: alias,
    fallbackAlias:
      alias === primaryAlias ? options.fallbackAlias : undefined,
    capabilities: { tools: true, streaming: true },
    policy: {
      retry: { maxAttempts: 1, onStatus: [429, 500, 502, 503, 504] },
    },
    params: createDefaultParams(),
  }));

  return {
    provider,
    resolveMock,
    resolve: resolveMock,
    registerInstance: jest.fn(),
    list: jest.fn().mockReturnValue([]),
  };
}

export function createE2eFallbackProviderRegistry(options: {
  primaryAlias: string;
  fallbackAlias: string;
  fallbackText?: string;
}): E2eProviderRegistryMock {
  const primaryProvider: AIProvider = {
    complete: jest
      .fn()
      .mockRejectedValue(
        new HttpException(
          {
            code: 'PROVIDER_ERROR',
            message: 'Server error',
            details: [],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      ),
    stream: jest.fn(),
  };

  const fallbackProvider: AIProvider = {
    complete: jest.fn().mockResolvedValue(
      createDefaultCompleteResponse({
        text: options.fallbackText ?? 'Response from fallback',
        usage: { inputTokens: 10, outputTokens: 15 },
      }),
    ),
    stream: jest.fn().mockReturnValue(createStreamResult(['fallback'])),
  };

  const resolveMock = jest.fn((alias: string) => {
    const isFallback = alias === options.fallbackAlias;
    return {
      provider: isFallback ? fallbackProvider : primaryProvider,
      providerName: TEST_PROVIDER_INSTANCE,
      modelId: isFallback ? 'claude-sonnet-4-5' : 'claude-opus-4',
      modelAlias: alias,
      fallbackAlias:
        alias === options.primaryAlias ? options.fallbackAlias : undefined,
      capabilities: { tools: true, streaming: true },
      policy: {
        retry: { maxAttempts: 1, onStatus: [429, 500, 502, 503, 504] },
      },
      params: createDefaultParams(),
    };
  });

  return {
    provider: primaryProvider,
    resolveMock,
    resolve: resolveMock,
    registerInstance: jest.fn(),
    list: jest.fn().mockReturnValue([]),
  };
}
