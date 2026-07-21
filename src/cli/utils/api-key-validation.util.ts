import type { GatewayProviderType } from 'src/config/provider-types';
import { isApiKeyRequiredForProviderType } from 'src/config/provider-api-key.validation';

const ANTHROPIC_KEY = /^sk-ant-/;
const GOOGLE_KEY = /^(AIza|AQ\.)/;

/** Validates raw provider API key input before `asProviderApiKey()` branding. */
export function validateProviderApiKey(
  type: GatewayProviderType,
  value: string,
): true | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return isApiKeyRequiredForProviderType(type)
      ? 'API key is required.'
      : true;
  }
  if (type === 'anthropic' && !ANTHROPIC_KEY.test(trimmed)) {
    return 'ANTHROPIC_API_KEY must start with "sk-ant-"';
  }
  if (type === 'google' && !GOOGLE_KEY.test(trimmed)) {
    return 'GOOGLE_API_KEY must start with "AIza" or "AQ."';
  }
  return true;
}
