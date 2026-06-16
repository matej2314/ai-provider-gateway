import type { LoggingService } from '../../logging/logging.service';

export function createMockLoggingService(): Partial<LoggingService> {
  return {
    child: jest.fn().mockReturnThis(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
