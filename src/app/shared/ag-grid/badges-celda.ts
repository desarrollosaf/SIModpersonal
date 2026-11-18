import { Component, HostBinding } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface Badge {
  texto: string;
  clase: string;
}

export interface BadgesCellRendererParams extends ICellRendererParams {
  badges: (params: ICellRendererParams) => Badge[];
  centrado?: boolean;
  /** Si regresa true, se muestra un botón "?" junto a las etiquetas que llama a `onClickAyuda`. */
  ayuda?: (data: unknown) => boolean;
  /** Texto del tooltip del botón "?". */
  tituloAyuda?: string;
  onClickAyuda?: (data: unknown) => void;
}

@Component({
  selector: 'app-badges-celda',
  standalone: true,
  template: `
    @for (b of badges; track b.texto) {
      <span class="badge" [class]="b.clase">{{ b.texto }}</span>
    }
    @if (mostrarAyuda) {
      <button
        type="button"
        class="ayuda"
        [title]="tituloAyuda"
        [attr.aria-label]="tituloAyuda"
        (click)="onClickAyuda($event)"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4.1"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M12 17.6v.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
        row-gap: 0.3rem;
        height: 100%;
        padding: 0.3rem 0;
      }

      :host.centrado {
        justify-content: center;
      }

      .badge {
        display: inline-block;
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--brand-muted);
        background: #f1f0f1;
      }

      .ayuda {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: #fdf3e2;
        color: #9c6a10;
        cursor: pointer;
        transition:
          background 0.18s ease,
          color 0.18s ease,
          transform 0.18s ease;
      }

      .ayuda svg {
        width: 16px;
        height: 16px;
      }

      .ayuda:hover {
        background: #9c6a10;
        color: #fff;
        transform: scale(1.1);
      }

      .ayuda:active {
        transform: scale(0.95);
      }

      .badge--ok {
        color: #4c8a1f;
        background: #eaf6df;
      }
      .badge--error {
        color: var(--brand-danger);
        background: #fbeceb;
      }
      .badge--warn {
        color: #9c6a10;
        background: #fdf3e2;
      }
      .badge--info {
        color: #2f6fb0;
        background: #e8f1fa;
      }
      .badge--neutral {
        color: var(--brand-muted);
        background: #f1f0f1;
      }
      .badge--rol-administrador {
        color: var(--brand-primary);
        background: #f8e3ec;
      }
      .badge--rol-analista {
        color: #4c8a1f;
        background: #eaf6df;
      }
      .badge--rol-supervisor {
        color: #2f6fb0;
        background: #e8f1fa;
      }
      .badge--rol-usuario {
        color: var(--brand-muted);
        background: #f1f0f1;
      }
      .badge--pago {
        color: #b8860b;
        background: #fdf3d9;
      }
      .badge--pagado {
        color: #1a8a4a;
        background: #e4f6ea;
      }
      .badge--ejercido {
        color: #5b4fd6;
        background: #ebe8fd;
      }
    `,
  ],
})
export class BadgesCeldaComponent implements ICellRendererAngularComp {
  protected badges: Badge[] = [];
  protected mostrarAyuda = false;
  protected tituloAyuda = 'Más información';
  private params!: BadgesCellRendererParams;

  @HostBinding('class.centrado')
  protected centrado = false;

  agInit(params: BadgesCellRendererParams): void {
    this.params = params;
    this.badges = params.badges(params);
    this.centrado = params.centrado ?? false;
    this.mostrarAyuda = params.ayuda?.(params.data) ?? false;
    this.tituloAyuda = params.tituloAyuda ?? 'Más información';
  }

  refresh(params: BadgesCellRendererParams): boolean {
    this.agInit(params);
    return true;
  }

  protected onClickAyuda(event: MouseEvent): void {
    // Que el clic no seleccione la fila de la tabla.
    event.stopPropagation();
    this.params.onClickAyuda?.(this.params.data);
  }
}
