import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import { UsersSafs } from './database/models/users-safs.model';
import { SUsuario } from './database/models/s-usuario.model';
import { SUsers } from './database/models/s-users.model';
import { TDependencia } from './database/models/t-dependencia.model';
import { TDireccion } from './database/models/t-direccion.model';
import { TDepartamento } from './database/models/t-departamento.model';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { MovimientosModule } from './movimientos/movimientos.module';

interface ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig],
    }),
    // Conexión principal (default): MySQL con los datos propios de SIModpersonal.
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<ConnectionConfig>('database.main')!;
        return {
          dialect: 'mysql',
          ...db,
          models: [],
          autoLoadModels: true,
          synchronize: false,
          // DATEONLY y DECIMAL llegan como texto: es lo que espera el frontend.
          define: { underscored: true },
        };
      },
    }),
    // Conexión externa (adminplem_saf, MySQL): usuarios para el login.
    SequelizeModule.forRootAsync({
      name: 'external',
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<ConnectionConfig>('database.external')!;
        return {
          dialect: 'mysql',
          ...db,
          models: [
            UsersSafs,
            SUsuario,
            SUsers,
            TDependencia,
            TDireccion,
            TDepartamento,
          ],
          autoLoadModels: true,
          synchronize: false,
        };
      },
    }),
    AuthModule,
    CatalogosModule,
    EmpleadosModule,
    MovimientosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
