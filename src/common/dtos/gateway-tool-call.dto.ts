import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { asToolCallId } from '../types/branded.types';
import type { GatewayToolCall } from '../../providers/types/tooling-types';

/**
 * HTTP/OpenAPI representation of a tool call (API boundary — plain strings).
 */
export class GatewayToolCallDto {
  @ApiProperty({
    description: 'Unique identifier for the tool call.',
    example: 'call_abc123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Name of the tool.',
    example: 'get_weather',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'JSON-encoded arguments of the tool call.',
    example: '{ "city": "New York" }',
  })
  @IsString()
  arguments: string;
}

/** Maps internal branded tool call to API DTO (implicit unbrand). */
export function toGatewayToolCallDto(
  call: GatewayToolCall,
): GatewayToolCallDto {
  return {
    id: call.id,
    name: call.name,
    arguments: call.arguments,
  };
}

/** Maps API DTO to internal branded tool call. */
export function fromGatewayToolCallDto(
  dto: GatewayToolCallDto,
): GatewayToolCall {
  return {
    id: asToolCallId(dto.id),
    name: dto.name,
    arguments: dto.arguments,
  };
}
