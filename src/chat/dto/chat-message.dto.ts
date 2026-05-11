import { IsIn, IsString, MaxLength } from 'class-validator';

const CONTENT_MAX_LENGTH = 3000;

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(CONTENT_MAX_LENGTH)
  content: string;
}
