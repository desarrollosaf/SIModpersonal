'use strict';

/**
 * El nombre se captura en tres partes. movimientos.nombre se conserva como el nombre completo
 * (PATERNO MATERNO NOMBRES) porque lo usan la busqueda y la exportacion.
 * La tabla empleados no cambia: se carga desde nomina solo con el nombre completo.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movimientos', 'nombres', { type: Sequelize.STRING(40), allowNull: true });
    await queryInterface.addColumn('movimientos', 'primer_apellido', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn('movimientos', 'segundo_apellido', { type: Sequelize.STRING(30), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movimientos', 'segundo_apellido');
    await queryInterface.removeColumn('movimientos', 'primer_apellido');
    await queryInterface.removeColumn('movimientos', 'nombres');
  },
};
