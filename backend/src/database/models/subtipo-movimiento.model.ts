import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { TipoMovimiento } from './tipo-movimiento.model';

@Table({
  tableName: 'cat_subtipos_movimiento',
  underscored: true,
  timestamps: true,
})
export class SubtipoMovimiento extends Model {
  @ForeignKey(() => TipoMovimiento)
  @Column({ type: DataType.STRING(1), primaryKey: true })
  declare tipo: string;

  @Column({ type: DataType.STRING(3), primaryKey: true })
  declare clave: string;

  @Column({ type: DataType.STRING(40), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
