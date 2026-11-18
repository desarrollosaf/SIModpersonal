import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // MySQL: datos propios de SIModpersonal.
  main: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  // MySQL (adminplem_saf): solo lectura de usuarios para el login.
  external: {
    host: process.env.DB_EXTERNAL_HOST,
    port: parseInt(process.env.DB_EXTERNAL_PORT ?? '3306', 10),
    username: process.env.DB_EXTERNAL_USERNAME,
    password: process.env.DB_EXTERNAL_PASSWORD,
    database: process.env.DB_EXTERNAL_DATABASE,
  },
}));
