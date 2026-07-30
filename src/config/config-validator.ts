import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import {
  GatewayConfigSchema,
  EXPECTED_SCHEMA_VERSION,
  type GatewayConfig,
} from './gateway-config.schema';
import { buildEffectiveGatewayConfig } from './configuration';
import { assertMasterKeyPresent } from './configuration-validation.service';

export interface ValidationResult {
  success: boolean;
  effectiveConfig?: GatewayConfig;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  /** Soft-skip provider API key / base URL presence (agent structural validate). Master key still required. */
  allowMissingProviderSecrets?: boolean;
}

function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
}

function collectInactiveProviderWarnings(
  raw: z.infer<typeof GatewayConfigSchema>,
  _effective: GatewayConfig,
): string[] {
  const warnings: string[] = [];

  for (const [instanceId, row] of Object.entries(raw.providers)) {
    if (row.enabled === false) {
      warnings.push(
        `WARN: Provider instance "${instanceId}" is defined but disabled (enabled:false)`,
      );
    }
  }
  return warnings;
}

export function validateGatewayConfig(
  options: ValidationOptions = {},
): ValidationResult {
  const configPath =
    options.configPath ?? join(process.cwd(), 'gateway.config.yaml');
  const env = options.env ?? process.env;
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsedYaml: unknown;
  try {
    const fileContent = readFileSync(configPath, 'utf-8');
    parsedYaml = yaml.load(fileContent);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      errors.push(`ERROR: Configuration file not found: ${configPath}`);
      return { success: false, errors, warnings };
    }
    errors.push(
      `ERROR: Failed to read or parse YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { success: false, errors, warnings };
  }

  const validationResult = GatewayConfigSchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    errors.push(
      ...formatZodIssues(validationResult.error).map((m) => `ERROR: ${m}`),
    );
    return { success: false, errors, warnings };
  }
  const parsed = validationResult.data;

  if (parsed.schemaVersion < EXPECTED_SCHEMA_VERSION) {
    warnings.push(
      `WARN: [schemaVersion]: ${parsed.schemaVersion} is older than expected.`,
    );
  }

  try {
    assertMasterKeyPresent(parsed, env);
  } catch (err) {
    errors.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, errors, warnings };
  }
  let effectiveConfig: GatewayConfig;

  try {
    if (options.allowMissingProviderSecrets) {
      effectiveConfig = buildEffectiveGatewayConfig(parsed, env, {
        allowMissingProviderApiKeys: true,
      });
    } else {
      effectiveConfig = buildEffectiveGatewayConfig(parsed, env);
    }
  } catch (err) {
    // Provider API keys: validated in buildEffectiveGatewayConfig via apiKeyRef from YAML.
    errors.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, errors, warnings };
  }

  for (const [instanceId, row] of Object.entries(parsed.clients)) {
    const gatewayKey = (env[row.gatewayKeyRef] ?? '').trim();
    if (!gatewayKey) {
      warnings.push(
        `WARN: Client "${instanceId}" has no gateway key (expected non-empty env ${row.gatewayKeyRef})`,
      );
    }
  }

  warnings.push(...collectInactiveProviderWarnings(parsed, effectiveConfig));

  return {
    success: true,
    effectiveConfig,
    errors,
    warnings,
  };
}
