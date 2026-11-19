import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Bitácora general de movimientos: quién hizo qué y cuándo. Solo se agregan registros. */
@Table({ tableName: 'bitacora_movimientos', underscored: true, timestamps: true, updatedAt: false })
export class BitacoraMovimiento extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(1), allowNull: false, defaultValue: 'B', field: 'tipo_mov' })
  declare tipoMov: string;

  @Column({ type: DataType.BIGINT, allowNull: true, field: 'entidad_id' })
  declare entidadId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'lote_id' })
  declare loteId: number | null;

  /** Folio, cuando el movimiento es de la tabla movimientos. */
  @Column({ type: DataType.STRING(6), allowNull: true })
  declare folio: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare accion: 'captura' | 'validacion' | 'cancelacion' | 'transferencia';

  @Column({ type: DataType.STRING(12), allowNull: true, field: 'estatus_anterior' })
  declare estatusAnterior: string | null;

  @Column({ type: DataType.STRING(12), allowNull: true, field: 'estatus_nuevo' })
  declare estatusNuevo: string | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare anio: number | null;

  @Column({ type: DataType.SMALLINT, allowNull: true, field: 'no_qna' })
  declare noQna: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'rfc_personal' })
  declare rfcPersonal: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare detalle: object | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'usuario_rfc' })
  declare usuarioRfc: string | null;
}
