import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../../../config/typed-config';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { asGatewayKey } from '../../../common/types';
import { enrichRequestWithClientId } from '../../../guards/helpers/resolve-and-enrich-request.helper';
import type { Request } from 'express';

function readAuthorizationHeader(req: Request): string | undefined {
  const fromHeader = req.header('authorization');
  if (typeof fromHeader === 'string' && fromHeader) return fromHeader.trim();

  const fromHeaders = req.headers['authorization'];
  if (Array.isArray(fromHeaders)) {
    for (const entry of fromHeaders) {
      if (typeof entry === 'string' && entry) return entry.trim();
    }
    return undefined;
  }
  if (typeof fromHeaders === 'string') return fromHeaders.trim();

  return undefined;
}

export function readBearerToken(req: Request): string | undefined {
  const value = readAuthorizationHeader(req);

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

    const gatewayKey = getAppConfig(this.config, 'gatewayKey');

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

    const brandedKey = asGatewayKey(token);

    if (!allowList.includes(brandedKey)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        message: 'Invalid Authorization: Bearer token.',
        requestId: req.requestId,
        details: [],
      });
    }
    enrichRequestWithClientId(req, brandedKey, this.config);
    return true;
  }
}
