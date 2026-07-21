import { applyDecorators, UseFilters, UseGuards } from '@nestjs/common';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { AnthropicExceptionFilter } from '../filters/anthropic-exception.filter';

export function AnthropicAuth() {
  return applyDecorators(
    UseGuards(AnthropicApiKeyGuard, SmartRateLimitGuard),
    UseFilters(AnthropicExceptionFilter),
  );
}
