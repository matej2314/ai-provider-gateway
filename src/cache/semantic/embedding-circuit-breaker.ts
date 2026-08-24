export class EmbeddingCircuitBreaker {
  private failures = 0;
  private readonly openAfter: number;

  constructor(openAfter = 3) {
    this.openAfter = openAfter;
  }

  isCircuitOpen(): boolean {
    return this.failures >= this.openAfter;
  }

  recordEmbedFailure(): void {
    this.failures += 1;
  }

  recordEmbedSuccess(): void {
    this.failures = 0;
  }
}
