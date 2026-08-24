export function semanticIndexName(embeddingModel: string, dim: number): string {
  const head = embeddingModel.split(':')[0] ?? embeddingModel;
  const slug = head.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${dim}`;
}
