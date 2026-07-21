import { HttpException, HttpStatus } from '@nestjs/common';
import { resolveProviderCallOptions } from './resolve-provider-call-options';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { GatewayParamsConfig } from '../../config/configuration';
import type { ChatParamsDto } from '../dto/chat-params.dto';

describe('resolveProviderCallOptions', () => {
  describe('Happy path - defaults only', () => {
    it('should return defaults when no overrides provided', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        allowOverrides: [],
        bounds: {},
      };

      const result = resolveProviderCallOptions(policy, undefined);

      expect(result).toEqual({
        temperature: 0.7,
        maxOutputTokens: 1024,
      });
    });

    it('should return empty object when no policy and no overrides', () => {
      const result = resolveProviderCallOptions(undefined, undefined);
      expect(result).toEqual({});
    });

    it('should return all defaults including new parameters', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.3,
          seed: 42,
          thinkingEnabled: false,
        },
        allowOverrides: [],
        bounds: {},
      };

      const result = resolveProviderCallOptions(policy, undefined);

      expect(result).toEqual({
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
        seed: 42,
        thinkingEnabled: false,
      });
    });
  });

  describe('Happy path - overrides allowed', () => {
    it('should apply numeric overrides when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7, maxOutputTokens: 1024 },
        allowOverrides: ['temperature', 'maxOutputTokens'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0.9,
        maxOutputTokens: 2048,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(0.9);
      expect(result.maxOutputTokens).toBe(2048);
    });

    it('should apply stop sequences override (string and array)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };

      const resultString = resolveProviderCallOptions(policy, { stop: '\n\n' });
      expect(resultString.stop).toBe('\n\n');

      const resultArray = resolveProviderCallOptions(policy, {
        stop: ['\n\n', '###'],
      });
      expect(resultArray.stop).toEqual(['\n\n', '###']);
    });

    it('should apply thinking mode overrides', () => {
      const policy: GatewayParamsConfig = {
        defaults: { thinkingEnabled: false, maxOutputTokens: 4096 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 2048,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingEnabled).toBe(true);
      expect(result.thinkingBudget).toBe(2048);
      expect(result.maxOutputTokens).toBe(4096);
    });

    it('should apply thinkingBudget with string effort level', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingBudget: 'high' };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingBudget).toBe('high');
    });

    it('should apply multiple overrides simultaneously', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          temperature: 0.5,
          maxOutputTokens: 512,
        },
        allowOverrides: [
          'temperature',
          'maxOutputTokens',
          'topP',
          'stop',
          'seed',
        ],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0.9,
        maxOutputTokens: 2048,
        topP: 0.95,
        stop: ['\n\n'],
        seed: 999,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        temperature: 0.9,
        maxOutputTokens: 2048,
        topP: 0.95,
        stop: ['\n\n'],
        seed: 999,
      });
    });
  });

  describe('Override validation', () => {
    it('should throw when override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7 },
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { temperature: 0.9 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );

      try {
        resolveProviderCallOptions(policy, bodyParams);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        const error = e as HttpException;
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toMatchObject({
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message: 'Parameter temperature is not allowed for this model alias',
        });
      }
    });

    it('should throw for multiple disallowed overrides', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const disallowedParams = [
        { topP: 0.95 },
        { stop: '\n\n' },
        { frequencyPenalty: 0.5 },
        { seed: 42 },
        { responseFormat: { type: 'json_object' } },
        { thinkingEnabled: true },
      ];

      disallowedParams.forEach((params) => {
        expect(() =>
          resolveProviderCallOptions(policy, params as ChatParamsDto),
        ).toThrow(HttpException);
      });
    });

    it('should allow some overrides while blocking others', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7, maxOutputTokens: 1024 },
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0.9,
        maxOutputTokens: 2048,
      };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });
  });

  describe('Bounds clamping', () => {
    it('should clamp numeric parameters to min/max bounds', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature', 'maxOutputTokens'],
        bounds: {
          temperature: { min: 0.5, max: 1.5 },
          maxOutputTokens: { min: 100, max: 4096 },
        },
      };

      const resultMin = resolveProviderCallOptions(policy, {
        temperature: 0.1,
        maxOutputTokens: 10,
      });
      expect(resultMin.temperature).toBe(0.5);
      expect(resultMin.maxOutputTokens).toBe(100);

      const resultMax = resolveProviderCallOptions(policy, {
        temperature: 2.0,
        maxOutputTokens: 10000,
      });
      expect(resultMax.temperature).toBe(1.5);
      expect(resultMax.maxOutputTokens).toBe(4096);
    });

    it('should clamp multiple parameters simultaneously', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature', 'maxOutputTokens', 'topP'],
        bounds: {
          temperature: { min: 0.3, max: 1.2 },
          maxOutputTokens: { min: 256, max: 2048 },
          topP: { min: 0.5, max: 0.95 },
        },
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0.1,
        maxOutputTokens: 5000,
        topP: 0.3,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        temperature: 0.3,
        maxOutputTokens: 2048,
        topP: 0.5,
      });
    });

    it('should not clamp when bounds not defined for parameter', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature', 'topP'],
        bounds: {
          temperature: { min: 0.5, max: 1.5 },
        },
      };
      const bodyParams: ChatParamsDto = { temperature: 2.0, topP: 0.99 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(1.5);
      expect(result.topP).toBe(0.99);
    });
  });

  describe('Thinking mode validation', () => {
    it('should allow thinking mode with sufficient maxOutputTokens', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 4096 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 2048,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingEnabled).toBe(true);
      expect(result.thinkingBudget).toBe(2048);
      expect(result.maxOutputTokens).toBe(4096);
    });

    it('should throw when maxOutputTokens insufficient for thinking budget', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 1024 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 2048,
      };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );

      try {
        resolveProviderCallOptions(policy, bodyParams);
      } catch (e) {
        const error = e as HttpException;
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: expect.stringContaining(
            'maxOutputTokens (1024) is insufficient for thinking mode',
          ),
        });
      }
    });

    it('should require minimum buffer between budget and maxOutputTokens', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 2048 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 2048,
      };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should not validate when thinkingBudget is string effort level', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 512 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 'medium',
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingEnabled).toBe(true);
      expect(result.thinkingBudget).toBe('medium');
    });

    it('should not validate when thinkingEnabled is false', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 512 },
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: false,
        thinkingBudget: 2048,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingEnabled).toBe(false);
      expect(result.thinkingBudget).toBe(2048);
    });
  });

  describe('Edge cases', () => {
    it('should ignore undefined overrides', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7 },
        allowOverrides: ['temperature', 'maxOutputTokens'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: undefined,
        maxOutputTokens: undefined,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({ temperature: 0.7 });
    });

    it('should handle empty params object', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7, maxOutputTokens: 1024 },
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {};

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        temperature: 0.7,
        maxOutputTokens: 1024,
      });
    });

    it('should handle zero values correctly (not treated as undefined)', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7, frequencyPenalty: 0.5 },
        allowOverrides: ['temperature', 'frequencyPenalty', 'seed'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0,
        frequencyPenalty: 0,
        seed: 0,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(0);
      expect(result.frequencyPenalty).toBe(0);
      expect(result.seed).toBe(0);
    });

    it('should handle empty stop sequences', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };

      const resultEmptyString = resolveProviderCallOptions(policy, {
        stop: '',
      });
      expect(resultEmptyString.stop).toBe('');

      const resultEmptyArray = resolveProviderCallOptions(policy, { stop: [] });
      expect(resultEmptyArray.stop).toEqual([]);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle full production config with all parameters', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
        },
        allowOverrides: [
          'temperature',
          'maxOutputTokens',
          'topP',
          'stop',
          'frequencyPenalty',
          'presencePenalty',
          'seed',
          'responseFormat',
          'thinkingEnabled',
          'thinkingBudget',
        ],
        bounds: {
          temperature: { min: 0.1, max: 1.5 },
          maxOutputTokens: { min: 100, max: 4096 },
          topP: { min: 0.1, max: 0.99 },
          frequencyPenalty: { min: -1.0, max: 1.0 },
          presencePenalty: { min: -1.0, max: 1.0 },
        },
      };
      const bodyParams: ChatParamsDto = {
        temperature: 0.85,
        maxOutputTokens: 3000,
        stop: ['\n\n', '###'],
        seed: 42,
        responseFormat: { type: 'json_object' },
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        temperature: 0.85,
        maxOutputTokens: 3000,
        topP: 0.9,
        stop: ['\n\n', '###'],
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        seed: 42,
        responseFormat: { type: 'json_object' },
      });
    });

    it('should merge defaults with partial overrides correctly', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
          seed: 123,
        },
        allowOverrides: ['temperature', 'stop'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        temperature: 1.0,
        stop: ['\n\n'],
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        temperature: 1.0,
        maxOutputTokens: 1024,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        seed: 123,
        stop: ['\n\n'],
      });
    });
  });
});
