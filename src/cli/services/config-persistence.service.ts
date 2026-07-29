import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import {
  GatewayConfig,
  GatewayConfigSchema,
} from 'src/config/gateway-config.schema';
import { buildEffectiveGatewayConfig } from 'src/config/configuration';
import { FileManagerService } from './file-manager.service';
import { ValidationFormatter } from '../utils/validation-formatter.util';

function normalizeGatewayConfigForWrite(config: GatewayConfig): GatewayConfig {
  return {
    ...config,
    providers: Object.fromEntries(
      Object.entries(config.providers).map(([id, row]) => [
        id,
        { ...row, enabled: row.enabled !== false },
      ]),
    ),
  };
}

@Injectable()
export class ConfigPersistenceService {
  constructor(private readonly fileManager: FileManagerService) {}

  async persistConfig(
    config: GatewayConfig,
    cwd: string,
    options: {
      skipEffectiveCheck?: boolean;
      /**
       * Soft-skip provider API key / base URL presence (agent defer / structural write).
       * Same semantics as CliGatewayValidatorService.allowMissingProviderSecrets.
       * Still enforces active models / enabled-provider invariants via buildEffective.
       */
      allowMissingProviderSecrets?: boolean;
    } = {},
  ): Promise<GatewayConfig> {
    const parsed = GatewayConfigSchema.safeParse(config);
    if (!parsed.success) {
      throw new Error(ValidationFormatter.formatZodError(parsed.error));
    }

    if (!options.skipEffectiveCheck) {
      dotenvConfig({ path: join(cwd, '.env') });
      try {
        buildEffectiveGatewayConfig(parsed.data, process.env, {
          allowMissingProviderApiKeys:
            options.allowMissingProviderSecrets === true,
        });
      } catch (err) {
        throw new Error(
          ValidationFormatter.formatRuntimeError(
            err instanceof Error ? err : new Error(String(err)),
          ),
        );
      }
    }

    const configPath = join(cwd, 'gateway.config.yaml');
    const normalized = normalizeGatewayConfigForWrite(parsed.data);
    await this.fileManager.backupFile(configPath);
    await this.fileManager.writeYaml(configPath, normalized);
    return normalized;
  }
}
