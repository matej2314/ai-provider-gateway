export interface EmbeddingBackend {
  isAvailable(): boolean;
  embed(text: string, timeoutMs?: number): Promise<number[]>;
}
