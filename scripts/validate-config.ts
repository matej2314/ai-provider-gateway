import { join } from 'path';
import { validateGatewayConfig } from '../src/config/config-validator';

/**
 * Lokalny dev: jeśli masz `.env`, możesz doładować go tutaj.
 * W CI zwykle nie ma pliku `.env` — env przychodzi z sekretów, więc to jest opcjonalne.
 *
 * Jeśli nie masz zainstalowanego `dotenv`, kod działa dalej (po prostu nie wczyta `.env`).
 */

try {
  require('dotenv').config();
} catch {}

const configPath =
  process.env.CONFIG_PATH ?? join(process.cwd(), 'gateway.config.yaml');

const result = validateGatewayConfig({
  configPath,
});

for (const warning of result.warnings) console.warn(warning);
for (const error of result.errors) console.error(error);

if (result.success) {
  const config = result.effectiveConfig;
  const providers = config ? Object.keys(config.providers).length : 0;
  const models = config ? Object.keys(config.models).length : 0;
  const clients = config ? Object.keys(config.clients).length : 0;
  console.log(
    `Config validated successfully. Found ${providers} providers, ${models} models, ${clients} clients.`,
  );
} else {
  console.error('Config validation failed.');
}

process.exit(result.success ? 0 : 1);
