import { createAnthropicProvider } from './create-anthropic-provider';
import { LoggingService } from '../../logging/logging.service';
import Anthropic from '@anthropic-ai/sdk';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { asProviderApiKey, asModelId } from '../../common/types';
import type {
  ProviderChatInput,
  ProviderCallOptions,
} from '../interfaces/ai-provider.interface';

jest.mock('@anthropic-ai/sdk');

describe('createAnthropicProvider', () => {
  let mockLogger: Partial<LoggingService>;
  let mockAnthropicClient: any;

  beforeEach(() => {
    mockLogger = createMockLoggingService();

    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
        stream: jest.fn(),
      },
    };

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => mockAnthropicClient,
    );
  });

  describe('anthropic factory', () => {
    it('should throw when apiKey empty', () => {
      expect(() =>
        createAnthropicProvider(
          asProviderApiKey(''),
          mockLogger as LoggingService,
        ),
      ).toThrow('[createAnthropicProvider] API key is required.');
    });

    it('should create provider with valid apiKey', () => {
      const provider = createAnthropicProvider(
        asProviderApiKey('test-key'),
        mockLogger as LoggingService,
      );

      expect(provider).toBeDefined();
      expect(typeof provider.complete).toBe('function');
      expect(typeof provider.stream).toBe('function');
      expect(jest.mocked(mockLogger).info).toHaveBeenCalledWith(
        'Anthropic provider instance created.',
      );
    });

    it('should create Anthropic client with apiKey', () => {
      createAnthropicProvider(
        asProviderApiKey('my-api-key'),
        mockLogger as LoggingService,
      );

      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'my-api-key' });
    });
  });

  describe('complete', () => {
    let provider: ReturnType<typeof createAnthropicProvider>;
    let input: ProviderChatInput;

    beforeEach(() => {
      provider = createAnthropicProvider(
        asProviderApiKey('test-key'),
        mockLogger as LoggingService,
      );
      input = {
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are helpful',
      };
    });

    it('should call Anthropic API with basic params', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg-123',
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await provider.complete(input, asModelId('claude-sonnet-4'));

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4',
          max_tokens: 1024,
          system: 'You are helpful',
          messages: expect.any(Array),
        }),
      );
    });

    it('should map temperature option', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { temperature: 0.7 };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        }),
      );
    });

    it('should map topP option', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { topP: 0.9 };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          top_p: 0.9,
        }),
      );
    });

    it('should map topK option', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { topK: 40 };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 40,
        }),
      );
    });

    it('should prefer topK over topP and temperature when multiple sampling params set', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = {
        topK: 40,
        topP: 0.9,
        temperature: 0.7,
      };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 40,
        }),
      );
      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('top_p');
      expect(callArgs).not.toHaveProperty('temperature');
    });

    it('should map stop sequences (array)', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { stop: ['STOP', 'END'] };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stop_sequences: ['STOP', 'END'],
        }),
      );
    });

    it('should map stop sequence (string)', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { stop: 'STOP' };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stop_sequences: ['STOP'],
        }),
      );
    });

    it('should map maxOutputTokens', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { maxOutputTokens: 2000 };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        }),
      );
    });

    it('should map metadata.userId', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const inputWithMetadata: ProviderChatInput = {
        ...input,
        metadata: { userId: 'user-123' },
      };

      await provider.complete(inputWithMetadata, asModelId('claude-sonnet-4'));

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { user_id: 'user-123' },
        }),
      );
    });

    it('should return parsed response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hello there!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.complete(
        input,
        asModelId('claude-sonnet-4'),
      );

      expect(result).toEqual({
        text: 'Hello there!',
        model: 'claude-sonnet-4',
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    });

    it('should concatenate multiple text blocks', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.complete(
        input,
        asModelId('claude-sonnet-4'),
      );

      expect(result.text).toBe('Hello world');
    });

    it('should return thinkingContent when response includes thinking blocks', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [
          { type: 'thinking', thinking: 'Let me think...' },
          { type: 'text', text: 'Answer' },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.complete(
        input,
        asModelId('claude-sonnet-4'),
      );

      expect(result.thinkingContent).toBe('Let me think...');
      expect(result.text).toBe('Answer');
    });

    it('should map thinkingEnabled to thinking param', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = { thinkingEnabled: true };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: {
            type: 'adaptive',
            display: 'summarized',
          },
        }),
      );
    });

    it('should map thinkingBudget number to thinking param', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: 'Hi!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
        thinkingBudget: 5000,
      };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: {
            type: 'enabled',
            budget_tokens: 5000,
            display: 'summarized',
          },
        }),
      );
    });

    it('should map responseFormat json_object to output_config', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [{ type: 'text', text: '{}' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const options: ProviderCallOptions = {
        responseFormat: { type: 'json_object' },
      };
      await provider.complete(input, asModelId('claude-sonnet-4'), options);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          output_config: {
            format: {
              type: 'json_schema',
              schema: { type: 'object', additionalProperties: true },
            },
          },
        }),
      );
    });

    it('should handle tools in request', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [
          { type: 'text', text: 'Let me check' },
          { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'tool_use',
      });

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
      };

      const result = await provider.complete(
        inputWithTools,
        asModelId('claude-sonnet-4'),
      );

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
        }),
      );
      expect(result.toolCalls).toBeDefined();
    });

    it('should map tool_choice in tools request', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        model: 'claude-sonnet-4',
        content: [
          { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'tool_use',
      });

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
        toolChoice: 'required',
      };

      await provider.complete(inputWithTools, asModelId('claude-sonnet-4'));

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_choice: { type: 'any' },
        }),
      );
    });

    it('should throw HttpException on Anthropic error', async () => {
      const error = new Error('API error');
      mockAnthropicClient.messages.create.mockRejectedValue(error);

      await expect(
        provider.complete(input, asModelId('claude-sonnet-4')),
      ).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should pass AbortSignal as request options when provided', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hi' }],
        model: 'claude-sonnet-4',
        usage: { input_tokens: 1, output_tokens: 1 },
      });
      const signal = new AbortController().signal;

      await provider.complete(input, asModelId('claude-sonnet-4'), { signal });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.any(Object),
        { signal },
      );
    });
  });

  describe('stream', () => {
    let provider: ReturnType<typeof createAnthropicProvider>;
    let input: ProviderChatInput;

    beforeEach(() => {
      provider = createAnthropicProvider(
        asProviderApiKey('test-key'),
        mockLogger as LoggingService,
      );
      input = {
        messages: [{ role: 'user', content: 'Hello' }],
      };
    });

    it('should return StreamResult with textStream', () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
        },
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      expect(result.textStream).toBeDefined();
      expect(result.getUsageMetadata).toBeDefined();
      expect(result.getUsageDetails).toBeDefined();
      expect(result.getFinalToolCalls).toBeDefined();
      expect(result.getStopReason).toBeDefined();
      expect(result.getThinkingContent).toBeDefined();
    });

    it('should stream text deltas', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' world' },
          };
        },
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));
      const chunks: string[] = [];

      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should return usage metadata after stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 15 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const metadata = await result.getUsageMetadata();

      expect(metadata).toEqual({
        inputTokens: 10,
        outputTokens: 15,
        model: 'claude-sonnet-4',
      });
    });

    it('should return usage details after stream when cache tokens present', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: {
            input_tokens: 10,
            output_tokens: 15,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 50,
          },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const usageDetails = await result.getUsageDetails!();

      expect(usageDetails).toEqual({
        promptCacheHitTokens: 100,
        promptCacheCreationTokens: 50,
      });
    });

    it('should return undefined from getUsageMetadata before stream starts', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
        },
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));
      const metadata = await result.getUsageMetadata();

      expect(metadata).toBeUndefined();
    });

    it('should return undefined from getUsageMetadata when finalMessage fails', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest
          .fn()
          .mockRejectedValue(new Error('finalMessage failed')),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const metadata = await result.getUsageMetadata();

      expect(metadata).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error getting stream usage metadata',
        expect.objectContaining({
          message: 'finalMessage failed',
        }),
      );
    });

    it('should ignore non-text_delta stream events', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { type: 'message_start', message: {} };
          yield {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta', partial_json: '{}' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
        },
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));
      const chunks: string[] = [];

      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello']);
    });

    it('should throw on stream error', async () => {
      mockAnthropicClient.messages.stream.mockImplementation(() => {
        throw new Error('stream failed');
      });

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      await expect(async () => {
        for await (const chunk of result.textStream) {
          void chunk;
        }
      }).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error streaming',
        expect.objectContaining({
          message: 'stream failed',
          model: 'claude-sonnet-4',
        }),
      );
    });

    it('should include tools in stream params when tools present', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [
            { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'tool_use',
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
        toolChoice: 'auto',
      };

      const result = provider.stream!(
        inputWithTools,
        asModelId('claude-sonnet-4'),
      );

      for await (const chunk of result.textStream) {
        void chunk;
      }

      expect(mockAnthropicClient.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
          tools: expect.any(Array),
          tool_choice: { type: 'auto' },
        }),
      );

      const toolCalls = await result.getFinalToolCalls!();
      expect(toolCalls).toBeDefined();
      expect(toolCalls!.length).toBeGreaterThan(0);
    });

    it('should return stop reason after stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [{ type: 'text', text: 'Done' }],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const stopReason = await result.getStopReason!();

      expect(stopReason).toBe('end_turn');
    });

    it('should return thinking content after stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [
            { type: 'thinking', thinking: 'Reasoning...' },
            { type: 'text', text: 'Answer' },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const thinkingContent = await result.getThinkingContent!();

      expect(thinkingContent).toBe('Reasoning...');
    });

    it('should return undefined from stream helpers before stream starts', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const result = provider.stream!(input, asModelId('claude-sonnet-4'));

      await expect(result.getFinalToolCalls!()).resolves.toBeUndefined();
      await expect(result.getStopReason!()).resolves.toBeUndefined();
      await expect(result.getThinkingContent!()).resolves.toBeUndefined();
    });

    it('should map stream options including thinking and metadata', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {},
        finalMessage: jest.fn().mockResolvedValue({
          model: 'claude-sonnet-4',
          content: [],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      mockAnthropicClient.messages.stream.mockReturnValue(mockStream);

      const inputWithMetadata: ProviderChatInput = {
        ...input,
        metadata: { userId: 42 },
      };
      const options: ProviderCallOptions = {
        temperature: 0.5,
        maxOutputTokens: 2048,
        thinkingEnabled: true,
      };

      const result = provider.stream!(
        inputWithMetadata,
        asModelId('claude-sonnet-4'),
        options,
      );

      for await (const chunk of result.textStream) {
        void chunk;
      }

      expect(mockAnthropicClient.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
          max_tokens: 2048,
          temperature: 0.5,
          metadata: { user_id: '42' },
          thinking: {
            type: 'adaptive',
            display: 'summarized',
          },
        }),
      );
    });
  });
});
