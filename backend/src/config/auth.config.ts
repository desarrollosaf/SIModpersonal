import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? '28800', 10),
  // URL publica del frontend, usada para armar el enlace de recuperacion.
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4220',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM ?? 'SIModpersonal <no-reply@congresoedomex.gob.mx>',
  },
}));
