import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'movimientos_bitacora',
  underscored: true,
  timestamps: true,
  updatedAt: false,
})
export class MovimientoBitacora extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(6), allowNull: false })
  declare folio: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare accion: string;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'usuario_rfc' })
  declare usuarioRfc: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare datos: object | null;
}
