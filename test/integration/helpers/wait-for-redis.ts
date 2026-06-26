import Redis from 'ioredis';

export type RedisConnectionOptions = {
  host: string;
  port: number;
  password?: string;
  db: number;
};

export type WaitForRedisOptions = Partial<RedisConnectionOptions> & {
  timeoutMs?: number;
  intervalMs?: number;
};

export function getRedisConnectionOptions(
  env: NodeJS.ProcessEnv = process.env,
): RedisConnectionOptions {
  const password = env.REDIS_PASSWORD?.trim();

  return {
    host: env.REDIS_HOST ?? '127.0.0.1',
    port: Number(env.REDIS_PORT ?? 6380),
    password: password ? password : undefined,
    db: Number(env.REDIS_DB ?? 15),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRedis(
  options: WaitForRedisOptions = {},
): Promise<boolean> {
  const {
    host,
    port,
    password,
    db,
    timeoutMs = 30_000,
    intervalMs = 500,
  } = { ...getRedisConnectionOptions(), ...options };

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const client = new Redis({
      host,
      port,
      password,
      db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      if (pong === 'PONG') return true;
    } catch (error) {
      lastError = error;
      client.disconnect();
      await sleep(intervalMs);
    }
  }

  console.warn('[integration] Redis unreachable', {
    host,
    port,
    db,
    lastError,
  });
  return false;
}

export async function isRedisReachable(): Promise<boolean> {
  return waitForRedis({ timeoutMs: 5_000 });
}
