import type OpenAI from 'openai';

export function mapGatewayMetadataToOpenAi(
  metadata: Record<string, string | number | boolean>,
): OpenAI.Responses.ResponseCreateParams['metadata'] {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value)]),
  );
}
