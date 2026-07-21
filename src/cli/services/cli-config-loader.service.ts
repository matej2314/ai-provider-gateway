import { Injectable } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import {
  GatewayConfigSchema,
  GatewayConfig,
} from '../../config/gateway-config.schema';
import { isApiKeyRequiredForProviderType } from '../../config/provider-api-key.validation';
import { isOpenAiProviderType } from '../../config/provider-types';

@Injectable()
export class CliConfigLoaderService {
  isBoilerplateConfig(path?: string): boolean {
    try {
      const config = this.loadRawConfig(path);

      const hasPlaceholderRefs =
        config.masterKeyRef.includes('PLACEHOLDER') ||
        config.masterKeyRef.includes('placeholder');

      const hasPlaceholderProviders = Object.keys(config.providers).some(
        (key) => key.includes('placeholder'),
      );

      const hasPlaceholderClients = Object.keys(config.clients).some((key) =>
        key.includes('placeholder'),
      );

      return (
        hasPlaceholderRefs || hasPlaceholderProviders || hasPlaceholderClients
      );
    } catch {
      return false;
    }
  }

  loadRawConfig(path?: string): GatewayConfig {
    const configPath = path || join(process.cwd(), 'gateway.config.yaml');

    if (!existsSync(configPath)) {
      throw new Error(
        `Configuration file not found: ${configPath}\n` +
          `Run "gateway config:init" to create it.`,
      );
    }

    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      const parsedYaml = yaml.load(fileContent);

      // Parsuj przez Zod schema (walidacja struktury)
      const result = GatewayConfigSchema.safeParse(parsedYaml);

      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const errorMessages = Object.entries(errors)
          .map(([field, msgs]) => `  ${field}: ${msgs?.join(', ')}`)
          .join('\n');

        throw new Error(`Configuration validation failed:\n${errorMessages}`);
      }

      return result.data;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('validation failed')
      ) {
        throw error;
      }
      throw new Error(`Failed to parse configuration file: ${String(error)}`);
    }
  }

  configExists(path?: string): boolean {
    const configPath = path || join(process.cwd(), 'gateway.config.yaml');
    return existsSync(configPath);
  }

  /**
   * Walidacja strukturalna YAML + lista brakujących env.
   * Pełna walidacja runtime: CliGatewayValidatorService / gateway config:validate.
   */
  loadWithEnvCheck(path?: string): {
    config: GatewayConfig;
    missingEnvVars: string[];
  } {
    const config = this.loadRawConfig(path);
    const missing: string[] = [];

    if (!process.env[config.masterKeyRef]?.trim()) {
      missing.push(config.masterKeyRef);
    }

    for (const [_id, provider] of Object.entries(config.providers)) {
      if (provider.enabled === false) continue;

      if (
        isApiKeyRequiredForProviderType(provider.type) &&
        !process.env[provider.apiKeyRef]?.trim()
      ) {
        missing.push(provider.apiKeyRef);
      }

      if (
        isOpenAiProviderType(provider.type) &&
        provider.baseUrlRef &&
        !process.env[provider.baseUrlRef]?.trim()
      ) {
        missing.push(provider.baseUrlRef);
      }
    }
    for (const [_id, client] of Object.entries(config.clients)) {
      if (!process.env[client.gatewayKeyRef]?.trim()) {
        missing.push(client.gatewayKeyRef);
      }
    }
    return { config, missingEnvVars: missing };
  }

  envExists(path?: string): boolean {
    const envPath = path || join(process.cwd(), '.env');
    return existsSync(envPath);
  }
}
