'use strict';

/**
 * Validacion y envio a nomina de TODOS los movimientos (altas, promociones, transferencias, licencias
 * y bajas), no solo de las bajas:
 *  - movimientos: columnas de validacion/transmision y lote. Su estatus se deriva: transmitida si
 *    docum_ok = 'T'; validada si validado_at tiene valor; capturada en otro caso.
 *  - movimientos_historico: pasa a ser general (folio, fecha_mov y una copia completa en datos JSON);
 *    s_usuario_id, fecha_baja y origen_id dejan de ser obligatorios porque solo aplican a bajas.
 *  - bitacora_movimientos: guarda el folio de los movimientos de la tabla movimientos.
 *  - lotes_nomina.tipo_mov = 'M' identifica un lote mixto (altas + bajas, etc.).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;

    await queryInterface.addColumn('movimientos', 'validado_por', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('movimientos', 'validado_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('movimientos', 'transmitido_por', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('movimientos', 'transmitido_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('movimientos', 'lote_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'lotes_nomina', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await q.query('ALTER TABLE movimientos_historico MODIFY s_usuario_id INT NULL');
    await q.query('ALTER TABLE movimientos_historico MODIFY fecha_baja DATE NULL');
    await q.query('ALTER TABLE movimientos_historico MODIFY origen_id BIGINT NULL');
    await queryInterface.addColumn('movimientos_historico', 'folio', { type: Sequelize.STRING(6), allowNull: true });
    await queryInterface.addColumn('movimientos_historico', 'fecha_mov', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('movimientos_historico', 'datos', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addIndex('movimientos_historico', ['folio']);

    await queryInterface.addColumn('bitacora_movimientos', 'folio', { type: Sequelize.STRING(6), allowNull: true });
    await queryInterface.addIndex('bitacora_movimientos', ['folio']);

    await q.query('ALTER TABLE lotes_nomina MODIFY tipo_mov VARCHAR(1) NOT NULL DEFAULT \'M\'');
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await queryInterface.removeColumn('bitacora_movimientos', 'folio');
    await queryInterface.removeColumn('movimientos_historico', 'datos');
    await queryInterface.removeColumn('movimientos_historico', 'fecha_mov');
    await queryInterface.removeColumn('movimientos_historico', 'folio');
    await q.query('DELETE FROM movimientos_historico WHERE s_usuario_id IS NULL');
    await q.query('ALTER TABLE movimientos_historico MODIFY s_usuario_id INT NOT NULL');
    await q.query('ALTER TABLE movimientos_historico MODIFY fecha_baja DATE NOT NULL');
    await q.query('ALTER TABLE movimientos_historico MODIFY origen_id BIGINT NOT NULL');
    await queryInterface.removeColumn('movimientos', 'lote_id');
    await queryInterface.removeColumn('movimientos', 'transmitido_at');
    await queryInterface.removeColumn('movimientos', 'transmitido_por');
    await queryInterface.removeColumn('movimientos', 'validado_at');
    await queryInterface.removeColumn('movimientos', 'validado_por');
  },
};
