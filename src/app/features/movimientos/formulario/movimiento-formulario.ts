import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';
import {
  Adscripcion, CatalogosFijos, CatalogosService, CatPercepcion, EmpleadoBusqueda, Puesto, TipoMovimiento,
} from '../../../core/services/catalogos.service';
import { GuardarMovimiento, Movimiento, MovimientosService, Percepcion } from '../../../core/services/movimientos.service';
import { ToastService } from '../../../core/services/toast.service';

type Campo =
  | 'rfc' | 'nombre' | 'curp' | 'ads' | 'nivel' | 'puesto' | 'rango' | 'tipCon' | 'tipoNomina'
  | 'fAlta' | 'fTerm' | 'horario' | 'reemp' | 'horas' | 'tarj' | 'ctaBan' | 'documOk' | 'percepciones';

/**
 * Campos que se capturan según el tipo de movimiento (los que CAP-MOP.p habilita en cada caso):
 * A alta, B baja, P promoción, T transferencia, L licencia.
 */
const CAMPOS: Record<string, Campo[]> = {
  A: ['rfc', 'nombre', 'curp', 'ads', 'nivel', 'puesto', 'rango', 'tipCon', 'tipoNomina', 'fAlta', 'fTerm', 'horario', 'reemp', 'horas', 'tarj', 'ctaBan', 'documOk', 'percepciones'],
  B: ['rfc', 'curp', 'tipCon', 'fTerm', 'horario', 'horas', 'tarj', 'documOk'],
  P: ['rfc', 'curp', 'ads', 'nivel', 'puesto', 'rango', 'tipCon', 'tipoNomina', 'fAlta', 'horario', 'reemp', 'horas', 'tarj', 'ctaBan', 'documOk', 'percepciones'],
  T: ['curp', 'ads', 'nivel', 'puesto', 'rango', 'tipCon', 'tipoNomina', 'fAlta', 'horario', 'reemp', 'horas', 'tarj', 'ctaBan', 'documOk', 'percepciones'],
  L: ['curp', 'fAlta', 'tipCon', 'fTerm', 'horario', 'horas', 'tarj', 'documOk'],
};

const hoy = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

@Component({
  selector: 'app-movimiento-formulario',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './movimiento-formulario.html',
  styleUrl: './movimiento-formulario.scss',
})
export class MovimientoFormulario {
  // Cabecera
  protected readonly folio = signal('');
  protected readonly fecMov = signal(hoy());
  protected readonly noQna = signal<number | null>(null);
  protected readonly tipoMov = signal('A');
  protected readonly subtipoMov = signal('NUE');

  // Empleado
  protected readonly curp = signal('');
  protected readonly nombre = signal('');
  protected readonly rfc = signal('');
  protected readonly adsAct = signal<number | null>(null);
  protected readonly adsAnt = signal<number | null>(null);
  protected readonly nivel = signal<number | null>(null);
  protected readonly puestoClave = signal('');
  protected readonly rango = signal<number | null>(null);
  protected readonly tipCon = signal('');
  protected readonly tipoNomina = signal('P');
  protected readonly fAlta = signal('');
  protected readonly fTerm = signal('');
  protected readonly horario = signal('');
  protected readonly hMat = signal('');
  protected readonly hVes = signal('');
  protected readonly tarj = signal<number | null>(null);
  protected readonly reemp = signal('');
  protected readonly ctaBan = signal('');
  protected readonly obs = signal('');
  protected readonly documOk = signal('N');
  protected readonly percepciones = signal<Percepcion[]>([]);
  protected readonly percepcionesAnteriores = signal<number | null>(null);

  // Catálogos
  protected readonly tipos = signal<TipoMovimiento[]>([]);
  protected readonly fijos = signal<CatalogosFijos | null>(null);
  protected readonly adscripciones = signal<Adscripcion[]>([]);
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly catPercepciones = signal<CatPercepcion[]>([]);

  // Estado
  protected readonly modoEdicion = signal(false);
  protected readonly transmitido = signal(false);
  protected readonly cargandoInicial = signal(true);
  protected readonly enviando = signal(false);
  protected readonly intentoGuardar = signal(false);
  protected readonly resultadosBusqueda = signal<EmpleadoBusqueda[]>([]);
  protected readonly esAdmin;
  protected readonly puedeEditar;

  protected readonly subtiposDelTipo = computed(
    () => this.tipos().find((t) => t.clave === this.tipoMov())?.subtipos ?? [],
  );
  protected readonly totalPercepciones = computed(
    () => Math.round(this.percepciones().reduce((s, p) => s + (Number(p.importe) || 0), 0) * 100) / 100,
  );
  protected readonly esAlta = computed(() => this.tipoMov() === 'A');
  protected readonly muestraAnteriores = computed(() => ['P', 'T'].includes(this.tipoMov()));

  private readonly busqueda$ = new Subject<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogos: CatalogosService,
    private readonly movimientos: MovimientosService,
    private readonly toast: ToastService,
    authService: AuthService,
  ) {
    const rol = authService.currentUser()?.rol ?? 'usuario';
    this.esAdmin = rol === 'administrador';
    this.puedeEditar = computed(() => ['administrador', 'capturista'].includes(rol) && !this.transmitido());

    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length >= 3 ? this.catalogos.buscarEmpleados(q).pipe(catchError(() => of([]))) : of([]))),
      )
      .subscribe((r) => this.resultadosBusqueda.set(r));

    this.cargarCatalogos();
  }

  /** ¿Este campo se captura para el tipo de movimiento elegido? */
  visible(campo: Campo): boolean {
    return CAMPOS[this.tipoMov()]?.includes(campo) ?? false;
  }

  // ------------------------------------------------------------------ carga

  private cargarCatalogos(): void {
    let pendientes = 4;
    const listo = () => {
      if (--pendientes === 0) this.iniciar();
    };
    this.catalogos.tiposMovimiento().subscribe({ next: (t) => { this.tipos.set(t); listo(); }, error: () => listo() });
    this.catalogos.fijos().subscribe({ next: (f) => { this.fijos.set(f); listo(); }, error: () => listo() });
    this.catalogos.adscripciones().subscribe({ next: (a) => { this.adscripciones.set(a); listo(); }, error: () => listo() });
    this.catalogos.percepciones('P').subscribe({ next: (p) => { this.catPercepciones.set(p); listo(); }, error: () => listo() });
  }

  private iniciar(): void {
    const folio = this.route.snapshot.paramMap.get('folio');
    if (folio) {
      this.modoEdicion.set(true);
      this.movimientos.obtener(folio).subscribe({
        next: (m) => {
          this.aplicar(m);
          this.cargandoInicial.set(false);
        },
        error: () => {
          this.toast.error('No se encontró el movimiento.');
          void this.router.navigate(['/movimientos']);
        },
      });
      return;
    }
    this.movimientos.siguienteFolio().subscribe({
      next: (r) => this.folio.set(r.folio),
      error: () => undefined,
    });
    this.cargandoInicial.set(false);
  }

  private aplicar(m: Movimiento): void {
    this.folio.set(m.folio);
    this.fecMov.set(m.fecMov);
    this.noQna.set(m.noQna);
    this.tipoMov.set(m.tipoMov);
    this.subtipoMov.set(m.subtipoMov);
    this.curp.set(m.curp);
    this.nombre.set(m.nombre);
    this.rfc.set(m.rfc ?? '');
    this.adsAct.set(m.adsAct);
    this.adsAnt.set(m.adsAnt);
    this.nivel.set(m.nivel);
    this.puestoClave.set(m.puestoClave);
    this.rango.set(m.rango);
    this.tipCon.set(m.tipCon ?? '');
    this.tipoNomina.set(m.tipoNomina === 'D' ? 'P' : m.tipoNomina);
    this.fAlta.set(m.fAlta ?? '');
    this.fTerm.set(m.fTerm ?? '');
    this.horario.set(m.horario ?? '');
    this.hMat.set(m.hMat ?? '');
    this.hVes.set(m.hVes ?? '');
    this.tarj.set(m.tarj);
    this.reemp.set(m.reemp ?? '');
    this.ctaBan.set(m.ctaBan ?? '');
    this.obs.set(m.obs ?? '');
    this.documOk.set(m.documOk === 'T' ? 'S' : m.documOk);
    this.percepciones.set(m.percepciones ?? []);
    this.percepcionesAnteriores.set(m.percepcionesAnteriores ?? null);
    this.transmitido.set(m.transmitido);
    if (m.nivel != null) this.cargarPuestos(m.nivel);
    this.cargarCatPercepciones(m.tipoNomina);
  }

  // --------------------------------------------------------------- cambios

  cambiarTipo(tipo: string): void {
    this.tipoMov.set(tipo);
    const subs = this.tipos().find((t) => t.clave === tipo)?.subtipos ?? [];
    this.subtipoMov.set(subs[0]?.clave ?? '');
  }

  buscarEmpleado(texto: string): void {
    this.nombre.set(texto);
    this.busqueda$.next(texto);
  }

  /** Equivale al trigger de CURP en CAP-MOP: trae del empleado todo lo que falta capturar. */
  elegirEmpleado(e: EmpleadoBusqueda): void {
    this.resultadosBusqueda.set([]);
    this.curp.set(e.curp);
    this.cargarPrellenado(e.curp);
  }

  alSalirDeCurp(): void {
    const curp = this.curp().trim();
    if (!this.esAlta() && curp.length >= 10 && !this.nombre()) this.cargarPrellenado(curp);
  }

  private cargarPrellenado(curp: string): void {
    this.catalogos.prellenado(curp).subscribe({
      next: (p) => {
        this.curp.set(p.curp);
        this.nombre.set(p.nombre);
        this.rfc.set(p.rfc ?? '');
        this.adsAnt.set(p.adscripcionId);
        if (this.adsAct() == null) this.adsAct.set(p.adscripcionId);
        if (this.nivel() == null && p.nivel != null) {
          this.nivel.set(p.nivel);
          this.cargarPuestos(p.nivel, p.puestoClave ?? '');
        }
        if (this.rango() == null) this.rango.set(p.rango);
        if (p.tipoNomina) this.tipoNomina.set(p.tipoNomina);
        if (!this.fAlta()) this.fAlta.set(p.fAlta ?? '');
        if (!this.ctaBan()) this.ctaBan.set(p.ctaBan ?? '');
        if (p.horario) {
          this.hMat.set(p.horario.hMat ?? '');
          this.hVes.set(p.horario.hVes ?? '');
          this.tarj.set(p.horario.tarj);
        }
        if (!this.percepciones().length) this.percepciones.set(p.percepciones);
        this.percepcionesAnteriores.set(p.percepcionesAnteriores);
        this.cargarCatPercepciones(this.tipoNomina());
        this.toast.success('Datos del empleado cargados desde nómina.');
      },
      error: (err: HttpErrorResponse) =>
        this.toast.error(err.error?.message ?? 'Esta CURP no pertenece a ningún empleado.'),
    });
  }

  cambiarNivel(valor: number | null): void {
    this.nivel.set(valor);
    this.puestoClave.set('');
    if (valor != null && valor >= 0) this.cargarPuestos(valor);
    else this.puestos.set([]);
  }

  private cargarPuestos(nivel: number, seleccionar?: string): void {
    this.catalogos.puestos(nivel).subscribe((p) => {
      this.puestos.set(p);
      if (seleccionar) this.puestoClave.set(seleccionar);
    });
  }

  /** Al cambiar de nómina, la clave de sueldo cambia: 01 (central) <-> 05 (honorarios). */
  cambiarNomina(tipo: string): void {
    const anterior = this.tipoNomina();
    this.tipoNomina.set(tipo);
    this.cargarCatPercepciones(tipo);
    const deCve = tipo === 'H' ? 1 : 5;
    const aCve = tipo === 'H' ? 5 : 1;
    if (anterior !== tipo) {
      this.percepciones.update((ps) => ps.map((p) => (p.cve === deCve ? { ...p, cve: aCve, descripcion: undefined } : p)));
    }
  }

  private cargarCatPercepciones(tipoNomina: string): void {
    this.catalogos.percepciones(tipoNomina).subscribe((c) => this.catPercepciones.set(c));
  }

  descripcionDe(cve: number): string {
    return this.catPercepciones().find((c) => c.cve === cve)?.descripcion ?? '';
  }

  // ----------------------------------------------------------- percepciones

  agregarPercepcion(): void {
    if (this.percepciones().length >= 7) {
      this.toast.error('Un movimiento admite máximo 7 percepciones.');
      return;
    }
    this.percepciones.update((ps) => [...ps, { cve: 0, importe: 0 }]);
  }

  cambiarPercepcion(i: number, cambios: Partial<Percepcion>): void {
    this.percepciones.update((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)));
  }

  quitarPercepcion(i: number): void {
    this.percepciones.update((ps) => ps.filter((_, idx) => idx !== i));
  }

  /** Sueldo + gratificación + compensación calculados del tabulador (nivel y rango). */
  sugerirPercepciones(): void {
    const puesto = this.puestoClave();
    const rango = this.rango();
    if (!puesto || !rango) {
      this.toast.error('Elige primero el puesto y el rango.');
      return;
    }
    this.catalogos.sugeridasAlta(puesto, rango, this.tipoNomina()).subscribe({
      next: (lineas) => this.percepciones.set(lineas),
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message ?? 'No se pudo calcular desde el tabulador.'),
    });
  }

  // ---------------------------------------------------------------- guardar

  private armar(): GuardarMovimiento {
    const opc = (v: string) => (v.trim() ? v.trim() : undefined);
    return {
      folio: this.modoEdicion() ? undefined : opc(this.folio()),
      fecMov: this.fecMov(),
      noQna: this.noQna() ?? 0,
      tipoMov: this.tipoMov(),
      subtipoMov: this.subtipoMov(),
      curp: this.curp().trim().toUpperCase(),
      rfc: opc(this.rfc()),
      nombre: this.nombre().trim(),
      adsAnt: this.adsAnt() ?? undefined,
      adsAct: this.adsAct() ?? 0,
      puestoClave: this.puestoClave(),
      rango: this.rango() ?? 0,
      tipCon: opc(this.tipCon()),
      tipoNomina: this.tipoNomina(),
      fAlta: opc(this.fAlta()),
      fTerm: opc(this.fTerm()),
      reemp: opc(this.reemp()),
      horario: opc(this.horario()),
      hMat: opc(this.hMat()),
      hVes: opc(this.hVes()),
      tarj: this.tarj() ?? undefined,
      ctaBan: opc(this.ctaBan()),
      obs: opc(this.obs()),
      documOk: this.documOk(),
      percepciones: this.percepciones().filter((p) => p.cve > 0).map((p) => ({ cve: p.cve, importe: Number(p.importe) || 0 })),
    };
  }

  /** Validaciones de pantalla (las mismas que bloqueaban "salvar" en CAP-MOP); el servidor vuelve a validar. */
  private faltantes(): string[] {
    const f: string[] = [];
    if (!this.noQna() || this.noQna()! < 1 || this.noQna()! > 24) f.push('La quincena debe estar entre 1 y 24');
    if (!this.curp().trim()) f.push('La CURP no puede ir en blanco');
    if (!this.nombre().trim()) f.push('El nombre no puede ir en blanco');
    if (!this.adsAct()) f.push('La adscripción no puede ir en blanco');
    if (!this.puestoClave()) f.push('El puesto no puede ir en blanco');
    if (!this.rango()) f.push('El rango no puede ir en blanco');
    if (this.esAlta() && !this.tipCon()) f.push('El tipo de contrato no puede ir en blanco');
    if (this.tipoMov() === 'B' && !this.fTerm()) f.push('La fecha de término es obligatoria en una baja');
    return f;
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    const faltantes = this.faltantes();
    if (faltantes.length) {
      this.toast.error(faltantes[0]);
      return;
    }
    this.enviando.set(true);
    const datos = this.armar();
    const peticion = this.modoEdicion()
      ? this.movimientos.actualizar(this.folio(), datos)
      : this.movimientos.crear(datos);
    peticion.subscribe({
      next: (m) => {
        this.enviando.set(false);
        this.toast.success('Registro salvado.');
        if (!this.modoEdicion()) void this.router.navigate(['/movimientos', m.folio]);
        else this.aplicar(m);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        const msg = err.error?.message;
        this.toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'No se pudo guardar el movimiento.'));
      },
    });
  }

  transmitir(): void {
    Swal.fire({
      title: '¿Transmitir a nómina?',
      text: `El folio ${this.folio()} ya no podrá modificarse.`,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, transmitir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-primary)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.movimientos.transmitir(this.folio()).subscribe({
        next: (m) => {
          this.aplicar(m);
          this.toast.success('Movimiento transmitido a nómina.');
        },
        error: (err: HttpErrorResponse) => this.toast.error(err.error?.message ?? 'No se pudo transmitir.'),
      });
    });
  }

  eliminar(): void {
    Swal.fire({
      title: '¿Eliminar este movimiento?',
      text: `Se eliminará el folio ${this.folio()}.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.movimientos.eliminar(this.folio()).subscribe({
        next: () => {
          this.toast.success('Movimiento eliminado.');
          void this.router.navigate(['/movimientos']);
        },
        error: (err: HttpErrorResponse) => this.toast.error(err.error?.message ?? 'No se pudo eliminar.'),
      });
    });
  }

  invalido(valor: unknown): boolean {
    return this.intentoGuardar() && (valor === null || valor === undefined || valor === '' || valor === 0);
  }
}
