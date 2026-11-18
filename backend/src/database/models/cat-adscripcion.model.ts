import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_adscripciones', underscored: true, timestamps: true })
export class CatAdscripcion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING(60), allowNull: false })
  declare descripcion: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
