import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Cada transferencia a nómina (otro sistema, por integrar). */
@Table({ tableName: 'lotes_nomina', underscored: true, timestamps: true })
export class LoteNomina extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(1), allowNull: false, defaultValue: 'B', field: 'tipo_mov' })
  declare tipoMov: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare anio: number;

  @Column({ type: DataType.SMALLINT, allowNull: false, field: 'no_qna' })
  declare noQna: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare total: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'pendiente_envio' })
  declare estatus: 'pendiente_envio' | 'enviado' | 'error';

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'generado_por' })
  declare generadoPor: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'enviado_at' })
  declare enviadoAt: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare respuesta: string | null;
}
