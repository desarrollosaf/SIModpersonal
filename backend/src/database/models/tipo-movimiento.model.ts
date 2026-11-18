import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { SubtipoMovimiento } from './subtipo-movimiento.model';

@Table({
  tableName: 'cat_tipos_movimiento',
  underscored: true,
  timestamps: true,
})
export class TipoMovimiento extends Model {
  @Column({ type: DataType.STRING(1), primaryKey: true })
  declare clave: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  declare nombre: string;

  @HasMany(() => SubtipoMovimiento, 'tipo')
  declare subtipos: SubtipoMovimiento[];
}
