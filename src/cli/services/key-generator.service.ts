import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  asGatewayKey,
  type GatewayKey,
} from '../../common/types/branded.types';

@Injectable()
export class KeyGeneratorService {
  private randomSegment(byteLength: number): string {
    return randomBytes(byteLength).toString('base64url');
  }

  generateMasterKey(): GatewayKey {
    return asGatewayKey(`gw_mk_${this.randomSegment(24)}`);
  }

  generateGatewayClientKey(clientId: string): GatewayKey {
    const slug = clientId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    return asGatewayKey(`gw_${slug}_${this.randomSegment(24)}`);
  }
}
