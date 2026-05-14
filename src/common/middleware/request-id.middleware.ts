import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    req.requestId =
      typeof incoming === 'string' && incoming.trim()
        ? incoming.trim()
        : `req_${uuidv4()}`;
    next();
  }
}
