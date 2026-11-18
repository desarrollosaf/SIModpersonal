import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmpleadosService } from './empleados.service';

@Controller('empleados')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'capturista', 'consulta')
export class EmpleadosController {
  constructor(private readonly empleados: EmpleadosService) {}

  @Get('buscar')
  buscar(@Query('q') q: string) {
    return this.empleados.buscar(q);
  }

  /** Datos de nómina para prellenar un movimiento que no es alta. */
  @Get('prellenado')
  prellenado(@Query('curp') curp: string) {
    if (!curp || curp.trim().length < 10)
      throw new BadRequestException(
        'Captura al menos 10 caracteres de la CURP',
      );
    return this.empleados.prellenado(curp);
  }

  /** Percepciones sugeridas al dar de alta (sueldo + gratificación + compensación). */
  @Get('sugeridas-alta')
  sugeridasAlta(
    @Query('puesto') puesto: string,
    @Query('rango') rango: string,
    @Query('tipoNomina') tipoNomina: string,
  ) {
    if (!puesto || !rango || !tipoNomina)
      throw new BadRequestException('Indica puesto, rango y tipo de nómina');
    return this.empleados.sugeridasAlta(puesto, Number(rango), tipoNomina);
  }
}
