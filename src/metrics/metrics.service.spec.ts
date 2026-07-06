import { Test } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { METRICS_BACKEND } from './metrics.tokens';
import type { MetricsBackend } from './interfaces/metrics-backend.interface';
import {
  TEST_CONVERSATION_ID,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_MODEL_ID,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_REQUEST_ID,
} from '../common/mocks/test-constants';
import { asInputTokens, asOutputTokens, asCostUsd } from '../common/types/branded.types';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockBackend: Partial<MetricsBackend>;

  beforeEach(async () => {
    mockBackend = {
      observeLlmCall: jest.fn(),
      observeLlmStream: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: METRICS_BACKEND, useValue: mockBackend },
      ],
    }).compile();

    service = module.get(MetricsService);
  });

  describe('observeLlmCall', () => {
    it('should delegate to backend', async () => {
      const context = {
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        modelId: TEST_MODEL_ID,
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
      };
      const fn = jest.fn().mockResolvedValue('result');

      (mockBackend.observeLlmCall as jest.Mock).mockResolvedValue('result');

      const result = await service.observeLlmCall(context, fn);

      expect(mockBackend.observeLlmCall).toHaveBeenCalledWith(
        context,
        fn,
        undefined,
      );
      expect(result).toBe('result');
    });

    it('should pass mapResult function', async () => {
      const context = {
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        modelId: TEST_MODEL_ID,
        requestId: TEST_REQUEST_ID,
      };
      const fn = jest.fn().mockResolvedValue({ data: 'ok' });
      const mapResult = jest.fn().mockReturnValue({
        usage: {
          inputTokens: asInputTokens(50),
          outputTokens: asOutputTokens(100),
        },
        costUsd: asCostUsd(0.002),
      });

      (mockBackend.observeLlmCall as jest.Mock).mockResolvedValue({
        data: 'ok',
      });

      await service.observeLlmCall(context, fn, mapResult);

      expect(mockBackend.observeLlmCall).toHaveBeenCalledWith(
        context,
        fn,
        mapResult,
      );
    });

    it('should propagate errors from fn', async () => {
      const context = {
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        modelId: TEST_MODEL_ID,
        requestId: TEST_REQUEST_ID,
      };
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      (mockBackend.observeLlmCall as jest.Mock).mockRejectedValue(error);

      await expect(service.observeLlmCall(context, fn)).rejects.toThrow(
        'Test error',
      );
    });
  });

  describe('observeLlmStream', () => {
    it('should delegate to backend', () => {
      const context = {
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        modelId: TEST_MODEL_ID,
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
      };
      const mockController = {
        withActiveSpan: <T>(fn: () => T) => fn(),
        end: jest.fn(),
        fail: jest.fn(),
      };

      (mockBackend.observeLlmStream as jest.Mock).mockReturnValue(
        mockController,
      );

      const result = service.observeLlmStream(context);

      expect(mockBackend.observeLlmStream).toHaveBeenCalledWith(context);
      expect(result).toBe(mockController);
    });

    it('should return span controller', () => {
      const context = {
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        modelId: TEST_MODEL_ID,
        requestId: TEST_REQUEST_ID,
      };
      const endMock = jest.fn();
      const failMock = jest.fn();
      const mockController = {
        withActiveSpan: <T>(fn: () => T) => fn(),
        end: endMock,
        fail: failMock,
      };

      (mockBackend.observeLlmStream as jest.Mock).mockReturnValue(
        mockController,
      );

      service.observeLlmStream(context);

      expect(endMock).toBeDefined();
      expect(typeof endMock).toBe('function');
    });
  });
});
