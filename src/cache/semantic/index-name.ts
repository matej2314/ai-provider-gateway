/** qwen3-embedding:0.6b + 1024 → qwen3-1024 (zmiana modelu/DIM = nowy indeks). */
export function semanticIndexName(embeddingModel: string, dim: number): string {
  const head = embeddingModel.split(':')[0] ?? embeddingModel;
  const family = head.split(/[^a-zA-Z0-9]+/)[0] ?? head;
  return `${family}-${dim}`;
}
