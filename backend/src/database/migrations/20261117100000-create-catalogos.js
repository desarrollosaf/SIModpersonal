'use strict';

/**
 * Catalogos del modulo de Movimientos de Personal (PostgreSQL).
 * Equivalencias con las tablas Progress del sistema original:
 *   CATA-ADSC   -> cat_adscripciones
 *   CATA-PUES   -> cat_puestos        (el nivel viaja en la clave: SUBSTRING(puesto,6,2))
 *   TABLA-RANG  -> tabla_niveles + tabla_rangos   (Imp-Nivel / Imp-Rang[] / Imp-Comp[])
 *   CATA-PD     -> cat_percepciones   (cves + tipo de nomina)
 *   (combos fijos de CAP-MOP) -> cat_tipos_movimiento, cat_subtipos_movimiento
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };

    await queryInterface.createTable('cat_adscripciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false }, // CATA-ADSC.ADSCRIP
      descripcion: { type: Sequelize.STRING(60), allowNull: false }, // CATA-ADSC.DESC-ADSC
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('cat_puestos', {
      clave: { type: Sequelize.STRING(10), primaryKey: true, allowNull: false }, // CATA-PUES.PUESTO
      descripcion: { type: Sequelize.STRING(80), allowNull: false }, // CATA-PUES.PUESTO-DESC
      nivel: { type: Sequelize.SMALLINT, allowNull: false }, // INTE(SUBSTRING(puesto,6,2))
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });
    await queryInterface.addIndex('cat_puestos', ['nivel']);

    await queryInterface.createTable('tabla_niveles', {
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false }, // TABLA-RANG.NIVEL
      imp_nivel: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // Imp-Nivel (quincenal)
      ...timestamps,
    });

    await queryInterface.createTable('tabla_rangos', {
      nivel: {
        type: Sequelize.SMALLINT,
        primaryKey: true,
        allowNull: false,
        references: { model: 'tabla_niveles', key: 'nivel' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rango: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false }, // indice de Imp-Rang[] / Imp-Comp[]
      imp_rango: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // Imp-Rang[rango] (gratificacion)
      imp_comp: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // Imp-Comp[rango] (compensacion)
      ...timestamps,
    });

    await queryInterface.createTable('cat_percepciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      cve: { type: Sequelize.SMALLINT, allowNull: false }, // CATA-PD.CVES
      tipo_nomina: { type: Sequelize.STRING(1), allowNull: false }, // CATA-PD.TIPO: P, D (central) o H (honorarios)
      descripcion: { type: Sequelize.STRING(60), allowNull: false }, // CATA-PD.CVE-DES-L
      ...timestamps,
    });
    await queryInterface.addConstraint('cat_percepciones', {
      fields: ['cve', 'tipo_nomina'],
      type: 'unique',
      name: 'uq_cat_percepciones_cve_tipo',
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE cat_percepciones ADD CONSTRAINT ck_cat_percepciones_tipo CHECK (tipo_nomina IN ('P','D','H'))`,
    );

    await queryInterface.createTable('cat_tipos_movimiento', {
      clave: { type: Sequelize.STRING(1), primaryKey: true, allowNull: false }, // A, B, P, T, L
      nombre: { type: Sequelize.STRING(30), allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('cat_subtipos_movimiento', {
      tipo: {
        type: Sequelize.STRING(1),
        primaryKey: true,
        allowNull: false,
        references: { model: 'cat_tipos_movimiento', key: 'clave' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      clave: { type: Sequelize.STRING(3), primaryKey: true, allowNull: false }, // NUE, REI, RIN, REN, ...
      nombre: { type: Sequelize.STRING(40), allowNull: false },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    for (const t of [
      'cat_subtipos_movimiento',
      'cat_tipos_movimiento',
      'cat_percepciones',
      'tabla_rangos',
      'tabla_niveles',
      'cat_puestos',
      'cat_adscripciones',
    ]) {
      await queryInterface.dropTable(t);
    }
  },
};
