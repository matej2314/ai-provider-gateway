import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { GatewayProviderType } from '../../config/provider-types';

export class GatewayModelCapabilitiesDto {
  @ApiPropertyOptional({ example: true })
  streaming?: boolean;

  @ApiPropertyOptional({ example: true })
  tools?: boolean;

  @ApiPropertyOptional({ example: false })
  thinking?: boolean;
}

export class GatewayModelDto {
  @ApiProperty({
    example: 'chat-default',
    description: 'Public model alias from gateway.config.yaml',
  })
  modelAlias: string;

  @ApiProperty({ example: 'anthropic-primary' })
  providerInstance: string;

  @ApiProperty({
    example: 'anthropic',
    description: 'Provider adapter type from providers[].type',
  })
  providerType: GatewayProviderType | 'gateway';

  @ApiProperty({
    example: 'claude-sonnet-4-5-20250929',
    description: 'Vendor model ID used by the runtime adapter',
  })
  modelId: string;

  @ApiPropertyOptional({ type: GatewayModelCapabilitiesDto })
  capabilities?: GatewayModelCapabilitiesDto;

  @ApiPropertyOptional({
    example: 'chat-backup',
    description: 'Optional fallback alias from models[].fallback',
  })
  fallback?: string;
}
