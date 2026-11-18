import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { TablaNivel } from './tabla-nivel.model';

@Table({ tableName: 'tabla_rangos', underscored: true, timestamps: true })
export class TablaRango extends Model {
  @ForeignKey(() => TablaNivel)
  @Column({ type: DataType.SMALLINT, primaryKey: true })
  declare nivel: number;

  @Column({ type: DataType.SMALLINT, primaryKey: true })
  declare rango: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare imp_rango: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare imp_comp: string;
}
