/**
 * Shared types for Chat module services
 */

import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { LoggingService } from '../../logging/logging.service';

/**
 * Common parameters passed to service methods
 */
export interface ChatExecutionContext {
  requestBody: ChatRequestDto;
  requestId: string;
  gatewayKey: string;
  modelAlias: string;
  log: LoggingService;
}

/**
 * Provider call context
 */
export interface ProviderCallContext {
  requestBody: ChatRequestDto;
  alias: string;
  requestId: string;
  options: ProviderCallOptions;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
}
