import {
  asConversationId,
  asGatewayKey,
  asModelAlias,
  asModelId,
  asProviderInstanceId,
  asRequestId,
  asToolCallId,
} from '../types/branded.types';

export const VALID_CONVERSATION_ID =
  'conv_123e4567-e89b-12d3-a456-426614174000';

/** UUID v4 for jest `uuid` mocks — yields valid `conv_${MOCK_UUID}` */
export const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';

export const TEST_CONVERSATION_ID = asConversationId(VALID_CONVERSATION_ID);

export const TEST_MODEL_ALIAS = 'test-model';
export const TEST_MODEL_ALIAS_BRANDED = asModelAlias(TEST_MODEL_ALIAS);

export const TEST_PROVIDER_INSTANCE = 'anthropic-primary';
export const TEST_PROVIDER_INSTANCE_BRANDED =
  asProviderInstanceId(TEST_PROVIDER_INSTANCE);

export const TEST_API_KEY_REF = 'ANTHROPIC_API_KEY_TEST';

export const TEST_MASTER_KEY_REF = 'MASTER_KEY_TEST';

export const TEST_GATEWAY_KEY = 'gw_key_123';
export const TEST_GATEWAY_KEY_BRANDED = asGatewayKey(TEST_GATEWAY_KEY);

export const TEST_REQUEST_ID = asRequestId('req-123');

export const TEST_MODEL_ID = asModelId('claude-sonnet-4-5');

export const TEST_TOOL_CALL_ID = asToolCallId('call_123');

export const TEST_RESPONSE_ID_PREFIX = `gw_${MOCK_UUID}`;
