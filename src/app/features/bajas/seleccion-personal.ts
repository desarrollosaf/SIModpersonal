import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BajasService, PersonalBaja } from '../../core/services/bajas.service';
import { ToastService } from '../../core/services/toast.service';

/** Búsqueda y selección múltiple de personal activo (saf.s_usuario) que todavía no tiene baja. */
@Component({
  selector: 'app-seleccion-personal',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './bajas.scss',
  template: `
    <div class="buscador">
      <input type="text" placeholder="Nombre, RFC o CURP (mínimo 3 letras)" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" (keyup.enter)="buscar()" />
      <button type="button" class="btn btn--outline" [disabled]="buscando()" (click)="buscar()">{{ buscando() ? 'Buscando…' : 'Buscar' }}</button>
    </div>
    @if (resultados().length) {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th></th><th>RFC</th><th>Nombre</th><th>Puesto</th><th>Adscripción</th></tr></thead>
          <tbody>
            @for (p of resultados(); track p.id) {
              <tr [class.seleccionada]="seleccion().has(p.id)">
                <td><input type="checkbox" [checked]="seleccion().has(p.id)" (change)="alternar(p.id, $any($event.target).checked)" /></td>
                <td>{{ p.rfc }}</td>
                <td>{{ p.nombre }}</td>
                <td>{{ p.puesto }}</td>
                <td class="chica">{{ p.adscripcion }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (!unico()) { <p class="hint">{{ seleccion().size }} seleccionada(s)</p> }
    } @else if (yaBuscado()) {
      <p class="vacio">Sin resultados. Solo aparece el personal activo que todavía no tiene una baja registrada.</p>
    }
  `,
})
export class SeleccionPersonal {
  /** Ids de s_usuario seleccionados. */
  readonly seleccionChange = output<number[]>();
  /** Con `unico` solo se puede elegir a una persona (promoción): se elige con un clic y se emite aquí. */
  readonly unico = input(false);
  readonly elegido = output<PersonalBaja | null>();

  protected readonly busqueda = signal('');
  protected readonly buscando = signal(false);
  protected readonly yaBuscado = signal(false);
  protected readonly resultados = signal<PersonalBaja[]>([]);
  protected readonly seleccion = signal<Set<number>>(new Set());

  constructor(private readonly bajas: BajasService, private readonly toast: ToastService) {}

  buscar(): void {
    const q = this.busqueda().trim();
    if (q.length < 3) {
      this.toast.error('Escribe al menos 3 letras del nombre, RFC o CURP.');
      return;
    }
    this.buscando.set(true);
    this.bajas.personal(q).subscribe({
      next: (r) => { this.resultados.set(r); this.yaBuscado.set(true); this.buscando.set(false); },
      error: (err: HttpErrorResponse) => {
        this.buscando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo buscar.');
      },
    });
  }

  alternar(id: number, marcado: boolean): void {
    this.seleccion.update((s) => {
      // En modo único, marcar a otra persona reemplaza la elección anterior.
      const n = this.unico() ? new Set<number>() : new Set(s);
      if (marcado) n.add(id); else n.delete(id);
      return n;
    });
    this.seleccionChange.emit([...this.seleccion()]);
    this.elegido.emit(this.resultados().find((p) => this.seleccion().has(p.id)) ?? null);
  }

  /** Quita de la lista a las personas ya guardadas y vacía la selección. */
  limpiar(): void {
    const marcados = this.seleccion();
    this.resultados.update((r) => r.filter((p) => !marcados.has(p.id)));
    this.seleccion.set(new Set());
    this.seleccionChange.emit([]);
  }
}
