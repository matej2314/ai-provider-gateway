import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  asClientId,
  asModelAlias,
  asSemanticCacheTtlSeconds,
} from '../../../common/types/branded.types';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import {
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../../common/mocks/test-constants';
import { LoggingService } from '../../../logging/logging.service';
import { RedisConnectionService } from '../../adapters/redis-cache/redis-connection.service';
import { semanticIndexName } from '../index-name';
import { RedisVectorStoreAdapter } from './redis-vector-store.adapter';
import type { CachedChatResponse } from '../../types/cached-chat-response.type';

describe('RedisVectorStoreAdapter', () => {
  const embeddingModel = 'qwen3-embedding:0.6b';
  const embeddingDim = 1024;
  const indexName = semanticIndexName(embeddingModel, embeddingDim);

  let adapter: RedisVectorStoreAdapter;
  let mockCall: jest.Mock;
  let getClient: jest.Mock;
  let mockLogger: ReturnType<typeof createMockLoggingService>;

  async function initAdapter(
    client: {
      call: jest.Mock;
      multi?: jest.Mock;
      hset?: jest.Mock;
      expire?: jest.Mock;
    } | null,
  ) {
    if (client) {
      mockCall = client.call;
    } else {
      mockCall = jest.fn();
    }
    getClient = jest.fn().mockReturnValue(client);
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        RedisVectorStoreAdapter,
        {
          provide: RedisConnectionService,
          useValue: { getClient },
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            semanticCache: {
              enabled: true,
              embeddingModel,
              embeddingDim,
            },
          }),
        },
        {
          provide: LoggingService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    adapter = module.get(RedisVectorStoreAdapter);
  }

  beforeEach(async () => {
    await initAdapter({ call: jest.fn().mockResolvedValue([0]) });
  });

  describe('ensureIndex', () => {
    it('should warn and skip when Redis client is null (fail-open)', async () => {
      await initAdapter(null);

      await expect(adapter.ensureIndex()).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis client unavailable'),
      );
    });

    it('should not throw onModuleInit when Redis client is null', async () => {
      await initAdapter(null);

      await expect(adapter.onModuleInit()).resolves.toBeUndefined();
    });

    it('should treat index already exists as success (B6)', async () => {
      mockCall
        .mockRejectedValueOnce(new Error('Unknown Index name'))
        .mockRejectedValueOnce(new Error('Index already exists'));

      await expect(adapter.ensureIndex()).resolves.toBeUndefined();

      expect(mockCall).toHaveBeenCalledWith('FT.INFO', indexName);
      const createCall = mockCall.mock.calls.find((c) => c[0] === 'FT.CREATE');
      expect(createCall).toBeDefined();
      expect(createCall).toEqual(
        expect.arrayContaining([
          'PREFIX',
          '1',
          `${indexName}:`,
          'modelAlias',
          'TAG',
          'CASESENSITIVE',
          'clientId',
          'TAG',
          'CASESENSITIVE',
        ]),
      );
      expect(createCall).not.toEqual(
        expect.arrayContaining([`aigw:sem:${indexName}:`]),
      );
      // Second ensure should be a no-op after latch
      mockCall.mockClear();
      await adapter.ensureIndex();
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should coalesce concurrent ensureIndex calls without throw', async () => {
      let resolveInfo: ((value: unknown) => void) | undefined;
      mockCall.mockImplementation((cmd: string) => {
        if (cmd === 'FT.INFO') {
          return new Promise((resolve) => {
            resolveInfo = resolve;
          });
        }
        return Promise.resolve('OK');
      });

      const a = adapter.ensureIndex();
      const b = adapter.ensureIndex();
      resolveInfo?.({});
      await expect(Promise.all([a, b])).resolves.toEqual([
        undefined,
        undefined,
      ]);
      expect(
        mockCall.mock.calls.filter((c) => c[0] === 'FT.INFO'),
      ).toHaveLength(1);
    });

    it('should warn when Search module is missing', async () => {
      mockCall.mockRejectedValue(new Error("ERR unknown command 'FT.INFO'"));

      await adapter.ensureIndex();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis Search module unavailable'),
        expect.any(Object),
      );
    });
  });

  describe('probeIndex', () => {
    it('should report unavailable when client is null', async () => {
      await initAdapter(null);

      await expect(adapter.probeIndex()).resolves.toEqual({
        available: false,
        message: 'Redis client unavailable for vector index probe',
      });
    });

    it('should report healthy when FT.INFO succeeds', async () => {
      mockCall.mockResolvedValue(['index_name', indexName]);

      await expect(adapter.probeIndex()).resolves.toEqual({
        available: true,
        message: 'Redis Search index available',
      });
    });

    it('should report degraded with operator message on unknown command', async () => {
      mockCall.mockRejectedValue(new Error("ERR unknown command 'FT.INFO'"));

      const result = await adapter.probeIndex();

      expect(result.available).toBe(false);
      expect(result.message).toContain('Redis Search module unavailable');
    });
  });

  describe('knn', () => {
    const validReplyJson = JSON.stringify({
      id: TEST_CACHED_RESPONSE_ID,
      provider: TEST_PROVIDER_INSTANCE_BRANDED,
      model: TEST_MODEL_ALIAS_BRANDED,
      output: { type: 'text', text: 'from-redis' },
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS_SMALL,
      },
      requestId: TEST_CACHED_REQUEST_ID,
      cached: true,
      cachedAt: '2026-01-01T00:00:00.000Z',
    });

    it('should include @embeddingModel in FT.SEARCH query', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]); // FT.INFO in ensure
      mockCall.mockResolvedValueOnce([0]); // FT.SEARCH

      const vector = Array.from(
        { length: embeddingDim },
        (_, i) => i / embeddingDim,
      );

      await adapter.knn({
        vector,
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys-sig',
        callParams: 'params-sig',
        k: 3,
      });

      const searchCall = mockCall.mock.calls.find((c) => c[0] === 'FT.SEARCH');
      expect(searchCall).toBeDefined();
      expect(searchCall![1]).toBe(indexName);
      expect(searchCall![2]).toMatch(
        /@embeddingModel:\{qwen3\\-embedding\\:0\\.6b\}/,
      );

      const query = searchCall![2] as string;
      expect(query).toContain('@modelAlias:');
      expect(query).toContain('@clientId:');
      expect(query).toContain('@embeddingModel:');
      expect(query).toContain('@systemSignature:');
      expect(query).toContain('@callParams:');
      expect(query).toContain('KNN 3');

      const limitIdx = searchCall!.indexOf('LIMIT');
      expect(limitIdx).toBeGreaterThan(-1);
      expect(searchCall![limitIdx + 1]).toBe('0');
      expect(searchCall![limitIdx + 2]).toBe('3');
    });

    it('should escape TAG specials (hyphen, colon) in FT.SEARCH query', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]);
      mockCall.mockResolvedValueOnce([0]);

      await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('chat-default'),
        clientId: asClientId('Team-A'),
        systemSignature: 'sys:v1',
        callParams: 'params-hash',
        k: 1,
      });

      const searchCall = mockCall.mock.calls.find((c) => c[0] === 'FT.SEARCH');
      expect(searchCall).toBeDefined();
      const query = searchCall![2] as string;
      expect(query).toContain('@modelAlias:{chat\\-default}');
      expect(query).toContain('@clientId:{Team\\-A}');
      expect(query).toContain('@systemSignature:{sys\\:v1}');
      expect(query).toContain('@callParams:{params\\-hash}');
    });

    it('should send Float32 little-endian blob in PARAMS', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]);
      mockCall.mockResolvedValueOnce([0]);

      const vector = [1, 0.5, -2];
      await adapter.knn({
        vector,
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 1,
      });

      const searchCall = mockCall.mock.calls.find((c) => c[0] === 'FT.SEARCH');
      expect(searchCall).toBeDefined();
      const blobIdx = searchCall!.indexOf('blob');
      expect(blobIdx).toBeGreaterThan(-1);
      const blob = searchCall![blobIdx + 1] as Buffer;
      expect(Buffer.isBuffer(blob)).toBe(true);
      expect(blob.byteLength).toBe(vector.length * 4);
      expect(blob.readFloatLE(0)).toBeCloseTo(1);
      expect(blob.readFloatLE(4)).toBeCloseTo(0.5);
      expect(blob.readFloatLE(8)).toBeCloseTo(-2);
    });

    it('should pass LIMIT 0 k for k=15 (not silently capped to 10)', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]);
      mockCall.mockResolvedValueOnce([0]);

      await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 15,
      });

      const searchCall = mockCall.mock.calls.find((c) => c[0] === 'FT.SEARCH');
      expect(searchCall).toBeDefined();
      const limitIdx = searchCall!.indexOf('LIMIT');
      expect(searchCall![limitIdx + 1]).toBe('0');
      expect(searchCall![limitIdx + 2]).toBe('15');
      expect(searchCall![2]).toContain('KNN 15');
    });

    it('should parse RESP hits as similarity = 1 - dist', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]);
      mockCall.mockResolvedValueOnce([
        1,
        'doc:1',
        ['reply', validReplyJson, 'dist', '0.1'],
      ]);

      const hits = await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 1,
      });

      expect(hits).toHaveLength(1);
      expect(hits[0].similarity).toBeCloseTo(0.9);
      expect(hits[0].reply.output).toEqual({
        type: 'text',
        text: 'from-redis',
      });
    });

    it('should skip hits with damaged JSON, invalid Zod shape, or missing dist', async () => {
      mockCall.mockResolvedValueOnce(['index_name', indexName]);
      mockCall.mockResolvedValueOnce([
        3,
        'bad-json',
        ['reply', '{not-json', 'dist', '0.05'],
        'bad-zod',
        ['reply', JSON.stringify({ cached: false }), 'dist', '0.05'],
        'no-dist',
        ['reply', validReplyJson],
        'ok',
        [
          'reply',
          Buffer.from(validReplyJson, 'utf8'),
          'dist',
          Buffer.from('0.2', 'utf8'),
        ],
      ]);

      const hits = await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 4,
      });

      expect(hits).toHaveLength(1);
      expect(hits[0].similarity).toBeCloseTo(0.8);
      expect(hits[0].reply.output.text).toBe('from-redis');
    });

    it('should return empty hits when Redis client is null (fail-open)', async () => {
      await initAdapter(null);

      const hits = await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 1,
      });

      expect(hits).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('semantic KNN skipped'),
      );
    });

    it('should recreate index after missing-index error (B5)', async () => {
      mockCall
        .mockResolvedValueOnce(['ok']) // ensure FT.INFO
        .mockRejectedValueOnce(new Error('Unknown Index name')) // FT.SEARCH
        .mockRejectedValueOnce(new Error('Unknown Index name')) // recreate FT.INFO
        .mockResolvedValueOnce('OK') // FT.CREATE
        .mockResolvedValueOnce([0]); // retry FT.SEARCH

      const hits = await adapter.knn({
        vector: [0.1],
        modelAlias: asModelAlias('test-model'),
        clientId: asClientId('client-a'),
        systemSignature: 'sys',
        callParams: 'params',
        k: 1,
      });

      expect(hits).toEqual([]);
      expect(
        mockCall.mock.calls.filter((c) => c[0] === 'FT.CREATE'),
      ).toHaveLength(1);
      expect(
        mockCall.mock.calls.filter((c) => c[0] === 'FT.SEARCH'),
      ).toHaveLength(2);
    });
  });

  describe('upsert', () => {
    const reply: CachedChatResponse = {
      id: TEST_CACHED_RESPONSE_ID,
      provider: TEST_PROVIDER_INSTANCE_BRANDED,
      model: TEST_MODEL_ALIAS_BRANDED,
      output: { type: 'text', text: 'x' },
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS_SMALL,
      },
      requestId: TEST_CACHED_REQUEST_ID,
      cached: true,
      cachedAt: '2026-01-01T00:00:00.000Z',
    };

    const baseUpsert = {
      vector: [0.1],
      text: 'hi',
      modelAlias: asModelAlias('test-model'),
      clientId: asClientId('client-a'),
      systemSignature: 'sys',
      callParams: 'params',
      reply,
    };

    function mockMultiClient() {
      const multiChain = {
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 1],
        ]),
      };
      const hset = jest.fn();
      const expire = jest.fn();
      const multi = jest.fn().mockReturnValue(multiChain);
      const call = jest.fn().mockResolvedValue([0]);
      return { call, multi, multiChain, hset, expire };
    }

    it('should skip when Redis client is null (fail-open)', async () => {
      await initAdapter(null);

      await expect(
        adapter.upsert({
          ...baseUpsert,
          ttlSeconds: asSemanticCacheTtlSeconds(60),
        }),
      ).resolves.toBeUndefined();
    });

    it('should HSET + EXPIRE in one MULTI (B8)', async () => {
      const client = mockMultiClient();
      await initAdapter(client);

      await adapter.upsert({
        ...baseUpsert,
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });

      expect(client.multi).toHaveBeenCalledTimes(1);
      expect(client.multiChain.hset).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${indexName}:`)),
        expect.objectContaining({
          modelAlias: 'test-model',
          clientId: 'client-a',
          embeddingModel,
          systemSignature: 'sys',
          callParams: 'params',
        }),
      );
      expect(client.multiChain.expire).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${indexName}:`)),
        60,
      );
      expect(client.multiChain.exec).toHaveBeenCalledTimes(1);
      expect(client.hset).not.toHaveBeenCalled();
      expect(client.expire).not.toHaveBeenCalled();
    });

    it('should store raw TAG values and Float32 vector blob (not query-escaped)', async () => {
      const client = mockMultiClient();
      await initAdapter(client);

      await adapter.upsert({
        ...baseUpsert,
        modelAlias: asModelAlias('chat-default'),
        clientId: asClientId('Team-A'),
        vector: [1, 2],
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });

      const hsetArgs = client.multiChain.hset.mock.calls[0] as [
        string,
        Record<string, string | Buffer>,
      ];
      expect(hsetArgs[1].modelAlias).toBe('chat-default');
      expect(hsetArgs[1].clientId).toBe('Team-A');
      const vectorBlob = hsetArgs[1].vector as Buffer;
      expect(Buffer.isBuffer(vectorBlob)).toBe(true);
      expect(vectorBlob.byteLength).toBe(8);
      expect(vectorBlob.readFloatLE(0)).toBeCloseTo(1);
      expect(vectorBlob.readFloatLE(4)).toBeCloseTo(2);
    });

    it('should reuse the same entryKey for identical identity fields', async () => {
      const client = mockMultiClient();
      await initAdapter(client);

      await adapter.upsert({
        ...baseUpsert,
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });
      await adapter.upsert({
        ...baseUpsert,
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });

      const key1 = client.multiChain.hset.mock.calls[0]![0] as string;
      const key2 = client.multiChain.hset.mock.calls[1]![0] as string;
      expect(key1).toBe(key2);
      expect(key1).toMatch(new RegExp(`^${indexName}:[a-f0-9]{32}$`));
      expect(key1.startsWith('aigw:sem:')).toBe(false);
    });

    it('should use a different entryKey when text or callParams change', async () => {
      const client = mockMultiClient();
      await initAdapter(client);

      await adapter.upsert({
        ...baseUpsert,
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });
      await adapter.upsert({
        ...baseUpsert,
        text: 'other',
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });
      await adapter.upsert({
        ...baseUpsert,
        callParams: 'other-params',
        ttlSeconds: asSemanticCacheTtlSeconds(60),
      });

      const keys = client.multiChain.hset.mock.calls.map((c) => c[0] as string);
      expect(new Set(keys).size).toBe(3);
    });

    it('should skip upsert when ttlSeconds < 1 (no eternal vectors)', async () => {
      const client = mockMultiClient();
      await initAdapter(client);

      await expect(
        adapter.upsert({
          ...baseUpsert,
          ttlSeconds: 0 as ReturnType<typeof asSemanticCacheTtlSeconds>,
        }),
      ).resolves.toBeUndefined();

      expect(client.multi).not.toHaveBeenCalled();
      expect(client.hset).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ttlSeconds must be >= 1'),
        expect.objectContaining({ ttlSeconds: 0 }),
      );
    });
  });
});
