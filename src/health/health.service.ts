import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      message: 'Gateway is running',
      timestamp: new Date().toISOString(),
    };
  }
}
