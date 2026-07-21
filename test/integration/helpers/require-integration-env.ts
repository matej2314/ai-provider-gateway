export function requireVendorApiKey(): string | undefined {
  return (
    process.env.INTEGRATION_ANTHROPIC_API_KEY?.trim() ||
    process.env.INTEGRATION_GOOGLE_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  );
}

export function hasOpenAiIntegrationEnv(): boolean {
  const apiKey =
    process.env.INTEGRATION_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    '';
  const baseUrl =
    process.env.INTEGRATION_OPENAI_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    '';
  return Boolean(apiKey && baseUrl);
}

export function requireOpenAiIntegrationEnv(): {
  apiKey: string;
  baseUrl: string;
} {
  const apiKey =
    process.env.INTEGRATION_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    '';
  const baseUrl = (
    process.env.INTEGRATION_OPENAI_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    ''
  ).replace(/\/$/, '');

  if (!apiKey) {
    throw new Error(
      'Missing INTEGRATION_OPENAI_API_KEY (or OPENAI_API_KEY) for OpenAI integration tests.',
    );
  }
  if (!baseUrl) {
    throw new Error(
      'Missing INTEGRATION_OPENAI_BASE_URL (or OPENAI_BASE_URL) for OpenAI integration tests.',
    );
  }

  return { apiKey, baseUrl };
}

/**
 * Builds environment variable names for openai-compatible provider
 * Example: 'ollama-local' -> { apiKeyEnv: 'INTEGRATION_OLLAMA_LOCAL_API_KEY', ... }
 */
function buildOpenAiCompatibleEnvNames(instanceId: string): {
  apiKeyEnv: string;
  baseUrlEnv: string;
} {
  const envPrefix = instanceId.toUpperCase().replace(/-/g, '_');
  return {
    apiKeyEnv: `INTEGRATION_${envPrefix}_API_KEY`,
    baseUrlEnv: `INTEGRATION_${envPrefix}_BASE_URL`,
  };
}

/**
 * Checks if environment variables are set for a specific openai-compatible provider
 */
export function hasOpenAiCompatibleProviderEnv(instanceId: string): boolean {
  const { apiKeyEnv, baseUrlEnv } = buildOpenAiCompatibleEnvNames(instanceId);
  const apiKey = process.env[apiKeyEnv]?.trim() || '';
  const baseUrl = process.env[baseUrlEnv]?.trim() || '';
  return Boolean(apiKey && baseUrl);
}

/**
 * Requires and returns environment variables for a specific openai-compatible provider
 * Throws error if variables are missing
 */
export function requireOpenAiCompatibleIntegrationEnv(instanceId: string): {
  apiKey: string;
  baseUrl: string;
} {
  const { apiKeyEnv, baseUrlEnv } = buildOpenAiCompatibleEnvNames(instanceId);
  const apiKey = process.env[apiKeyEnv]?.trim() || '';
  const baseUrl = (process.env[baseUrlEnv]?.trim() || '').replace(/\/$/, '');

  if (!apiKey) {
    throw new Error(
      `Missing ${apiKeyEnv} for ${instanceId} integration tests. ` +
        `Add it to .env.test file.`,
    );
  }
  if (!baseUrl) {
    throw new Error(
      `Missing ${baseUrlEnv} for ${instanceId} integration tests. ` +
        `Add it to .env.test file.`,
    );
  }

  return { apiKey, baseUrl };
}
