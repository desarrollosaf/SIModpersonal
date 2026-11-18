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

  @Column({ type: DataType.STRING(60), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(1), allowNull: true })
  declare sexo: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'ads_ant' })
  declare adsAnt: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'ads_act' })
  declare adsAct: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    field: 'puesto_clave',
  })
  declare puestoClave: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare rango: number;

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

  @HasMany(() => MovimientoPercepcion, {
    foreignKey: 'folio',
    sourceKey: 'folio',
  })
  declare percepciones: MovimientoPercepcion[];
}
