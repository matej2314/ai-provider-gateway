import { Test, TestingModule } from '@nestjs/testing';
import { AiMetricsService } from './ai-metrics.service';
import { AI_METRICS_BACKEND } from './ai-metrics.tokens';
import type { AiMetricsBackend } from './interfaces/ai-metrics-backend.interface';
import {
  TEST_CONVERSATION_ID,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_MODEL_ID,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_REQUEST_ID,
} from '../../common/mocks/test-constants';
import {
  asInputTokens,
  asOutputTokens,
  asCostUsd,
} from '../../common/types/branded.types';

describe('AiMetricsService', () => {
  let service: AiMetricsService;
  let mockBackend: Partial<AiMetricsBackend>;

  beforeEach(async () => {
    mockBackend = {
      observeLlmCall: jest.fn(),
      observeLlmStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMetricsService,
        { provide: AI_METRICS_BACKEND, useValue: mockBackend },
      ],
    }).compile();

    service = module.get<AiMetricsService>(AiMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const controller = service.observeLlmStream(context);

      expect(controller).toBe(mockController);
    });
  });
});
