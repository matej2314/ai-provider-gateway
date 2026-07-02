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
