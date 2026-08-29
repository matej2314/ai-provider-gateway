import { Test } from '@nestjs/testing';
import {
  STREAM_CACHE_REPLAY_CHUNK_SIZE,
  StreamCacheReplayService,
} from './stream-cache-replay.service';
import { LoggingService } from '../../logging/logging.service';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import type { SseEvent } from '../sse/sse-event.type';
import {
  TEST_CONVERSATION_ID,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROMPT_CACHE_HIT_TOKENS,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_CACHED_RESPONSE_ID,
  TEST_REQUEST_ID,
} from '../../common/mocks/test-constants';
import { asSystemFingerprint } from '../../common/types/branded.types';

describe('StreamCacheReplayService', () => {
  let service: StreamCacheReplayService;
  let mockLogger: Partial<LoggingService>;

  const baseCached: CachedChatResponse = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Cached answer' },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };

  beforeEach(async () => {
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        StreamCacheReplayService,
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(StreamCacheReplayService);
  });

  describe('replay', () => {
    describe('Happy path', () => {
      it('emits meta with cached* then deltas of 64 then done', () => {
        const text = 'a'.repeat(130);
        const events: SseEvent[] = [];

        service.replay({
          cached: { ...baseCached, output: { type: 'text', text } },
          cacheSource: 'exact',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: (e) => events.push(e),
        });

        expect(events[0]).toMatchObject({
          name: 'meta',
          data: { cached: true, cacheSource: 'exact' },
        });
        const deltas = events.filter(
          (e): e is Extract<SseEvent, { name: 'delta' }> => e.name === 'delta',
        );
        expect(deltas).toHaveLength(3);
        expect(deltas.map((d) => d.data.text.length)).toEqual([
          STREAM_CACHE_REPLAY_CHUNK_SIZE,
          STREAM_CACHE_REPLAY_CHUNK_SIZE,
          2,
        ]);
        expect(events.at(-1)?.name).toBe('done');
      });

      it('uses cache id and current request/conversation ids in meta', () => {
        const events: SseEvent[] = [];

        service.replay({
          cached: baseCached,
          cacheSource: 'semantic',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: (e) => events.push(e),
        });

        expect(events[0]).toEqual({
          name: 'meta',
          data: {
            id: TEST_CACHED_RESPONSE_ID,
            provider: TEST_PROVIDER_INSTANCE_BRANDED,
            model: TEST_MODEL_ALIAS_BRANDED,
            requestId: TEST_REQUEST_ID,
            conversationId: TEST_CONVERSATION_ID,
            cached: true,
            cachedAt: '2026-01-01T00:00:00.000Z',
            cacheSource: 'semantic',
          },
        });
      });

      it('emits meta then done without deltas when text is empty', () => {
        const events: SseEvent[] = [];

        service.replay({
          cached: { ...baseCached, output: { type: 'text', text: '' } },
          cacheSource: 'exact',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: (e) => events.push(e),
        });

        expect(events.map((e) => e.name)).toEqual(['meta', 'done']);
      });

      it('forwards usage, finishReason and optional done fields from cache', () => {
        const events: SseEvent[] = [];

        service.replay({
          cached: {
            ...baseCached,
            usage: {
              inputTokens: TEST_INPUT_TOKENS,
              outputTokens: TEST_OUTPUT_TOKENS_SMALL,
            },
            usageDetails: {
              promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS,
            },
            systemFingerprint: asSystemFingerprint('fp_cached'),
            thinkingContent: 'step',
            effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
            warnings: [{ code: 'ignored_param', message: 'ignored' }],
          },
          cacheSource: 'exact',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: (e) => events.push(e),
        });

        const done = events.at(-1);
        expect(done).toEqual({
          name: 'done',
          data: {
            usage: {
              inputTokens: TEST_INPUT_TOKENS,
              outputTokens: TEST_OUTPUT_TOKENS_SMALL,
              totalTokens: TEST_INPUT_TOKENS + TEST_OUTPUT_TOKENS_SMALL,
            },
            finishReason: 'stop',
            usageDetails: {
              promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS,
            },
            systemFingerprint: 'fp_cached',
            thinkingContent: 'step',
            effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
            warnings: [{ code: 'ignored_param', message: 'ignored' }],
          },
        });
        expect(events[0]).toMatchObject({
          name: 'meta',
          data: { effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS },
        });
      });

      it('logs completion after done', () => {
        service.replay({
          cached: baseCached,
          cacheSource: 'semantic',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: () => undefined,
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Stream cache replay completed',
          { cacheSource: 'semantic' },
        );
      });
    });

    describe('Abort', () => {
      it('stops emitting when shouldAbort becomes true', () => {
        let n = 0;

        service.replay({
          cached: {
            ...baseCached,
            output: { type: 'text', text: 'x'.repeat(200) },
          },
          cacheSource: 'semantic',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: () => {
            n++;
          },
          shouldAbort: () => n >= 2,
        });

        expect(n).toBeLessThan(5);
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('emits nothing when shouldAbort is already true', () => {
        const events: SseEvent[] = [];

        service.replay({
          cached: baseCached,
          cacheSource: 'exact',
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          emit: (e) => events.push(e),
          shouldAbort: () => true,
        });

        expect(events).toEqual([]);
        expect(mockLogger.info).not.toHaveBeenCalled();
      });
    });
  });
});
