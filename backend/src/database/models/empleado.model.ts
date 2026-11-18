import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Nómina vigente (tabla EMPLEADO del sistema Progress). Solo lectura desde este módulo. */
@Table({ tableName: 'empleados', underscored: true, timestamps: true })
export class Empleado extends Model {
  @Column({ type: DataType.STRING(18), primaryKey: true })
  declare curp: string;

  @Column({ type: DataType.STRING(14), allowNull: true })
  declare rfc: string | null;

  @Column({ type: DataType.STRING(60), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'adscripcion_id' })
  declare adscripcionId: number | null;

  @Column({ type: DataType.STRING(10), allowNull: true, field: 'puesto_clave' })
  declare puestoClave: string | null;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  declare rango: number | null;

  @Column({ type: DataType.STRING(1), allowNull: true, field: 'tipo_nomina' })
  declare tipoNomina: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'f_alta' })
  declare fAlta: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'cta_ban' })
  declare ctaBan: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true, field: 'tot_per' })
  declare totPer: string | null;
}
