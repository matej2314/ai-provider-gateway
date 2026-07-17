import { HttpException, HttpStatus } from '@nestjs/common';
import { assertNoFallbackCycle } from './fallback-chain';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { asModelAlias } from '../../common/types/branded.types';

const primary = asModelAlias('primary');
const fallback = asModelAlias('fallback');
const alias1 = asModelAlias('alias1');
const myModel = asModelAlias('my-model');

describe('assertNoFallbackCycle', () => {
  it('should pass when fallbackAlias is different', () => {
    expect(() => assertNoFallbackCycle(primary, fallback)).not.toThrow();
  });

  it('should pass when fallbackAlias is undefined', () => {
    expect(() => assertNoFallbackCycle(primary, undefined)).not.toThrow();
  });

  it('should pass when fallbackAlias is not provided', () => {
    expect(() => assertNoFallbackCycle(primary)).not.toThrow();
  });

  it('should throw when primaryAlias equals fallbackAlias', () => {
    expect(() => assertNoFallbackCycle(alias1, alias1)).toThrow(HttpException);

    try {
      assertNoFallbackCycle(alias1, alias1);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(httpError.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message:
          'Circular fallback detected: alias "alias1" cannot fallback to itself',
      });
    }
  });

  it('should throw with correct alias in message', () => {
    try {
      assertNoFallbackCycle(myModel, myModel);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getResponse()).toMatchObject({
        message:
          'Circular fallback detected: alias "my-model" cannot fallback to itself',
      });
    }
  });

  it('should pass when aliases differ by case', () => {
    expect(() =>
      assertNoFallbackCycle(asModelAlias('Primary'), primary),
    ).not.toThrow();
  });

  it('should pass when aliases differ by whitespace', () => {
    expect(() =>
      assertNoFallbackCycle(primary, asModelAlias('primary ')),
    ).not.toThrow();
  });

  it('should throw when both are empty strings', () => {
    expect(() =>
      assertNoFallbackCycle(asModelAlias(''), asModelAlias('')),
    ).not.toThrow();
    expect(() =>
      assertNoFallbackCycle(primary, asModelAlias('')),
    ).not.toThrow();
  });
});
