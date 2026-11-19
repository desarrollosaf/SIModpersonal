import { IsNotEmpty, IsString } from 'class-validator';

export class RecuperarDto {
  @IsString()
  @IsNotEmpty()
  usuario: string;
}
