import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  @IsNotEmpty()
  actual: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres' })
  nueva: string;
}
