import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import {
  validateGatewayConfig,
  type ValidationResult,
} from 'src/config/config-validator';
import { validate as validateEnv } from 'src/config/env.validation';

export interface CliValidateOptions {
  cwd?: string;
  configPath?: string;
  envPath?: string;
  validateEnvFormat?: boolean;
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
    });

    if (options.validateEnvFormat !== false && result.success) {
      try {
        validateEnv(process.env);
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
