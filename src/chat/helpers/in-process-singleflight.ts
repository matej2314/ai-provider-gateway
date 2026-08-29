/**
 * In-process coalescing: concurrent callers with the same key share one work().
 * After settle the entry is removed so the next call starts fresh.
 */
export const createInProcessSingleflight = <T>(): ((
  key: string,
  work: () => Promise<T>,
) => Promise<T>) => {
  const inFlight = new Map<string, Promise<T>>();

  return (key: string, work: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const pending = work().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
    return pending;
  };
};
