import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProviderRegistryService } from '../../../src/providers/provider-registry.service';
import type {
  AIProvider,
  ProviderChatResponse,
  StreamResult,
} from '../../../src/providers/interfaces/ai-provider.interface';
import {
  TEST_INPUT_TOKENS,
  TEST_INPUT_TOKENS_SMALL,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ID,
  TEST_OUTPUT_TOKENS,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../../src/common/mocks/test-constants';
import type { GatewayProviderType } from '../../../src/config/provider-types';
import type { OpenAiApiSurface } from '../../../src/providers/openai/openai-provider.types';
import {
  asMaxAttempts,
  asModelAlias,
  asModelId,
  asOutputTokens,
  asProviderInstanceId,
} from '../../../src/common/types/branded.types';
import {
  E2E_OPENAI_MODEL_ALIAS,
  E2E_OPENAI_PROVIDER_INSTANCE,
} from './e2e-constants';

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

export type E2eProviderCapabilities = {
  tools?: boolean;
  streaming?: boolean;
  thinking?: boolean;
};

export type E2eStreamResultOptions = {
  chunks?: string[];
  hang?: boolean;
  systemFingerprint?: string;
  thinkingContent?: string;
  toolCalls?: ProviderChatResponse['toolCalls'];
  stopReason?: ProviderChatResponse['stopReason'];
};

export type E2eProviderRegistryOptions = {
  modelAlias?: string;
  fallbackAlias?: string;
  providerName?: string;
  providerType?: GatewayProviderType;
  modelId?: string;
  openAiApiSurface?: OpenAiApiSurface;
  completeResponse?: Partial<ProviderChatResponse>;
  streamChunks?: string[];
  streamOptions?: E2eStreamResultOptions;
  hangStream?: boolean;
  capabilities?: E2eProviderCapabilities;
};

const capabilities = (options: E2eProviderRegistryOptions) => ({
  tools: true,
  streaming: true,
  thinking: false,
  ...options?.capabilities,
});

export type E2eProviderRegistryMock = Partial<ProviderRegistryService> & {
  provider: AIProvider;
  resolveMock: jest.Mock;
  capabilities: E2eProviderCapabilities;
};

function createDefaultCompleteResponse(
  overrides: Partial<ProviderChatResponse> = {},
): ProviderChatResponse {
  return {
    text: 'Mocked response from provider',
    stopReason: 'end_turn',
    usage: {
      inputTokens: TEST_INPUT_TOKENS,
      outputTokens: TEST_OUTPUT_TOKENS,
    },
    ...overrides,
  };
}

function createStreamResult(
  options: E2eStreamResultOptions = {},
): StreamResult {
  const chunks = options.chunks ?? ['Hello', ' world'];
  const hang = options.hang === true;

  async function* textStream(): AsyncIterable<string> {
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
      inputTokens: TEST_INPUT_TOKENS_SMALL,
      outputTokens: TEST_OUTPUT_TOKENS_SMALL,
    }),
    getStopReason: jest
      .fn()
      .mockResolvedValue(options.stopReason ?? ('end_turn' as const)),
    ...(options.systemFingerprint !== undefined && {
      getSystemFingerprint: jest
        .fn()
        .mockResolvedValue(options.systemFingerprint),
    }),
    ...(options.thinkingContent !== undefined && {
      getThinkingContent: jest.fn().mockResolvedValue(options.thinkingContent),
    }),
    ...(options.toolCalls !== undefined && {
      getFinalToolCalls: jest.fn().mockResolvedValue(options.toolCalls),
    }),
  };
}

function buildResolvedConfig(
  alias: string,
  options: E2eProviderRegistryOptions,
  provider: AIProvider,
  primaryAlias: string,
) {
  const providerType = options.providerType ?? 'anthropic';

  return {
    provider,
    providerName: asProviderInstanceId(
      options.providerName ?? TEST_PROVIDER_INSTANCE,
    ),
    providerType,
    modelId: asModelId(options.modelId ?? TEST_MODEL_ID),
    modelAlias: asModelAlias(alias),
    fallbackAlias:
      alias === primaryAlias && options.fallbackAlias
        ? asModelAlias(options.fallbackAlias)
        : undefined,
    capabilities: capabilities(options),
    policy: {
      retry: {
        maxAttempts: asMaxAttempts(1),
        onStatus: [429, 500, 502, 503, 504],
      },
    },
    params: createDefaultParams(),
    ...(providerType === 'openai' && {
      openAiApiSurface: options.openAiApiSurface ?? 'responses',
    }),
  };
}

export function createE2eProviderRegistry(
  options: E2eProviderRegistryOptions = {},
): E2eProviderRegistryMock {
  const primaryAlias = options.modelAlias ?? TEST_MODEL_ALIAS;
  const streamChunks = options.streamChunks ?? ['Hello', ' world'];
  const streamOptions: E2eStreamResultOptions = {
    chunks: streamChunks,
    hang: options.hangStream === true,
    ...options.streamOptions,
  };

  const provider: AIProvider = {
    complete: jest
      .fn()
      .mockResolvedValue(
        createDefaultCompleteResponse(options.completeResponse),
      ),
    stream: jest.fn().mockReturnValue(createStreamResult(streamOptions)),
  };

  const resolveMock = jest.fn((alias: string) =>
    buildResolvedConfig(alias, options, provider, primaryAlias),
  );

  return {
    provider,
    resolveMock,
    resolve: resolveMock,
    capabilities: capabilities(options),
    registerInstance: jest.fn(),
    list: jest.fn().mockReturnValue([]),
  };
}

export function createE2eOpenAiProviderRegistry(
  options: Omit<E2eProviderRegistryOptions, 'providerType'> = {},
): E2eProviderRegistryMock {
  return createE2eProviderRegistry({
    modelAlias: E2E_OPENAI_MODEL_ALIAS,
    providerName: E2E_OPENAI_PROVIDER_INSTANCE,
    modelId: 'gpt-4o',
    providerType: 'openai',
    openAiApiSurface: 'responses',
    ...options,
  });
}

export function createE2eFallbackProviderRegistry(options: {
  primaryAlias: string;
  fallbackAlias: string;
  fallbackText?: string;
}): E2eProviderRegistryMock {
  const primaryProvider: AIProvider = {
    complete: jest.fn().mockRejectedValue(
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
        usage: {
          inputTokens: TEST_INPUT_TOKENS,
          outputTokens: asOutputTokens(15),
        },
      }),
    ),
    stream: jest
      .fn()
      .mockReturnValue(createStreamResult({ chunks: ['fallback'] })),
  };

  const resolveMock = jest.fn((alias: string) => {
    const isFallback = alias === options.fallbackAlias;
    return {
      provider: isFallback ? fallbackProvider : primaryProvider,
      providerName: TEST_PROVIDER_INSTANCE_BRANDED,
      providerType: 'anthropic' as const,
      modelId: isFallback ? TEST_MODEL_ID : asModelId('claude-opus-4'),
      modelAlias: asModelAlias(alias),
      fallbackAlias:
        alias === options.primaryAlias
          ? asModelAlias(options.fallbackAlias)
          : undefined,
      capabilities: capabilities({}),
      policy: {
        retry: {
          maxAttempts: asMaxAttempts(1),
          onStatus: [429, 500, 502, 503, 504],
        },
      },
      params: createDefaultParams(),
    };
  });

  return {
    provider: primaryProvider,
    resolveMock,
    resolve: resolveMock,
    capabilities: capabilities(options),
    registerInstance: jest.fn(),
    list: jest.fn().mockReturnValue([]),
  };
}
