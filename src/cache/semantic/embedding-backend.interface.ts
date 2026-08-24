export interface EmbeddingBackend {
  isAvailable(): boolean;
  embed(text: string): Promise<number[]>;
}
