import type { ChatWarningDto } from '../../chat/dto/chat-warning.dto';
import type {
  RequestId,
  ResponseId,
  ProviderInstanceId,
  ModelAlias,
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
    inputTokens: number;
    outputTokens: number;
  };
  requestId: RequestId;
  cached: true;
  cachedAt: string;
  warnings?: ChatWarningDto[];
}
