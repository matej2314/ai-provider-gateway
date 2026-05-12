export interface CacheBackend {
  isAvailable(): boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
}
