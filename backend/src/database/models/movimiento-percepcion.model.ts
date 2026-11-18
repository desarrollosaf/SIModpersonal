import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Movimiento } from './movimiento.model';

@Table({
  tableName: 'movimiento_percepciones',
  underscored: true,
  timestamps: true,
})
export class MovimientoPercepcion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Movimiento)
  @Column({ type: DataType.STRING(6), allowNull: false })
  declare folio: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare orden: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare cve: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare importe: string;
}
