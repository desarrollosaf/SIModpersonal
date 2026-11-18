'use strict';

/**
 * MOV-PER (Progress) -> movimientos + movimiento_percepciones.
 * Los arreglos CVES[7] / IMP[7] de MOV-PER se normalizan en movimiento_percepciones (orden 1..7).
 * La tabla temporal AUX de CAP-MOP desaparece: el formulario edita un solo documento.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };

    await queryInterface.createTable('movimientos', {
      folio: { type: Sequelize.STRING(6), primaryKey: true, allowNull: false }, // MOV-PER.FOLIO "NNNNAA"
      fec_mov: { type: Sequelize.DATEONLY, allowNull: false }, // FEC-MOV
      no_qna: { type: Sequelize.SMALLINT, allowNull: false }, // NO-QNA (1..24)
      tipo_mov: { type: Sequelize.STRING(1), allowNull: false }, // 1er caracter de TIP-MOV: A, B, P, T, L
      subtipo_mov: { type: Sequelize.STRING(3), allowNull: false }, // caracteres 2-4 de TIP-MOV
      curp: { type: Sequelize.STRING(18), allowNull: false }, // CURP
      rfc: { type: Sequelize.STRING(14), allowNull: true }, // RFC
      nombre: { type: Sequelize.STRING(60), allowNull: false }, // NOMBRE
      sexo: { type: Sequelize.STRING(1), allowNull: true }, // SEXO
      ads_ant: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cat_adscripciones', key: 'id' } }, // ADS-ANT
      ads_act: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cat_adscripciones', key: 'id' } }, // ADS-ACT
      puesto_clave: { type: Sequelize.STRING(10), allowNull: false, references: { model: 'cat_puestos', key: 'clave' } }, // PUESTO
      rango: { type: Sequelize.SMALLINT, allowNull: false }, // RANGO
      percep_a: { type: Sequelize.DECIMAL(12, 2), allowNull: true }, // PERCEP-A (percepciones anteriores)
      tip_con: { type: Sequelize.STRING(1), allowNull: true }, // TIP-CON: C, B, S, T, O
      tipo_nomina: { type: Sequelize.STRING(1), allowNull: false }, // TIPO: D, P, H
      f_alta: { type: Sequelize.DATEONLY, allowNull: true }, // F-ALTA ("a partir de")
      f_term: { type: Sequelize.DATEONLY, allowNull: true }, // F-TERM
      reemp: { type: Sequelize.STRING(60), allowNull: true }, // REEMP ("en sustitucion de")
      horario: { type: Sequelize.STRING(1), allowNull: true }, // HORARIO: O, E, V
      h_mat: { type: Sequelize.STRING(20), allowNull: true }, // H-MAT
      h_ves: { type: Sequelize.STRING(20), allowNull: true }, // H-VES
      tarj: { type: Sequelize.SMALLINT, allowNull: true }, // TARJ (0 = NO, 1 = SI)
      cta_ban: { type: Sequelize.STRING(20), allowNull: true }, // CTA-BAN
      obs: { type: Sequelize.STRING(250), allowNull: true }, // OBS
      docum_ok: { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'N' }, // DOCUM_OK: S, N, T (transmitido a nomina)
      creado_por: { type: Sequelize.STRING(20), allowNull: true }, // RFC del capturista
      actualizado_por: { type: Sequelize.STRING(20), allowNull: true },
      ...timestamps,
    });
    await queryInterface.addConstraint('movimientos', {
      fields: ['tipo_mov', 'subtipo_mov'],
      type: 'foreign key',
      name: 'fk_movimientos_subtipo',
      references: { table: 'cat_subtipos_movimiento', fields: ['tipo', 'clave'] },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_qna CHECK (no_qna BETWEEN 1 AND 24)`);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_folio CHECK (folio ~ '^[0-9]{6}$')`);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_tip_con CHECK (tip_con IS NULL OR tip_con IN ('C','B','S','T','O'))`);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_tipo_nomina CHECK (tipo_nomina IN ('D','P','H'))`);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_horario CHECK (horario IS NULL OR horario IN ('O','E','V'))`);
    await q(`ALTER TABLE movimientos ADD CONSTRAINT ck_movimientos_docum_ok CHECK (docum_ok IN ('S','N','T'))`);
    await q('CREATE INDEX ix_movimientos_curp10 ON movimientos (substr(curp, 1, 10))');
    await q('CREATE INDEX ix_movimientos_periodo ON movimientos (substr(folio, 5, 2), no_qna)');
    await queryInterface.addIndex('movimientos', ['fec_mov']);
    await queryInterface.addIndex('movimientos', ['tipo_mov', 'subtipo_mov']);

    await queryInterface.createTable('movimiento_percepciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      folio: {
        type: Sequelize.STRING(6),
        allowNull: false,
        references: { model: 'movimientos', key: 'folio' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      orden: { type: Sequelize.SMALLINT, allowNull: false }, // posicion 1..7 dentro de CVES[] / IMP[]
      cve: { type: Sequelize.SMALLINT, allowNull: false }, // CVES[orden]
      importe: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // IMP[orden]
      ...timestamps,
    });
    await queryInterface.addConstraint('movimiento_percepciones', {
      fields: ['folio', 'orden'],
      type: 'unique',
      name: 'uq_movimiento_percepciones_folio_orden',
    });
    await q(`ALTER TABLE movimiento_percepciones ADD CONSTRAINT ck_mov_percep_orden CHECK (orden BETWEEN 1 AND 7)`);

    // Bitacora de cambios (el sistema original no la tenia; sirve para auditar quien modifico un folio).
    await queryInterface.createTable('movimientos_bitacora', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      folio: { type: Sequelize.STRING(6), allowNull: false },
      accion: { type: Sequelize.STRING(20), allowNull: false }, // CREAR, MODIFICAR, TRANSMITIR, ELIMINAR
      usuario_rfc: { type: Sequelize.STRING(20), allowNull: true },
      datos: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('movimientos_bitacora', ['folio']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movimientos_bitacora');
    await queryInterface.dropTable('movimiento_percepciones');
    await queryInterface.dropTable('movimientos');
  },
};
