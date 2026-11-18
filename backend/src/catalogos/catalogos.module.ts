import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TablaNivel } from '../database/models/tabla-nivel.model';
import { TablaRango } from '../database/models/tabla-rango.model';
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
      TablaNivel,
      TablaRango,
    ]),
    JwtAuthModule,
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
