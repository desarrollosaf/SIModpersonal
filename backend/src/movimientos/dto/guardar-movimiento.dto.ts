import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PercepcionDto {
  @IsInt()
  @Min(1)
  cve: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  importe: number;
}

export class GuardarMovimientoDto {
  /** Solo al crear: "NNNNAA". Si no se manda se asigna el siguiente consecutivo del año. */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'folio debe tener 6 dígitos (NNNNAA)' })
  folio?: string;

  @IsISO8601({ strict: true })
  fecMov: string;

  @IsInt()
  @Min(1)
  @Max(24)
  noQna: number;

  @IsIn(['A', 'B', 'P', 'T', 'L'])
  tipoMov: string;

  @IsString()
  @Length(3, 3)
  subtipoMov: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  curp: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  rfc?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsOptional()
  @IsIn(['M', 'F', 'H'])
  sexo?: string;

  @IsOptional()
  @IsInt()
  adsAnt?: number;

  @IsInt()
  @Min(1)
  adsAct: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  puestoClave: string;

  @IsInt()
  @Min(1)
  rango: number;

  @IsOptional()
  @IsIn(['C', 'B', 'S', 'T', 'O'])
  tipCon?: string;

  @IsIn(['D', 'P', 'H'])
  tipoNomina: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  fAlta?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  fTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reemp?: string;

  @IsOptional()
  @IsIn(['O', 'E', 'V'])
  horario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  hMat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  hVes?: string;

  @IsOptional()
  @IsIn([0, 1])
  tarj?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ctaBan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  obs?: string;

  /** S documentación completa, N incompleta. T solo lo asigna el endpoint de transmisión. */
  @IsOptional()
  @IsIn(['S', 'N'])
  documOk?: string;

  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => PercepcionDto)
  percepciones: PercepcionDto[];
}
