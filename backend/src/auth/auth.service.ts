import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersSafs } from '../database/models/users-safs.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { RolesService } from '../roles/roles.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UsersSafs, 'external')
    private readonly usersSafsModel: typeof UsersSafs,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async login(usuario: string, password: string) {
    // Usuario = s_usuario.N_Usuario (que coincide con users_safs.rfc); contraseña = users_safs.password.
    const user = await this.usersSafsModel.findOne({
      where: { rfc: usuario.trim().toUpperCase() },
      include: [{ model: SUsuario, as: 'datos_user' }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const nombreCompleto = user.datos_user
      ? [user.datos_user.Nombre, user.datos_user.A_Paterno, user.datos_user.A_Materno]
          .filter(Boolean)
          .join(' ')
      : user.name;

    const rol = await this.rolesService.getRolForRfc(user.rfc);

    const payload = { sub: user.id, rfc: user.rfc, rol };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: this.configService.get<number>('auth.jwtExpiresInSeconds'),
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        rfc: user.rfc,
        email: user.email,
        nombre: nombreCompleto,
        puesto: user.datos_user?.Puesto ?? null,
        path_foto: user.path_foto,
        cambio_contrasena: !!user.cambio_contrasena,
        rol,
      },
    };
  }

  async cambiarContrasena(userId: number, actual: string, nueva: string) {
    const user = await this.usersSafsModel.findByPk(userId);
    if (!user || !(await bcrypt.compare(actual, user.password))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (await bcrypt.compare(nueva, user.password)) {
      throw new BadRequestException('La contraseña nueva debe ser distinta a la actual');
    }
    await this.guardarContrasena(user, nueva);
    return { ok: true };
  }

  /** Siempre responde igual, exista o no el usuario, para no revelar quien esta registrado. */
  async solicitarRecuperacion(usuario: string) {
    const respuesta = {
      mensaje: 'Si el usuario existe y tiene un correo registrado, se envió un enlace de recuperación.',
    };

    const user = await this.usersSafsModel.findOne({
      where: { rfc: usuario.trim().toUpperCase() },
      include: [{ model: SUsuario, as: 'datos_user' }],
    });
    const correo = (user?.datos_user?.C_Electronico || user?.email || '').trim();
    if (!user || !correo) {
      return respuesta;
    }

    // El secreto incluye el hash actual: al cambiar la contraseña el enlace deja de servir (un solo uso).
    const token = await this.jwtService.signAsync(
      { sub: user.id, proposito: 'recuperar' },
      { secret: this.secretoRecuperacion(user), expiresIn: 3600 },
    );
    const base = this.configService.get<string>('auth.frontendUrl');
    const enlace = `${base}/restablecer?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.enviarRecuperacion(correo, user.name ?? user.rfc, enlace);
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo de recuperación a ${correo}`, error as Error);
    }
    return respuesta;
  }

  async restablecerContrasena(token: string, password: string) {
    const invalido = new BadRequestException('El enlace no es válido o ya venció');
    const decodificado = this.jwtService.decode<{ sub?: number } | null>(token);
    if (!decodificado?.sub) throw invalido;

    const user = await this.usersSafsModel.findByPk(decodificado.sub);
    if (!user) throw invalido;

    try {
      const payload = await this.jwtService.verifyAsync<{ proposito: string }>(token, {
        secret: this.secretoRecuperacion(user),
      });
      if (payload.proposito !== 'recuperar') throw invalido;
    } catch {
      throw invalido;
    }

    await this.guardarContrasena(user, password);
    return { ok: true };
  }

  private secretoRecuperacion(user: UsersSafs): string {
    return `${this.configService.get<string>('auth.jwtSecret')}${user.password}`;
  }

  private async guardarContrasena(user: UsersSafs, nueva: string) {
    user.password = await bcrypt.hash(nueva, 10);
    user.cambio_contrasena = 1;
    await user.save();
  }
}
