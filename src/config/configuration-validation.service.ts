import { validate, type ValidatedEnvironment } from './env.validation';
import {
  assertEnabledProviderApiKeysPresent,
  type RawGatewayConfig,
} from './provider-api-key.validation';
import { assertEnabledProviderBaseUrlPresent } from './provider-base-url.validation';
import type { GatewayConfig } from './gateway-config.schema';

/**
 * Single entry point for configuration validation orchestration.
 * Low-level rules stay in env.validation / provider-*-validation;
 * this facade is the only place callers should compose them.
 *
 * Plain class (not Nest Injectable) — used during ConfigModule bootstrap
 * before the DI container exists.
 */
export class ConfigurationValidationService {
  validateEnvironment(config: Record<string, unknown>): ValidatedEnvironment {
    return validate(config);
  }

  assertMasterKeyPresent(
    config: Pick<GatewayConfig, 'masterKeyRef'>,
    env: NodeJS.ProcessEnv = process.env,
  ): void {
    const masterRaw = (env[config.masterKeyRef] ?? '').trim();
    if (!masterRaw) {
      throw new Error('[GatewayKey] Missing master key.');
    }
  }

  assertEnabledProviderSecretsPresent(
    config: RawGatewayConfig,
    env: NodeJS.ProcessEnv = process.env,
  ): void {
    assertEnabledProviderApiKeysPresent(config, env);
    assertEnabledProviderBaseUrlPresent(config, env);
  }

  /**
   * Validates master key + provider secrets for an already-parsed YAML config.
   * Does not load files or run Zod schema checks — those stay in config-validator.
   */
  validateParsedGatewayConfig(
    config: RawGatewayConfig,
    env: NodeJS.ProcessEnv = process.env,
  ): void {
    this.assertMasterKeyPresent(config, env);
    this.assertEnabledProviderSecretsPresent(config, env);
  }
}

export const configurationValidation = new ConfigurationValidationService();

/** Nest `ConfigModule.forRoot({ validate })` hook */
export function validateEnvironment(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  return configurationValidation.validateEnvironment(config);
}

export function assertMasterKeyPresent(
  config: Pick<GatewayConfig, 'masterKeyRef'>,
  env: NodeJS.ProcessEnv = process.env,
): void {
  configurationValidation.assertMasterKeyPresent(config, env);
}

export function assertEnabledProviderSecretsPresent(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  configurationValidation.assertEnabledProviderSecretsPresent(config, env);
}
