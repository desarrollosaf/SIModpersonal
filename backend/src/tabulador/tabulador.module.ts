import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TabuladorVersion } from '../database/models/tabulador-version.model';
import { TabuladorBitacora } from '../database/models/tabulador-bitacora.model';
import { TablaRang } from '../database/models/tabla-rang.model';
import { TabuladorService } from './tabulador.service';

@Module({
  imports: [SequelizeModule.forFeature([TabuladorVersion, TabuladorBitacora, TablaRang])],
  providers: [TabuladorService],
  exports: [TabuladorService],
})
export class TabuladorModule {}
