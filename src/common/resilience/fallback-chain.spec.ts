import { HttpException, HttpStatus } from '@nestjs/common';
import { assertNoFallbackCycle } from './fallback-chain';
import { ApiErrorCode } from '../errors/api-error.code';

describe('assertNoFallbackCycle', () => {
  it('should pass when fallbackAlias is different', () => {
    expect(() => assertNoFallbackCycle('primary', 'fallback')).not.toThrow();
  });

  it('should pass when fallbackAlias is undefined', () => {
    expect(() => assertNoFallbackCycle('primary', undefined)).not.toThrow();
  });

  it('should pass when fallbackAlias is not provided', () => {
    expect(() => assertNoFallbackCycle('primary')).not.toThrow();
  });

  it('should throw when primaryAlias equals fallbackAlias', () => {
    expect(() => assertNoFallbackCycle('alias1', 'alias1')).toThrow(
      HttpException,
    );

    try {
      assertNoFallbackCycle('alias1', 'alias1');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(e.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message:
          'Circular fallback detected: alias "alias1" cannot fallback to itself',
      });
    }
  });

  it('should throw with correct alias in message', () => {
    try {
      assertNoFallbackCycle('my-model', 'my-model');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect(e.getResponse()).toMatchObject({
        message:
          'Circular fallback detected: alias "my-model" cannot fallback to itself',
      });
    }
  });

  it('should pass when aliases differ by case', () => {
    expect(() => assertNoFallbackCycle('Primary', 'primary')).not.toThrow();
  });

  it('should pass when aliases differ by whitespace', () => {
    expect(() => assertNoFallbackCycle('primary', 'primary ')).not.toThrow();
  });

  it('should throw when both are empty strings', () => {
    expect(() => assertNoFallbackCycle('', '')).not.toThrow();
    expect(() => assertNoFallbackCycle('primary', '')).not.toThrow();
  });
});
