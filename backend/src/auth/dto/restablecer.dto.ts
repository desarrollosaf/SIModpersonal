import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RestablecerDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres' })
  password: string;
}
