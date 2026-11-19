import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersSafs } from '../database/models/users-safs.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { RolesModule } from '../roles/roles.module';
import { JwtAuthModule } from './jwt-auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    SequelizeModule.forFeature([UsersSafs, SUsuario], 'external'),
    RolesModule,
    JwtAuthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
  exports: [JwtAuthModule],
})
export class AuthModule {}
