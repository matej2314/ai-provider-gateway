import {
  readNumericStatus,
  readErrorMessage,
  nameLooksLikeTimeout,
} from './provider-error.mapper.helpers';

describe('readNumericStatus', () => {
  it('should read status from error object', () => {
    const error = { status: 429 };

    const result = readNumericStatus(error);

    expect(result).toBe(429);
  });

  it('should read status from nested response object', () => {
    const error = { response: { status: 500 } };

    const result = readNumericStatus(error);

    expect(result).toBe(500);
  });

  it('should prioritize top-level status over nested', () => {
    const error = { status: 429, response: { status: 500 } };

    const result = readNumericStatus(error);

    expect(result).toBe(429);
  });

  it('should return undefined when status not numeric', () => {
    const error = { status: '500' };

    const result = readNumericStatus(error);

    expect(result).toBeUndefined();
  });

  it('should return undefined when status is Infinity', () => {
    const error = { status: Infinity };

    const result = readNumericStatus(error);

    expect(result).toBeUndefined();
  });

  it('should return undefined when status is NaN', () => {
    const error = { status: NaN };

    const result = readNumericStatus(error);

    expect(result).toBeUndefined();
  });

  it('should return undefined when no status', () => {
    const error = { message: 'Error' };

    const result = readNumericStatus(error);

    expect(result).toBeUndefined();
  });

  it('should return undefined for non-object', () => {
    const result = readNumericStatus('error string');

    expect(result).toBeUndefined();
  });

  it('should return undefined for null', () => {
    const result = readNumericStatus(null);

    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    const result = readNumericStatus(undefined);

    expect(result).toBeUndefined();
  });
});

describe('readErrorMessage', () => {
  it('should read message from Error', () => {
    const error = new Error('Test error');

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Test error');
  });

  it('should read message from object', () => {
    const error = { message: 'Error message' };

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Error message');
  });

  it('should return fallback when Error message is empty', () => {
    const error = new Error('');

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback when Error message is whitespace', () => {
    const error = new Error('   ');

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback when object message is empty', () => {
    const error = { message: '' };

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback when object message is whitespace', () => {
    const error = { message: '   ' };

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback when message is not string', () => {
    const error = { message: 123 };

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback when no message property', () => {
    const error = { code: 'ERROR' };

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback for non-object', () => {
    const result = readErrorMessage('string error', 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback for null', () => {
    const result = readErrorMessage(null, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should return fallback for undefined', () => {
    const result = readErrorMessage(undefined, 'Fallback');

    expect(result).toBe('Fallback');
  });

  it('should trim message before checking', () => {
    const error = new Error('  Message  ');

    const result = readErrorMessage(error, 'Fallback');

    expect(result).toBe('  Message  ');
  });
});

describe('nameLooksLikeTimeout', () => {
  it('should return true for AbortError', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(true);
  });

  it('should return true for TimeoutError', () => {
    const error = new Error('Timeout');
    error.name = 'TimeoutError';

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(true);
  });

  it('should return false for Error with different name', () => {
    const error = new Error('Test');
    error.name = 'TestError';

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(false);
  });

  it('should return false for Error with default name', () => {
    const error = new Error('Test');

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(false);
  });

  it('should return false for non-Error object', () => {
    const error = { name: 'AbortError' };

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(false);
  });

  it('should return false for null', () => {
    const result = nameLooksLikeTimeout(null);

    expect(result).toBe(false);
  });

  it('should return false for undefined', () => {
    const result = nameLooksLikeTimeout(undefined);

    expect(result).toBe(false);
  });

  it('should be case-sensitive', () => {
    const error = new Error('Test');
    error.name = 'aborterror';

    const result = nameLooksLikeTimeout(error);

    expect(result).toBe(false);
  });
});
