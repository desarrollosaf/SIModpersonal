import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Historial de cambios del catálogo de claves de percepción. */
@Table({ tableName: 'cat_percepciones_bitacora', underscored: true, timestamps: true, updatedAt: false })
export class CatPercepcionBitacora extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare cve: number | null;

  @Column({ type: DataType.STRING(1), allowNull: true, field: 'tipo_nomina' })
  declare tipoNomina: string | null;

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
