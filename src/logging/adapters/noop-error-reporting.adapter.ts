import { Injectable } from '@nestjs/common';
import type {
  ErrorReportingBackend,
  LogContext,
} from '../interfaces/logger.interface';

@Injectable()
export class NoopErrorReportingAdapter implements ErrorReportingBackend {
  isEnabled(): boolean {
    return false;
  }

  captureException(_error: Error, _context?: LogContext): void {}

  async flush(): Promise<void> {}
}
