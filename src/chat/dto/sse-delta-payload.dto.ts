import { ApiProperty } from '@nestjs/swagger';

export class SseDeltaPayloadDto {
  @ApiProperty()
  text: string;
}
