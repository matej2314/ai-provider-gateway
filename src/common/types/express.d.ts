import type { ClientId, GatewayKey, RequestId } from './branded.types';

declare global {
  namespace Express {
    interface Request {
      requestId: RequestId;
      gatewayKey?: GatewayKey;
      clientId?: ClientId;
    }
  }
}

export {};
