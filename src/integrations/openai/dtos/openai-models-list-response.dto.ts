import { ApiProperty } from '@nestjs/swagger';

export class OpenAiModelDto {
  @ApiProperty({ example: 'chat-default' })
  id: string;

  @ApiProperty({ example: 'model' })
  object: 'model';

  @ApiProperty({ example: 1710000000 })
  created: number;

  @ApiProperty({ example: 'anthropic' })
  owned_by: string;
}

export class OpenAiModelsListResponseDto {
  @ApiProperty({ example: 'list' })
  object: 'list';

  @ApiProperty({ type: [OpenAiModelDto] })
  data: OpenAiModelDto[];
}
