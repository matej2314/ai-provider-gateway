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
    it('should apply temperature override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { temperature: 0.7 },
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { temperature: 0.9 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(0.9);
    });

    it('should apply maxOutputTokens override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 1024 },
        allowOverrides: ['maxOutputTokens'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { maxOutputTokens: 2048 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.maxOutputTokens).toBe(2048);
    });

    it('should apply topP override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { topP: 0.9 },
        allowOverrides: ['topP'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topP: 0.95 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.topP).toBe(0.95);
    });

    it('should apply stop sequences override (string)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { stop: '\n\n' };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.stop).toBe('\n\n');
    });

    it('should apply stop sequences override (array)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { stop: ['\n\n', '###', 'END'] };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.stop).toEqual(['\n\n', '###', 'END']);
    });

    it('should apply frequencyPenalty override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { frequencyPenalty: 0.0 },
        allowOverrides: ['frequencyPenalty'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { frequencyPenalty: 0.8 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.frequencyPenalty).toBe(0.8);
    });

    it('should apply presencePenalty override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { presencePenalty: 0.0 },
        allowOverrides: ['presencePenalty'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { presencePenalty: 1.2 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.presencePenalty).toBe(1.2);
    });

    it('should apply seed override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['seed'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { seed: 12345 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.seed).toBe(12345);
    });

    it('should apply topK override when allowed (Anthropic/Google)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['topK'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topK: 40 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.topK).toBe(40);
    });

    it('should apply responseFormat override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['responseFormat'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        responseFormat: { type: 'json_object' },
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.responseFormat).toEqual({ type: 'json_object' });
    });

    it('should apply thinkingEnabled override when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { thinkingEnabled: false },
        allowOverrides: ['thinkingEnabled'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingEnabled: true };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingEnabled).toBe(true);
    });

    it('should apply thinkingBudget override (string effort) when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingBudget: 'high' };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingBudget).toBe('high');
    });

    it('should apply thinkingBudget override (numeric tokens) when allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingBudget: 2048 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.thinkingBudget).toBe(2048);
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

  describe('Edge case - allowOverrides validation', () => {
    it('should throw when temperature override not allowed', () => {
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
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message: 'Parameter temperature is not allowed for this model alias',
        });
      }
    });

    it('should throw when topP override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topP: 0.95 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when stop override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { stop: '\n\n' };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when frequencyPenalty override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['presencePenalty'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { frequencyPenalty: 0.5 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when presencePenalty override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { presencePenalty: 0.5 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when seed override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { seed: 42 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when topK override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topK: 40 };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when responseFormat override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        responseFormat: { type: 'json_object' },
      };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when thinkingEnabled override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: { thinkingEnabled: false },
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingEnabled: true };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });

    it('should throw when thinkingBudget override not allowed', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: [],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { thinkingBudget: 'medium' };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
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

  describe('Edge case - bounds clamping', () => {
    it('should clamp temperature to bounds min', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature'],
        bounds: {
          temperature: { min: 0.5, max: 1.5 },
        },
      };
      const bodyParams: ChatParamsDto = { temperature: 0.1 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(0.5);
    });

    it('should clamp temperature to bounds max', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature'],
        bounds: {
          temperature: { min: 0.5, max: 1.5 },
        },
      };
      const bodyParams: ChatParamsDto = { temperature: 2.0 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(1.5);
    });

    it('should clamp maxOutputTokens to bounds min', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['maxOutputTokens'],
        bounds: {
          maxOutputTokens: { min: 100, max: 4096 },
        },
      };
      const bodyParams: ChatParamsDto = { maxOutputTokens: 10 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.maxOutputTokens).toBe(100);
    });

    it('should clamp maxOutputTokens to bounds max', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['maxOutputTokens'],
        bounds: {
          maxOutputTokens: { min: 100, max: 4096 },
        },
      };
      const bodyParams: ChatParamsDto = { maxOutputTokens: 10000 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.maxOutputTokens).toBe(4096);
    });

    it('should clamp topP to bounds', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['topP'],
        bounds: {
          topP: { min: 0.1, max: 0.99 },
        },
      };
      const bodyParams: ChatParamsDto = { topP: 1.0 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.topP).toBe(0.99);
    });

    it('should clamp frequencyPenalty to bounds', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['frequencyPenalty'],
        bounds: {
          frequencyPenalty: { min: -1.0, max: 1.0 },
        },
      };
      const bodyParams: ChatParamsDto = { frequencyPenalty: 1.5 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.frequencyPenalty).toBe(1.0);
    });

    it('should clamp presencePenalty to bounds', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['presencePenalty'],
        bounds: {
          presencePenalty: { min: -1.0, max: 1.0 },
        },
      };
      const bodyParams: ChatParamsDto = { presencePenalty: -2.5 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.presencePenalty).toBe(-1.0);
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
  });

  describe('Edge case - thinking mode validation', () => {
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
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: expect.stringContaining(
            'maxOutputTokens (1024) is insufficient for thinking mode',
          ),
        });
      }
    });

    it('should throw when maxOutputTokens insufficient (edge: exactly budget size)', () => {
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

    it('should allow when maxOutputTokens = budget + 512 (minimum buffer)', () => {
      const policy: GatewayParamsConfig = {
        defaults: { maxOutputTokens: 2560 },
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
    });

    it('should not validate when thinkingBudget is string (effort level)', () => {
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
      expect(result.maxOutputTokens).toBe(512);
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

    it('should use default maxOutputTokens (1024) when not specified', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        thinkingEnabled: true,
        thinkingBudget: 1536,
      };

      expect(() => resolveProviderCallOptions(policy, bodyParams)).toThrow(
        HttpException,
      );
    });
  });

  describe('Edge case - undefined/null handling', () => {
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

    it('should handle empty string stop sequence', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { stop: '' };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.stop).toBe('');
    });

    it('should handle empty array stop sequences', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['stop'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { stop: [] };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.stop).toEqual([]);
    });
  });

  describe('Edge case - boundary values', () => {
    it('should accept temperature at DTO minimum (0)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { temperature: 0 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(0);
    });

    it('should accept temperature at DTO maximum (2)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['temperature'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { temperature: 2 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.temperature).toBe(2);
    });

    it('should accept topP at minimum (0)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['topP'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topP: 0 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.topP).toBe(0);
    });

    it('should accept topP at maximum (1)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['topP'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { topP: 1 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.topP).toBe(1);
    });

    it('should accept penalties at minimum (-2)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['frequencyPenalty', 'presencePenalty'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        frequencyPenalty: -2,
        presencePenalty: -2,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.frequencyPenalty).toBe(-2);
      expect(result.presencePenalty).toBe(-2);
    });

    it('should accept penalties at maximum (2)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['frequencyPenalty', 'presencePenalty'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        frequencyPenalty: 2,
        presencePenalty: 2,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.frequencyPenalty).toBe(2);
      expect(result.presencePenalty).toBe(2);
    });

    it('should accept seed at minimum (0)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['seed'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { seed: 0 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.seed).toBe(0);
    });

    it('should accept seed at maximum (2^32 - 1)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['seed'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { seed: 2 ** 32 - 1 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.seed).toBe(4294967295);
    });

    it('should accept maxOutputTokens at minimum (1)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['maxOutputTokens'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { maxOutputTokens: 1 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.maxOutputTokens).toBe(1);
    });

    it('should accept maxOutputTokens at maximum (8192)', () => {
      const policy: GatewayParamsConfig = {
        defaults: {},
        allowOverrides: ['maxOutputTokens'],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = { maxOutputTokens: 8192 };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result.maxOutputTokens).toBe(8192);
    });
  });

  describe('Integration - complex scenarios', () => {
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

    it('should handle thinking mode with all related parameters', () => {
      const policy: GatewayParamsConfig = {
        defaults: {
          maxOutputTokens: 4096,
          thinkingEnabled: true,
        },
        allowOverrides: [
          'maxOutputTokens',
          'thinkingEnabled',
          'thinkingBudget',
        ],
        bounds: {},
      };
      const bodyParams: ChatParamsDto = {
        maxOutputTokens: 8192,
        thinkingEnabled: true,
        thinkingBudget: 2048,
      };

      const result = resolveProviderCallOptions(policy, bodyParams);

      expect(result).toEqual({
        maxOutputTokens: 8192,
        thinkingEnabled: true,
        thinkingBudget: 2048,
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
