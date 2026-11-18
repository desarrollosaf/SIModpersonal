import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'pagos_descuentos', underscored: true, timestamps: true })
export class PagoDescuento extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(18), allowNull: false })
  declare curp: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare cve: number;

  /** 'C' = percepción vigente. */
  @Column({ type: DataType.STRING(1), allowNull: false, field: 't_m' })
  declare tM: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare imp: string;
}
