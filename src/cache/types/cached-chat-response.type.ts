import type { ChatWarningDto } from '../../chat/dto/chat-warning.dto';
import type { GatewayFinishReason } from '../../chat/types/gateway-finish-reason.type';
import type { ProviderUsageDetails } from '../../providers/interfaces/ai-provider.interface';
import type {
  RequestId,
  ResponseId,
  ProviderInstanceId,
  ModelAlias,
  InputTokens,
  OutputTokens,
  SystemFingerprint,
} from '../../common/types/branded.types';

export interface CachedChatResponse {
  id: ResponseId;
  provider: ProviderInstanceId;
  model: ModelAlias;
  output: {
    type: 'text';
    text: string;
  };
  usage?: {
    inputTokens: InputTokens;
    outputTokens: OutputTokens;
  };
  requestId: RequestId;
  cached: true;
  cachedAt: string;
  finishReason: GatewayFinishReason;
  warnings?: ChatWarningDto[];
  thinkingContent?: string;
  effectiveModelAlias?: ModelAlias;
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: SystemFingerprint;
}
