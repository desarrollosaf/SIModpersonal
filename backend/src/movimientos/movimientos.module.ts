import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Movimiento } from '../database/models/movimiento.model';
import { MovimientoPercepcion } from '../database/models/movimiento-percepcion.model';
import { MovimientoHistorico } from '../database/models/movimiento-historico.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { MovimientoBitacora } from '../database/models/movimiento-bitacora.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { EmpleadosModule } from '../empleados/empleados.module';
import { BajasModule } from '../bajas/bajas.module';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Movimiento,
      MovimientoPercepcion,
      MovimientoBitacora,
      MovimientoHistorico,
      BitacoraMovimiento,
      LoteNomina,
      CatPuesto,
      CatPercepcion,
      SubtipoMovimiento,
      TipoMovimiento,
    ]),
    SequelizeModule.forFeature([SUsuario, TDependencia, TDireccion, TDepartamento], 'external'),
    JwtAuthModule,
    EmpleadosModule,
    BajasModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
