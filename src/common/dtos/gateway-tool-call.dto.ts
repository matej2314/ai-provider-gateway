import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
