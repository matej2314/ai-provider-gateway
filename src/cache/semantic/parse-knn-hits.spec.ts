import { parseKnnHits, asString } from './parse-knn-hits';
import {
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';

const validReplyJson = JSON.stringify({
  id: TEST_CACHED_RESPONSE_ID,
  provider: TEST_PROVIDER_INSTANCE_BRANDED,
  model: TEST_MODEL_ALIAS_BRANDED,
  output: { type: 'text', text: 'from-redis' },
  usage: {
    inputTokens: TEST_INPUT_TOKENS,
    outputTokens: TEST_OUTPUT_TOKENS_SMALL,
  },
  cached: true,
  cachedAt: '2026-01-01T00:00:00.000Z',
  finishReason: 'stop',
});

describe('asString', () => {
  it('keeps strings, decodes buffers, stringifies numbers, else empty', () => {
    expect(asString('ok')).toBe('ok');
    expect(asString(Buffer.from('buf', 'utf8'))).toBe('buf');
    expect(asString(12)).toBe('12');
    expect(asString(null)).toBe('');
  });
});

describe('parseKnnHits', () => {
  it('returns empty when payload is not a RESP hit list', () => {
    expect(parseKnnHits(null)).toEqual({ hits: [], corruptKeys: [] });
    expect(parseKnnHits([0])).toEqual({ hits: [], corruptKeys: [] });
  });

  it('maps dist to similarity = 1 - dist', () => {
    const { hits, corruptKeys } = parseKnnHits([
      1,
      'doc:1',
      ['reply', validReplyJson, 'dist', '0.1'],
    ]);

    expect(corruptKeys).toEqual([]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.similarity).toBeCloseTo(0.9);
    expect(hits[0]?.reply.output).toEqual({
      type: 'text',
      text: 'from-redis',
    });
  });

  it('collects corrupt keys and skips missing dist without deleting', () => {
    const { hits, corruptKeys } = parseKnnHits([
      4,
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

    expect(hits).toHaveLength(1);
    expect(hits[0]?.similarity).toBeCloseTo(0.8);
    expect(corruptKeys).toEqual(['bad-json', 'bad-zod']);
  });

  it('treats unservable length replies as corrupt keys', () => {
    const lengthReplyJson = JSON.stringify({
      ...JSON.parse(validReplyJson),
      finishReason: 'length',
    });
    const { hits, corruptKeys } = parseKnnHits([
      1,
      'too-long',
      ['reply', lengthReplyJson, 'dist', '0.05'],
    ]);

    expect(hits).toEqual([]);
    expect(corruptKeys).toEqual(['too-long']);
  });
});
