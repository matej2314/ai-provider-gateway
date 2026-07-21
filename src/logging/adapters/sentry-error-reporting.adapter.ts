import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type {
  ErrorReportingBackend,
  LogContext,
} from '../interfaces/logger.interface';

@Injectable()
export class SentryErrorReportingAdapter implements ErrorReportingBackend {
  isEnabled(): boolean {
    return true;
  }

  captureException(error: Error, context?: LogContext): void {
    const includePrompts = process.env.SENTRY_INCLUDE_PROMPTS === 'true';

    Sentry.withScope((scope) => {
      if (context?.requestId) scope.setTag('requestId', context?.requestId);
      if (context?.module) scope.setTag('module', String(context?.module));
      if (context?.provider)
        scope.setTag('provider', String(context?.provider));
      if (context?.modelAlias) {
        scope.setTag('modelAlias', String(context?.modelAlias));
      }

      const {
        requestId,
        module,
        provider,
        modelAlias,
        message,
        level,
        ...rest
      } = context ?? {};

      scope.setExtras({
        ...rest,
        ...(requestId !== undefined ? { requestId } : {}),
        ...(module !== undefined ? { module: String(module) } : {}),
        ...(provider !== undefined ? { provider: String(provider) } : {}),
        ...(modelAlias !== undefined ? { modelAlias: String(modelAlias) } : {}),
        ...(typeof message === 'string' ? { logMessage: message } : {}),
        ...(typeof level === 'string' ? { logLevel: level } : {}),
      });

      if (!includePrompts) {
        scope.setExtra('promptsIncluded', false);
      }

      Sentry.captureException(error);
    });
  }

  async flush(timeoutMs = 2000): Promise<void> {
    await Sentry.flush(timeoutMs);
  }
}
