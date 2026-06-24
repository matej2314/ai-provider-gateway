import { Test } from '@nestjs/testing';
import { LoggingService } from './logging.service';
import { LOGGER_BACKEND, ERROR_REPORTING_BACKEND } from './logging.tokens';
import type {
  LoggerBackend,
  ErrorReportingBackend,
} from './interfaces/logger.interface';

const mockLoggerBackend: LoggerBackend = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
};

const mockErrorReporting: ErrorReportingBackend = {
  isEnabled: jest.fn().mockReturnValue(false),
  captureException: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
};

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggingService,
        { provide: LOGGER_BACKEND, useValue: mockLoggerBackend },
        { provide: ERROR_REPORTING_BACKEND, useValue: mockErrorReporting },
      ],
    }).compile();

    service = module.get(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create child logger with context', () => {
    const child = service.child({ module: 'TestModule' });

    expect(child).toBeInstanceOf(LoggingService);
  });

  it('should have debug method', () => {
    expect(typeof Reflect.get(service, 'debug')).toBe('function');
  });

  it('should have info method', () => {
    expect(typeof Reflect.get(service, 'info')).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof Reflect.get(service, 'warn')).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof Reflect.get(service, 'error')).toBe('function');
  });

  it('should not throw when logging', () => {
    expect(() => service.debug('Debug message')).not.toThrow();
    expect(() => service.info('Info message')).not.toThrow();
    expect(() => service.warn('Warn message')).not.toThrow();
    expect(() =>
      service.error('Error message', new Error('test')),
    ).not.toThrow();
  });

  it('should accept context objects', () => {
    expect(() =>
      service.info('Message with context', { userId: '123' }),
    ).not.toThrow();
  });

  it('should support child loggers', () => {
    const child = service.child({ module: 'ChildModule' });

    expect(() => child.info('Child log')).not.toThrow();
  });
});
