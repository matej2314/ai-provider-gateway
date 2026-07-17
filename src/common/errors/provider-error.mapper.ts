import { HttpException, HttpStatus } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ApiErrorPayload } from './api-error.dto';
import { ApiErrorCode } from './api-error.code';
import {
  readErrorMessage,
  readNumericStatus,
  nameLooksLikeTimeout,
} from './provider-error.mapper.helpers';
import type { MappedProviderError } from './error.types';

export { mapOpenAiSdkError } from '../../providers/openai/mappers/openai-error.mapper';

function payloadOf(message: string, code: ApiErrorCode): ApiErrorPayload {
  return { code, message, details: [] };
}

export function mapAnthropicSdkError(error: unknown): MappedProviderError {
  const fallbackMsg = readErrorMessage(error, 'Anthropic request failed.');

  if (error instanceof Anthropic.RateLimitError) {
    return {
      httpStatus: HttpStatus.TOO_MANY_REQUESTS,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_RATE_LIMITED),
    };
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return {
      httpStatus: HttpStatus.UNAUTHORIZED,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_AUTH_FAILED),
    };
  }

  if (error instanceof Anthropic.BadRequestError) {
    return {
      httpStatus: HttpStatus.BAD_REQUEST,
      payload: payloadOf(fallbackMsg, ApiErrorCode.VALIDATION_FAILED),
    };
  }

  if (error instanceof Anthropic.APIError) {
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

    if (status >= 500 && status <= 599) {
      return {
        httpStatus: HttpStatus.BAD_GATEWAY,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
      };
    }

    if (status >= 400 && status <= 499) {
      return {
        httpStatus: HttpStatus.BAD_REQUEST,
        payload: payloadOf(fallbackMsg, ApiErrorCode.VALIDATION_FAILED),
      };
    }

    return {
      httpStatus: HttpStatus.BAD_GATEWAY,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
    };
  }

  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError' || name === 'TimeoutError') {
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

export function mapGoogleGenAiError(error: unknown): MappedProviderError {
  const fallbackMsg = readErrorMessage(error, 'Google GenAI request failed.');
  const status = readNumericStatus(error);

  if (nameLooksLikeTimeout(error)) {
    return {
      httpStatus: HttpStatus.GATEWAY_TIMEOUT,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_TIMEOUT),
    };
  }

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

  if (status && status >= 500 && status <= 599) {
    return {
      httpStatus: HttpStatus.BAD_GATEWAY,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
    };
  }

  if (status && status >= 400 && status <= 499) {
    return {
      httpStatus: HttpStatus.BAD_REQUEST,
      payload: payloadOf(fallbackMsg, ApiErrorCode.VALIDATION_FAILED),
    };
  }

  return {
    httpStatus: HttpStatus.BAD_GATEWAY,
    payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
  };
}

export function toHttpException(mapped: MappedProviderError): HttpException {
  return new HttpException(mapped.payload, mapped.httpStatus);
}
