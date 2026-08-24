import { semanticIndexName } from './index-name';

describe('semanticIndexName', () => {
  it('should map qwen3-embedding:0.6b + 1024 to qwen3-1024', () => {
    expect(semanticIndexName('qwen3-embedding:0.6b', 1024)).toBe('qwen3-1024');
  });

  it('should change name when model or dim changes', () => {
    const base = semanticIndexName('qwen3-embedding:0.6b', 1024);
    const otherModel = semanticIndexName('nomic-embed-text', 1024);
    const otherDim = semanticIndexName('qwen3-embedding:0.6b', 768);

    expect(otherModel).not.toBe(base);
    expect(otherDim).not.toBe(base);
  });
});
