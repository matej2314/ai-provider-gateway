import { PrometheusAppMetricsAdapter } from './prometheus-app-metrics.adapter';
import { PrometheusService } from '../prometheus.service';

describe('PrometheusAppMetricsAdapter', () => {
  let adapter: PrometheusAppMetricsAdapter;

  beforeEach(() => {
    adapter = new PrometheusAppMetricsAdapter(new PrometheusService());
  });

  describe('HTTP Transport Layer Metrics', () => {
    describe('recordHttpRequest', () => {
      it('should record HTTP request with method, route and status code', async () => {
        adapter.recordHttpRequest({
          method: 'POST',
          route: '/api/v1/chat',
          statusCode: 200,
        });

        const snapshot = await adapter.getMetricsSnapshot();

        expect(snapshot).toMatch(
          /gateway_http_requests_total\{method="POST",route="\/api\/v1\/chat",status_code="200"\} 1/,
        );
      });
    });

    describe('recordHttpRequestDuration', () => {
      it('should record HTTP request duration histogram', async () => {
        adapter.recordHttpRequestDuration('GET', '/health', 0.123);

        const snapshot = await adapter.getMetricsSnapshot();

        expect(snapshot).toMatch(
          /gateway_http_request_duration_seconds_bucket\{le="[^"]+",method="GET",route="\/health"\}/,
        );
        expect(snapshot).toMatch(
          /gateway_http_request_duration_seconds_sum\{method="GET",route="\/health"\}/,
        );
      });
    });
  });

  describe('LLM Domain Layer Metrics', () => {
    describe('recordRequest', () => {
      it('should record LLM request with provider, model and status', async () => {
        adapter.recordRequest({
          method: 'chat',
          provider: 'anthropic' as any,
          model: 'claude-3-5-sonnet' as any,
          client: 'client-123',
          status: 'success',
        });

        const snapshot = await adapter.getMetricsSnapshot();

        expect(snapshot).toMatch(
          /gateway_llm_requests_total\{method="chat",provider="anthropic",model="claude-3-5-sonnet",client="client-123",status="success"\} 1/,
        );
      });
    });

    describe('recordTokens', () => {
      it('should record input tokens with token_type label', async () => {
        adapter.recordTokens('openai' as any, 'gpt-4' as any, 'input', 100);

        const snapshot = await adapter.getMetricsSnapshot();

        expect(snapshot).toMatch(
          /gateway_llm_tokens_total\{provider="openai",model="gpt-4",token_type="input"\} 100/,
        );
      });

      it('should record output tokens with token_type label', async () => {
        adapter.recordTokens('openai' as any, 'gpt-4' as any, 'output', 50);

        const snapshot = await adapter.getMetricsSnapshot();

        expect(snapshot).toMatch(
          /gateway_llm_tokens_total\{provider="openai",model="gpt-4",token_type="output"\} 50/,
        );
      });
    });
  });

  describe('syncHealthMetrics', () => {
    it('should export readiness and per-component health gauges', async () => {
      adapter.syncHealthMetrics({
        ready: false,
        components: {
          config: 'unhealthy',
          redis: 'healthy',
          cache: 'healthy',
        },
      });

      const snapshot = await adapter.getMetricsSnapshot();

      expect(snapshot).toMatch(/gateway_readiness 0/);
      expect(snapshot).toMatch(/gateway_health_status\{component="config"\} 0/);
      expect(snapshot).toMatch(/gateway_health_status\{component="redis"\} 1/);
      expect(snapshot).toMatch(/gateway_health_status\{component="cache"\} 1/);
    });

    it('should export embeddings component when present in snapshot', async () => {
      adapter.syncHealthMetrics({
        ready: true,
        components: {
          config: 'healthy',
          cache: 'healthy',
          embeddings: 'degraded',
        },
      });

      const snapshot = await adapter.getMetricsSnapshot();

      expect(snapshot).toMatch(/gateway_readiness 1/);
      expect(snapshot).toMatch(
        /gateway_health_status\{component="embeddings"\} 0\.5/,
      );
    });

    it('should export vectorStore component when present in snapshot', async () => {
      adapter.syncHealthMetrics({
        ready: true,
        components: {
          config: 'healthy',
          cache: 'healthy',
          vectorStore: 'degraded',
        },
      });

      const snapshot = await adapter.getMetricsSnapshot();

      expect(snapshot).toMatch(/gateway_readiness 1/);
      expect(snapshot).toMatch(
        /gateway_health_status\{component="vectorStore"\} 0\.5/,
      );
    });
  });

  describe('setComponentHealth', () => {
    it('should map degraded status to 0.5', async () => {
      adapter.setComponentHealth('redis', 'degraded');

      const snapshot = await adapter.getMetricsSnapshot();

      expect(snapshot).toMatch(
        /gateway_health_status\{component="redis"\} 0\.5/,
      );
    });
  });

  describe('setProcessUpTime', () => {
    it('should export process uptime gauge', async () => {
      adapter.setProcessUpTime(42);

      const snapshot = await adapter.getMetricsSnapshot();

      expect(snapshot).toMatch(/gateway_process_uptime_seconds 42/);
    });
  });
});
