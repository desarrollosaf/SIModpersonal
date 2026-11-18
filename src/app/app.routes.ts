import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
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
        path: 'administracion/roles',
        canActivate: [roleGuard(['administrador'])],
        loadChildren: () =>
          import('./features/administracion/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
