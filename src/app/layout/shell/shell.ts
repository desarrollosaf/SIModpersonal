import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InactivityService } from '../../core/services/inactivity.service';

interface NavChild {
  label: string;
  route?: string;
  children?: { label: string; route: string }[];
}

interface NavItem {
  label: string;
  route?: string;
  children?: NavChild[];
}

const MOVIMIENTOS: NavItem = {
  label: 'Movimientos',
  children: [
    { label: 'Captura de movimientos', route: '/movimientos/nuevo' },
    { label: 'Consulta individual', route: '/movimientos' },
    { label: 'Movimientos por periodo', route: '/consulta-periodo' },
    { label: 'Validación y envío a nómina', route: '/validacion' },
    { label: 'Bitácora e histórico', route: '/bitacora' },
  ],
};

const CONSULTA: NavItem = {
  label: 'Consulta',
  children: [
    { label: 'Consulta individual', route: '/movimientos' },
    { label: 'Movimientos por periodo', route: '/consulta-periodo' },
    { label: 'Validación y envío a nómina', route: '/validacion' },
    { label: 'Bitácora e histórico', route: '/bitacora' },
  ],
};

const ADMINISTRACION: NavItem = {
  label: 'Administración',
  children: [{ label: 'Roles de usuario', route: '/administracion/roles' }],
};

function buildNav(rol: string): NavItem[] {
  switch (rol) {
    case 'administrador':
      return [MOVIMIENTOS, ADMINISTRACION];
    case 'capturista':
      return [MOVIMIENTOS];
    case 'consulta':
      return [CONSULTA];
    default:
      return [];
  }
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit, OnDestroy {
  protected readonly user;
  protected readonly nav;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    protected readonly inactivity: InactivityService,
  ) {
    this.user = this.authService.currentUser;
    this.nav = computed(() => buildNav(this.user()?.rol ?? 'usuario'));
  }

  ngOnInit(): void {
    this.inactivity.start();
  }

  ngOnDestroy(): void {
    this.inactivity.stop();
  }

  logout(): void {
    this.inactivity.stop();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  /** Submenú desplegado dentro de un menú. */
  protected readonly submenuAbierto = signal<string | null>(null);

  alternarSubmenu(evento: Event, label: string): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.submenuAbierto.update((actual) => (actual === label ? null : label));
  }

  submenuVisible(child: NavChild): boolean {
    return (
      this.submenuAbierto() === child.label ||
      (child.children ?? []).some((c) => this.router.url.startsWith(c.route))
    );
  }

  cerrarMenuMovil(): void {
    const menu = document.getElementById('mainNav');
    if (!menu || !menu.classList.contains('show')) return;

    const bootstrapGlobal = (window as unknown as { bootstrap?: BootstrapGlobal }).bootstrap;
    bootstrapGlobal?.Collapse.getOrCreateInstance(menu).hide();
  }
}

interface BootstrapGlobal {
  Collapse: {
    getOrCreateInstance(element: Element): { hide(): void };
  };
}
