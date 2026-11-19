import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Baja, BajasService, Concentrado } from '../../core/services/bajas.service';

/** Concentrado (tabla temporal) de bajas de una quincena, con los botones de validar y transferir a nómina. */
@Component({
  selector: 'app-panel-bajas',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './bajas.scss',
  template: `
    <div class="encabezado">
      <span class="hint">Quincena {{ noQna() }} / {{ anio() }}</span>
      <div class="chips">
        <span class="chip chip--capturada">Capturadas {{ resumen().capturada }}</span>
        <span class="chip chip--validada">Validadas {{ resumen().validada }}</span>
        <span class="chip chip--transmitida">Transmitidas {{ resumen().transmitida }}</span>
        <span class="chip chip--cancelada">Canceladas {{ resumen().cancelada }}</span>
      </div>
    </div>

    @if (datos()?.bajas?.length) {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>RFC</th><th>Nombre</th><th>Puesto</th><th>Adscripción</th><th>Motivo</th><th>Fecha</th><th>Estatus</th><th></th></tr></thead>
          <tbody>
            @for (b of datos()!.bajas; track b.id) {
              <tr [class.cancelada]="b.estatus === 'cancelada'">
                <td>{{ b.rfc }}</td>
                <td>{{ b.nombre }}</td>
                <td>{{ b.puesto }}</td>
                <td class="chica">{{ b.adscripcion }}</td>
                <td>{{ b.motivo }}</td>
                <td>{{ b.fechaBaja }}</td>
                <td><span class="chip chip--{{ b.estatus }}">{{ b.estatus }}</span></td>
                <td>
                  @if (puedeCancelar(b)) {
                    <button type="button" class="quitar" aria-label="Cancelar baja" (click)="cancelar(b)">✕</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="vacio">{{ cargando() ? 'Cargando…' : 'No hay bajas capturadas en esta quincena.' }}</p>
    }

    @if (resumen().capturada + resumen().validada > 0) {
      <p class="hint">
        La validación y el envío a nómina se hacen en
        <a routerLink="/validacion">Validación y envío a nómina</a>.
      </p>
    }
  `,
})
export class PanelBajas {
  readonly anio = input.required<number>();
  readonly noQna = input.required<number>();

  /** Avisa a quien lo contiene que algo cambió (validar, transferir, cancelar). */
  protected readonly cargando = signal(false);
  protected readonly datos = signal<Concentrado | null>(null);
  private readonly puedeCapturar: boolean;

  protected readonly resumen = computed(() => this.datos()?.resumen ?? { capturada: 0, validada: 0, transmitida: 0, cancelada: 0 });

  constructor(
    private readonly bajas: BajasService,
    private readonly toast: ToastService,
    authService: AuthService,
  ) {
    const rol = authService.currentUser()?.rol ?? 'usuario';
    this.puedeCapturar = ['administrador', 'capturista'].includes(rol);
    // Se recarga cada vez que cambia la quincena que se muestra.
    effect(() => {
      this.anio();
      this.noQna();
      untracked(() => this.recargar());
    });
  }

  recargar(): void {
    this.cargando.set(true);
    this.bajas.concentrado(this.anio(), this.noQna()).subscribe({
      next: (d) => { this.datos.set(d); this.cargando.set(false); },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cargar la quincena.');
      },
    });
  }

  puedeCancelar(b: Baja): boolean {
    return this.puedeCapturar && (b.estatus === 'capturada' || b.estatus === 'validada');
  }

  cancelar(b: Baja): void {
    Swal.fire({
      title: '¿Cancelar la baja?',
      text: `${b.nombre} (${b.rfc}) saldrá del concentrado de la quincena.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: 'var(--brand-primary)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.bajas.cancelar(b.id).subscribe({
        next: () => { this.toast.success('Baja cancelada.'); this.recargar(); },
        error: (err: HttpErrorResponse) => this.toast.error(err.error?.message ?? 'No se pudo cancelar.'),
      });
    });
  }
}
