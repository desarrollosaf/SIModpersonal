'use strict';

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// El login valida contra users_safs (MySQL externo, bcrypt) y el rol vive en
// Postgres (usuario_roles, por RFC). Por eso este seeder toca las dos bases.
// El campo rfc funciona como identificador interno; el login acepta rfc o correo.
const USUARIOS = [
  {
    name: 'Administrador',
    email: 'Administrador@congresoedomex.gob.mx',
    rfc: 'ADMINISTRADOR',
    password: 'dadp171126@',
    rol: 'administrador',
  },
  {
    name: 'Usuario',
    email: 'user_dadp@congresoedomex.gob.mx',
    rfc: 'USUARIO',
    password: 's1dadp171126',
    rol: 'usuario',
  },
  {
    name: 'Capturista',
    email: 'capturista_dadp@congresoedomex.gob.mx',
    rfc: 'CAPTURISTA',
    password: 's2dadp171126',
    rol: 'capturista',
  },
  {
    name: 'Consulta',
    email: 'consulta_dadp@congresoedomex.gob.mx',
    rfc: 'CONSULTA',
    password: 's3dadp171126',
    rol: 'consulta',
  },
];

async function conectarMysql() {
  return mysql.createConnection({
    host: process.env.DB_EXTERNAL_HOST,
    port: parseInt(process.env.DB_EXTERNAL_PORT ?? '3306', 10),
    user: process.env.DB_EXTERNAL_USERNAME,
    password: process.env.DB_EXTERNAL_PASSWORD,
    database: process.env.DB_EXTERNAL_DATABASE,
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const db = await conectarMysql();
    try {
      for (const u of USUARIOS) {
        const hash = await bcrypt.hash(u.password, 10);
        const [existe] = await db.execute(
          'SELECT id FROM users_safs WHERE rfc = ? LIMIT 1',
          [u.rfc],
        );
        if (existe.length) {
          await db.execute(
            'UPDATE users_safs SET name = ?, email = ?, password = ?, cambio_contrasena = 0, deleted_at = NULL, updated_at = NOW() WHERE rfc = ?',
            [u.name, u.email, hash, u.rfc],
          );
        } else {
          await db.execute(
            'INSERT INTO users_safs (name, email, rfc, password, cambio_contrasena, created_at, updated_at) VALUES (?, ?, ?, ?, 0, NOW(), NOW())',
            [u.name, u.email, u.rfc, hash],
          );
        }
      }
    } finally {
      await db.end();
    }

    const sequelize = queryInterface.sequelize;
    for (const u of USUARIOS) {
      await sequelize.query(
        `INSERT INTO usuario_roles (rfc, rol_id, created_at, updated_at)
         SELECT :rfc, id, NOW(), NOW() FROM roles WHERE clave = :rol
         ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id), updated_at = NOW()`,
        { replacements: { rfc: u.rfc, rol: u.rol } },
      );
    }
  },

  async down(queryInterface) {
    const rfcs = USUARIOS.map((u) => u.rfc);
    const db = await conectarMysql();
    try {
      await db.query('DELETE FROM users_safs WHERE rfc IN (?)', [rfcs]);
    } finally {
      await db.end();
    }
    await queryInterface.bulkDelete('usuario_roles', { rfc: rfcs });
  },
};
