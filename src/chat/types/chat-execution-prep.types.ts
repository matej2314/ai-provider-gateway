import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { ResolvedSystemPrompts } from '../../config/configuration.types';
import type { ConversationId } from '../../common/types/branded.types';

export interface ChatExecutionPrep {
  primaryResolved: ResolvedProviderConfig;
  options: ProviderCallOptions;
  responseConversationId: ConversationId;
  resolvedPrompts: ResolvedSystemPrompts;
}
