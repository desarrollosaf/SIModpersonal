import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Movimiento } from '../../core/services/movimientos.service';

/** Tabla de movimientos compartida por la consulta individual y la consulta por periodo. */
@Component({
  selector: 'app-tabla-movimientos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Fecha</th>
            <th>Qna</th>
            <th>Movimiento</th>
            <th>Nombre</th>
            <th>CURP</th>
            <th>Adscripción</th>
            <th>Puesto</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (m of movimientos(); track m.folio || 'B' + m.id) {
            <tr>
              <td>
                @if (m.esBaja) {
                  <span class="sin-folio" title="Baja del concentrado: no tiene folio">—</span>
                } @else {
                  <a [routerLink]="['/movimientos', m.folio]" class="folio">{{ m.folio.slice(0, 4) }}-{{ m.folio.slice(4) }}</a>
                }
              </td>
              <td>{{ m.fecMov }}</td>
              <td class="centro">{{ m.noQna }}</td>
              <td>
                <span class="chip chip--{{ m.tipoMov }}">{{ m.tipoMovNombre }}</span>
                <small>{{ m.subtipoMovNombre }}</small>
              </td>
              <td>{{ m.nombre }}</td>
              <td class="mono">{{ m.curp }}</td>
              <td>{{ m.adscripcion }}</td>
              <td>{{ m.puesto }}</td>
              <td>
                @if (m.esBaja) {
                  <span class="estado" [class.estado--t]="m.estatusBaja === 'transmitida'" [class.estado--s]="m.estatusBaja === 'validada'" [class.estado--n]="m.estatusBaja === 'capturada'">
                    {{ m.estatusBaja === 'transmitida' ? 'Enviada a nómina' : m.estatusBaja === 'validada' ? 'Validada' : 'Capturada' }}
                  </span>
                } @else if (m.documOk === 'T') {
                  <span class="estado estado--t">Transmitido</span>
                } @else if (m.documOk === 'S') {
                  <span class="estado estado--s">Doc. completa</span>
                } @else {
                  <span class="estado estado--n">Doc. incompleta</span>
                }
              </td>
              <td class="acciones">
                @if (m.esBaja) {
                  <a routerLink="/validacion" class="ver">Validación</a>
                } @else {
                  <a [routerLink]="['/movimientos', m.folio]" class="ver">{{ m.documOk === 'T' ? 'Ver' : 'Abrir' }}</a>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="10" class="vacio">Sin movimientos para los filtros elegidos.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .tabla-wrap { overflow-x: auto; border: 1px solid var(--brand-border); border-radius: 14px; }
    .tabla { width: 100%; border-collapse: collapse; font-size: 0.85rem; background: #fff; }
    th { padding: 0.7rem 0.85rem; text-align: left; font-size: 0.74rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--brand-muted); border-bottom: 1px solid var(--brand-border); white-space: nowrap; }
    td { padding: 0.65rem 0.85rem; border-bottom: 1px solid #f1eff0; color: var(--brand-ink); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .centro { text-align: center; }
    .mono { font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem; }
    .sin-folio { color: var(--brand-muted); }
    .folio { font-weight: 700; color: var(--brand-primary); text-decoration: none; }
    td small { display: block; margin-top: 0.2rem; color: var(--brand-muted); font-size: 0.74rem; }
    .chip { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: #eee; }
    .chip--A { background: #e4f3d4; color: #3b6b12; }
    .chip--B { background: #fdecea; color: #8f1f19; }
    .chip--P { background: #e8eefc; color: #2c4a9a; }
    .chip--T { background: #fff3d6; color: #8a5a00; }
    .chip--L { background: #efe6f7; color: #5b2a86; }
    .estado { font-size: 0.74rem; font-weight: 600; }
    .estado--t { color: #3b6b12; } .estado--s { color: #2c4a9a; } .estado--n { color: #8a5a00; }
    .ver { font-weight: 600; color: var(--brand-primary); text-decoration: none; }
    .vacio { padding: 2rem; text-align: center; color: var(--brand-muted); }
  `,
})
export class TablaMovimientos {
  readonly movimientos = input<Movimiento[]>([]);
  readonly abrir = output<string>();
}
