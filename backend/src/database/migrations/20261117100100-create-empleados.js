'use strict';

/**
 * Datos de nomina que el modulo solo CONSULTA para "rescatar" campos faltantes y calcular
 * percepciones anteriores:
 *   EMPLEADO -> empleados      (la llave real es la CURP; el sistema original compara solo
 *                               los primeros 10 caracteres: SUBSTRING(curp,1,10))
 *   PAG-DES  -> pagos_descuentos (t_m = 'C' son las percepciones vigentes del empleado)
 *   HORARIO  -> horarios
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };

    await queryInterface.createTable('empleados', {
      curp: { type: Sequelize.STRING(18), primaryKey: true, allowNull: false }, // EMPLEADO.CURP
      rfc: { type: Sequelize.STRING(14), allowNull: true }, // EMPLEADO.RFC
      nombre: { type: Sequelize.STRING(60), allowNull: false }, // EMPLEADO.NOMBRE
      adscripcion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cat_adscripciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, // EMPLEADO.ADSCRIP
      puesto_clave: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: { model: 'cat_puestos', key: 'clave' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, // EMPLEADO.PUESTO
      rango: { type: Sequelize.SMALLINT, allowNull: true }, // EMPLEADO.RANGO
      tipo_nomina: { type: Sequelize.STRING(1), allowNull: true }, // EMPLEADO.TIPO: D, P, H
      f_alta: { type: Sequelize.DATEONLY, allowNull: true }, // EMPLEADO.F-ALTA
      cta_ban: { type: Sequelize.STRING(20), allowNull: true }, // EMPLEADO.CTA-BAN
      tot_per: { type: Sequelize.DECIMAL(12, 2), allowNull: true }, // EMPLEADO.TOT-PER
      ...timestamps,
    });
    await queryInterface.sequelize.query(
      'CREATE INDEX ix_empleados_curp10 ON empleados (substr(curp, 1, 10))',
    );
    await queryInterface.addIndex('empleados', ['rfc']);

    await queryInterface.createTable('pagos_descuentos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      curp: { type: Sequelize.STRING(18), allowNull: false }, // PAG-DES.CURP
      cve: { type: Sequelize.SMALLINT, allowNull: false }, // PAG-DES.CVES
      t_m: { type: Sequelize.STRING(1), allowNull: false }, // PAG-DES.T-M ('C' = percepcion vigente)
      imp: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // PAG-DES.IMP
      ...timestamps,
    });
    await queryInterface.sequelize.query(
      'CREATE INDEX ix_pagos_descuentos_curp10 ON pagos_descuentos (substr(curp, 1, 10), t_m)',
    );

    await queryInterface.createTable('horarios', {
      curp: { type: Sequelize.STRING(18), primaryKey: true, allowNull: false }, // HORARIO.CURP
      h_mat: { type: Sequelize.STRING(20), allowNull: true }, // HORARIO.H-MAT
      h_ves: { type: Sequelize.STRING(20), allowNull: true }, // HORARIO.H-VES
      tarj: { type: Sequelize.SMALLINT, allowNull: true }, // HORARIO.TARJ (0 = NO, 1 = SI)
      ...timestamps,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('horarios');
    await queryInterface.dropTable('pagos_descuentos');
    await queryInterface.dropTable('empleados');
  },
};
