import { IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CONTENT_MAX_LENGTH = 3000;

export class ChatMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description: 'Role of the message. Must be either "user" or "assistant".',
    required: true,
    example: 'user',
  })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({
    description:
      'Content of the message. Must be a string with a maximum length of 3000 characters.',
    required: true,
    example: 'Hello, how are you?',
  })
  @IsString()
  @MaxLength(CONTENT_MAX_LENGTH)
  content: string;
}
