import { Body, Controller, Get, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QuincenaDto } from '../bajas/dto/bajas.dto';
import { ValidacionService } from './validacion.service';

const rfcDe = (req: Request) => ((req['user'] as { rfc?: string } | undefined)?.rfc ?? '').toString();

@Controller('validacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ValidacionController {
  constructor(private readonly validacion: ValidacionService) {}

  /** Movimientos y bajas de la quincena, con su estatus. */
  @Get()
  @Roles('administrador', 'capturista', 'consulta')
  listar(@Query('anio', ParseIntPipe) anio: number, @Query('noQna', ParseIntPipe) noQna: number) {
    return this.validacion.listar(anio, noQna);
  }

  /** Movimientos y bajas pendientes por enviar a nómina, de todas las quincenas. */
  @Get('pendientes')
  @Roles('administrador', 'capturista', 'consulta')
  pendientes() {
    return this.validacion.pendientes();
  }

  /** Valida todo lo capturado, de todas las quincenas con pendientes. */
  @Post('validar-pendientes')
  @Roles('administrador')
  validarPendientes(@Req() req: Request) {
    return this.validacion.validarPendientes(rfcDe(req));
  }

  /** Envía a nómina todo lo validado, de todas las quincenas con pendientes (un lote por quincena). */
  @Post('enviar-pendientes')
  @Roles('administrador')
  enviarPendientes(@Req() req: Request) {
    return this.validacion.enviarPendientes(rfcDe(req));
  }

  @Post('validar')
  @Roles('administrador')
  validar(@Req() req: Request, @Body() dto: QuincenaDto) {
    return this.validacion.validar(dto.anio, dto.noQna, rfcDe(req));
  }

  @Post('enviar')
  @Roles('administrador')
  enviar(@Req() req: Request, @Body() dto: QuincenaDto) {
    return this.validacion.enviar(dto.anio, dto.noQna, rfcDe(req));
  }
}
