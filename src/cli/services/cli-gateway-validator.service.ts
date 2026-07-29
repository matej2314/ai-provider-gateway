import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import {
  validateGatewayConfig,
  type ValidationResult,
} from 'src/config/config-validator';
import { validateEnvironment } from 'src/config/configuration-validation.service';

export interface CliValidateOptions {
  cwd?: string;
  configPath?: string;
  envPath?: string;
  validateEnvFormat?: boolean;
  /** Soft-skip provider API key / base URL presence (agent structural validate). Master key still required. */
  allowMissingProviderSecrets?: boolean;
}

@Injectable()
export class CliGatewayValidatorService {
  validate(options: CliValidateOptions = {}): ValidationResult {
    const cwd = options.cwd ?? process.cwd();
    const configPath = options.configPath ?? join(cwd, 'gateway.config.yaml');
    const envPath = options.envPath ?? join(cwd, '.env');

    dotenvConfig({ path: envPath });

    const result = validateGatewayConfig({
      configPath,
      env: process.env,
      allowMissingProviderSecrets: options.allowMissingProviderSecrets,
    });

    if (options.validateEnvFormat !== false && result.success) {
      try {
        validateEnvironment(process.env);
      } catch (err) {
        return {
          ...result,
          success: false,
          errors: [
            ...result.errors,
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
          ],
        };
      }
    }

    return result;
  }
}
