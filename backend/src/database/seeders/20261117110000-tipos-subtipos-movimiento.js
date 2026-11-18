'use strict';

const TIPOS = [
  ['A', 'ALTA'],
  ['B', 'BAJA'],
  ['P', 'PROMOCION'],
  ['T', 'TRANSFERENCIA'],
  ['L', 'LICENCIA'],
];

// [tipo, clave, nombre]  (CAP-MOP: procedure combo-tm y LOOKUP de subtipos)
const SUBTIPOS = [
  ['A', 'NUE', 'NUEVO INGRESO'],
  ['A', 'REI', 'REINGRESO'],
  ['A', 'RIN', 'REINCORPORACION'],
  ['B', 'REN', 'RENUNCIA'],
  ['B', 'RES', 'RESCISION'],
  ['B', 'JUB', 'JUBILACION'],
  ['B', 'DEF', 'DEFUNCION'],
  ['B', 'TER', 'TERMINO DE CONTRATO'],
  ['B', 'CPL', 'RESOLUCION CONTRALORIA'],
  ['B', 'CDE', 'CONCLUSION DE ENCARGO'],
  ['B', 'PCL', 'POR CONVENIO LABORAL'],
  ['B', 'TLE', 'TERMINO DE LEGISLATURA'],
  ['P', 'REC', 'RECLASIFICACION'],
  ['P', 'REM', 'REMUNERACION ADICIONAL'],
  ['P', 'QUI', 'QUINQUENIO'],
  ['T', 'TRA', 'TRANSFERENCIA'],
  ['L', 'CON', 'CON SUELDO'],
  ['L', 'SIN', 'SIN SUELDO'],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'cat_tipos_movimiento',
      TIPOS.map(([clave, nombre]) => ({ clave, nombre, created_at: now, updated_at: now })),
    );
    await queryInterface.bulkInsert(
      'cat_subtipos_movimiento',
      SUBTIPOS.map(([tipo, clave, nombre]) => ({
        tipo,
        clave,
        nombre,
        activo: true,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cat_subtipos_movimiento', null, {});
    await queryInterface.bulkDelete('cat_tipos_movimiento', null, {});
  },
};
