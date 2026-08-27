import { semanticIndexName } from './index-name';

describe('semanticIndexName', () => {
  it('should map full normalized model + dim (not first family segment)', () => {
    expect(semanticIndexName('qwen3-embedding:0.6b', 1024)).toBe(
      'qwen3-embedding-0-6b-1024',
    );
  });

  it('should give different names for same-family models at the same DIM', () => {
    const small = semanticIndexName('qwen3-embedding:0.6b', 1024);
    const large = semanticIndexName('qwen3-embedding:4b', 1024);

    expect(small).toBe('qwen3-embedding-0-6b-1024');
    expect(large).toBe('qwen3-embedding-4b-1024');
    expect(small).not.toBe(large);
  });

  it('should change name when dim changes', () => {
    const base = semanticIndexName('qwen3-embedding:0.6b', 1024);
    const otherDim = semanticIndexName('qwen3-embedding:0.6b', 768);

    expect(otherDim).toBe('qwen3-embedding-0-6b-768');
    expect(otherDim).not.toBe(base);
  });

  it('should normalize case and separators', () => {
    expect(semanticIndexName('Nomic-Embed-Text', 768)).toBe(
      'nomic-embed-text-768',
    );
  });
});
