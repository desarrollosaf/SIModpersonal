import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Historial de cambios del tabulador: quien cambió qué importe, de cuánto a cuánto y por qué. */
@Table({ tableName: 'tabulador_bitacora', underscored: true, timestamps: true, updatedAt: false })
export class TabuladorBitacora extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'version_id' })
  declare versionId: number;

  @Column({ type: DataType.STRING(15), allowNull: false })
  declare accion: 'importacion' | 'alta' | 'modificacion' | 'baja' | 'publicacion';

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare nivel: number | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare rango: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare campo: string | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true, field: 'valor_anterior' })
  declare valorAnterior: string | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true, field: 'valor_nuevo' })
  declare valorNuevo: string | null;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare motivo: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'usuario_rfc' })
  declare usuarioRfc: string | null;
}
