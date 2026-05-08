import { IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsString()
  modelAlias: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
