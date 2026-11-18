'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('roles', [
      { clave: 'administrador', nombre: 'Administrador', created_at: now, updated_at: now },
      { clave: 'capturista', nombre: 'Capturista', created_at: now, updated_at: now },
      { clave: 'consulta', nombre: 'Consulta', created_at: now, updated_at: now },
      { clave: 'usuario', nombre: 'Usuario', created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', {
      clave: ['administrador', 'capturista', 'consulta', 'usuario'],
    });
  },
};
