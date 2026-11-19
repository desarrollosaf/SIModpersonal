import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { BajasService } from '../../core/services/bajas.service';
import { ConcentradoValidacion, FilaValidacion, ValidacionService } from '../../core/services/validacion.service';
import { QUINCENAS, quincenaActual } from '../bajas/quincenas';

/** Concentrado por quincena de altas, bajas y demás movimientos: validarlos y enviarlos a nómina. */
@Component({
  selector: 'app-validacion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './validacion.html',
  styleUrl: '../bajas/bajas.scss',
})
export class Validacion implements OnInit {
  protected readonly quincenas = QUINCENAS;
  protected readonly esAdmin: boolean;
  protected readonly puedeCancelar: boolean;

  protected readonly anio = signal(new Date().getFullYear());
  protected readonly noQna = signal(quincenaActual());
  protected readonly cargando = signal(false);
  protected readonly trabajando = signal(false);
  protected readonly datos = signal<ConcentradoValidacion | null>(null);

  /** 'quincena' = lo de la quincena elegida; 'pendientes' = todo lo que falta por enviar, de cualquier quincena. */
  protected readonly vista = signal<'quincena' | 'pendientes'>('quincena');
  protected readonly pendientes = signal<ConcentradoValidacion | null>(null);
  protected readonly totalPendientes = computed(() => this.pendientes()?.filas.length ?? 0);
  protected readonly datosVista = computed(() => (this.vista() === 'pendientes' ? this.pendientes() : this.datos()));

  protected readonly resumen = computed(() => this.datosVista()?.resumen ?? { capturada: 0, validada: 0, transmitida: 0, cancelada: 0 });
  /** Capturadas con documentación incompleta: no se pueden validar hasta completarla. */
  protected readonly incompletas = computed(
    () => (this.pendientes()?.filas ?? []).filter((f) => f.estatus === 'capturada' && f.documOk === 'N').length,
  );
  protected readonly puedeEnviar = computed(() => this.resumen().validada > 0 && this.resumen().capturada === 0);

  constructor(
    private readonly validacion: ValidacionService,
    private readonly bajas: BajasService,
    private readonly toast: ToastService,
    authService: AuthService,
  ) {
    const rol = authService.currentUser()?.rol ?? 'usuario';
    this.esAdmin = rol === 'administrador';
    this.puedeCancelar = ['administrador', 'capturista'].includes(rol);
  }

  ngOnInit(): void {
    this.cargar();
  }

  /** Muestra u oculta la lista de pendientes de todas las quincenas. */
  alternarPendientes(): void {
    this.vista.update((v) => (v === 'pendientes' ? 'quincena' : 'pendientes'));
    this.cargar();
  }

  /** Desde la lista de pendientes, abre la quincena de esa fila para validarla o enviarla. */
  irAQuincena(f: FilaValidacion): void {
    this.anio.set(f.anio);
    this.noQna.set(f.noQna);
    this.vista.set('quincena');
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    // El contador del botón se mantiene al día después de cada cambio.
    this.validacion.pendientes().subscribe({ next: (p) => this.pendientes.set(p), error: () => undefined });
    this.validacion.listar(this.anio(), this.noQna()).subscribe({
      next: (d) => { this.datos.set(d); this.cargando.set(false); },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cargar la quincena.');
      },
    });
  }

  cancelarBaja(f: FilaValidacion): void {
    if (f.id == null) return;
    Swal.fire({
      title: '¿Cancelar la baja?',
      text: `${f.nombre} (${f.rfc}) saldrá del concentrado de la quincena.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: 'var(--brand-primary)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.bajas.cancelar(f.id!).subscribe({
        next: () => { this.toast.success('Baja cancelada.'); this.cargar(); },
        error: (err: HttpErrorResponse) => this.toast.error(err.error?.message ?? 'No se pudo cancelar.'),
      });
    });
  }

  /** Valida todo lo capturado, de todas las quincenas con pendientes. */
  validar(): void {
    this.trabajando.set(true);
    this.validacion.validarPendientes().subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.toast.success(`Validados: ${r.movimientos} movimiento(s) y ${r.bajas} baja(s).`);
        if (r.incompletos) {
          this.toast.error(`${r.incompletos} movimiento(s) con documentación incompleta no se validaron.`);
        }
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.trabajando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo validar.');
      },
    });
  }

  /** Envía a nómina todo lo validado, de todas las quincenas (un lote por quincena). */
  enviar(): void {
    const total = this.resumen().validada;
    Swal.fire({
      title: '¿Enviar a nómina?',
      text: `Se enviarán ${total} movimiento(s) pendientes. Después ya no podrán modificarse ni cancelarse.`,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-primary)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.trabajando.set(true);
      this.validacion.enviarPendientes().subscribe({
        next: (res) => {
          this.trabajando.set(false);
          const lotes = res.lotes.map((l) => `Q${l.noQna}/${l.anio}`).join(', ');
          this.toast.success(`${res.total} movimiento(s) enviado(s) a nómina (${lotes}).`);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.trabajando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo enviar a nómina.');
        },
      });
    });
  }
}
