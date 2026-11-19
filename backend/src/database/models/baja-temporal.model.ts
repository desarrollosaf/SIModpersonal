import { Table, Column, Model, DataType } from 'sequelize-typescript';

export type EstatusBaja = 'capturada' | 'validada' | 'transmitida' | 'cancelada';

/** Concentrado (tabla temporal) de bajas por quincena. El personal viene de saf.s_usuario. */
@Table({ tableName: 'bajas_temporal', underscored: true, timestamps: true })
export class BajaTemporal extends Model {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare anio: number;

  @Column({ type: DataType.SMALLINT, allowNull: false, field: 'no_qna' })
  declare noQna: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 's_usuario_id' })
  declare sUsuarioId: number;

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

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'fecha_baja' })
  declare fechaBaja: string;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare observaciones: string | null;

  @Column({ type: DataType.STRING(12), allowNull: false, defaultValue: 'capturada' })
  declare estatus: EstatusBaja;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'creado_por' })
  declare creadoPor: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'validado_por' })
  declare validadoPor: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'validado_at' })
  declare validadoAt: Date | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'transmitido_por' })
  declare transmitidoPor: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'transmitido_at' })
  declare transmitidoAt: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'lote_id' })
  declare loteId: number | null;
}
