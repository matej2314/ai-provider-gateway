import type { GatewayKey } from './branded.types';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      gatewayKey?: GatewayKey;
    }
  }
}

export {};
