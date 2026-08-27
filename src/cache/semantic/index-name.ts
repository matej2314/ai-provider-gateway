/**
 * Pełna znormalizowana nazwa modelu + DIM → nazwa indeksu Redis Search.
 * `qwen3-embedding:0.6b` i `qwen3-embedding:4b` przy tym samym DIM nie współdzielą indeksu.
 * Zmiana modelu lub DIM = nowy indeks.
 */
export function semanticIndexName(embeddingModel: string, dim: number): string {
  const normalized = embeddingModel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${normalized}-${dim}`;
}
