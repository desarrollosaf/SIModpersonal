import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CatalogosService } from './catalogos.service';

@Controller('catalogos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'capturista', 'consulta')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('fijos')
  fijos() {
    return this.catalogos.fijos();
  }

  @Get('dependencias')
  dependencias() {
    return this.catalogos.listarDependencias();
  }

  @Get('direcciones')
  direcciones(@Query('dependencia', ParseIntPipe) dependencia: number) {
    return this.catalogos.listarDirecciones(dependencia);
  }

  @Get('departamentos')
  departamentos(@Query('direccion', ParseIntPipe) direccion: number) {
    return this.catalogos.listarDepartamentos(direccion);
  }

  @Get('adscripciones')
  adscripciones() {
    return this.catalogos.listarAdscripciones();
  }

  @Get('puestos')
  puestos(@Query('nivel') nivel?: string) {
    return this.catalogos.listarPuestos(
      nivel !== undefined && nivel !== '' ? Number(nivel) : undefined,
    );
  }

  @Get('percepciones')
  percepciones(@Query('tipoNomina') tipoNomina?: string) {
    return this.catalogos.listarPercepciones(tipoNomina);
  }

  @Get('tipos-movimiento')
  tiposMovimiento() {
    return this.catalogos.tiposMovimiento();
  }

  @Get('tabulador/:nivel')
  tabulador(@Param('nivel', ParseIntPipe) nivel: number) {
    return this.catalogos.tabulador(nivel);
  }
}
