import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { RecuperarDto } from './dto/recuperar.dto';
import { RestablecerDto } from './dto/restablecer.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.rfc, loginDto.password);
  }

  @Post('cambiar-contrasena')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cambiarContrasena(@Req() req: Request, @Body() dto: CambiarContrasenaDto) {
    const { sub } = req['user'] as { sub: number };
    return this.authService.cambiarContrasena(sub, dto.actual, dto.nueva);
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  recuperar(@Body() dto: RecuperarDto) {
    return this.authService.solicitarRecuperacion(dto.usuario);
  }

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  restablecer(@Body() dto: RestablecerDto) {
    return this.authService.restablecerContrasena(dto.token, dto.password);
  }
}
