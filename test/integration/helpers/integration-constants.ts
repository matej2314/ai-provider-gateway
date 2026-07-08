import {
  asGatewayKey,
  asModelAlias,
  asModelId,
  asProviderInstanceId,
  type GatewayKey,
} from '../../../src/common/types';
import type { ResolvedSystemPrompts } from '../../../src/config/configuration.types';

export const INTEGRATION_MASTER_KEY_REF = 'MASTER_KEY';
export const INTEGRATION_GATEWAY_KEY_REF = 'INTEGRATION_GATEWAY_KEY';
export const INTEGRATION_ANTHROPIC_API_KEY_REF =
  'INTEGRATION_ANTHROPIC_API_KEY';
export const INTEGRATION_GOOGLE_API_KEY_REF = 'INTEGRATION_GOOGLE_API_KEY';

export const INTEGRATION_GATEWAY_CLIENT_ID = 'integration-ide';
export const INTEGRATION_PROVIDER_INSTANCE = 'anthropic-it';
export const INTEGRATION_MODEL_ALIAS = 'it-chat';
export const INTEGRATION_MODEL_ID = 'claude-sonnet-4-5';
export const INTEGRATION_SECOND_MODEL_ALIAS = 'it-chat-fast';
export const INTEGRATION_SECOND_MODEL_ID = 'claude-sonnet-4-6';

export const INTEGRATION_MODEL_ALIAS_BRANDED = asModelAlias(
  INTEGRATION_MODEL_ALIAS,
);
export const INTEGRATION_SECOND_MODEL_ALIAS_BRANDED = asModelAlias(
  INTEGRATION_SECOND_MODEL_ALIAS,
);
export const INTEGRATION_MODEL_ID_BRANDED = asModelId(INTEGRATION_MODEL_ID);
export const INTEGRATION_PROVIDER_INSTANCE_BRANDED = asProviderInstanceId(
  INTEGRATION_PROVIDER_INSTANCE,
);

export const INTEGRATION_API_PREFIX = '/api/v1';

export const INTEGRATION_ROUTES = {
  health: `${INTEGRATION_API_PREFIX}/health`,
  healthReady: `${INTEGRATION_API_PREFIX}/health/ready`,
  chat: `${INTEGRATION_API_PREFIX}/chat`,
  chatStream: `${INTEGRATION_API_PREFIX}/chat/stream`,
  openAiCompletions: `${INTEGRATION_API_PREFIX}/openai/chat/completions`,
  anthropicMessages: `${INTEGRATION_API_PREFIX}/anthropic/messages`,
} as const;

export const INTEGRATION_POST_SUCCESS_STATUS = 201;

export const INTEGRATION_RESOLVED_PROMPTS: ResolvedSystemPrompts = {
  master: 'integration master prompt',
  main: 'integration main prompt',
  perModelByAlias: {},
};

export function readIntegrationEnv(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim();
}

export function getIntegrationGatewayKey(): GatewayKey {
  return asGatewayKey(readIntegrationEnv(INTEGRATION_GATEWAY_KEY_REF));
}

export function getIntegrationMasterKey(): GatewayKey {
  return asGatewayKey(readIntegrationEnv(INTEGRATION_MASTER_KEY_REF));
}

export function buildIntegrationGatewayKeyAllowList(): GatewayKey[] {
  return [
    readIntegrationEnv(INTEGRATION_GATEWAY_KEY_REF),
    readIntegrationEnv(INTEGRATION_MASTER_KEY_REF),
  ]
    .filter(Boolean)
    .map(asGatewayKey);
}
