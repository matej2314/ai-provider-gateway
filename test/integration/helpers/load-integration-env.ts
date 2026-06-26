import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

export function loadIntegrationEnv(): void {
  const envPath = join(process.cwd(), '.env.test');

  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}
