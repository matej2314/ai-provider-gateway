import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class KeyGeneratorService {
  private randomSegment(byteLength: number): string {
    return randomBytes(byteLength).toString('base64url');
  }

  generateMasterKey(): string {
    return `gw_mk_${this.randomSegment(24)}`;
  }

  generateGatewayClientKey(clientId: string): string {
    const slug = clientId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    return `gw_${slug}_${this.randomSegment(24)}`;
  }
}
