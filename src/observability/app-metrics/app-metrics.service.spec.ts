import { Test, TestingModule } from '@nestjs/testing';
import { AppMetricsService } from './app-metrics.service';
import { APP_METRICS_BACKEND } from './app-metrics.tokens';
import { PreMetricsScrapeRegistry } from './pre-metrics-scrape.registry';
import type { AppMetricsBackend } from './interfaces/app-metrics-backend.interface';
import {
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';
import { asClientId } from '../../common/types/branded.types';

const TEST_CLIENT = asClientId('default');

describe('AppMetricsService', () => {
  let service: AppMetricsService;
  let mockBackend: Partial<jest.Mocked<AppMetricsBackend>>;
  let preMetricsScrapeRegistry: PreMetricsScrapeRegistry;

  beforeEach(async () => {
    mockBackend = {
      getMetricsSnapshot: jest.fn().mockResolvedValue(''),
      observeProviderCall: jest.fn(),
      observeProviderStream: jest.fn(),
      syncHealthMetrics: jest.fn(),
      recordHttpRequest: jest.fn(),
      recordHttpRequestDuration: jest.fn(),
      recordRequest: jest.fn(),
      recordTokens: jest.fn(),
    };

    preMetricsScrapeRegistry = new PreMetricsScrapeRegistry();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppMetricsService,
        { provide: APP_METRICS_BACKEND, useValue: mockBackend },
        {
          provide: PreMetricsScrapeRegistry,
          useValue: preMetricsScrapeRegistry,
        },
      ],
    }).compile();

    service = module.get<AppMetricsService>(AppMetricsService);
  });

  describe('HTTP Transport Layer', () => {
    describe('recordHttpRequest', () => {
      it('should delegate HTTP request recording to backend', () => {
        const labels = {
          method: 'POST' as const,
          route: '/api/v1/chat',
          statusCode: 200,
        };

        service.recordHttpRequest(labels);

        expect(mockBackend.recordHttpRequest).toHaveBeenCalledWith(labels);
      });
    });

    describe('recordHttpRequestDuration', () => {
      it('should delegate HTTP duration recording to backend', () => {
        service.recordHttpRequestDuration('GET', '/health', 0.05);

        expect(mockBackend.recordHttpRequestDuration).toHaveBeenCalledWith(
          'GET',
          '/health',
          0.05,
        );
      });
    });
  });

  describe('LLM Domain Layer', () => {
    describe('recordRequest', () => {
      it('should delegate LLM request recording to backend', () => {
        const labels = {
          method: 'chat' as const,
          provider: TEST_PROVIDER_INSTANCE_BRANDED,
          model: TEST_MODEL_ALIAS_BRANDED,
          client: TEST_CLIENT,
          status: 'success' as const,
        };

        service.recordRequest(labels);

        expect(mockBackend.recordRequest).toHaveBeenCalledWith(labels);
      });
    });

    describe('recordTokens', () => {
      it('should delegate token recording to backend', () => {
        service.recordTokens(
          TEST_PROVIDER_INSTANCE_BRANDED,
          TEST_MODEL_ALIAS_BRANDED,
          'input',
          100,
        );

        expect(mockBackend.recordTokens).toHaveBeenCalledWith(
          TEST_PROVIDER_INSTANCE_BRANDED,
          TEST_MODEL_ALIAS_BRANDED,
          'input',
          100,
        );
      });
    });
  });

  describe('observeProviderCall', () => {
    const context = {
      method: 'chat' as const,
      provider: TEST_PROVIDER_INSTANCE_BRANDED,
      model: TEST_MODEL_ALIAS_BRANDED,
      client: TEST_CLIENT,
    };

    it('should delegate context, fn and mapUsage to backend', async () => {
      const fn = jest.fn().mockResolvedValue({ data: 'ok' });
      const mapUsage = jest.fn().mockReturnValue({
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS,
      });

      (mockBackend.observeProviderCall as jest.Mock).mockResolvedValue({
        data: 'ok',
      });

      const result = await service.observeProviderCall(context, fn, mapUsage);

      expect(mockBackend.observeProviderCall).toHaveBeenCalledWith(
        context,
        fn,
        mapUsage,
      );
      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('observeProviderStream', () => {
    it('should delegate context to backend and return stream scope', () => {
      const context = {
        method: 'stream' as const,
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        client: TEST_CLIENT,
      };
      const mockScope = {
        end: jest.fn(),
        fail: jest.fn(),
      };

      (mockBackend.observeProviderStream as jest.Mock).mockReturnValue(
        mockScope,
      );

      const result = service.observeProviderStream(context);

      expect(mockBackend.observeProviderStream).toHaveBeenCalledWith(context);
      expect(result).toBe(mockScope);
    });
  });

  describe('getMetricsSnapshot', () => {
    it('should run pre-scrape hooks before delegating to backend', async () => {
      const hook = jest.fn().mockResolvedValue(undefined);
      preMetricsScrapeRegistry.register(hook);

      const snapshot =
        'gateway_llm_requests_total 1\ngateway_http_requests_total 5\n';
      mockBackend.getMetricsSnapshot!.mockResolvedValue(snapshot);

      const result = await service.getMetricsSnapshot();

      expect(hook).toHaveBeenCalled();
      expect(hook.mock.invocationCallOrder[0]).toBeLessThan(
        (mockBackend.getMetricsSnapshot as jest.Mock).mock
          .invocationCallOrder[0],
      );
      expect(mockBackend.getMetricsSnapshot).toHaveBeenCalled();
      expect(result).toBe(snapshot);
    });

    it('should delegate metrics export to backend when no hooks registered', async () => {
      const snapshot =
        'gateway_llm_requests_total 1\ngateway_http_requests_total 5\n';
      mockBackend.getMetricsSnapshot!.mockResolvedValue(snapshot);

      const result = await service.getMetricsSnapshot();

      expect(mockBackend.getMetricsSnapshot).toHaveBeenCalled();
      expect(result).toBe(snapshot);
    });
  });

  describe('syncHealthMetrics', () => {
    it('should delegate health snapshot to backend', () => {
      const snapshot = {
        ready: true,
        components: {
          config: 'healthy' as const,
          redis: 'healthy' as const,
          cache: 'degraded' as const,
        },
      };

      service.syncHealthMetrics(snapshot);

      expect(mockBackend.syncHealthMetrics).toHaveBeenCalledWith(snapshot);
    });
  });
});
