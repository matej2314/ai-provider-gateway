import OpenAI from 'openai';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createChatCompletionsAdapter } from '../openai/adapters/chat-completions.adapter';
import { createResponsesAdapter } from '../openai/adapters/responses.adapter';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';

jest.mock('openai');
jest.mock('../openai/adapters/chat-completions.adapter');
jest.mock('../openai/adapters/responses.adapter');

describe('createOpenAiProviderCore', () => {
  const logger = createMockLoggingService() as never;
  const baseConfig = {
    apiKey: 'sk-test',
    baseUrl: 'https://api.openai.com/v1',
    apiSurface: 'auto' as const,
  };

  const chatComplete = jest.fn();
  const chatStream = jest.fn();
  const responsesComplete = jest.fn();
  const responsesStream = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createChatCompletionsAdapter as jest.Mock).mockReturnValue({
      complete: chatComplete,
      stream: chatStream,
    });
    (createResponsesAdapter as jest.Mock).mockReturnValue({
      complete: responsesComplete,
      stream: responsesStream,
    });
  });

  it('throws for non-OpenAI provider type', () => {
    expect(() =>
      createOpenAiProviderCore(
        'anthropic',
        {
          apiKey: 'x',
          baseUrl: 'https://api.openai.com/v1',
          apiSurface: 'auto',
        },
        logger,
      ),
    ).toThrow(/Unsupported provider type/);
  });

  it('creates OpenAI client with baseURL', () => {
    createOpenAiProviderCore('openai', baseConfig, logger);
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
      }),
    );
  });

  describe('api surface routing', () => {
    const input = { messages: [{ role: 'user' as const, content: 'Hi' }] };

    it('routes gpt-4o to chat-completions adapter', async () => {
      const provider = createOpenAiProviderCore('openai', baseConfig, logger);
      await provider.complete(input, 'gpt-4o');
      expect(chatComplete).toHaveBeenCalled();
      expect(responsesComplete).not.toHaveBeenCalled();
    });

    it('routes thinkingEnabled to responses adapter', async () => {
      const provider = createOpenAiProviderCore('openai', baseConfig, logger);
      await provider.complete(input, 'gpt-4o', { thinkingEnabled: true });
      expect(responsesComplete).toHaveBeenCalled();
      expect(chatComplete).not.toHaveBeenCalled();
    });

    it('routes openai-compatible always to chat-completions adapter', async () => {
      const provider = createOpenAiProviderCore(
        'openai-compatible',
        { ...baseConfig, apiSurface: 'chat-completions' },
        logger,
      );
      await provider.complete(input, 'llama3.2', { thinkingEnabled: true });
      expect(chatComplete).toHaveBeenCalled();
      expect(responsesComplete).not.toHaveBeenCalled();
    });

    it('routes stream the same way as complete', () => {
      const provider = createOpenAiProviderCore('openai', baseConfig, logger);
      provider.stream?.(input, 'o3-mini');
      expect(responsesStream).toHaveBeenCalled();
      expect(chatStream).not.toHaveBeenCalled();
    });
  });
});
