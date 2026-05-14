import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  @Get()
  checkHealth() {
    return this.healthService.check();
  }
}
