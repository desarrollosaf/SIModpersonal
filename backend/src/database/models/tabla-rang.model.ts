import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * TABLA-RANG de Progress: un renglón por nivel con Imp-Nivel, Imp-Rang[1..5] e Imp-Comp[1..5]
 * (aquí como columnas imp_ran_n / imp_comp_n). version_id separa las cargas del tabulador.
 */
@Table({ tableName: 'tabla_rang', underscored: true, timestamps: true })
export class TablaRang extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, field: 'version_id' })
  declare versionId: number;

  @Column({ type: DataType.SMALLINT, primaryKey: true })
  declare nivel: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_nivel' })
  declare impNivel: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_ran_1' })
  declare impRan1: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_ran_2' })
  declare impRan2: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_ran_3' })
  declare impRan3: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_ran_4' })
  declare impRan4: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_ran_5' })
  declare impRan5: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_comp_1' })
  declare impComp1: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_comp_2' })
  declare impComp2: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_comp_3' })
  declare impComp3: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_comp_4' })
  declare impComp4: string;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'imp_comp_5' })
  declare impComp5: string;

  /** Imp-Rang[rango]: gratificación del rango (1-5); fuera de rango vale 0. */
  impRang(rango: number): number {
    return rango >= 1 && rango <= 5 ? Number(this.get(`impRan${rango}`)) : 0;
  }

  /** Imp-Comp[rango]: compensación del rango (1-5); fuera de rango vale 0. */
  impComp(rango: number): number {
    return rango >= 1 && rango <= 5 ? Number(this.get(`impComp${rango}`)) : 0;
  }
}
