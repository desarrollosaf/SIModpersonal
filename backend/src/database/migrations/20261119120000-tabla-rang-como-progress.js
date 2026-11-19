'use strict';

/**
 * El tabulador pasa a la misma forma que TABLA-RANG en Progress: UN renglon por nivel con
 * Imp-Nivel, Imp-Rang[1..5] e Imp-Comp[1..5] como columnas (igual que el Excel TABLA-RANG-Qxxxx).
 * Se conserva version_id para el historial (tabulador_versiones) y la bitacora.
 * Reemplaza a tabla_niveles + tabla_rangos, copiando sus datos.
 */
const RANGOS = [1, 2, 3, 4, 5];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;
    const dec = () => ({ type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

    await queryInterface.createTable('tabla_rang', {
      version_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'tabulador_versiones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false }, // NIVEL
      imp_nivel: dec(), // IMP-NIVEL
      ...Object.fromEntries(RANGOS.map((n) => [`imp_ran_${n}`, dec()])), // IMP-RAN-1..5 (Imp-Rang[n])
      ...Object.fromEntries(RANGOS.map((n) => [`imp_comp_${n}`, dec()])), // IMP-COMP-1..5 (Imp-Comp[n])
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    const ran = RANGOS.map((n) => `COALESCE(MAX(CASE WHEN r.rango = ${n} THEN r.imp_rango END), 0)`);
    const comp = RANGOS.map((n) => `COALESCE(MAX(CASE WHEN r.rango = ${n} THEN r.imp_comp END), 0)`);
    await q.query(
      `INSERT INTO tabla_rang (version_id, nivel, imp_nivel, ${RANGOS.map((n) => `imp_ran_${n}`).join(', ')},
                               ${RANGOS.map((n) => `imp_comp_${n}`).join(', ')}, created_at, updated_at)
       SELECT n.version_id, n.nivel, n.imp_nivel, ${ran.join(', ')}, ${comp.join(', ')}, n.created_at, n.updated_at
       FROM tabla_niveles n
       LEFT JOIN tabla_rangos r ON r.version_id = n.version_id AND r.nivel = n.nivel
       GROUP BY n.version_id, n.nivel, n.imp_nivel, n.created_at, n.updated_at`,
    );

    await queryInterface.dropTable('tabla_rangos');
    await queryInterface.dropTable('tabla_niveles');
  },

  async down(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };
    await queryInterface.createTable('tabla_niveles', {
      version_id: {
        type: Sequelize.INTEGER, primaryKey: true, allowNull: false,
        references: { model: 'tabulador_versiones', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      imp_nivel: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.createTable('tabla_rangos', {
      version_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
      nivel: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      rango: { type: Sequelize.SMALLINT, primaryKey: true, allowNull: false },
      imp_rango: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      imp_comp: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addConstraint('tabla_rangos', {
      fields: ['version_id', 'nivel'], type: 'foreign key', name: 'fk_tabla_rangos_nivel',
      references: { table: 'tabla_niveles', fields: ['version_id', 'nivel'] }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
    });
    await q.query('INSERT INTO tabla_niveles (version_id, nivel, imp_nivel) SELECT version_id, nivel, imp_nivel FROM tabla_rang');
    for (const n of RANGOS) {
      await q.query(
        `INSERT INTO tabla_rangos (version_id, nivel, rango, imp_rango, imp_comp)
         SELECT version_id, nivel, ${n}, imp_ran_${n}, imp_comp_${n} FROM tabla_rang`,
      );
    }
    await queryInterface.dropTable('tabla_rang');
  },
};
