'use strict';

/**
 * Tabulador versionado (TABLA-RANG del sistema original).
 *  - tabulador_versiones: cada carga/actualizacion del tabulador (ej. Q0226). Solo una es "vigente";
 *    las anteriores quedan como "historico" y no se borran.
 *  - tabla_niveles / tabla_rangos: los importes de cada version (antes eran unicos, sin historia).
 *  - tabulador_bitacora: cada alta, modificacion o baja de un importe (valor anterior y nuevo).
 * tabla_niveles y tabla_rangos estaban vacias, por eso se recrean.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };

    await queryInterface.dropTable('tabla_rangos');
    await queryInterface.dropTable('tabla_niveles');

    await queryInterface.createTable('tabulador_versiones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      clave: { type: Sequelize.STRING(20), allowNull: false, unique: true }, // ej. Q0226
      anio: { type: Sequelize.SMALLINT, allowNull: false },
      quincena_inicio: { type: Sequelize.SMALLINT, allowNull: false }, // primera quincena (1-24) en que aplica
      estatus: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'borrador' }, // borrador | vigente | historico
      descripcion: { type: Sequelize.STRING(200), allowNull: true },
      archivo_origen: { type: Sequelize.STRING(200), allowNull: true },
      publicada_at: { type: Sequelize.DATE, allowNull: true }, // cuando paso a vigente
      creado_por: { type: Sequelize.STRING(20), allowNull: true }, // RFC
      ...timestamps,
    });
    await queryInterface.addIndex('tabulador_versiones', ['estatus']);

    await queryInterface.createTable('tabla_niveles', {
      version_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'tabulador_versiones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false }, // IMP-NIVEL por nivel
      imp_nivel: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('tabla_rangos', {
      version_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      rango: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false }, // 1-5 (IMP-RAN-n / IMP-COMP-n)
      imp_rango: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // gratificacion
      imp_comp: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // compensacion
      ...timestamps,
    });
    await queryInterface.addConstraint('tabla_rangos', {
      fields: ['version_id', 'nivel'],
      type: 'foreign key',
      name: 'fk_tabla_rangos_nivel',
      references: { table: 'tabla_niveles', fields: ['version_id', 'nivel'] },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.createTable('tabulador_bitacora', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      version_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tabulador_versiones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      accion: { type: Sequelize.STRING(15), allowNull: false }, // importacion | alta | modificacion | baja | publicacion
      nivel: { type: Sequelize.SMALLINT, allowNull: true },
      rango: { type: Sequelize.SMALLINT, allowNull: true },
      campo: { type: Sequelize.STRING(20), allowNull: true }, // imp_nivel | imp_rango | imp_comp
      valor_anterior: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      valor_nuevo: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      motivo: { type: Sequelize.STRING(250), allowNull: true },
      usuario_rfc: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('tabulador_bitacora', ['version_id', 'nivel', 'rango']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tabulador_bitacora');
    await queryInterface.dropTable('tabla_rangos');
    await queryInterface.dropTable('tabla_niveles');
    await queryInterface.dropTable('tabulador_versiones');
    // Estructura original (sin versiones).
    await queryInterface.createTable('tabla_niveles', {
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      imp_nivel: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.createTable('tabla_rangos', {
      nivel: {
        type: Sequelize.SMALLINT, primaryKey: true, allowNull: false,
        references: { model: 'tabla_niveles', key: 'nivel' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      rango: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      imp_rango: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      imp_comp: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
};
