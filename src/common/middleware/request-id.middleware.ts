import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { asRequestId } from '../types';
import { createRequestId } from '../types/branded.guards';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    req.requestId =
      typeof incoming === 'string' && incoming.trim()
        ? asRequestId(incoming.trim())
        : createRequestId(`req_${uuidv4()}`);

    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
