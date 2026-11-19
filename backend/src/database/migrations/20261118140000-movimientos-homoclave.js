'use strict';

/** Homoclave del RFC (ultimos 3 caracteres), capturada aparte del RFC base de 10. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movimientos', 'homoclave', { type: Sequelize.STRING(3), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movimientos', 'homoclave');
  },
};
