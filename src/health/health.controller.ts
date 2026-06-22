import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthLivenessResponseDto } from './dto/health-liveness-response.dto';
import { HealthReadinessResponseDto } from './dto/health-readiness-response.dto';
import { ApiRequestIdHeader } from '../common/decorators/api-request-id-header.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness',
    description: 'LightWeight process probe. Does not require X-Gateway-Key.',
  })
  @ApiOkResponse({ type: HealthLivenessResponseDto })
  @ApiRequestIdHeader()
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness',
    description:
      'HTTP always 200; evaluation by body.status (ready | not_ready). Does not require X-Gateway-Key.',
  })
  @ApiOkResponse({ type: HealthReadinessResponseDto })
  @ApiRequestIdHeader()
  async getReadiness() {
    return await this.healthService.getReadiness();
  }
}
