'use strict';

/**
 * Una licencia no captura puesto ni rango (en Progress salian del empleado de nomina, que aqui aun no
 * esta cargado), asi que movimientos.puesto_clave y movimientos.rango pasan a ser opcionales.
 * Siguen siendo obligatorios en altas, promociones y transferencias (lo valida el backend).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query('ALTER TABLE movimientos MODIFY puesto_clave VARCHAR(10) NULL');
    await q.query('ALTER TABLE movimientos MODIFY rango SMALLINT NULL');
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query('DELETE FROM movimientos WHERE puesto_clave IS NULL OR rango IS NULL');
    await q.query('ALTER TABLE movimientos MODIFY rango SMALLINT NOT NULL');
    await q.query('ALTER TABLE movimientos MODIFY puesto_clave VARCHAR(10) NOT NULL');
  },
};
