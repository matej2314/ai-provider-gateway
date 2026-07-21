import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../../../config/typed-config';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { readBearerToken } from '../../../integrations/openai/guards/openai-bearer-auth.guard';
import { asGatewayKey } from '../../../common/types';
import { enrichRequestWithClientId } from '../../../guards/helpers/resolve-and-enrich-request.helper';
import type { Request } from 'express';

export function readAnthropicApiKey(req: Request): string | undefined {
  const xApiKey = req.header('x-api-key');
  if (xApiKey?.trim()) return xApiKey.trim();

  const bearerToken = readBearerToken(req);
  return bearerToken;
}

@Injectable()
export class AnthropicApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = readAnthropicApiKey(req);

    const gatewayKey = getAppConfig(this.config, 'gatewayKey');
    const allowList = gatewayKey?.allowList ?? [];

    if (allowList.length === 0) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ApiErrorCode.GATEWAY_KEY_NOT_CONFIGURED,
        message: 'Gateway key allowlist is not configured.',
        requestId: req.requestId,
        details: [],
      });
    }

    if (!key) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing x-api-key or Authorization header.',
        requestId: req.requestId,
        details: [],
      });
    }

    const brandedKey = asGatewayKey(key);

    if (!allowList.includes(brandedKey)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        message: 'Invalid API key.',
        requestId: req.requestId,
        details: [],
      });
    }
    enrichRequestWithClientId(req, brandedKey, this.config);
    return true;
  }
}
