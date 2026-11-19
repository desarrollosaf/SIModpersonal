import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { Movimiento, MovimientosService } from '../../../core/services/movimientos.service';
import { QUINCENAS, quincenaActual } from '../../bajas/quincenas';
import { Paginador } from '../../../shared/tarjetas/paginador';
import { TablaMovimientos } from '../../../shared/tabla-movimientos/tabla-movimientos';

@Component({
  selector: 'app-movimientos-lista',
  standalone: true,
  imports: [RouterLink, FormsModule, Paginador, TablaMovimientos],
  templateUrl: './movimientos-lista.html',
  styleUrl: './movimientos-lista.scss',
})
export class MovimientosLista implements OnDestroy {
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly datos = signal<Movimiento[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(25);

  protected readonly busqueda = signal('');
  protected readonly tipoMov = signal('');
  protected readonly anio = signal(String(new Date().getFullYear()).slice(2));
  protected readonly quincenas = QUINCENAS;
  /** Por defecto se muestran los movimientos de la quincena en curso (0 = todas). */
  protected readonly quincena = signal(quincenaActual());
  protected readonly puedeCapturar;

  private readonly busquedaTexto$ = new Subject<string>();
  private readonly sub: Subscription;

  constructor(
    private readonly movimientos: MovimientosService,
    authService: AuthService,
  ) {
    this.puedeCapturar = () => ['administrador', 'capturista'].includes(authService.currentUser()?.rol ?? '');
    this.sub = this.busquedaTexto$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.pagina.set(1);
      this.cargar();
    });
    this.cargar();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.busquedaTexto$.next(texto);
  }

  cambiarFiltro(): void {
    this.pagina.set(1);
    this.cargar();
  }

  irAPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
  }

  cambiarTamano(t: number): void {
    this.tamano.set(t);
    this.cambiarFiltro();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.movimientos
      .listar({
        anio: this.anio() || undefined,
        // Con texto de búsqueda se busca en todo el año; sin él, solo en la quincena elegida.
        qnaInicial: this.busqueda().trim() || !this.quincena() ? undefined : this.quincena(),
        qnaFinal: this.busqueda().trim() || !this.quincena() ? undefined : this.quincena(),
        tipoMov: this.tipoMov() || undefined,
        q: this.busqueda().trim() || undefined,
        page: this.pagina(),
        limit: this.tamano(),
      })
      .subscribe({
        next: (r) => {
          this.datos.set(r.datos);
          this.total.set(r.total);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los movimientos.');
          this.cargando.set(false);
        },
      });
  }
}
