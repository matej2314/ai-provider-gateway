import { ApiProperty } from '@nestjs/swagger';

export class AnthropicModelDto {
  @ApiProperty({ example: 'model' })
  type: 'model';

  @ApiProperty({ example: 'chat-default' })
  id: string;

  @ApiProperty({ example: 'Chat default ' })
  display_name: string;

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  created_at: string;
}

export class AnthropicModelsListResponseDto {
  @ApiProperty({ type: [AnthropicModelDto] })
  data: AnthropicModelDto[];

  @ApiProperty({ example: 'chat-default' })
  first_id: string;

  @ApiProperty({ example: 'chat-default' })
  last_id: string;

  @ApiProperty({ example: false })
  has_more: boolean;
}
