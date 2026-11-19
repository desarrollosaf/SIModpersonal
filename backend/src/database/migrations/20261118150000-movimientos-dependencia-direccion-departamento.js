'use strict';

/**
 * La adscripcion deja de venir de cat_adscripciones y pasa a capturarse como
 * Dependencia / Direccion / Departamento, tomados de saf.t_dependencia, t_direccion y t_departamento.
 * Son bases distintas, asi que se guardan solo los ids (sin llave foranea).
 * ads_ant / ads_act se conservan sin FK y ads_act pasa a ser opcional (ya no se llena).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;
    await queryInterface.addColumn('movimientos', 'dependencia_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('movimientos', 'direccion_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('movimientos', 'departamento_id', { type: Sequelize.INTEGER, allowNull: true });

    const [fks] = await q.query(
      `SELECT constraint_name AS nombre FROM information_schema.key_column_usage
       WHERE table_schema = DATABASE() AND table_name = 'movimientos'
         AND column_name IN ('ads_ant', 'ads_act') AND referenced_table_name IS NOT NULL`,
    );
    for (const { nombre } of fks) {
      await q.query(`ALTER TABLE movimientos DROP FOREIGN KEY \`${nombre}\``);
    }
    await q.query('ALTER TABLE movimientos MODIFY ads_act INT NULL');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movimientos', 'departamento_id');
    await queryInterface.removeColumn('movimientos', 'direccion_id');
    await queryInterface.removeColumn('movimientos', 'dependencia_id');
  },
};
