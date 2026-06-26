import Redis from 'ioredis';
import { getRedisConnectionOptions } from './wait-for-redis';

export async function flushIntegrationRedisDb(): Promise<void> {
  const { host, port, password, db } = getRedisConnectionOptions();

  const client = new Redis({
    host,
    port,
    password,
    db,
    lazyConnect: true,
  });
  await client.connect();
  await client.flushdb();
  await client.quit();
}
