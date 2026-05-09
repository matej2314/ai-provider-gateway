export class ErrorEnvelopeDto {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  details?: unknown[];
}
