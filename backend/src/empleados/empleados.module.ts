import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Empleado } from '../database/models/empleado.model';
import { Horario } from '../database/models/horario.model';
import { PagoDescuento } from '../database/models/pago-descuento.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TablaNivel } from '../database/models/tabla-nivel.model';
import { TablaRango } from '../database/models/tabla-rango.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Empleado,
      Horario,
      PagoDescuento,
      CatPuesto,
      CatAdscripcion,
      CatPercepcion,
      TablaNivel,
      TablaRango,
    ]),
    JwtAuthModule,
  ],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  exports: [EmpleadosService],
})
export class EmpleadosModule {}
