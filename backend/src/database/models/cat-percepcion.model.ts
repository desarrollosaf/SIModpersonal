import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** CATA-PD de Progress: clave de percepción o deducción por tipo de nómina. Llave: (cve, tipo_nomina). */
@Table({ tableName: 'cat_percepciones', underscored: true, timestamps: true })
export class CatPercepcion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare cve: number;

  /** P = central, D = dietas, H = honorarios. */
  @Column({ type: DataType.STRING(1), allowNull: false, field: 'tipo_nomina' })
  declare tipoNomina: string;

  /** Descripción larga (CVE-DES-L). */
  @Column({ type: DataType.STRING(60), allowNull: false })
  declare descripcion: string;

  @Column({ type: DataType.STRING(15), allowNull: true, field: 'desc_corta' })
  declare descCorta: string | null;

  /** F fija, E eventual. */
  @Column({ type: DataType.STRING(1), allowNull: true, field: 'fija_eventual' })
  declare fijaEventual: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'grava_ispt' })
  declare gravaIspt: boolean;

  /** P percepción, D deducción. */
  @Column({ type: DataType.STRING(1), allowNull: false, defaultValue: 'P' })
  declare naturaleza: string;

  @Column({ type: DataType.DECIMAL(6, 3), allowNull: false, defaultValue: 0, field: 'g_issemym' })
  declare gIssemym: string;

  @Column({ type: DataType.DECIMAL(6, 3), allowNull: false, defaultValue: 0, field: 'g_med' })
  declare gMed: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'ded_issemym' })
  declare dedIssemym: boolean;

  /** Partida presupuestal. */
  @Column({ type: DataType.STRING(15), allowNull: true })
  declare partida: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'cve_iss' })
  declare cveIss: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'des_pro' })
  declare desPro: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
