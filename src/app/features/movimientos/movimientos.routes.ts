import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const MOVIMIENTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/movimientos-lista').then((m) => m.MovimientosLista),
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard(['administrador', 'capturista'])],
    loadComponent: () =>
      import('./formulario/movimiento-formulario').then((m) => m.MovimientoFormulario),
  },
  {
    path: ':folio',
    loadComponent: () =>
      import('./formulario/movimiento-formulario').then((m) => m.MovimientoFormulario),
  },
];
