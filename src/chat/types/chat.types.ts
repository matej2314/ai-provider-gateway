/**
 * Shared types for Chat module services
 */

import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { LoggingService } from '../../logging/logging.service';
import type {
  RequestId,
  GatewayKey,
  ModelAlias,
} from '../../common/types/branded.types';

/**
 * Common parameters passed to service methods
 */
export interface ChatExecutionContext {
  requestBody: ChatRequestDto;
  requestId: RequestId;
  gatewayKey: GatewayKey;
  modelAlias: ModelAlias;
  log: LoggingService;
}

/**
 * Provider call context
 */
export interface ProviderCallContext {
  requestBody: ChatRequestDto;
  alias: ModelAlias;
  requestId: RequestId;
  options: ProviderCallOptions;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
}
