import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MovimientosService } from './movimientos.service';
import { GuardarMovimientoDto } from './dto/guardar-movimiento.dto';
import { FiltroMovimientosDto } from './dto/filtro-movimientos.dto';

const rfcDe = (req: Request) =>
  ((req['user'] as { rfc?: string } | undefined)?.rfc ?? '').toString();

@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get()
  @Roles('administrador', 'capturista', 'consulta')
  listar(@Query() filtro: FiltroMovimientosDto) {
    return this.movimientos.listar(filtro);
  }

  @Get('siguiente-folio')
  @Roles('administrador', 'capturista')
  siguienteFolio(@Query('anio') anio?: string) {
    return this.movimientos.siguienteFolio(anio);
  }

  @Get('exportar')
  @Roles('administrador', 'capturista', 'consulta')
  async exportar(@Query() filtro: FiltroMovimientosDto, @Res() res: Response) {
    const buffer = await this.movimientos.exportarExcel(filtro);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="movimientos-personal.xlsx"',
    });
    res.send(buffer);
  }

  @Get(':folio')
  @Roles('administrador', 'capturista', 'consulta')
  obtener(@Param('folio') folio: string) {
    return this.movimientos.obtener(folio);
  }

  @Post()
  @Roles('administrador', 'capturista')
  crear(@Body() dto: GuardarMovimientoDto, @Req() req: Request) {
    return this.movimientos.crear(dto, rfcDe(req));
  }

  @Put(':folio')
  @Roles('administrador', 'capturista')
  actualizar(
    @Param('folio') folio: string,
    @Body() dto: GuardarMovimientoDto,
    @Req() req: Request,
  ) {
    return this.movimientos.actualizar(folio, dto, rfcDe(req));
  }

  @Post(':folio/transmitir')
  @Roles('administrador')
  transmitir(@Param('folio') folio: string, @Req() req: Request) {
    return this.movimientos.transmitir(folio, rfcDe(req));
  }

  @Delete(':folio')
  @Roles('administrador')
  eliminar(@Param('folio') folio: string, @Req() req: Request) {
    return this.movimientos.eliminar(folio, rfcDe(req));
  }
}
