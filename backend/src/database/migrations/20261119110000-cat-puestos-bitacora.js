'use strict';

/**
 * Bitacora del catalogo de puestos (CATA-PUES). Los puestos no se borran: cuando dejan de usarse se
 * marcan activo = false en cat_puestos, y cada alta, cambio de descripcion o baja queda aqui.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cat_puestos_bitacora', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      clave: { type: Sequelize.STRING(10), allowNull: true }, // null en la importacion masiva
      accion: { type: Sequelize.STRING(15), allowNull: false }, // importacion | alta | modificacion | baja | reactivacion
      campo: { type: Sequelize.STRING(20), allowNull: true }, // descripcion | nivel | activo
      valor_anterior: { type: Sequelize.STRING(80), allowNull: true },
      valor_nuevo: { type: Sequelize.STRING(80), allowNull: true },
      motivo: { type: Sequelize.STRING(250), allowNull: true },
      usuario_rfc: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('cat_puestos_bitacora', ['clave']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cat_puestos_bitacora');
  },
};
