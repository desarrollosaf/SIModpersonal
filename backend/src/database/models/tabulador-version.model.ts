import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Cada carga del tabulador (ej. Q0226). Solo una es 'vigente'; las anteriores quedan como 'historico'. */
@Table({ tableName: 'tabulador_versiones', underscored: true, timestamps: true })
export class TabuladorVersion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
  declare clave: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare anio: number;

  @Column({ type: DataType.SMALLINT, allowNull: false, field: 'quincena_inicio' })
  declare quincenaInicio: number;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'borrador' })
  declare estatus: 'borrador' | 'vigente' | 'historico';

  @Column({ type: DataType.STRING(200), allowNull: true })
  declare descripcion: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true, field: 'archivo_origen' })
  declare archivoOrigen: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'publicada_at' })
  declare publicadaAt: Date | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'creado_por' })
  declare creadoPor: string | null;
}
