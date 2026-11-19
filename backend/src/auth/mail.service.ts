import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async enviarRecuperacion(destino: string, nombre: string, enlace: string): Promise<void> {
    const host = this.config.get<string>('auth.smtp.host');

    // Sin SMTP configurado (desarrollo) el enlace se escribe en el log del backend.
    if (!host) {
      this.logger.warn(`SMTP no configurado. Enlace de recuperación para ${destino}: ${enlace}`);
      return;
    }

    const user = this.config.get<string>('auth.smtp.user');
    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('auth.smtp.port'),
      secure: this.config.get<boolean>('auth.smtp.secure'),
      auth: user ? { user, pass: this.config.get<string>('auth.smtp.password') } : undefined,
    });

    await transporter.sendMail({
      from: this.config.get<string>('auth.smtp.from'),
      to: destino,
      subject: 'Recuperación de contraseña - SIModpersonal',
      text:
        `Hola ${nombre},\n\nRecibimos una solicitud para restablecer tu contraseña.\n` +
        `Entra al siguiente enlace (vence en 1 hora):\n${enlace}\n\n` +
        `Si no fuiste tú, ignora este mensaje.`,
      html:
        `<p>Hola ${nombre},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p>` +
        `<p><a href="${enlace}">Restablecer contraseña</a> (el enlace vence en 1 hora).</p>` +
        `<p>Si no fuiste tú, ignora este mensaje.</p>`,
    });
  }
}
