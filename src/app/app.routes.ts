import { Routes } from '@angular/router';
import { authGuard, guestGuard, passwordChangedGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: 'recuperar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/cuenta/recuperar').then((m) => m.Recuperar),
  },
  {
    path: 'restablecer',
    loadComponent: () => import('./features/cuenta/restablecer').then((m) => m.Restablecer),
  },
  {
    path: 'cambiar-contrasena',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cuenta/cambiar-contrasena').then((m) => m.CambiarContrasena),
  },
  {
    path: '',
    canActivate: [authGuard, passwordChangedGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'movimientos',
        canActivate: [roleGuard(['administrador', 'capturista', 'consulta'])],
        loadChildren: () =>
          import('./features/movimientos/movimientos.routes').then((m) => m.MOVIMIENTOS_ROUTES),
      },
      {
        path: 'consulta-periodo',
        canActivate: [roleGuard(['administrador', 'capturista', 'consulta'])],
        loadComponent: () =>
          import('./features/consulta-periodo/consulta-periodo').then((m) => m.ConsultaPeriodo),
      },
      {
        path: 'validacion',
        canActivate: [roleGuard(['administrador', 'capturista', 'consulta'])],
        loadComponent: () => import('./features/validacion/validacion').then((m) => m.Validacion),
      },
      {
        path: 'bitacora',
        canActivate: [roleGuard(['administrador', 'capturista', 'consulta'])],
        loadComponent: () => import('./features/bajas/bitacora').then((m) => m.Bitacora),
      },
      {
        path: 'administracion/roles',
        canActivate: [roleGuard(['administrador'])],
        loadChildren: () =>
          import('./features/administracion/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
