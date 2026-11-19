import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CrearBajasDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  anio?: number;

  @IsInt()
  @Min(1)
  @Max(24)
  noQna: number;

  @IsDateString({}, { message: 'La fecha de baja debe tener el formato AAAA-MM-DD' })
  fechaBaja: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  subtipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos una persona' })
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  personal: number[];
}

export class QuincenaDto {
  @IsInt()
  @Min(2000)
  anio: number;

  @IsInt()
  @Min(1)
  @Max(24)
  noQna: number;
}

export class ValidarBajasDto extends QuincenaDto {
  /** Si se omite, se validan todas las capturadas de la quincena. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];
}
