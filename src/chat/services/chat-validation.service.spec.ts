import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatValidationService } from './chat-validation.service';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { createMockDefaultResolvedConfig } from '../../common/mocks/createMockResolvedProviderConfig';
import { createMockAIProvider } from '../../common/mocks/createMockAIProvider';
import { asModelId } from '../../common/types/branded.types';
import { TEST_MODEL_ALIAS } from '../../common/mocks/test-constants';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
import type { ChatRequestDto } from '../dto/chat-request.dto';

describe('ChatValidationService', () => {
  let service: ChatValidationService;
  let mockRegistry: Partial<ProviderRegistryService>;
  let mockLogger: Partial<LoggingService>;
  let resolvedConfig: ResolvedProviderConfig;

  beforeEach(async () => {
    resolvedConfig = createMockDefaultResolvedConfig();
    mockRegistry = {
      resolve: jest.fn().mockReturnValue(resolvedConfig),
    };
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        ChatValidationService,
        { provide: ProviderRegistryService, useValue: mockRegistry },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ChatValidationService);
  });

  describe('validateTooling', () => {
    const baseRequest: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'Hi' }],
    };

    describe('Happy path', () => {
      it('should not throw for non-tooling request', () => {
        expect(() =>
          service.validateTooling(baseRequest, resolvedConfig),
        ).not.toThrow();
      });

      it('should not throw when tooling request and model supports tools', () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          tooling: {
            definitions: [{ name: 'get_weather', parameters: {} }],
          },
        };

        expect(() =>
          service.validateTooling(request, resolvedConfig),
        ).not.toThrow();
      });

      it('should not throw when message contains toolCalls and model supports tools', () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          messages: [
            {
              role: 'assistant',
              content: '',
              toolCalls: [
                {
                  id: 'tc_1',
                  name: 'get_weather',
                  arguments: '{}',
                },
              ],
            },
          ],
        };

        expect(() =>
          service.validateTooling(request, resolvedConfig),
        ).not.toThrow();
      });
    });

    describe('Errors', () => {
      it('should throw TOOLS_NOT_SUPPORTED when tooling request and capabilities.tools is false', () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          tooling: {
            definitions: [{ name: 'get_weather', parameters: {} }],
          },
        };
        const configWithoutTools: ResolvedProviderConfig = {
          ...resolvedConfig,
          capabilities: { tools: false, streaming: true },
        };

        try {
          service.validateTooling(request, configWithoutTools);
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
            message: 'Tools are not supported for this model alias.',
            details: [],
          });
        }
      });

      it('should throw TOOLS_NOT_SUPPORTED when capabilities is undefined', () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          tooling: {
            definitions: [{ name: 'get_weather', parameters: {} }],
          },
        };
        const configNoCapabilities = {
          ...resolvedConfig,
          capabilities: undefined,
        } as unknown as ResolvedProviderConfig;

        expect(() =>
          service.validateTooling(request, configNoCapabilities),
        ).toThrow(HttpException);
      });
    });

    describe('Edge cases', () => {
      it('should not throw when tooling.definitions is empty array', () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          tooling: { definitions: [] },
        };

        expect(() =>
          service.validateTooling(request, resolvedConfig),
        ).not.toThrow();
      });

      it('should not throw when tooling object exists but definitions missing', () => {
        const request = {
          ...baseRequest,
          tooling: {},
        } as ChatRequestDto;

        expect(() =>
          service.validateTooling(request, resolvedConfig),
        ).not.toThrow();
      });
    });
  });

  describe('validateThinking', () => {
    describe('Happy path', () => {
      it('should pass when thinkingEnabled is false', () => {
        const options = { thinkingEnabled: false };

        expect(() =>
          service.validateThinking(resolvedConfig, options),
        ).not.toThrow();
      });

      it('should pass when thinkingEnabled is true and capability is true', () => {
        const configWithThinking: ResolvedProviderConfig = {
          ...resolvedConfig,
          capabilities: { tools: true, streaming: true, thinking: true },
        };
        const options = { thinkingEnabled: true };

        expect(() =>
          service.validateThinking(configWithThinking, options),
        ).not.toThrow();
      });
    });

    describe('Errors', () => {
      it('should throw THINKING_NOT_SUPPORTED when thinkingEnabled is true but capability is false', () => {
        const configWithoutThinking: ResolvedProviderConfig = {
          ...resolvedConfig,
          capabilities: { tools: true, streaming: true, thinking: false },
        };
        const options = { thinkingEnabled: true };

        try {
          service.validateThinking(configWithoutThinking, options);
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.THINKING_NOT_SUPPORTED,
            message: 'Extended thinking is not supported for this model alias.',
            details: [],
          });
        }
      });

      it('should throw THINKING_NOT_SUPPORTED when thinkingEnabled is true but capability is undefined', () => {
        const configNoThinking = {
          ...resolvedConfig,
          capabilities: {},
        } as unknown as ResolvedProviderConfig;
        const options = { thinkingEnabled: true };

        try {
          service.validateThinking(configNoThinking, options);
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.THINKING_NOT_SUPPORTED,
            message: 'Extended thinking is not supported for this model alias.',
            details: [],
          });
        }
      });

      it('should throw THINKING_NOT_SUPPORTED for openai implicit string effort without capability', () => {
        const configOpenAi: ResolvedProviderConfig = {
          ...resolvedConfig,
          providerType: 'openai',
          capabilities: { streaming: true, thinking: false },
        };

        try {
          service.validateThinking(configOpenAi, { thinkingBudget: 'high' });
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.THINKING_NOT_SUPPORTED,
            message: 'Extended thinking is not supported for this model alias.',
            details: [],
          });
        }
      });

      it('should pass for openai o3-mini without thinking params', () => {
        const configOpenAi: ResolvedProviderConfig = {
          ...resolvedConfig,
          providerType: 'openai',
          modelId: asModelId('o3-mini'),
          capabilities: { streaming: true, thinking: false },
        };

        expect(() => service.validateThinking(configOpenAi, {})).not.toThrow();
      });
    });
  });

  describe('validateForStreaming', () => {
    describe('Happy path', () => {
      it('should return resolved config when streaming is supported and adapter exists', () => {
        const result = service.validateForStreaming(TEST_MODEL_ALIAS);

        expect(mockRegistry.resolve).toHaveBeenCalledWith(TEST_MODEL_ALIAS);
        expect(result).toBe(resolvedConfig);
      });
    });

    describe('Errors', () => {
      it('should throw STREAMING_NOT_SUPPORTED when capabilities.streaming is false', () => {
        (mockRegistry.resolve as jest.Mock).mockReturnValue({
          ...resolvedConfig,
          capabilities: { tools: true, streaming: false },
        });

        try {
          service.validateForStreaming(TEST_MODEL_ALIAS);
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
            message: 'Streaming not supported for this model.',
            details: [],
          });
        }

        expect(mockLogger.child).toHaveBeenCalledWith({
          module: 'ChatValidationService',
          modelAlias: TEST_MODEL_ALIAS,
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Streaming not supported for this model',
          expect.objectContaining({
            provider: 'anthropic',
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          }),
        );
      });

      it('should throw when capabilities.streaming missing', () => {
        (mockRegistry.resolve as jest.Mock).mockReturnValue({
          ...resolvedConfig,
          capabilities: { tools: true },
        });

        expect(() => service.validateForStreaming(TEST_MODEL_ALIAS)).toThrow(
          HttpException,
        );
      });

      it('should throw when provider.stream adapter is missing', () => {
        const providerWithoutStream = createMockAIProvider();
        delete (providerWithoutStream as { stream?: unknown }).stream;

        (mockRegistry.resolve as jest.Mock).mockReturnValue({
          ...resolvedConfig,
          provider: providerWithoutStream,
        });

        try {
          service.validateForStreaming(TEST_MODEL_ALIAS);
          fail('Expected HttpException');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          const ex = error as HttpException;
          expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect(ex.getResponse()).toEqual({
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
            message: 'Streaming adapter not implemented for this provider.',
            details: [],
          });
        }

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Streaming adapter not implemented for this provider',
          expect.objectContaining({
            provider: 'anthropic',
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          }),
        );
      });
    });

    describe('Edge cases', () => {
      it('should propagate registry.resolve errors', () => {
        (mockRegistry.resolve as jest.Mock).mockImplementation(() => {
          throw new HttpException('Unknown model', HttpStatus.BAD_REQUEST);
        });

        expect(() => service.validateForStreaming('unknown-alias')).toThrow(
          HttpException,
        );
      });
    });
  });
});
