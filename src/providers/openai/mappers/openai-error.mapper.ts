import { HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import {
  readErrorMessage,
  readNumericStatus,
  nameLooksLikeTimeout,
} from '../../../common/errors/provider-error.mapper.helpers';
import type { MappedProviderError } from '../../../common/errors/error.types';

function payloadOf(message: string, code: ApiErrorCode) {
  return { code, message, details: [] as [] };
}

export function mapOpenAiSdkError(error: unknown): MappedProviderError {
  const fallbackMsg = readErrorMessage(error, 'OpenAI request failed.');

  if (error instanceof OpenAI.APIError) {
    const status =
      typeof error.status === 'number' ? error.status : HttpStatus.BAD_GATEWAY;

    if (status === 429) {
      return {
        httpStatus: HttpStatus.TOO_MANY_REQUESTS,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_RATE_LIMITED),
      };
    }

    if (status === 401 || status === 403) {
      return {
        httpStatus: HttpStatus.UNAUTHORIZED,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_AUTH_FAILED),
      };
    }
    if (status === 408 || status === 504) {
      return {
        httpStatus: HttpStatus.GATEWAY_TIMEOUT,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_TIMEOUT),
      };
    }
    if (status >= 500) {
      return {
        httpStatus: HttpStatus.BAD_GATEWAY,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
      };
    }
    if (status >= 400) {
      return {
        httpStatus: HttpStatus.BAD_REQUEST,
        payload: payloadOf(fallbackMsg, ApiErrorCode.VALIDATION_FAILED),
      };
    }
  }

  const status = readNumericStatus(error);
  if (nameLooksLikeTimeout(error) || status === 408 || status === 504) {
    return {
      httpStatus: HttpStatus.GATEWAY_TIMEOUT,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_TIMEOUT),
    };
  }

  return {
    httpStatus: HttpStatus.BAD_GATEWAY,
    payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
  };
}
