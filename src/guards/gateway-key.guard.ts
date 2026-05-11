import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { GatewayKeyRuntimeConfig } from '../config/configuration.types';
import { ApiErrorCode } from '../common/errors/api-error.code';

function resolveRequestId(req: Request): string {
  const incoming = req.headers['x-request-id'];
  return typeof incoming === 'string' && incoming.trim()
    ? incoming.trim()
    : `req_${uuidv4()}`;
}

@Injectable()
export class GatewayKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const raw = req.header('x-gateway-key') ?? req.headers['x-gateway-key'];
    const headerValue = Array.isArray(raw)
      ? raw[0]?.trim()
      : raw?.trim();

    const gatewayKey = this.configService.get<
      GatewayKeyRuntimeConfig | undefined
    >('gatewayKey');
    const allowList = gatewayKey?.allowList ?? [];

    const attachRequestContext = () => {
      (req as Request & { requestId?: string }).requestId =
        resolveRequestId(req);
    };

    if (allowList.length === 0) {
      attachRequestContext();
      const requestId = (req as Request & { requestId?: string }).requestId!;
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ApiErrorCode.GATEWAY_KEY_NOT_CONFIGURED,
        message: 'Gateway key allowlist is not configured.',
        requestId,
        details: [],
      });
    }

    if (!headerValue) {
      attachRequestContext();
      const requestId = (req as Request & { requestId?: string }).requestId!;
      throw new UnauthorizedException({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing X-Gateway-Key header value.',
        requestId,
        details: [],
      });
    }

    if (!allowList.includes(headerValue)) {
      attachRequestContext();
      const requestId = (req as Request & { requestId?: string }).requestId!;
      throw new ForbiddenException({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        message: 'Invalid X-Gateway-Key header value.',
        requestId,
        details: [],
      });
    }

    return true;
  }
}
