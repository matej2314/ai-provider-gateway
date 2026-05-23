import { ApiPropertyOptional } from '@nestjs/swagger';

export class SseDonePayloadDto {
  @ApiPropertyOptional({ description: 'done event has empty payload' })
  _placeholder: never;
}
