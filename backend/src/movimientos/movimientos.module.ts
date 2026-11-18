import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Movimiento } from '../database/models/movimiento.model';
import { MovimientoPercepcion } from '../database/models/movimiento-percepcion.model';
import { MovimientoBitacora } from '../database/models/movimiento-bitacora.model';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { EmpleadosModule } from '../empleados/empleados.module';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Movimiento,
      MovimientoPercepcion,
      MovimientoBitacora,
      CatAdscripcion,
      CatPuesto,
      CatPercepcion,
      SubtipoMovimiento,
      TipoMovimiento,
    ]),
    JwtAuthModule,
    EmpleadosModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
})
export class MovimientosModule {}
