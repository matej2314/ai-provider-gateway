import { loadIntegrationEnv } from '../helpers/load-integration-env';
import { waitForRedis } from '../helpers/wait-for-redis';

export default async function globalSetup(): Promise<void> {
  loadIntegrationEnv();

  const ready = await waitForRedis({ timeoutMs: 30_000 });

  if (!ready) {
    throw new Error(
      '[integration] Redis not ready. Start: npm run test:integration:redis:up',
    );
  }
}
