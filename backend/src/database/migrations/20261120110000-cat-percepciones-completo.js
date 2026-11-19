'use strict';

/**
 * CATA-PD de Progress completo: ademas de clave, tipo de nomina y descripcion larga, el catalogo
 * trae descripcion corta, fija/eventual, si grava ISPT, si es percepcion o deduccion, porcentajes
 * ISSEMYM/medico, la partida presupuestal y la clave ISSEMYM. La llave sigue siendo (cve, tipo_nomina).
 * cat_percepciones_bitacora guarda los cambios: las claves no se borran, se marcan activo = false.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = 'cat_percepciones';
    await queryInterface.addColumn(t, 'desc_corta', { type: Sequelize.STRING(15), allowNull: true });
    await queryInterface.addColumn(t, 'fija_eventual', { type: Sequelize.STRING(1), allowNull: true }); // F fija | E eventual
    await queryInterface.addColumn(t, 'grava_ispt', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn(t, 'naturaleza', { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'P' }); // P percepcion | D deduccion
    await queryInterface.addColumn(t, 'g_issemym', { type: Sequelize.DECIMAL(6, 3), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn(t, 'g_med', { type: Sequelize.DECIMAL(6, 3), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn(t, 'ded_issemym', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn(t, 'partida', { type: Sequelize.STRING(15), allowNull: true }); // partida presupuestal
    await queryInterface.addColumn(t, 'cve_iss', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn(t, 'des_pro', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn(t, 'activo', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });

    await queryInterface.createTable('cat_percepciones_bitacora', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      cve: { type: Sequelize.SMALLINT, allowNull: true },
      tipo_nomina: { type: Sequelize.STRING(1), allowNull: true },
      accion: { type: Sequelize.STRING(15), allowNull: false }, // importacion | alta | modificacion | baja | reactivacion
      campo: { type: Sequelize.STRING(20), allowNull: true },
      valor_anterior: { type: Sequelize.STRING(80), allowNull: true },
      valor_nuevo: { type: Sequelize.STRING(80), allowNull: true },
      motivo: { type: Sequelize.STRING(250), allowNull: true },
      usuario_rfc: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('cat_percepciones_bitacora', ['cve', 'tipo_nomina']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cat_percepciones_bitacora');
    for (const c of ['activo', 'des_pro', 'cve_iss', 'partida', 'ded_issemym', 'g_med', 'g_issemym', 'naturaleza', 'grava_ispt', 'fija_eventual', 'desc_corta']) {
      await queryInterface.removeColumn('cat_percepciones', c);
    }
  },
};
