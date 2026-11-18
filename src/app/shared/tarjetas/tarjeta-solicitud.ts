import { Component, computed, input, output } from '@angular/core';

/** Color de la marca lateral de la card (mismo criterio que los estatus en el resto del sistema). */
export type TonoTarjeta = 'info' | 'ok' | 'error' | 'warn' | 'pago' | 'pagado' | 'ejercido' | 'firmar' | 'neutral';

/** Tono de la card según el estatus del sistema. */
export function tonoPorEstatus(estatus: string | null | undefined): TonoTarjeta {
  switch (estatus) {
    case 'REGISTRADO':
      return 'info';
    case 'COMPROMETIDO':
      return 'ok';
    case 'RECHAZADO':
    case 'CANCELADO':
      return 'error';
    case 'PARA PAGO':
      return 'pago';
    case 'PAGADO':
      return 'pagado';
    case 'EJERCIDO':
      return 'ejercido';
    default:
      return 'neutral';
  }
}

/**
 * Card de una solicitud para las bandejas (Solicitudes, Por firmar, Pagos, Validación). Los
 * chips de estatus y los botones de acción los pone cada pantalla: van proyectados en los
 * elementos con atributo `chips` y `acciones`.
 */
@Component({
  selector: 'app-tarjeta-solicitud',
  standalone: true,
  template: `
    <article
      class="tarjeta tarjeta--{{ tono() }}"
      [class.tarjeta--seleccionada]="seleccionada()"
      [class.tarjeta--atenuada]="atenuada()"
    >
      @if (seleccionable()) {
        <label class="tarjeta__check" [attr.aria-label]="'Seleccionar ' + folio()">
          <input type="checkbox" [checked]="seleccionada()" (change)="onSeleccion($event)" />
        </label>
      }

      <span class="tarjeta__marca" aria-hidden="true"><span></span></span>

      <div class="tarjeta__cuerpo">
        <div class="tarjeta__encabezado">
          <h3 class="tarjeta__folio">{{ folio() }}</h3>
          @if (fechaTexto()) {
            <span class="tarjeta__fecha">{{ fechaTexto() }}</span>
          }
        </div>

        <div class="tarjeta__chips">
          @if (tipo()) {
            <span class="tarjeta__tipo">{{ tipo() }}</span>
          }
          <ng-content select="[chips]" />
        </div>

        @if (solicitante() || beneficiario() || validador() || firmante()) {
          <p class="tarjeta__personas">
            @if (solicitante()) {
              <span>
                De: <strong>{{ solicitante() }}</strong>
                @if (departamento()) {
                  <small> · {{ departamento() }}</small>
                }
              </span>
            }
            @if (beneficiario()) {
              <span>Beneficiario: <strong>{{ beneficiario() }}</strong></span>
            }
            @if (validador()) {
              <span>Validador: <strong>{{ validador() }}</strong></span>
            }
            @if (firmante()) {
              <span>Firma: <strong>{{ firmante() }}</strong></span>
            }
          </p>
        }

        <ng-content select="[detalle]" />
      </div>

      <div class="tarjeta__lado">
        <strong class="tarjeta__importe">{{ importeTexto() }}</strong>
        <div class="tarjeta__acciones">
          <ng-content select="[acciones]" />
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Los contenedores proyectados solo agrupan: sus hijos se acomodan como si fueran directos. */
      :host ::ng-deep [chips],
      :host ::ng-deep [acciones] {
        display: contents;
      }

      .tarjeta {
        --tono: #9aa0a3;
        --tono-suave: #f1f0f1;
        position: relative;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.15rem 1rem 1rem;
        border: 1px solid var(--brand-border);
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        transition:
          box-shadow 0.18s ease,
          transform 0.18s ease,
          border-color 0.18s ease;
      }

      .tarjeta:hover {
        border-color: color-mix(in srgb, var(--tono) 35%, var(--brand-border));
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.07);
        transform: translateY(-1px);
      }

      .tarjeta--seleccionada {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px var(--brand-primary-soft);
      }

      .tarjeta--atenuada {
        opacity: 0.7;
      }

      .tarjeta--info { --tono: #2f6fb0; --tono-suave: #e8f1fa; }
      .tarjeta--ok { --tono: #4c8a1f; --tono-suave: #eaf6df; }
      .tarjeta--error { --tono: #c0392b; --tono-suave: #fbeceb; }
      .tarjeta--warn { --tono: #d4890f; --tono-suave: #fdf3e2; }
      .tarjeta--pago { --tono: #b8860b; --tono-suave: #fdf3d9; }
      .tarjeta--pagado { --tono: #1a8a4a; --tono-suave: #e4f6ea; }
      .tarjeta--ejercido { --tono: #5b4fd6; --tono-suave: #ebe8fd; }
      .tarjeta--firmar { --tono: #5b4fd6; --tono-suave: #ebe8fd; }

      .tarjeta__check {
        display: flex;
        margin: 0;
        cursor: pointer;
      }

      .tarjeta__check input {
        width: 18px;
        height: 18px;
        accent-color: var(--brand-primary);
        cursor: pointer;
      }

      .tarjeta__marca {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--tono-suave);
      }

      .tarjeta__marca span {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--tono);
      }

      .tarjeta__cuerpo {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .tarjeta__encabezado {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
      }

      .tarjeta__folio {
        margin: 0;
        font-size: 0.98rem;
        font-weight: 700;
        color: var(--brand-ink);
        letter-spacing: 0.01em;
      }

      .tarjeta__fecha {
        flex-shrink: 0;
        font-size: 0.76rem;
        color: var(--brand-muted);
      }

      .tarjeta__chips {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .tarjeta__tipo {
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        background: #eef0f6;
        color: #3c4a6b;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .tarjeta__personas {
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem 1.1rem;
        margin: 0;
        font-size: 0.8rem;
        color: var(--brand-muted);
      }

      .tarjeta__personas strong {
        color: var(--brand-ink);
        font-weight: 700;
      }

      .tarjeta__personas small {
        font-size: 0.76rem;
      }

      .tarjeta__lado {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.55rem;
        flex-shrink: 0;
      }

      .tarjeta__importe {
        font-size: 1.02rem;
        font-weight: 800;
        color: var(--brand-ink);
        white-space: nowrap;
      }

      .tarjeta__acciones {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      @media (max-width: 720px) {
        .tarjeta {
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .tarjeta__cuerpo {
          flex-basis: calc(100% - 60px);
        }

        .tarjeta__lado {
          width: 100%;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.6rem;
          border-top: 1px dashed var(--brand-border);
        }
      }
    `,
  ],
})
export class TarjetaSolicitud {
  readonly folio = input.required<string>();
  /** YYYY-MM-DD */
  readonly fecha = input<string | null>(null);
  readonly tipo = input<string | null>(null);
  readonly importe = input<number | null>(null);
  readonly tono = input<TonoTarjeta>('neutral');
  readonly solicitante = input<string | null>(null);
  readonly departamento = input<string | null>(null);
  readonly beneficiario = input<string | null>(null);
  readonly validador = input<string | null>(null);
  /** Firmante final elegido al capturar la solicitud. */
  readonly firmante = input<string | null>(null);
  readonly seleccionable = input(false);
  readonly seleccionada = input(false);
  readonly atenuada = input(false);

  readonly seleccionChange = output<boolean>();

  protected readonly fechaTexto = computed(() => {
    const iso = this.fecha();
    if (!iso) return '';
    const [anio, mes, dia] = iso.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  });

  protected readonly importeTexto = computed(() => {
    const valor = this.importe();
    return valor == null
      ? ''
      : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
  });

  protected onSeleccion(evento: Event): void {
    this.seleccionChange.emit((evento.target as HTMLInputElement).checked);
  }
}
