import type { GatewayKey, RequestId } from './branded.types';

declare global {
  namespace Express {
    interface Request {
      requestId: RequestId;
      gatewayKey?: GatewayKey;
    }
  }
}

export {};
