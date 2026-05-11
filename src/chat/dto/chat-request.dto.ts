import { IsString, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ChatMessageDto } from './chat-message.dto';

const MAX_MESSAGES = 50;

export class ChatRequestDto {
  @IsString()
  modelAlias: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
