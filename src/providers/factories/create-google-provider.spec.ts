import { createGoogleProvider } from './create-google-provider';
import { LoggingService } from '../../logging/logging.service';
import { GoogleGenAI } from '@google/genai';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import type {
  ProviderChatInput,
  ProviderCallOptions,
} from '../interfaces/ai-provider.interface';
import { mapToolChoiceToGemini } from '../google/google-tools.mapper';
import { asProviderApiKey, asModelId } from '../../common/types/branded.types';

jest.mock('@google/genai');

describe('createGoogleProvider', () => {
  let mockLogger: Partial<LoggingService>;
  let mockGoogleClient: any;

  beforeEach(() => {
    mockLogger = createMockLoggingService();

    mockGoogleClient = {
      models: {
        generateContent: jest.fn(),
        generateContentStream: jest.fn(),
      },
    };

    (GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>).mockImplementation(
      () => mockGoogleClient,
    );
  });

  describe('google factory', () => {
    it('should throw when apiKey is empty', () => {
      expect(() =>
        createGoogleProvider(
          asProviderApiKey(''),
          mockLogger as LoggingService,
        ),
      ).toThrow('[createGoogleProvider] API key is required.');
    });

    it('should create provider with valid apiKey', () => {
      const provider = createGoogleProvider(
        asProviderApiKey('test-key'),
        mockLogger as LoggingService,
      );

      expect(provider).toBeDefined();
      expect(typeof provider.complete).toBe('function');
      expect(typeof provider.stream).toBe('function');
      expect(jest.mocked(mockLogger).info).toHaveBeenCalledWith(
        'Google provider instance created.',
      );
    });

    it('should create GoogleGenAI client with apiKey', () => {
      createGoogleProvider(
        asProviderApiKey('my-api-key'),
        mockLogger as LoggingService,
      );

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'my-api-key' });
    });
  });

  describe('complete', () => {
    let provider: ReturnType<typeof createGoogleProvider>;
    let input: ProviderChatInput;

    beforeEach(() => {
      provider = createGoogleProvider(
        asProviderApiKey('test-key'),
        mockLogger as LoggingService,
      );
      input = {
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are helpful',
      };
    });

    it('should call Google API with basic params', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        modelVersion: 'gemini-2.5-flash',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
        },
      });

      await provider.complete(input, asModelId('gemini-2.5-flash'));

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: expect.any(Array),
          config: expect.objectContaining({
            systemInstruction: 'You are helpful',
            maxOutputTokens: 1024,
          }),
        }),
      );
    });

    it('should map temperature option', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { temperature: 0.7 };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            temperature: 0.7,
          }),
        }),
      );
    });

    it('should pass abortSignal in config when options.signal is set', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });
      const signal = new AbortController().signal;

      await provider.complete(input, asModelId('gemini-2.5-flash'), { signal });

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            abortSignal: signal,
          }),
        }),
      );
    });

    it('should map topP and topK options', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { topP: 0.9, topK: 40 };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            topP: 0.9,
            topK: 40,
          }),
        }),
      );
    });

    it('should map stopSequences (array)', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { stop: ['STOP', 'END'] };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            stopSequences: ['STOP', 'END'],
          }),
        }),
      );
    });

    it('should map stopSequences (string)', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { stop: 'STOP' };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            stopSequences: ['STOP'],
          }),
        }),
      );
    });

    it('should map maxOutputTokens option', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { maxOutputTokens: 2048 };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            maxOutputTokens: 2048,
          }),
        }),
      );
    });

    it('should omit systemInstruction when system is empty or whitespace', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      await provider.complete(
        { messages: [{ role: 'user', content: 'Hello' }], system: '   ' },
        asModelId('gemini-2.5-flash'),
      );

      const call = mockGoogleClient.models.generateContent.mock.calls[0][0];
      expect(call.config.systemInstruction).toBeUndefined();
    });

    it('should map seed option', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { seed: 42 };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            seed: 42,
          }),
        }),
      );
    });

    it('should map responseFormat json_object', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: '{}',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        responseFormat: { type: 'json_object' },
      };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            response_format: 'application/json',
          }),
        }),
      );
    });

    it('should map responseFormat with jsonSchema', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: '{}',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        responseFormat: {
          type: 'json_object',
          jsonSchema: { type: 'object', properties: {} },
        },
      };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            response_schema: { type: 'object', properties: {} },
          }),
        }),
      );
    });

    it('should enable thinking for gemini-3.x models', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
        thinkingBudget: 'high',
      };
      await provider.complete(input, asModelId('gemini-3.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            thinkingConfig: expect.objectContaining({
              includeThoughts: true,
              thinkingLevel: 'HIGH',
            }),
          }),
        }),
      );
    });

    it('should map thinkingBudget number to tokens', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
        thinkingBudget: 5000,
      };
      await provider.complete(input, asModelId('gemini-3.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            thinkingConfig: expect.objectContaining({
              includeThoughts: true,
              thinkingBudget: 5000,
              thinkingLevel: 'HIGH',
            }),
          }),
        }),
      );
    });

    it('should default thinkingLevel to HIGH when thinkingEnabled without budget', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = { thinkingEnabled: true };
      await provider.complete(input, asModelId('gemini-3.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            thinkingConfig: expect.objectContaining({
              includeThoughts: true,
              thinkingLevel: 'HIGH',
            }),
          }),
        }),
      );
      const call = mockGoogleClient.models.generateContent.mock.calls[0][0];
      expect(call.config.thinkingConfig.thinkingBudget).toBeUndefined();
    });

    it('should map thinkingBudget string levels', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
        thinkingBudget: 'low',
      };
      await provider.complete(input, asModelId('gemini-3.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            thinkingConfig: expect.objectContaining({
              includeThoughts: true,
              thinkingLevel: 'LOW',
            }),
          }),
        }),
      );
    });

    it('should fallback unknown thinkingBudget string to HIGH', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
        thinkingBudget:
          'unknown-level' as ProviderCallOptions['thinkingBudget'],
      };
      await provider.complete(input, asModelId('gemini-3.5-flash'), options);

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            thinkingConfig: expect.objectContaining({
              thinkingLevel: 'HIGH',
            }),
          }),
        }),
      );
    });

    it('should warn when thinking requested for non-gemini-3 model', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const options: ProviderCallOptions = {
        thinkingEnabled: true,
      };
      await provider.complete(input, asModelId('gemini-2.5-flash'), options);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ThinkingConfig requested but model does not support it.',
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        }),
      );
    });

    it('should handle tools in request', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: '',
        functionCalls: [{ id: 'call_1', name: 'weather', args: {} }],
        usageMetadata: {},
      });

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
      };

      const result = await provider.complete(
        inputWithTools,
        asModelId('gemini-2.5-flash'),
      );

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            tools: expect.any(Array),
          }),
        }),
      );
      expect(result.toolCalls).toBeDefined();
    });

    it('should map tool_choice in tools request', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: '',
        functionCalls: [{ id: 'call_1', name: 'weather', args: {} }],
        usageMetadata: {},
      });

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
        toolChoice: 'required',
      };

      await provider.complete(inputWithTools, asModelId('gemini-2.5-flash'));

      expect(mockGoogleClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            toolConfig: {
              functionCallingConfig: mapToolChoiceToGemini('required'),
            },
          }),
        }),
      );
    });

    it('should return thinkingContent when response includes thoughts', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Answer',
        thoughts: 'Reasoning...',
        usageMetadata: {},
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-3.5-flash'),
        {
          thinkingEnabled: true,
        },
      );

      expect(result.thinkingContent).toBe('Reasoning...');
    });

    it('should join array thoughts into thinkingContent', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Answer',
        thoughts: ['Step 1', 'Step 2'],
        usageMetadata: {},
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-3.5-flash'),
        {
          thinkingEnabled: true,
        },
      );

      expect(result.thinkingContent).toBe('Step 1\nStep 2');
    });

    it('should read thinkingContent field when thoughts is absent', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Answer',
        thinkingContent: 'Reasoning...',
        usageMetadata: {},
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-3.5-flash'),
        {
          thinkingEnabled: true,
        },
      );

      expect(result.thinkingContent).toBe('Reasoning...');
    });

    it('should return parsed response', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hello there!',
        modelVersion: 'gemini-2.5-flash',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
        },
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-2.5-flash'),
      );

      expect(result).toEqual({
        text: 'Hello there!',
        model: 'gemini-2.5-flash',
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    });

    it('should fallback model to modelId when modelVersion is missing', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        usageMetadata: {},
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-2.5-flash'),
      );

      expect(result.model).toBe('gemini-2.5-flash');
    });

    it('should return undefined usage when usageMetadata is missing', async () => {
      mockGoogleClient.models.generateContent.mockResolvedValue({
        text: 'Hi!',
        modelVersion: 'gemini-2.5-flash',
      });

      const result = await provider.complete(
        input,
        asModelId('gemini-2.5-flash'),
      );

      expect(result.usage).toBeUndefined();
    });

    it('should throw HttpException on Google error', async () => {
      const error = new Error('API error');
      mockGoogleClient.models.generateContent.mockRejectedValue(error);

      await expect(
        provider.complete(input, asModelId('gemini-2.5-flash')),
      ).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('stream', () => {
    let provider: ReturnType<typeof createGoogleProvider>;
    let input: ProviderChatInput;

    beforeEach(() => {
      provider = createGoogleProvider(
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
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      expect(result.textStream).toBeDefined();
      expect(result.getUsageMetadata).toBeDefined();
      expect(result.getFinalToolCalls).toBeDefined();
      expect(result.getStopReason).toBeDefined();
      expect(result.getThinkingContent).toBeDefined();
    });

    it('should stream text chunks', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: {} };
          yield { text: ' world', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));
      const chunks: string[] = [];

      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should return usage metadata from last chunk', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: { promptTokenCount: 10 } };
          yield {
            text: ' world',
            modelVersion: 'gemini-2.5-flash',
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 15,
            },
          };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const metadata = await result.getUsageMetadata();

      expect(metadata).toEqual({
        inputTokens: 10,
        outputTokens: 15,
        model: 'gemini-2.5-flash',
      });
    });

    it('should return undefined from getUsageMetadata before stream starts', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));
      const metadata = await result.getUsageMetadata();

      expect(metadata).toBeUndefined();
    });

    it('should return undefined from getUsageMetadata when last chunk has no metadata', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello' };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const metadata = await result.getUsageMetadata();

      expect(metadata).toBeUndefined();
    });

    it('should ignore chunks without text', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { thoughts: 'thinking', usageMetadata: {} };
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));
      const chunks: string[] = [];

      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello']);
    });

    it('should throw on stream error', async () => {
      mockGoogleClient.models.generateContentStream.mockRejectedValue(
        new Error('stream failed'),
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      await expect(async () => {
        for await (const chunk of result.textStream) {
          void chunk;
        }
      }).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error streaming',
        expect.objectContaining({
          message: 'stream failed',
          model: 'gemini-2.5-flash',
        }),
      );
    });

    it('should warn when thinking requested for non-gemini-3 model during stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'), {
        thinkingEnabled: true,
      });

      for await (const chunk of result.textStream) {
        void chunk;
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ThinkingConfig requested but model does not support it.',
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        }),
      );
    });

    it('should include tools in stream params when tools present', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield {
            text: '',
            functionCalls: [{ id: 'call_1', name: 'weather', args: {} }],
            usageMetadata: {},
          };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const inputWithTools: ProviderChatInput = {
        ...input,
        tools: [{ name: 'weather', parameters: {} }],
        toolChoice: 'required',
      };

      const result = provider.stream!(
        inputWithTools,
        asModelId('gemini-2.5-flash'),
      );

      for await (const chunk of result.textStream) {
        void chunk;
      }

      expect(
        mockGoogleClient.models.generateContentStream,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            tools: expect.any(Array),
            toolConfig: {
              functionCallingConfig: mapToolChoiceToGemini('required'),
            },
          }),
        }),
      );

      const toolCalls = await result.getFinalToolCalls!();
      expect(toolCalls).toBeDefined();
      expect(toolCalls!.length).toBeGreaterThan(0);
    });

    it('should return stop reason after stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield {
            text: 'Done',
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
          };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const stopReason = await result.getStopReason!();

      expect(stopReason).toBe('end_turn');
    });

    it('should return thinking content after stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Answer', thoughts: 'Reasoning part 1' };
          yield { thoughts: 'Reasoning part 2' };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-3.5-flash'), {
        thinkingEnabled: true,
      });

      for await (const chunk of result.textStream) {
        void chunk;
      }

      const thinkingContent = await result.getThinkingContent!();

      expect(thinkingContent).toBe('Reasoning part 1\nReasoning part 2');
    });

    it('should return undefined from stream helpers before stream starts', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const result = provider.stream!(input, asModelId('gemini-2.5-flash'));

      await expect(result.getFinalToolCalls!()).resolves.toBeUndefined();
      await expect(result.getStopReason!()).resolves.toBeUndefined();
      await expect(result.getThinkingContent!()).resolves.toBeUndefined();
    });

    it('should map stream options including thinking config', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: function* () {
          yield { text: 'Hello', usageMetadata: {} };
        },
      };

      mockGoogleClient.models.generateContentStream.mockResolvedValue(
        mockStream,
      );

      const options: ProviderCallOptions = {
        temperature: 0.5,
        maxOutputTokens: 2048,
        thinkingEnabled: true,
        thinkingBudget: 'medium',
      };

      const result = provider.stream!(
        input,
        asModelId('gemini-3.5-flash'),
        options,
      );

      for await (const chunk of result.textStream) {
        void chunk;
      }

      expect(
        mockGoogleClient.models.generateContentStream,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            temperature: 0.5,
            maxOutputTokens: 2048,
            thinkingConfig: expect.objectContaining({
              includeThoughts: true,
              thinkingLevel: 'MEDIUM',
            }),
          }),
        }),
      );
    });
  });
});
