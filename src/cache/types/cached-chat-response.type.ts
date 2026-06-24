import type { ChatWarningDto } from '../../chat/dto/chat-warning.dto';

export interface CachedChatResponse {
  id: string;
  provider: string;
  model: string;
  output: {
    type: 'text';
    text: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  requestId: string;
  cached: true;
  cachedAt: string;
  warnings?: ChatWarningDto[];
}
