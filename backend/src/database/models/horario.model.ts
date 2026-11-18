import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'horarios', underscored: true, timestamps: true })
export class Horario extends Model {
  @Column({ type: DataType.STRING(18), primaryKey: true })
  declare curp: string;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'h_mat' })
  declare hMat: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'h_ves' })
  declare hVes: string | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare tarj: number | null;
}
