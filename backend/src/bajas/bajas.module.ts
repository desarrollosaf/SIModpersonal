import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BajaTemporal } from '../database/models/baja-temporal.model';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { MovimientoHistorico } from '../database/models/movimiento-historico.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { BajasController, BitacoraController } from './bajas.controller';
import { BajasService } from './bajas.service';

@Module({
  imports: [
    SequelizeModule.forFeature([BajaTemporal, LoteNomina, MovimientoHistorico, BitacoraMovimiento, SubtipoMovimiento]),
    SequelizeModule.forFeature([SUsuario, TDependencia, TDireccion, TDepartamento], 'external'),
    JwtAuthModule,
  ],
  controllers: [BajasController, BitacoraController],
  providers: [BajasService],
  exports: [BajasService],
})
export class BajasModule {}
