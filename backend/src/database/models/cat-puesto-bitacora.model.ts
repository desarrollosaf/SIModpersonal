import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Historial de cambios del catálogo de puestos. */
@Table({ tableName: 'cat_puestos_bitacora', underscored: true, timestamps: true, updatedAt: false })
export class CatPuestoBitacora extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare clave: string | null;

  @Column({ type: DataType.STRING(15), allowNull: false })
  declare accion: 'importacion' | 'alta' | 'modificacion' | 'baja' | 'reactivacion';

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare campo: string | null;

  @Column({ type: DataType.STRING(80), allowNull: true, field: 'valor_anterior' })
  declare valorAnterior: string | null;

  @Column({ type: DataType.STRING(80), allowNull: true, field: 'valor_nuevo' })
  declare valorNuevo: string | null;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare motivo: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'usuario_rfc' })
  declare usuarioRfc: string | null;
}
