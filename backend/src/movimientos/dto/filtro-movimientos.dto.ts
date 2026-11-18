import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class FiltroMovimientosDto {
  /** Año del folio, 2 dígitos ("25"). Por default el año actual. */
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'anio debe tener 2 dígitos' })
  anio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  qnaInicial?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  qnaFinal?: number;

  @IsOptional()
  @IsIn(['A', 'B', 'P', 'T', 'L'])
  tipoMov?: string;

  /** CENTRAL (D y P) u HONORARIOS (H). */
  @IsOptional()
  @IsIn(['CENTRAL', 'HONORARIOS'])
  nomina?: string;

  /** Folio, nombre, CURP o RFC. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
