import {
  EMBEDDING_CIRCUIT_COOLDOWN_MS,
  EMBEDDING_CIRCUIT_OPEN_AFTER,
} from './semantic-cache.constants';

export class EmbeddingCircuitBreaker {
  private failures = 0;
  private readonly openAfter: number;
  private readonly cooldownMs: number;
  private openedAtMs = 0;
  private trialInFlight = false;

  constructor(
    openAfter = EMBEDDING_CIRCUIT_OPEN_AFTER,
    cooldownMs = EMBEDDING_CIRCUIT_COOLDOWN_MS,
  ) {
    this.openAfter = openAfter;
    this.cooldownMs = cooldownMs;
  }

  shouldSkipEmbed(): boolean {
    if (this.failures < this.openAfter) return false;
    const cooledDown = Date.now() - this.openedAtMs >= this.cooldownMs;
    if (!cooledDown) return true;
    if (this.trialInFlight) return true;
    this.trialInFlight = true;
    return false;
  }

  isCircuitOpen(): boolean {
    return (
      this.failures >= this.openAfter &&
      Date.now() - this.openedAtMs < this.cooldownMs
    );
  }

  recordEmbedFailure(): void {
    this.failures++;
    this.trialInFlight = false;
    if (this.failures >= this.openAfter) {
      this.openedAtMs = Date.now();
    }
  }

  recordEmbedSuccess(): void {
    this.failures = 0;
    this.openedAtMs = 0;
    this.trialInFlight = false;
  }
}
