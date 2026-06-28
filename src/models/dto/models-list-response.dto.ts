import { ApiProperty } from '@nestjs/swagger';
import { GatewayModelDto } from './gateway-model.dto';

export class ModelsListResponseDto {
  @ApiProperty({ type: [GatewayModelDto] })
  models: GatewayModelDto[];
}
