import { ApiErrorPayload } from './api-error.dto';

export type MappedProviderError = {
  httpStatus: number;
  payload: ApiErrorPayload;
};
