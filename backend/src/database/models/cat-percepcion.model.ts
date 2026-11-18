import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_percepciones', underscored: true, timestamps: true })
export class CatPercepcion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare cve: number;

  /** P y D = nómina central, H = honorarios. */
  @Column({ type: DataType.STRING(1), allowNull: false, field: 'tipo_nomina' })
  declare tipoNomina: string;

  @Column({ type: DataType.STRING(60), allowNull: false })
  declare descripcion: string;
}
