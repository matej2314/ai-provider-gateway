import { applyDecorators, UseFilters, UseGuards } from '@nestjs/common';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { OpenAiExceptionFilter } from '../filters/openai-exception.filter';

export function OpenAiAuth() {
  return applyDecorators(
    UseGuards(OpenAiBearerAuthGuard, SmartRateLimitGuard),
    UseFilters(OpenAiExceptionFilter),
  );
}
