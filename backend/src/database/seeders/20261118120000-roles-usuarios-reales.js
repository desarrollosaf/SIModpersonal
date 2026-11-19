'use strict';

// Asigna rol (en usuario_roles, por RFC) a usuarios que ya existen en saf.users_safs.
// No toca sus contraseñas: entran con la que tienen en users_safs.
const ASIGNACIONES = [
  { rfc: 'GANJ931118', rol: 'administrador' },
  { rfc: 'AIJA770907', rol: 'administrador' },
  { rfc: 'JIRM760305', rol: 'capturista' },
  { rfc: 'JIRS941021', rol: 'consulta' },
  { rfc: 'CAVL870806', rol: 'usuario' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const a of ASIGNACIONES) {
      await queryInterface.sequelize.query(
        `INSERT INTO usuario_roles (rfc, rol_id, created_at, updated_at)
         SELECT :rfc, id, NOW(), NOW() FROM roles WHERE clave = :rol
         ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id), updated_at = NOW()`,
        { replacements: a },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuario_roles', { rfc: ASIGNACIONES.map((a) => a.rfc) });
  },
};
