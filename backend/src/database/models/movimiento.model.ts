import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { MovimientoPercepcion } from './movimiento-percepcion.model';

@Table({ tableName: 'movimientos', underscored: true, timestamps: true })
export class Movimiento extends Model {
  @Column({ type: DataType.STRING(6), primaryKey: true })
  declare folio: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'fec_mov' })
  declare fecMov: string;

  @Column({ type: DataType.SMALLINT, allowNull: false, field: 'no_qna' })
  declare noQna: number;

  /** A alta, B baja, P promoción, T transferencia, L licencia. */
  @Column({ type: DataType.STRING(1), allowNull: false, field: 'tipo_mov' })
  declare tipoMov: string;

  @Column({ type: DataType.STRING(3), allowNull: false, field: 'subtipo_mov' })
  declare subtipoMov: string;

  @Column({ type: DataType.STRING(18), allowNull: false })
  declare curp: string;

  @Column({ type: DataType.STRING(14), allowNull: true })
  declare rfc: string | null;

  @Column({ type: DataType.STRING(3), allowNull: true })
  declare homoclave: string | null;

  /** Nombre completo: PATERNO MATERNO NOMBRES (se arma al guardar). */
  @Column({ type: DataType.STRING(60), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(40), allowNull: true })
  declare nombres: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true, field: 'primer_apellido' })
  declare primerApellido: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true, field: 'segundo_apellido' })
  declare segundoApellido: string | null;

  @Column({ type: DataType.STRING(1), allowNull: true })
  declare sexo: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'ads_ant' })
  declare adsAnt: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'ads_act' })
  declare adsAct: number | null;

  /** Ids de saf.t_dependencia / t_direccion / t_departamento (otra base: sin FK). */
  @Column({ type: DataType.INTEGER, allowNull: true, field: 'dependencia_id' })
  declare dependenciaId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'direccion_id' })
  declare direccionId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'departamento_id' })
  declare departamentoId: number | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'puesto_clave',
  })
  declare puestoClave: string | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare rango: number | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'percep_a' })
  declare percepA: string | null;

  /** C confianza, B base, S supernumerario, T tiempo determinado, O obra terminada. */
  @Column({ type: DataType.STRING(1), allowNull: true, field: 'tip_con' })
  declare tipCon: string | null;

  /** D y P = central, H = honorarios. */
  @Column({ type: DataType.STRING(1), allowNull: false, field: 'tipo_nomina' })
  declare tipoNomina: string;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'f_alta' })
  declare fAlta: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'f_term' })
  declare fTerm: string | null;

  @Column({ type: DataType.STRING(60), allowNull: true })
  declare reemp: string | null;

  /** O ordinario, E extraordinario, V vigilante. */
  @Column({ type: DataType.STRING(1), allowNull: true })
  declare horario: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'h_mat' })
  declare hMat: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'h_ves' })
  declare hVes: string | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare tarj: number | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'cta_ban' })
  declare ctaBan: string | null;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare obs: string | null;

  /** S documentación completa, N incompleta, T transmitido a nómina (ya no se puede modificar). */
  @Column({
    type: DataType.STRING(1),
    allowNull: false,
    defaultValue: 'N',
    field: 'docum_ok',
  })
  declare documOk: string;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'creado_por' })
  declare creadoPor: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    field: 'actualizado_por',
  })
  declare actualizadoPor: string | null;

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

  @HasMany(() => MovimientoPercepcion, {
    foreignKey: 'folio',
    sourceKey: 'folio',
  })
  declare percepciones: MovimientoPercepcion[];
}
