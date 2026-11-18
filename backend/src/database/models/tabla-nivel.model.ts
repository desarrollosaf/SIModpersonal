import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { TablaRango } from './tabla-rango.model';

@Table({ tableName: 'tabla_niveles', underscored: true, timestamps: true })
export class TablaNivel extends Model {
  @Column({ type: DataType.SMALLINT, primaryKey: true })
  declare nivel: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare imp_nivel: string;

  @HasMany(() => TablaRango, 'nivel')
  declare rangos: TablaRango[];
}
