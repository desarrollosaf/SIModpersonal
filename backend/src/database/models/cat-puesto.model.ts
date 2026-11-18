import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_puestos', underscored: true, timestamps: true })
export class CatPuesto extends Model {
  @Column({ type: DataType.STRING(10), primaryKey: true })
  declare clave: string;

  @Column({ type: DataType.STRING(80), allowNull: false })
  declare descripcion: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare nivel: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
