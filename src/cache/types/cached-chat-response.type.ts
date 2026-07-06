import type { ChatWarningDto } from '../../chat/dto/chat-warning.dto';
import type {
  RequestId,
  ResponseId,
  ProviderInstanceId,
  ModelAlias,
  InputTokens,
  OutputTokens,
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
  warnings?: ChatWarningDto[];
}
