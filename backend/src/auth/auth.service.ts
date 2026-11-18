import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { Op } from 'sequelize';
import * as bcrypt from 'bcryptjs';
import { UsersSafs } from '../database/models/users-safs.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UsersSafs, 'external')
    private readonly usersSafsModel: typeof UsersSafs,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(identificador: string, password: string) {
    const rfc = identificador.trim();
    const user = await this.usersSafsModel.findOne({
      where: { [Op.or]: [{ rfc: rfc.toUpperCase() }, { email: rfc }] },
      include: [{ model: SUsuario, as: 'datos_user' }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('RFC o contraseña incorrectos');
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
}
