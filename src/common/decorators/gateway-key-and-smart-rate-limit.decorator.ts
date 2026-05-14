import { applyDecorators, UseGuards } from '@nestjs/common';
import { GatewayKeyGuard } from 'src/guards/gateway-key.guard';
import { SmartRateLimitGuard } from 'src/guards/smart-rate-limit-guard';

export function GatewayKeyAndSmartRateLimit() {
  return applyDecorators(UseGuards(GatewayKeyGuard, SmartRateLimitGuard));
}
