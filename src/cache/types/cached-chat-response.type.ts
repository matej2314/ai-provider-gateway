import type { ChatWarningDto } from '../../chat/dto/chat-warning.dto';
import type { RequestId, ProviderInstanceId, MessageId } from '../../common/types/branded.types';

export interface CachedChatResponse {
  id: string;
  provider: ProviderInstanceId;
  model: string;
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
