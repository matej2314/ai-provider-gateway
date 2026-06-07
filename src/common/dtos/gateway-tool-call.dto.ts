import { IsString } from 'class-validator';

export class GatewayToolCallDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  arguments: string;
}
