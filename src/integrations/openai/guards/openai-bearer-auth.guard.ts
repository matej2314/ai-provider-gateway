import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import type { Request } from 'express';
import type { GatewayKeyRuntimeConfig } from 'src/config/configuration.types';

export function readBearerToken(req: Request): string | undefined {
  const raw = req.header('authorization') ?? req.headers['authorization'];
  const value = Array.isArray(raw) ? raw[0]?.trim() : raw?.trim();

  if (!value) return undefined;

  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1]?.trim() ?? undefined;
}

@Injectable()
export class OpenAiBearerAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = readBearerToken(req);

    const gatewayKey = this.config.get<GatewayKeyRuntimeConfig | undefined>(
      'gatewayKey',
    );

    const allowList = gatewayKey?.allowList ?? [];

    if (allowList.length === 0) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ApiErrorCode.GATEWAY_KEY_NOT_CONFIGURED,
        message: 'Gateway key allowlist is not configured.',
      });
    }

    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing Authorization: Bearer token.',
        requestId: req.requestId,
        details: [],
      });
    }

    if (!allowList.includes(token)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        message: 'Invalid Authorization: Bearer token.',
        requestId: req.requestId,
        details: [],
      });
    }
    req.gatewayKey = token;
    return true;
  }
}
