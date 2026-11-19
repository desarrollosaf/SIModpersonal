'use strict';

/**
 * Flujo de bajas por quincena:
 *   bajas_temporal       -> concentrado (tabla temporal) donde se capturan y validan las bajas de la quincena.
 *   lotes_nomina         -> cada transferencia a nomina (otro sistema, por integrar).
 *   movimientos_historico-> copia inmutable de lo transferido (no se edita ni se borra).
 *   bitacora_movimientos -> registro de TODO lo que se hace con los movimientos (captura, validacion,
 *                           cancelacion, transferencia...). Es general: lleva tipo_mov para que altas,
 *                           promociones, etc. puedan usarla despues.
 * El personal viene de saf.s_usuario (otra base): se guardan sus ids y un respaldo de nombre/puesto.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.fn('NOW');

    await queryInterface.createTable('lotes_nomina', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tipo_mov: { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'B' },
      anio: { type: Sequelize.SMALLINT, allowNull: false },
      no_qna: { type: Sequelize.SMALLINT, allowNull: false },
      total: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estatus: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendiente_envio' }, // pendiente_envio | enviado | error
      generado_por: { type: Sequelize.STRING(20), allowNull: true },
      enviado_at: { type: Sequelize.DATE, allowNull: true },
      respuesta: { type: Sequelize.TEXT, allowNull: true }, // respuesta del sistema de nomina (a futuro)
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex('lotes_nomina', ['anio', 'no_qna']);

    await queryInterface.createTable('bajas_temporal', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      anio: { type: Sequelize.SMALLINT, allowNull: false },
      no_qna: { type: Sequelize.SMALLINT, allowNull: false },
      s_usuario_id: { type: Sequelize.INTEGER, allowNull: false }, // saf.s_usuario.id_Usuario
      rfc: { type: Sequelize.STRING(20), allowNull: false }, // saf.s_usuario.N_Usuario
      curp: { type: Sequelize.STRING(18), allowNull: true },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      puesto: { type: Sequelize.STRING(150), allowNull: true },
      dependencia_id: { type: Sequelize.INTEGER, allowNull: true },
      direccion_id: { type: Sequelize.INTEGER, allowNull: true },
      departamento_id: { type: Sequelize.INTEGER, allowNull: true },
      subtipo: { type: Sequelize.STRING(10), allowNull: false }, // motivo: REN, DEF, JUB...
      fecha_baja: { type: Sequelize.DATEONLY, allowNull: false },
      observaciones: { type: Sequelize.STRING(250), allowNull: true },
      estatus: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'capturada' }, // capturada | validada | transmitida | cancelada
      creado_por: { type: Sequelize.STRING(20), allowNull: true },
      validado_por: { type: Sequelize.STRING(20), allowNull: true },
      validado_at: { type: Sequelize.DATE, allowNull: true },
      transmitido_por: { type: Sequelize.STRING(20), allowNull: true },
      transmitido_at: { type: Sequelize.DATE, allowNull: true },
      lote_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lotes_nomina', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex('bajas_temporal', ['anio', 'no_qna', 'estatus']);
    await queryInterface.addIndex('bajas_temporal', ['rfc', 'estatus']);

    await queryInterface.createTable('movimientos_historico', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      tipo_mov: { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'B' },
      origen_id: { type: Sequelize.BIGINT, allowNull: false }, // id en bajas_temporal
      lote_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'lotes_nomina', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      anio: { type: Sequelize.SMALLINT, allowNull: false },
      no_qna: { type: Sequelize.SMALLINT, allowNull: false },
      s_usuario_id: { type: Sequelize.INTEGER, allowNull: false },
      rfc: { type: Sequelize.STRING(20), allowNull: false },
      curp: { type: Sequelize.STRING(18), allowNull: true },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      puesto: { type: Sequelize.STRING(150), allowNull: true },
      dependencia_id: { type: Sequelize.INTEGER, allowNull: true },
      direccion_id: { type: Sequelize.INTEGER, allowNull: true },
      departamento_id: { type: Sequelize.INTEGER, allowNull: true },
      subtipo: { type: Sequelize.STRING(10), allowNull: false },
      fecha_baja: { type: Sequelize.DATEONLY, allowNull: false },
      observaciones: { type: Sequelize.STRING(250), allowNull: true },
      creado_por: { type: Sequelize.STRING(20), allowNull: true },
      validado_por: { type: Sequelize.STRING(20), allowNull: true },
      transmitido_por: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex('movimientos_historico', ['rfc']);
    await queryInterface.addIndex('movimientos_historico', ['anio', 'no_qna']);

    await queryInterface.createTable('bitacora_movimientos', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      tipo_mov: { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'B' },
      entidad_id: { type: Sequelize.BIGINT, allowNull: true }, // id del movimiento (bajas_temporal.id) o null si es del lote
      lote_id: { type: Sequelize.INTEGER, allowNull: true },
      accion: { type: Sequelize.STRING(20), allowNull: false }, // captura | validacion | cancelacion | transferencia
      estatus_anterior: { type: Sequelize.STRING(12), allowNull: true },
      estatus_nuevo: { type: Sequelize.STRING(12), allowNull: true },
      anio: { type: Sequelize.SMALLINT, allowNull: true },
      no_qna: { type: Sequelize.SMALLINT, allowNull: true },
      rfc_personal: { type: Sequelize.STRING(20), allowNull: true },
      detalle: { type: Sequelize.JSON, allowNull: true },
      usuario_rfc: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex('bitacora_movimientos', ['tipo_mov', 'entidad_id']);
    await queryInterface.addIndex('bitacora_movimientos', ['anio', 'no_qna']);
    await queryInterface.addIndex('bitacora_movimientos', ['rfc_personal']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bitacora_movimientos');
    await queryInterface.dropTable('movimientos_historico');
    await queryInterface.dropTable('bajas_temporal');
    await queryInterface.dropTable('lotes_nomina');
  },
};
