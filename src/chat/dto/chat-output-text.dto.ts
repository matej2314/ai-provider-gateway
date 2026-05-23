import { ApiProperty } from '@nestjs/swagger';

export class ChatOutputTextDto {
  @ApiProperty({ enum: ['text'], example: 'text' })
  type: 'text';

  @ApiProperty({
    description: 'Odpowiedź wygenerowana przez model.',
    example: 'Odpowiedź modelu....',
  })
  text: string;
}
