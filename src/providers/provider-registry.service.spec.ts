import { Test } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistryService } from './provider-registry.service';
import { LoggingService } from '../logging/logging.service';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { UnsupportedProviderException } from '../common/exceptions/unsupported-provider.exception';
import { RETRY_POLICY_DEFAULTS } from '../common/retry-policy-defaults';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockAIProvider } from '../common/mocks/createMockAIProvider';
import type { AIProvider } from './interfaces/ai-provider.interface';

describe('ProviderRegistryService', () => {
  let service: ProviderRegistryService;
  let mockConfig: Partial<ConfigService>;
  let mockLogger: Partial<LoggingService>;
  let mockProvider: Partial<AIProvider>;

  beforeEach(async () => {
    mockConfig = {
      get: jest.fn(),
    };

    mockLogger = createMockLoggingService();

    mockProvider = createMockAIProvider();

    const module = await Test.createTestingModule({
      providers: [
        ProviderRegistryService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ProviderRegistryService);
  });

  it('should create a scoped logger on construction', () => {
    expect(mockLogger.child).toHaveBeenCalledWith({
      module: 'ProviderRegistryService',
    });
  });

  describe('registerInstance', () => {
    it('should register provider instance', () => {
      service.registerInstance(
        'anthropic-primary',
        'anthropic',
        mockProvider as AIProvider,
      );

      expect(service.list()).toEqual(['anthropic-primary']);
    });

    it('should overwrite existing instance on re-register', () => {
      const firstProvider = { complete: jest.fn() } as AIProvider;
      const secondProvider = { complete: jest.fn() } as AIProvider;

      service.registerInstance('anthropic-primary', 'anthropic', firstProvider);
      service.registerInstance(
        'anthropic-primary',
        'anthropic',
        secondProvider,
      );

      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      expect(service.resolve('test-model').provider).toBe(secondProvider);
    });

    it('should register multiple instances', () => {
      service.registerInstance(
        'anthropic-1',
        'anthropic',
        mockProvider as AIProvider,
      );
      service.registerInstance(
        'google-1',
        'google',
        mockProvider as AIProvider,
      );

      expect(service.list()).toEqual(
        expect.arrayContaining(['anthropic-1', 'google-1']),
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no instances registered', () => {
      expect(service.list()).toEqual([]);
    });

    it('should return registered instance ids', () => {
      service.registerInstance(
        'anthropic-primary',
        'anthropic',
        mockProvider as AIProvider,
      );

      expect(service.list()).toEqual(['anthropic-primary']);
    });
  });

  describe('resolve', () => {
    beforeEach(() => {
      service.registerInstance(
        'anthropic-primary',
        'anthropic',
        mockProvider as AIProvider,
      );

      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            policy: {
              timeoutMs: 30000,
              retry: { maxAttempts: 3, onStatus: [429, 500] },
              params: {
                defaults: { temperature: 0.7 },
                allowOverrides: ['temperature'],
                bounds: {},
              },
            },
            capabilities: {
              tools: true,
            },
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
        },
      });
    });

    it('should resolve model alias to config', () => {
      const result = service.resolve('test-model');

      expect(mockConfig.get).toHaveBeenCalledWith('gateway');
      expect(result.modelAlias).toBe('test-model');
      expect(result.modelId).toBe('claude-sonnet-4-5');
      expect(result.providerName).toBe('anthropic-primary');
      expect(result.provider).toBe(mockProvider);
    });

    it('should include params config', () => {
      const result = service.resolve('test-model');

      expect(result.params).toEqual({
        defaults: { temperature: 0.7 },
        allowOverrides: ['temperature'],
        bounds: {},
      });
    });

    it('should include policy config', () => {
      const result = service.resolve('test-model');

      expect(result.policy).toEqual({
        timeoutMs: 30000,
        retry: { maxAttempts: 3, onStatus: [429, 500] },
      });
    });

    it('should apply retry policy defaults when values are omitted', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            policy: {
              retry: {},
            },
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.policy).toEqual({
        timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
        retry: {
          maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
          onStatus: RETRY_POLICY_DEFAULTS.onStatus,
        },
      });
    });

    it('should include timeoutMs without retry when retry block is absent', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            policy: {
              timeoutMs: 5000,
            },
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.policy).toEqual({
        timeoutMs: 5000,
        retry: undefined,
      });
    });

    it('should default only omitted retry fields', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            policy: {
              timeoutMs: 15000,
              retry: { maxAttempts: 2 },
            },
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.policy).toEqual({
        timeoutMs: 15000,
        retry: {
          maxAttempts: 2,
          onStatus: RETRY_POLICY_DEFAULTS.onStatus,
        },
      });
    });

    it('should include capabilities', () => {
      const result = service.resolve('test-model');

      expect(result.capabilities).toEqual({
        tools: true,
      });
    });

    it('should throw when model alias not found', () => {
      expect(() => service.resolve('nonexistent')).toThrow(HttpException);

      try {
        service.resolve('nonexistent');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect((e as HttpException).getResponse()).toMatchObject({
          code: ApiErrorCode.MODEL_ALIAS_NOT_FOUND,
          message: expect.stringContaining('nonexistent'),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Model alias not found in config:',
        { modelAlias: 'nonexistent' },
      );
    });

    it('should throw when provider instance missing from config', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'test',
            providerInstance: 'nonexistent-provider',
            policy: {},
          },
        },
        providers: {},
      });

      expect(() => service.resolve('test-model')).toThrow(HttpException);

      try {
        service.resolve('test-model');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect((e as HttpException).getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: expect.stringContaining('nonexistent-provider'),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Provider instance not found in config:',
        { providerInstance: 'nonexistent-provider' },
      );
    });

    it('should throw when provider instance not registered', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'test',
            providerInstance: 'unregistered-provider',
            policy: {},
          },
        },
        providers: {
          'unregistered-provider': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      expect(() => service.resolve('test-model')).toThrow(
        UnsupportedProviderException,
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Provider instance not registered:',
        { instanceId: 'unregistered-provider', type: 'anthropic' },
      );
    });

    it('should throw when gateway config missing', () => {
      (mockConfig.get as jest.Mock).mockReturnValue(undefined);

      expect(() => service.resolve('test-model')).toThrow(
        InternalServerErrorException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Gateway config not found.',
        expect.any(Error),
      );
    });

    it('should throw when registered provider type mismatches config', () => {
      service.registerInstance(
        'anthropic-primary',
        'google',
        mockProvider as AIProvider,
      );

      expect(() => service.resolve('test-model')).toThrow(
        InternalServerErrorException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Provider instance type mismatch:',
        expect.objectContaining({
          name: 'ProviderInstanceTypeMismatch',
        }),
      );
    });

    it('should include fallbackAlias when configured', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            fallback: 'fallback-model',
            policy: {},
          },
          'fallback-model': {
            modelId: 'claude-haiku',
            providerInstance: 'anthropic-primary',
            policy: {},
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.fallbackAlias).toBe('fallback-model');
    });

    it('should omit fallbackAlias when model has no fallback configured', () => {
      const result = service.resolve('test-model');

      expect(result.fallbackAlias).toBeUndefined();
    });

    it('should omit fallbackAlias when fallback alias is missing from config', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'claude-sonnet-4-5',
            providerInstance: 'anthropic-primary',
            fallback: 'missing-fallback',
            policy: {},
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.fallbackAlias).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Fallback alias not found in config:',
        { modelAlias: 'test-model', fallback: 'missing-fallback' },
      );
    });

    it('should default capabilities when not configured', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'test',
            providerInstance: 'anthropic-primary',
            policy: {},
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.capabilities).toEqual({});
    });

    it('should omit policy when model has no policy block', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        models: {
          'test-model': {
            modelId: 'test',
            providerInstance: 'anthropic-primary',
          },
        },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
          },
        },
      });

      const result = service.resolve('test-model');

      expect(result.policy).toBeUndefined();
      expect(result.params).toBeUndefined();
    });
  });
});
