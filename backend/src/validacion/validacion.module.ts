import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { BajasModule } from '../bajas/bajas.module';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { ValidacionController } from './validacion.controller';
import { ValidacionService } from './validacion.service';

@Module({
  imports: [SequelizeModule.forFeature([LoteNomina, BitacoraMovimiento]), JwtAuthModule, BajasModule, MovimientosModule],
  controllers: [ValidacionController],
  providers: [ValidacionService],
})
export class ValidacionModule {}
