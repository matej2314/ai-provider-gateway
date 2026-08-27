import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { LoggingService } from '../../../logging/logging.service';
import { OllamaEmbeddingAdapter } from './ollama-embedding.adapter';

describe('OllamaEmbeddingAdapter', () => {
  const embeddingDim = 4;
  const embeddingModel = 'qwen3-embedding:0.6b';
  const embeddingBaseUrl = 'http://127.0.0.1:11435';
  const originalFetch = global.fetch;

  let adapter: OllamaEmbeddingAdapter;
  let fetchMock: jest.Mock;
  let mockLogger: ReturnType<typeof createMockLoggingService>;

  async function createAdapter(
    overrides: {
      enabled?: boolean;
      embeddingTimeoutMs?: number;
      embeddingBaseUrl?: string;
    } = {},
  ): Promise<OllamaEmbeddingAdapter> {
    mockLogger = createMockLoggingService();
    const module = await Test.createTestingModule({
      providers: [
        OllamaEmbeddingAdapter,
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            semanticCache: {
              enabled: overrides.enabled ?? true,
              embeddingModel,
              embeddingDim,
              embeddingBaseUrl: overrides.embeddingBaseUrl ?? embeddingBaseUrl,
              embeddingTimeoutMs: overrides.embeddingTimeoutMs ?? 5000,
            },
          }),
        },
        {
          provide: LoggingService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    return module.get(OllamaEmbeddingAdapter);
  }

  function okEmbedResponse(vector: number[]): Response {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ embeddings: [vector] }),
    } as Response;
  }

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = await createAdapter();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('embed', () => {
    it('should POST JSON to /api/embed with model and input', async () => {
      const vector = [0.1, 0.2, 0.3, 0.4];
      fetchMock.mockResolvedValue(okEmbedResponse(vector));

      await expect(adapter.embed('hello world')).resolves.toEqual(vector);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${embeddingBaseUrl}/api/embed`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: embeddingModel,
            input: 'hello world',
          }),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should strip trailing slash from embeddingBaseUrl', async () => {
      adapter = await createAdapter({
        embeddingBaseUrl: `${embeddingBaseUrl}/`,
      });
      fetchMock.mockResolvedValue(okEmbedResponse([1, 0, 0, 0]));

      await adapter.embed('x');

      expect(fetchMock.mock.calls[0]![0]).toBe(`${embeddingBaseUrl}/api/embed`);
    });

    it('should reject when HTTP response is not ok', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      await expect(adapter.embed('x')).rejects.toThrow(
        'embed request failed: 503',
      );
    });

    it('should reject when embedding dimensions mismatch', async () => {
      fetchMock.mockResolvedValue(okEmbedResponse([1, 2, 3]));

      await expect(adapter.embed('x')).rejects.toThrow(
        'Embedding dimensions mismatch: got 3, expected 4',
      );
    });

    it('should reject when embeddings array is missing', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embeddings: [] }),
      });

      await expect(adapter.embed('x')).rejects.toThrow(
        'Embedding dimensions mismatch: got 0, expected 4',
      );
    });

    it('should abort when timeout elapses before fetch resolves', async () => {
      fetchMock.mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              reject(new Error('missing abort signal'));
              return;
            }
            signal.addEventListener('abort', () => {
              reject(
                Object.assign(new Error('The operation was aborted'), {
                  name: 'AbortError',
                }),
              );
            });
          }),
      );

      await expect(adapter.embed('slow', 40)).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAvailable / onModuleInit', () => {
    it('should report availability from semanticCache.enabled', async () => {
      expect(adapter.isAvailable()).toBe(true);
      const disabled = await createAdapter({ enabled: false });
      expect(disabled.isAvailable()).toBe(false);
    });

    it('should warm up with embed when enabled', async () => {
      fetchMock.mockResolvedValue(okEmbedResponse([1, 0, 0, 0]));

      await adapter.onModuleInit();

      expect(fetchMock).toHaveBeenCalledWith(
        `${embeddingBaseUrl}/api/embed`,
        expect.objectContaining({
          body: JSON.stringify({ model: embeddingModel, input: 'warmup' }),
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Embedding model warmed up successfully',
      );
    });

    it('should warn and not throw when warmup fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(adapter.onModuleInit()).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Embedding warmup failed'),
      );
    });

    it('should skip warmup when semantic cache is disabled', async () => {
      adapter = await createAdapter({ enabled: false });

      await adapter.onModuleInit();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
