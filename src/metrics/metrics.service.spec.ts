import { Test } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { METRICS_BACKEND } from './metrics.tokens';
import type { MetricsBackend } from './interfaces/metrics-backend.interface';

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
        provider: 'openai',
        modelAlias: 'test-model',
        modelId: 'gpt-4',
        requestId: 'req-123',
        conversationId: 'conv-123',
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
        provider: 'openai',
        modelAlias: 'test-model',
        modelId: 'gpt-4',
        requestId: 'req-123',
      };
      const fn = jest.fn().mockResolvedValue({ data: 'ok' });
      const mapResult = jest
        .fn()
        .mockReturnValue({ usage: { outputTokens: 100 } });

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
        provider: 'openai',
        modelAlias: 'test-model',
        modelId: 'gpt-4',
        requestId: 'req-123',
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
        provider: 'openai',
        modelAlias: 'test-model',
        modelId: 'gpt-4',
        requestId: 'req-123',
        conversationId: 'conv-123',
      };
      const mockController = {
        end: jest.fn(),
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
        provider: 'openai',
        modelAlias: 'test-model',
        modelId: 'gpt-4',
        requestId: 'req-123',
      };
      const mockController = {
        end: jest.fn(),
      };

      (mockBackend.observeLlmStream as jest.Mock).mockReturnValue(
        mockController,
      );

      const controller = service.observeLlmStream(context);

      expect(controller.end).toBeDefined();
      expect(typeof controller.end).toBe('function');
    });
  });
});
