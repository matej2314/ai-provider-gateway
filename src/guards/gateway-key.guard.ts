import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../config/typed-config';
import { Request } from 'express';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { readGatewayKeyHeader } from '../common/readGatewayKeyHeader';
import { enrichRequestWithClientId } from './helpers/resolve-and-enrich-request.helper';

@Injectable()
export class GatewayKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const headerValue = readGatewayKeyHeader(req);

    const gatewayKey = getAppConfig(this.configService, 'gatewayKey');
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

    if (!headerValue) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing X-Gateway-Key header value.',
        requestId: req.requestId,
        details: [],
      });
    }

    if (!allowList.includes(headerValue)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        message: 'Invalid X-Gateway-Key header value.',
        requestId: req.requestId,
        details: [],
      });
    }
    enrichRequestWithClientId(req, headerValue, this.configService);
    return true;
  }
}
