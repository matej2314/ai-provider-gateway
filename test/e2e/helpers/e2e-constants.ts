import { API_GLOBAL_PREFIX } from '../../../src/setup.app';
import { TEST_GATEWAY_KEY } from '../../../src/common/mocks/test-constants';

export const E2E_GATEWAY_KEY = TEST_GATEWAY_KEY;
export const E2E_INVALID_GATEWAY_KEY = 'invalid_gateway_key';
export const E2E_API_PREFIX = `/${API_GLOBAL_PREFIX}`;

export const E2E_ROUTES = {
  chat: `${E2E_API_PREFIX}/chat`,
  chatStream: `${E2E_API_PREFIX}/chat/stream`,
  openAiCompletions: `${E2E_API_PREFIX}/openai/chat/completions`,
  openAiModels: `${E2E_API_PREFIX}/openai/models`,
  anthropicMessages: `${E2E_API_PREFIX}/anthropic/messages`,
  anthropicModels: `${E2E_API_PREFIX}/anthropic/models`,
  models: `${E2E_API_PREFIX}/models`,
} as const;

export const E2E_ANTHROPIC_USER_MESSAGE = {
  role: 'user' as const,
  content: [{ type: 'text' as const, text: 'Hello' }],
};

export function createAnthropicRequestBody(
  model: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    model,
    messages: [E2E_ANTHROPIC_USER_MESSAGE],
    max_tokens: 1024,
    ...overrides,
  };
}

/** NestJS defaults POST handlers to 201 Created unless @HttpCode(200) is set. */
export const E2E_POST_SUCCESS_STATUS = 201;
