import OpenAI from 'openai';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createChatCompletionsAdapter } from '../openai/adapters/chat-completions.adapter';
import { createResponsesAdapter } from '../openai/adapters/responses.adapter';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { asProviderApiKey, asModelId } from '../../common/types';

jest.mock('openai');
jest.mock('../openai/adapters/chat-completions.adapter');
jest.mock('../openai/adapters/responses.adapter');

describe('createOpenAiProviderCore', () => {
  const logger = createMockLoggingService() as never;
  const baseConfig = {
    apiKey: asProviderApiKey('sk-test'),
    baseUrl: 'https://api.openai.com/v1',
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
          apiKey: asProviderApiKey('x'),
          baseUrl: 'https://api.openai.com/v1',
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

  describe('provider type routing', () => {
    const input = { messages: [{ role: 'user' as const, content: 'Hi' }] };

    it('routes type openai always to responses adapter', async () => {
      const provider = createOpenAiProviderCore('openai', baseConfig, logger);
      await provider.complete(input, asModelId('gpt-4o'));
      expect(responsesComplete).toHaveBeenCalled();
      expect(chatComplete).not.toHaveBeenCalled();
    });

    it('routes type openai stream to responses adapter', () => {
      const provider = createOpenAiProviderCore('openai', baseConfig, logger);
      provider.stream?.(input, asModelId('o3-mini'));
      expect(responsesStream).toHaveBeenCalled();
      expect(chatStream).not.toHaveBeenCalled();
    });

    it('routes openai-compatible always to chat-completions adapter', async () => {
      const provider = createOpenAiProviderCore(
        'openai-compatible',
        baseConfig,
        logger,
      );
      await provider.complete(input, asModelId('llama3.2'), {
        thinkingEnabled: true,
      });
      expect(chatComplete).toHaveBeenCalled();
      expect(responsesComplete).not.toHaveBeenCalled();
    });

    it('routes openai-compatible stream to chat-completions adapter', () => {
      const provider = createOpenAiProviderCore(
        'openai-compatible',
        baseConfig,
        logger,
      );
      provider.stream?.(input, asModelId('llama3.2'));
      expect(chatStream).toHaveBeenCalled();
      expect(responsesStream).not.toHaveBeenCalled();
    });

    it('passes includeStreamUsage false for openai chat-completions adapter', () => {
      createOpenAiProviderCore('openai', baseConfig, logger);
      expect(createChatCompletionsAdapter).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { includeStreamUsage: false },
      );
    });

    it('passes includeStreamUsage true for openai-compatible chat-completions adapter', () => {
      createOpenAiProviderCore('openai-compatible', baseConfig, logger);
      expect(createChatCompletionsAdapter).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { includeStreamUsage: true },
      );
    });
  });
});
