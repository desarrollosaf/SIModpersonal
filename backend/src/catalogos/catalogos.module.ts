import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TabuladorModule } from '../tabulador/tabulador.module';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      CatAdscripcion,
      CatPuesto,
      CatPercepcion,
      TipoMovimiento,
      SubtipoMovimiento,
    ]),
    SequelizeModule.forFeature([TDependencia, TDireccion, TDepartamento], 'external'),
    TabuladorModule,
    JwtAuthModule,
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
