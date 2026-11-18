import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Asignacion, Rol, RolesService, UsuarioBusqueda } from '../../../core/services/roles.service';
import { ToastService } from '../../../core/services/toast.service';
import { TarjetaRegistro } from '../../../shared/tarjetas/tarjeta-registro';
import { TonoTarjeta } from '../../../shared/tarjetas/tarjeta-solicitud';
import { Paginador } from '../../../shared/tarjetas/paginador';
import { ListaPaginada } from '../../../shared/tarjetas/lista-paginada';

const ROL_USUARIO = 'usuario';

/** Palabras que van en minúscula al pasar los textos del catálogo a formato de título. */
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'para', 'por', 'con']);

/** Color de la marca de la card según el rol (mismo criterio que los chips de rol). */
const TONO_POR_ROL: Record<string, TonoTarjeta | 'primario'> = {
  administrador: 'primario',
  capturista: 'ok',
  consulta: 'info',
};
@Component({
  selector: 'app-roles-asignacion',
  standalone: true,
  imports: [FormsModule, TarjetaRegistro, Paginador],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class RolesAsignacion {
  protected readonly roles = signal<Rol[]>([]);
  /** "Usuario" no se asigna: es el rol automático de quien no tiene ningún otro. */
  protected readonly rolesAsignables = computed(() => this.roles().filter((r) => r.clave !== ROL_USUARIO));
  protected readonly asignaciones = signal<Asignacion[]>([]);
  protected readonly cargandoAsignaciones = signal(true);

  protected readonly query = signal('');
  protected readonly resultados = signal<UsuarioBusqueda[]>([]);
  protected readonly mostrarResultados = signal(false);
  protected readonly buscando = signal(false);

  protected readonly usuarioSeleccionado = signal<UsuarioBusqueda | null>(null);
  protected readonly rolSeleccionadoId = signal<number | null>(null);

  protected readonly guardando = signal(false);

  /** Filtro de la lista por clave de rol ('' = todos). */
  protected readonly filtroRol = signal('');
  private readonly asignacionesFiltradas = computed(() => {
    const rol = this.filtroRol();
    return rol ? this.asignaciones().filter((a) => a.rol.clave === rol) : this.asignaciones();
  });
  protected readonly lista = new ListaPaginada(
    () => this.asignacionesFiltradas(),
    (a) => [a.nombre, a.rfc, a.puesto, a.direccion, a.departamento, a.rol.nombre].filter(Boolean).join(' '),
  );

  private readonly searchTerms$ = new Subject<string>();

  constructor(
    private readonly rolesService: RolesService,
    private readonly toastService: ToastService,
  ) {
    this.rolesService.listRoles().subscribe((roles) => this.roles.set(roles));
    this.cargarAsignaciones();

    this.searchTerms$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim().length < 2) {
            return [];
          }
          this.buscando.set(true);
          return this.rolesService.buscarUsuarios(term);
        }),
      )
      .subscribe((resultados) => {
        this.buscando.set(false);
        this.resultados.set(resultados);
      });
  }

  onQueryChange(valor: string): void {
    this.query.set(valor);
    this.usuarioSeleccionado.set(null);
    this.mostrarResultados.set(true);
    this.searchTerms$.next(valor);
  }

  onQueryBlur(): void {
    setTimeout(() => this.mostrarResultados.set(false), 150);
  }

  /** Rol que ya tiene asignado una persona (para avisarlo al buscarla en "Asignar rol"). */
  rolActualDe(rfc: string): Rol | null {
    return this.asignaciones().find((a) => a.rfc === rfc)?.rol ?? null;
  }

  onFiltroRolChange(clave: string): void {
    this.filtroRol.set(clave);
    this.lista.reiniciar();
  }

  /**
   * El catálogo de personal guarda todo en mayúsculas ("DIR DE FINANZAS"); se pasa a formato de
   * título para leerlo mejor, con conectores en minúscula y respetando siglas entre paréntesis.
   */
  legible(texto: string): string {
    return texto
      .trim()
      .split(/\s+/)
      .map((palabra, i) => {
        if (/^\(.*\)$/.test(palabra)) return palabra.toUpperCase();
        const minuscula = palabra.toLocaleLowerCase('es-MX');
        if (i > 0 && CONECTORES.has(minuscula)) return minuscula;
        return minuscula.charAt(0).toLocaleUpperCase('es-MX') + minuscula.slice(1);
      })
      .join(' ');
  }

  tonoDe(asignacion: Asignacion): TonoTarjeta | 'primario' {
    return TONO_POR_ROL[asignacion.rol.clave] ?? 'neutral';
  }

  seleccionarUsuario(usuario: UsuarioBusqueda): void {
    this.usuarioSeleccionado.set(usuario);
    this.query.set(`${usuario.nombre} (${usuario.rfc})`);
    this.resultados.set([]);
    this.mostrarResultados.set(false);
  }

  asignar(): void {
    const usuario = this.usuarioSeleccionado();
    const rolId = this.rolSeleccionadoId();

    if (!usuario || !rolId) {
      return;
    }

    this.guardando.set(true);

    this.rolesService.asignarRol(usuario.rfc, rolId).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastService.success(`Rol asignado a ${usuario.nombre}.`);
        this.query.set('');
        this.usuarioSeleccionado.set(null);
        this.rolSeleccionadoId.set(null);
        this.cargarAsignaciones();
      },
      error: () => {
        this.guardando.set(false);
        this.toastService.error('No se pudo asignar el rol. Intenta de nuevo.');
      },
    });
  }

  quitar(asignacion: Asignacion): void {
    const nombre = asignacion.nombre ?? asignacion.rfc;

    Swal.fire({
      title: '¿Quitar este rol?',
      text: `${nombre} perderá el rol de ${asignacion.rol.nombre} y volverá a tener el rol "Usuario".`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.rolesService.quitarAsignacion(asignacion.rfc).subscribe({
        next: () => {
          this.toastService.success(`Rol quitado a ${nombre}.`);
          this.cargarAsignaciones();
        },
        error: () => this.toastService.error('No se pudo quitar el rol.'),
      });
    });
  }

  private cargarAsignaciones(): void {
    this.cargandoAsignaciones.set(true);
    this.rolesService.listAsignaciones().subscribe({
      next: (asignaciones) => {
        this.asignaciones.set(asignaciones);
        this.cargandoAsignaciones.set(false);
      },
      error: () => this.cargandoAsignaciones.set(false),
    });
  }
}
