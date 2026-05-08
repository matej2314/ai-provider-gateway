import { IsString, IsArray, ValidateNested} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ChatMessageDto } from './chat-message.dto';

export class ChatRequestDto {
  @IsString()
  modelAlias: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
