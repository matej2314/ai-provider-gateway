import { applyDecorators, UseGuards } from '@nestjs/common';
import { GatewayKeyGuard } from '../../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../../guards/smart-rate-limit-guard';

export function GatewayKeyAndSmartRateLimit() {
  return applyDecorators(UseGuards(GatewayKeyGuard, SmartRateLimitGuard));
}
