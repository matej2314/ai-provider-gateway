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

type GatewayKeyGuardConfig = {
  masterKey?: string;
  keys?: string[];
};

function parseKeys(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveRequestId(req: Request): string {
  const incomingHeader = req.headers['x-request-id'];
  return typeof incomingHeader === 'string' && incomingHeader.trim()
    ? incomingHeader.trim()
    : `req_${uuidv4()}`;
}

@Injectable()
export class GatewayKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const raw = req.header('x-gateway-key') ?? req.headers['x-gateway-key'];
      const headerValue = Array.isArray(raw) ? raw[0]?.trim() : raw?.trim();
      
      const config = this.configService.get<GatewayKeyConfig>('gatewayKey') ?? {};
      const allowListFromEnv = parseKeys(process.env.)
  }
}
