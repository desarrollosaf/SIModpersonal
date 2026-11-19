import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Copia inmutable de lo transferido a nómina. No se edita ni se borra. */
@Table({ tableName: 'movimientos_historico', underscored: true, timestamps: true, updatedAt: false })
export class MovimientoHistorico extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(1), allowNull: false, defaultValue: 'B', field: 'tipo_mov' })
  declare tipoMov: string;

  /** id en bajas_temporal (solo bajas). */
  @Column({ type: DataType.BIGINT, allowNull: true, field: 'origen_id' })
  declare origenId: number | null;

  /** Folio del movimiento (altas, promociones, transferencias y licencias). */
  @Column({ type: DataType.STRING(6), allowNull: true })
  declare folio: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'fecha_mov' })
  declare fechaMov: string | null;

  /** Copia completa del movimiento al momento de transferirlo. */
  @Column({ type: DataType.JSON, allowNull: true })
  declare datos: object | null;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'lote_id' })
  declare loteId: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare anio: number;

  @Column({ type: DataType.SMALLINT, allowNull: false, field: 'no_qna' })
  declare noQna: number;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 's_usuario_id' })
  declare sUsuarioId: number | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare rfc: string;

  @Column({ type: DataType.STRING(18), allowNull: true })
  declare curp: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare puesto: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'dependencia_id' })
  declare dependenciaId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'direccion_id' })
  declare direccionId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'departamento_id' })
  declare departamentoId: number | null;

  @Column({ type: DataType.STRING(10), allowNull: false })
  declare subtipo: string;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'fecha_baja' })
  declare fechaBaja: string | null;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare observaciones: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'creado_por' })
  declare creadoPor: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'validado_por' })
  declare validadoPor: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'transmitido_por' })
  declare transmitidoPor: string | null;
}
