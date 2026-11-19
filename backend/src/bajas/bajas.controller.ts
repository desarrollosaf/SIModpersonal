import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BajasService } from './bajas.service';
import { CrearBajasDto } from './dto/bajas.dto';

const rfcDe = (req: Request) => ((req['user'] as { rfc?: string } | undefined)?.rfc ?? '').toString();
const entero = (v?: string) => (v ? parseInt(v, 10) || undefined : undefined);

@Controller('bajas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BajasController {
  constructor(private readonly bajas: BajasService) {}

  @Get('motivos')
  @Roles('administrador', 'capturista', 'consulta')
  motivos() {
    return this.bajas.motivos();
  }

  /** Personal activo de saf.s_usuario para seleccionar. */
  @Get('personal')
  @Roles('administrador', 'capturista')
  personal(@Query('q') q?: string, @Query('dependencia') dependencia?: string) {
    return this.bajas.buscarPersonal(q ?? '', entero(dependencia));
  }

  @Get('quincenas')
  @Roles('administrador', 'capturista', 'consulta')
  quincenas() {
    return this.bajas.quincenas();
  }

  @Get()
  @Roles('administrador', 'capturista', 'consulta')
  listar(@Query('anio', ParseIntPipe) anio: number, @Query('noQna', ParseIntPipe) noQna: number, @Query('estatus') estatus?: string) {
    return this.bajas.listar(anio, noQna, estatus);
  }

  @Post()
  @Roles('administrador', 'capturista')
  crear(@Req() req: Request, @Body() dto: CrearBajasDto) {
    return this.bajas.crear(dto, rfcDe(req));
  }

  @Delete(':id')
  @Roles('administrador', 'capturista')
  cancelar(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.bajas.cancelar(id, rfcDe(req));
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'capturista', 'consulta')
export class BitacoraController {
  constructor(private readonly bajas: BajasService) {}

  @Get('bitacora-movimientos')
  bitacora(
    @Query('anio') anio?: string, @Query('noQna') noQna?: string, @Query('rfc') rfc?: string,
    @Query('accion') accion?: string, @Query('pagina') pagina?: string,
  ) {
    return this.bajas.consultarBitacora({ anio: entero(anio), noQna: entero(noQna), rfc, accion, pagina: entero(pagina) });
  }

  @Get('historico-movimientos')
  historico(
    @Query('anio') anio?: string, @Query('noQna') noQna?: string, @Query('rfc') rfc?: string, @Query('pagina') pagina?: string,
  ) {
    return this.bajas.consultarHistorico({ anio: entero(anio), noQna: entero(noQna), rfc, pagina: entero(pagina) });
  }
}
