import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { BajasService, RegistroBitacora, RegistroHistorico } from '../../core/services/bajas.service';
import { QUINCENAS } from './quincenas';

const TAMANO = 50;

/** Bitácora general de movimientos e histórico de lo transferido a nómina. */
@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './bitacora.html',
  styleUrl: './bajas.scss',
})
export class Bitacora implements OnInit {
  protected readonly quincenas = QUINCENAS;
  protected readonly vista = signal<'bitacora' | 'historico'>('bitacora');
  protected readonly anio = signal<number | null>(new Date().getFullYear());
  protected readonly noQna = signal<number | null>(null);
  protected readonly rfc = signal('');
  protected readonly accion = signal('');
  protected readonly pagina = signal(1);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly bitacora = signal<RegistroBitacora[]>([]);
  protected readonly historico = signal<RegistroHistorico[]>([]);
  protected readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / TAMANO)));

  constructor(private readonly bajas: BajasService, private readonly toast: ToastService) {}

  ngOnInit(): void {
    this.consultar();
  }

  cambiarVista(v: 'bitacora' | 'historico'): void {
    this.vista.set(v);
    this.pagina.set(1);
    this.consultar();
  }

  filtrar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  irA(p: number): void {
    if (p < 1 || p > this.paginas()) return;
    this.pagina.set(p);
    this.consultar();
  }

  consultar(): void {
    this.cargando.set(true);
    const filtro = {
      anio: this.anio() ?? undefined,
      noQna: this.noQna() ?? undefined,
      rfc: this.rfc().trim() || undefined,
      pagina: this.pagina(),
    };
    const error = (err: HttpErrorResponse) => {
      this.cargando.set(false);
      this.toast.error(err.error?.message ?? 'No se pudo consultar.');
    };
    if (this.vista() === 'bitacora') {
      this.bajas.bitacora({ ...filtro, accion: this.accion() || undefined }).subscribe({
        next: (r) => { this.bitacora.set(r.registros); this.total.set(r.total); this.cargando.set(false); },
        error,
      });
    } else {
      this.bajas.historico(filtro).subscribe({
        next: (r) => { this.historico.set(r.registros); this.total.set(r.total); this.cargando.set(false); },
        error,
      });
    }
  }
}
