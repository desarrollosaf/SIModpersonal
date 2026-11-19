import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }

  return router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return true;
  }

  return router.parseUrl('/home');
};

/** Obliga a cambiar la contraseña en el primer ingreso (users_safs.cambio_contrasena = 0). */
export const passwordChangedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (environment.forzarCambioContrasena && auth.currentUser()?.cambio_contrasena === false) {
    return router.parseUrl('/cambiar-contrasena');
  }

  return true;
};
