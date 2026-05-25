import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

const CONTENT_MAX = 3000;

export class OpenAiChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'] })
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role: 'system' | 'user' | 'assistant' | 'tool';

  @ApiProperty({
    description:
      'Parts of the message. Must be a string with a maximum length of 3000 characters.',
  })
  @IsString()
  @MaxLength(CONTENT_MAX)
  content: string;
}
