import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Movimiento, MovimientosService, FiltroMovimientos } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { Paginador } from '../../shared/tarjetas/paginador';
import { TablaMovimientos } from '../../shared/tabla-movimientos/tabla-movimientos';

const QUINCENAS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
].flatMap((mes, i) => [
  { numero: i * 2 + 1, nombre: `1a. QNA. DE ${mes}` },
  { numero: i * 2 + 2, nombre: `2a. QNA. DE ${mes}` },
]);

/** Equivale a COR-MOP.W + MCONS-AC.W / MCONS-TO.W: movimientos por periodo (quincenas) con salida a Excel. */
@Component({
  selector: 'app-consulta-periodo',
  standalone: true,
  imports: [FormsModule, Paginador, TablaMovimientos],
  templateUrl: './consulta-periodo.html',
  styleUrl: './consulta-periodo.scss',
})
export class ConsultaPeriodo {
  protected readonly quincenas = QUINCENAS;

  protected readonly anio = signal(String(new Date().getFullYear()).slice(2));
  protected readonly qnaInicial = signal(1);
  protected readonly qnaFinal = signal(24);
  protected readonly tipoMov = signal('');
  protected readonly nomina = signal('');

  protected readonly cargando = signal(false);
  protected readonly exportando = signal(false);
  protected readonly consultado = signal(false);
  protected readonly datos = signal<Movimiento[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(25);

  constructor(
    private readonly movimientos: MovimientosService,
    private readonly toast: ToastService,
  ) {}

  private filtro(): FiltroMovimientos {
    return {
      anio: this.anio() || undefined,
      qnaInicial: this.qnaInicial(),
      qnaFinal: this.qnaFinal(),
      tipoMov: this.tipoMov() || undefined,
      nomina: this.nomina() || undefined,
    };
  }

  consultar(pagina = 1): void {
    if (this.qnaFinal() < this.qnaInicial()) {
      this.toast.error('La quincena final no puede ser anterior a la inicial.');
      return;
    }
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.movimientos.listar({ ...this.filtro(), page: pagina, limit: this.tamano() }).subscribe({
      next: (r) => {
        this.datos.set(r.datos);
        this.total.set(r.total);
        this.consultado.set(true);
        this.cargando.set(false);
      },
      error: () => {
        this.toast.error('No se pudo realizar la consulta.');
        this.cargando.set(false);
      },
    });
  }

  cambiarTamano(t: number): void {
    this.tamano.set(t);
    this.consultar(1);
  }

  exportar(): void {
    this.exportando.set(true);
    this.movimientos.exportar(this.filtro()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movimientos-${this.anio()}-qna${this.qnaInicial()}-${this.qnaFinal()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: () => {
        this.toast.error('No se pudo generar el archivo de Excel.');
        this.exportando.set(false);
      },
    });
  }
}
