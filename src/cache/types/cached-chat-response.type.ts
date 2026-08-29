import type { ProviderUsageDetails } from '../../providers/interfaces/ai-provider.interface';
import type {
  ResponseId,
  ProviderInstanceId,
  ModelAlias,
  InputTokens,
  OutputTokens,
  SystemFingerprint,
} from '../../common/types/branded.types';

export type CachedFinishReason =
  | 'stop'
  | 'tool_calls'
  | 'length'
  | 'content_filter';

export type CachedChatWarning = {
  code: string;
  message: string;
  field?: string;
};

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
  cached: true;
  cachedAt: string;
  finishReason: CachedFinishReason;
  warnings?: CachedChatWarning[];
  thinkingContent?: string;
  effectiveModelAlias?: ModelAlias;
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: SystemFingerprint;
}
