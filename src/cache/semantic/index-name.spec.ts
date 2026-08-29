import { createHash } from 'node:crypto';
import {
  SEMANTIC_CACHE_PROJECT_ID,
  canonicalSemanticSchema,
} from './semantic-cache.constants';
import { semanticIndexName } from './index-name';

describe('semanticIndexName', () => {
  const model = 'qwen3-embedding:0.6b';
  const dim = 1024;

  function expectedHash(
    embeddingModel: string,
    embeddingDim: number,
    projectId = SEMANTIC_CACHE_PROJECT_ID,
    schemaCanonical = canonicalSemanticSchema(embeddingDim),
  ): string {
    return createHash('sha256')
      .update(
        `${projectId}\n${embeddingModel}\n${embeddingDim}\n${schemaCanonical}`,
      )
      .digest('hex')
      .slice(0, 8);
  }

  it('should start with projectId:sem:idx: and include model, dim, schema hash', () => {
    const name = semanticIndexName(model, dim);
    const hash8 = expectedHash(model, dim);

    expect(name).toBe(
      `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-${hash8}`,
    );
    expect(name.startsWith(`${SEMANTIC_CACHE_PROJECT_ID}:sem:idx:`)).toBe(true);
    expect(name.split(':')[0]).not.toBe('aigw');
  });

  it('should be stable for identical inputs', () => {
    expect(semanticIndexName(model, dim)).toBe(semanticIndexName(model, dim));
  });

  it('should give different names for same-family models at the same DIM', () => {
    const small = semanticIndexName('qwen3-embedding:0.6b', dim);
    const large = semanticIndexName('qwen3-embedding:4b', dim);

    expect(small).toContain('qwen3-embedding-0-6b-1024-');
    expect(large).toContain('qwen3-embedding-4b-1024-');
    expect(small).not.toBe(large);
  });

  it('should change name when dim changes', () => {
    const base = semanticIndexName(model, 1024);
    const otherDim = semanticIndexName(model, 768);

    expect(otherDim).toContain('-768-');
    expect(otherDim).not.toBe(base);
  });

  it('should change name when canonical SCHEMA changes (same project prefix)', () => {
    const base = semanticIndexName(model, dim);
    const altered = semanticIndexName(model, dim, {
      schemaCanonical: `${canonicalSemanticSchema(dim)}\nextra:TAG:CASESENSITIVE`,
    });

    expect(altered.startsWith(`${SEMANTIC_CACHE_PROJECT_ID}:sem:idx:`)).toBe(
      true,
    );
    expect(altered).not.toBe(base);
  });

  it('should change prefix and hash when PROJECT_ID changes', () => {
    const base = semanticIndexName(model, dim);
    const other = semanticIndexName(model, dim, {
      projectId: 'other-gateway',
    });

    expect(other.startsWith('other-gateway:sem:idx:')).toBe(true);
    expect(other).not.toBe(base);
    expect(other.split('-').at(-1)).not.toBe(base.split('-').at(-1));
  });

  it('should normalize case and separators in the model segment', () => {
    const name = semanticIndexName('Nomic-Embed-Text', 768);
    expect(name).toMatch(
      /^ai-provider-gateway:sem:idx:nomic-embed-text-768-[a-f0-9]{8}$/,
    );
  });
});
