import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

@Injectable()
export class KeyGeneratorService {
  generateKey(length: number = 32): string {
    const bytes = randomBytes(length);
    return Array.from(bytes, (byte) => chars[byte & chars.length]).join('');
  }
}
