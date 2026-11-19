import { Component, computed, effect, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';
import {
  OpcionCatalogo, CatalogosFijos, CatalogosService, CatPercepcion, EmpleadoBusqueda, Puesto, TipoMovimiento,
} from '../../../core/services/catalogos.service';
import { GuardarMovimiento, Movimiento, MovimientosService, Percepcion } from '../../../core/services/movimientos.service';
import { ToastService } from '../../../core/services/toast.service';
import { BajasService, PersonalBaja } from '../../../core/services/bajas.service';
import { PanelBajas } from '../../bajas/panel-bajas';
import { SeleccionPersonal } from '../../bajas/seleccion-personal';

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

/**
 * Separa un nombre completo guardado como PATERNO MATERNO NOMBRES (formato de nómina).
 * Es una aproximación: apellidos compuestos (DE LA CRUZ) se pueden corregir en pantalla.
 */
function dividirNombre(completo: string): { nombres: string; primerApellido: string; segundoApellido: string } {
  const p = completo.trim().split(/\s+/).filter(Boolean);
  if (p.length <= 1) return { nombres: '', primerApellido: p[0] ?? '', segundoApellido: '' };
  if (p.length === 2) return { nombres: p[1], primerApellido: p[0], segundoApellido: '' };
  return { nombres: p.slice(2).join(' '), primerApellido: p[0], segundoApellido: p[1] };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-movimiento-formulario',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, SeleccionPersonal, PanelBajas],
  templateUrl: './movimiento-formulario.html',
  styleUrl: './movimiento-formulario.scss',
})
export class MovimientoFormulario {
  // Cabecera
  protected readonly folio = signal('');
  protected readonly fecMov = signal(hoy());
  /** Q1 — 1-15 Ene, Q2 — 16-fin Ene ... Q24 — 16-fin Dic. */
  protected readonly quincenas = MESES.flatMap((mes, i) => [
    { numero: i * 2 + 1, etiqueta: `Q${i * 2 + 1} — 1-15 ${mes}` },
    { numero: i * 2 + 2, etiqueta: `Q${i * 2 + 2} — 16-fin ${mes}` },
  ]);
  protected readonly noQna = signal<number | null>(null);
  // Nada viene preseleccionado: hasta elegir el tipo de movimiento solo se ve la primera sección.
  protected readonly tipoMov = signal('');
  protected readonly subtipoMov = signal('');

  // Empleado
  protected readonly curp = signal('');
  protected readonly nombres = signal('');
  protected readonly primerApellido = signal('');
  protected readonly segundoApellido = signal('');
  protected readonly rfc = signal('');
  protected readonly homoclave = signal('');
  protected readonly dependenciaId = signal<number | null>(null);
  protected readonly direccionId = signal<number | null>(null);
  protected readonly departamentoId = signal<number | null>(null);
  protected readonly nivel = signal<number | null>(null);
  protected readonly puestoClave = signal('');
  protected readonly rango = signal<number | null>(null);
  protected readonly tipCon = signal('');
  protected readonly tipoNomina = signal('');
  protected readonly fAlta = signal('');
  protected readonly fTerm = signal('');
  protected readonly horario = signal('');
  protected readonly hMat = signal('');
  protected readonly hVes = signal('');
  protected readonly tarj = signal<number | null>(null);
  protected readonly reemp = signal('');
  protected readonly ctaBan = signal('');
  protected readonly obs = signal('');
  protected readonly documOk = signal('');
  protected readonly percepciones = signal<Percepcion[]>([]);
  protected readonly percepcionesAnteriores = signal<number | null>(null);

  // Catálogos
  protected readonly tipos = signal<TipoMovimiento[]>([]);
  protected readonly fijos = signal<CatalogosFijos | null>(null);
  protected readonly dependencias = signal<OpcionCatalogo[]>([]);
  protected readonly direcciones = signal<OpcionCatalogo[]>([]);
  protected readonly departamentos = signal<OpcionCatalogo[]>([]);
  /** Catálogo completo de puestos activos (~900): el nombre se elige primero y el nivel después. */
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly puestoNombre = signal('');
  protected readonly nombresPuesto = computed(() =>
    [...new Set(this.puestos().map((p) => p.descripcion))].sort((a, b) => a.localeCompare(b, 'es')),
  );
  /** Rangos que se pueden capturar según el nivel (regla de CAP-MOP.p): 1-4 si el nivel es menor a 24, 1-5 en adelante. */
  protected readonly opcionesRango = computed(() => {
    const nivel = this.nivel();
    if (nivel == null) return [];
    return Array.from({ length: nivel < 24 ? 4 : 5 }, (_, i) => i + 1);
  });
  /** Niveles en que existe el puesto elegido; cada uno corresponde a una clave de puesto. */
  protected readonly opcionesNivel = computed(() => {
    const filas = this.puestos()
      .filter((p) => p.descripcion === this.puestoNombre())
      .sort((a, b) => a.nivel - b.nivel);
    return filas.map((p) => ({
      clave: p.clave,
      nivel: p.nivel,
      // Si dos claves comparten nivel (ej. SECRETARIO 31) se distingue con la clave.
      etiqueta: filas.filter((o) => o.nivel === p.nivel).length > 1 ? `${p.nivel} (${p.clave})` : `${p.nivel}`,
    }));
  });
  protected readonly catPercepciones = signal<CatPercepcion[]>([]);
  /** Percepciones que salen del tabulador para el nivel y rango elegidos: sueldo, gratificación y compensación (×2). */
  protected readonly opcionesTabulador = signal<Percepcion[]>([]);
  private consultaTabulador = 0;

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

  /**
   * Promoción, transferencia y licencia nuevas se eligen de la plantilla activa (saf.s_usuario):
   * nombre, CURP y RFC salen de ahí.
   */
  protected readonly eligeDePlantilla = computed(() => ['P', 'T', 'L'].includes(this.tipoMov()) && !this.modoEdicion());
  protected readonly accionPlantilla = computed(
    () => ({ P: 'promover', T: 'transferir', L: 'con licencia' } as Record<string, string>)[this.tipoMov()] ?? '',
  );
  protected readonly personaElegida = signal<PersonalBaja | null>(null);

  // --- Baja de personal: se captura sobre la plantilla (saf.s_usuario) y se guarda en el concentrado temporal.
  /** Un movimiento nuevo de tipo BAJA no usa el formulario de empleado: elige personal y va al concentrado. */
  protected readonly esBaja = computed(() => this.tipoMov() === 'B' && !this.modoEdicion());
  protected readonly seleccionBaja = signal<number[]>([]);
  protected readonly obsBaja = signal('');
  protected readonly guardandoBajas = signal(false);
  protected readonly anioBaja = computed(() => Number(this.fecMov().slice(0, 4)) || new Date().getFullYear());
  private readonly selectorBajas = viewChild(SeleccionPersonal);
  private readonly panelBajas = viewChild(PanelBajas);
  protected readonly muestraAnteriores = computed(() => ['P', 'T'].includes(this.tipoMov()));

  private readonly busqueda$ = new Subject<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogos: CatalogosService,
    private readonly movimientos: MovimientosService,
    private readonly toast: ToastService,
    private readonly bajas: BajasService,
    authService: AuthService,
  ) {
    // Cada vez que cambia el puesto (nivel), el rango o la nómina, se recalculan los importes del tabulador.
    effect(() => {
      const puesto = this.puestoClave();
      const rango = this.rango();
      const tipo = this.tipoNomina();
      untracked(() => this.cargarOpcionesTabulador(puesto, rango, tipo));
    });

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
    let pendientes = 5;
    const listo = () => {
      if (--pendientes === 0) this.iniciar();
    };
    this.catalogos.tiposMovimiento().subscribe({ next: (t) => { this.tipos.set(t); listo(); }, error: () => listo() });
    this.catalogos.fijos().subscribe({ next: (f) => { this.fijos.set(f); listo(); }, error: () => listo() });
    this.catalogos.dependencias().subscribe({ next: (d) => { this.dependencias.set(d); listo(); }, error: () => listo() });
    this.catalogos.percepciones('P').subscribe({ next: (p) => { this.catPercepciones.set(p); listo(); }, error: () => listo() });
    this.catalogos.puestos().subscribe({ next: (p) => { this.puestos.set(p); listo(); }, error: () => listo() });
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
    const n = m.nombres || m.primerApellido ? { nombres: m.nombres ?? '', primerApellido: m.primerApellido ?? '', segundoApellido: m.segundoApellido ?? '' } : dividirNombre(m.nombre);
    this.nombres.set(n.nombres);
    this.primerApellido.set(n.primerApellido);
    this.segundoApellido.set(n.segundoApellido);
    this.asignarRfc(m.rfc, m.homoclave);
    this.asignarAdscripcion(m.dependenciaId, m.direccionId, m.departamentoId);
    this.seleccionarPuestoPorClave(m.puestoClave);
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
    this.cargarCatPercepciones(m.tipoNomina);
  }

  // --------------------------------------------------------------- cambios

  cambiarTipo(tipo: string): void {
    this.tipoMov.set(tipo);
    if (this.personaElegida()) this.elegirPersonal(null);
    const subs = this.tipos().find((t) => t.clave === tipo)?.subtipos ?? [];
    // Transferencia tiene un solo subtipo (el select va bloqueado); en los demás el usuario elige.
    this.subtipoMov.set(tipo === 'T' ? (subs[0]?.clave ?? '') : '');
  }

  /** Al elegir a la persona de la plantilla se llenan sus datos y su adscripción actual. */
  elegirPersonal(p: PersonalBaja | null): void {
    this.personaElegida.set(p);
    this.nombres.set(p?.nombres ?? '');
    this.primerApellido.set(p?.primerApellido ?? '');
    this.segundoApellido.set(p?.segundoApellido ?? '');
    this.curp.set(p?.curp ?? '');
    this.asignarRfc(p?.rfc ?? null);
    this.resultadosBusqueda.set([]);
    if (p) this.asignarAdscripcion(p.dependenciaId, p.direccionId, p.departamentoId);
  }

  /** Actualiza una parte del nombre y lanza la búsqueda en nómina con lo que se escribe. */
  escribirNombre(campo: 'nombres' | 'primerApellido' | 'segundoApellido', texto: string): void {
    this[campo].set(texto);
    this.busqueda$.next(texto);
  }

  /** El RFC base son 10 caracteres; si llega completo (13) se separa la homoclave. */
  private asignarRfc(rfc: string | null, homoclave?: string | null): void {
    const completo = (rfc ?? '').trim();
    this.rfc.set(completo.slice(0, 10));
    this.homoclave.set(homoclave ?? (completo.length > 10 ? completo.slice(10) : ''));
  }

  /** Dependencia → Dirección → Departamento: cada lista depende de la selección anterior. */
  cambiarDependencia(id: number | null): void {
    this.dependenciaId.set(id);
    this.direccionId.set(null);
    this.departamentoId.set(null);
    this.direcciones.set([]);
    this.departamentos.set([]);
    if (id != null) this.catalogos.direcciones(id).subscribe((d) => this.direcciones.set(d));
  }

  cambiarDireccion(id: number | null): void {
    this.direccionId.set(id);
    this.departamentoId.set(null);
    this.departamentos.set([]);
    if (id != null) this.catalogos.departamentos(id).subscribe((d) => this.departamentos.set(d));
  }

  /** Fija los tres valores y carga las listas que dependen de ellos (al abrir un movimiento o pre-llenar). */
  private asignarAdscripcion(dependencia: number | null, direccion: number | null, departamento: number | null): void {
    this.dependenciaId.set(dependencia);
    this.direccionId.set(direccion);
    this.departamentoId.set(departamento);
    this.direcciones.set([]);
    this.departamentos.set([]);
    if (dependencia != null) this.catalogos.direcciones(dependencia).subscribe((d) => this.direcciones.set(d));
    if (direccion != null) this.catalogos.departamentos(direccion).subscribe((d) => this.departamentos.set(d));
  }

  private nombreVacio(): boolean {
    return !this.nombres().trim() && !this.primerApellido().trim() && !this.segundoApellido().trim();
  }

  /** Equivale al trigger de CURP en CAP-MOP: trae del empleado todo lo que falta capturar. */
  elegirEmpleado(e: EmpleadoBusqueda): void {
    this.resultadosBusqueda.set([]);
    this.curp.set(e.curp);
    this.cargarPrellenado(e.curp);
  }

  alSalirDeCurp(): void {
    const curp = this.curp().trim();
    if (!this.esAlta() && curp.length >= 10 && this.nombreVacio()) this.cargarPrellenado(curp);
  }

  private cargarPrellenado(curp: string): void {
    this.catalogos.prellenado(curp).subscribe({
      next: (p) => {
        this.curp.set(p.curp);
        const n = dividirNombre(p.nombre);
        this.nombres.set(n.nombres);
        this.primerApellido.set(n.primerApellido);
        this.segundoApellido.set(n.segundoApellido);
        this.asignarRfc(p.rfc);
        if (this.dependenciaId() == null) {
          this.asignarAdscripcion(p.dependenciaId, p.direccionId, p.departamentoId);
        }
        if (!this.puestoClave() && p.puestoClave) this.seleccionarPuestoPorClave(p.puestoClave);
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

  /** Primero se elige el puesto; el nivel se elige después entre los que existen para ese puesto. */
  cambiarPuesto(nombre: string): void {
    this.puestoNombre.set(nombre);
    this.puestoClave.set('');
    this.nivel.set(null);
    this.rango.set(null);
    const opciones = this.opcionesNivel();
    if (opciones.length === 1) this.cambiarNivel(opciones[0].clave);
  }

  /** El nivel elegido determina la clave del puesto (sus dos últimos dígitos son el nivel). */
  cambiarNivel(clave: string): void {
    const puesto = this.puestos().find((p) => p.clave === clave);
    this.puestoClave.set(puesto?.clave ?? '');
    this.nivel.set(puesto?.nivel ?? null);
    this.ajustarRango();
  }

  /** Si el rango ya capturado no existe para el nuevo nivel, se limpia. */
  private ajustarRango(): void {
    const rango = this.rango();
    if (rango != null && !this.opcionesRango().includes(rango)) this.rango.set(null);
  }

  private seleccionarPuestoPorClave(clave: string | null | undefined): void {
    const puesto = this.puestos().find((p) => p.clave === clave);
    this.puestoNombre.set(puesto?.descripcion ?? '');
    this.puestoClave.set(puesto?.clave ?? clave ?? '');
    this.nivel.set(puesto?.nivel ?? null);
  }

  /** Al cambiar de nómina, la clave de sueldo cambia: 01 (central) <-> 05 (honorarios). */
  cambiarNomina(tipo: string): void {
    const anterior = this.tipoNomina();
    this.tipoNomina.set(tipo);
    this.cargarCatPercepciones(tipo);
    const deCve = tipo === 'H' ? 1 : 5;
    const aCve = tipo === 'H' ? 5 : 1;
    if (anterior && anterior !== tipo) {
      this.percepciones.update((ps) => ps.map((p) => (p.cve === deCve ? { ...p, cve: aCve, descripcion: undefined } : p)));
    }
  }

  private cargarCatPercepciones(tipoNomina: string): void {
    this.catalogos.percepciones(tipoNomina).subscribe((c) => this.catPercepciones.set(c));
  }

  /** Claves que se ofrecen al capturar: solo percepciones (las deducciones también están en el catálogo). */
  protected readonly clavesCapturables = computed(() => this.catPercepciones().filter((c) => c.naturaleza === 'P'));

  partidaDe(cve: number): string {
    const partida = this.catPercepciones().find((c) => c.cve === cve)?.partida;
    return partida && partida !== '0' ? partida : '';
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
    // Como en CAP-MOP: al elegir una clave del tabulador (sueldo, gratificación, compensación) el importe se llena solo.
    const deTabulador = cambios.cve ? this.opcionesTabulador().find((o) => o.cve === cambios.cve) : undefined;
    const final = deTabulador ? { ...cambios, importe: deTabulador.importe } : cambios;
    this.percepciones.update((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...final } : p)));
  }

  private cargarOpcionesTabulador(puesto: string, rango: number | null, tipoNomina: string): void {
    const consulta = ++this.consultaTabulador;
    if (!puesto || !rango || !tipoNomina) {
      this.opcionesTabulador.set([]);
      return;
    }
    this.catalogos.sugeridasAlta(puesto, rango, tipoNomina).subscribe({
      next: (lineas) => {
        if (consulta === this.consultaTabulador) this.opcionesTabulador.set(lineas);
      },
      error: () => {
        if (consulta === this.consultaTabulador) this.opcionesTabulador.set([]);
      },
    });
  }

  protected conceptoTabulador(cve: number): string {
    const nombres: Record<number, string> = { 1: 'SUELDO', 5: 'SUELDOS Y SALARIOS COMPACTADOS', 11: 'COMPENSACIÓN', 12: 'GRATIFICACIÓN' };
    return this.descripcionDe(cve) || nombres[cve] || `Clave ${cve}`;
  }

  protected estaAgregada(cve: number): boolean {
    return this.percepciones().some((p) => p.cve === cve);
  }

  /** Marca o desmarca una percepción del tabulador: la agrega con su importe o la quita. */
  alternarTabulador(opcion: Percepcion, marcada: boolean): void {
    if (!marcada) {
      this.percepciones.update((ps) => ps.filter((p) => p.cve !== opcion.cve));
      return;
    }
    if (this.estaAgregada(opcion.cve)) return;
    if (this.percepciones().length >= 7) {
      this.toast.error('Un movimiento admite máximo 7 percepciones.');
      return;
    }
    this.percepciones.update((ps) => [...ps, { cve: opcion.cve, importe: opcion.importe }]);
  }

  quitarPercepcion(i: number): void {
    this.percepciones.update((ps) => ps.filter((_, idx) => idx !== i));
  }

  /**
   * Recalcula con el tabulador (nivel y rango actuales) SOLO las percepciones del tabulador que ya están
   * en la tabla: sueldo (1/5), gratificación (12) y compensación (11). No agrega ninguna nueva (eso se hace
   * con las casillas) y deja intactas las demás percepciones.
   */
  sugerirPercepciones(): void {
    if (!this.puestoClave() || !this.rango()) {
      this.toast.error('Elige primero el puesto, el nivel y el rango.');
      return;
    }
    const importes = new Map(this.opcionesTabulador().map((o) => [o.cve, o.importe]));
    if (!this.percepciones().some((p) => importes.has(p.cve))) {
      this.toast.error('Marca primero las percepciones del tabulador que quieres calcular.');
      return;
    }
    this.percepciones.update((ps) =>
      ps.map((p) => (importes.has(p.cve) ? { ...p, importe: importes.get(p.cve)! } : p)),
    );
    this.toast.success('Importes recalculados con el tabulador.');
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
      homoclave: opc(this.homoclave()),
      nombres: this.nombres().trim(),
      primerApellido: this.primerApellido().trim(),
      segundoApellido: opc(this.segundoApellido()),
      dependenciaId: this.dependenciaId() ?? 0,
      direccionId: this.direccionId() ?? undefined,
      departamentoId: this.departamentoId() ?? undefined,
      puestoClave: this.puestoClave(),
      rango: this.rango() ?? 0,
      tipCon: opc(this.tipCon()),
      // Bajas y licencias no capturan la nómina: se manda central por omisión.
      tipoNomina: this.tipoNomina() || 'P',
      fAlta: opc(this.fAlta()),
      fTerm: opc(this.fTerm()),
      reemp: opc(this.reemp()),
      horario: opc(this.horario()),
      hMat: opc(this.hMat()),
      hVes: opc(this.hVes()),
      tarj: this.tarj() ?? undefined,
      ctaBan: opc(this.ctaBan()),
      obs: opc(this.obs()),
      documOk: this.documOk() || 'N',
      percepciones: this.percepciones().filter((p) => p.cve > 0).map((p) => ({ cve: p.cve, importe: Number(p.importe) || 0 })),
    };
  }

  /** Validaciones de pantalla (las mismas que bloqueaban "salvar" en CAP-MOP); el servidor vuelve a validar. */
  private faltantes(): string[] {
    const f: string[] = [];
    if (!this.tipoMov()) f.push('Selecciona el tipo de movimiento');
    if (this.eligeDePlantilla() && !this.personaElegida()) f.push('Selecciona a la persona de la plantilla');
    if (this.tipoMov() && !this.subtipoMov()) f.push('Selecciona el subtipo');
    if (!this.noQna() || this.noQna()! < 1 || this.noQna()! > 24) f.push('La quincena debe estar entre 1 y 24');
    if (!this.curp().trim()) f.push('La CURP no puede ir en blanco');
    if (!this.nombres().trim()) f.push('El nombre(s) no puede ir en blanco');
    if (!this.primerApellido().trim()) f.push('El primer apellido no puede ir en blanco');
    if (this.visible('ads') && !this.dependenciaId()) f.push('La dependencia no puede ir en blanco');
    if (this.visible('puesto') && !this.puestoClave()) f.push('El puesto no puede ir en blanco');
    if (this.visible('rango') && !this.rango()) f.push('El rango no puede ir en blanco');
    if (this.esAlta() && !this.tipCon()) f.push('El tipo de contrato no puede ir en blanco');
    if (this.visible('tipoNomina') && !this.tipoNomina()) f.push('Selecciona el tipo de nómina');
    if (this.visible('documOk') && !this.documOk()) f.push('Indica si la documentación está completa');
    if (this.tipoMov() === 'B' && !this.fTerm()) f.push('La fecha de término es obligatoria en una baja');
    return f;
  }

  /** Guarda las bajas elegidas en el concentrado temporal de la quincena (sin crear folio de movimiento). */
  guardarBajas(): void {
    if (!this.noQna()) return this.toast.error('Elige la quincena.');
    if (!this.fecMov()) return this.toast.error('Captura la fecha de la baja.');
    if (!this.subtipoMov()) return this.toast.error('Elige el subtipo (motivo) de la baja.');
    if (!this.seleccionBaja().length) return this.toast.error('Selecciona al menos una persona.');

    this.guardandoBajas.set(true);
    this.bajas.crear({
      anio: this.anioBaja(),
      noQna: this.noQna()!,
      fechaBaja: this.fecMov(),
      subtipo: this.subtipoMov(),
      observaciones: this.obsBaja().trim() || undefined,
      personal: this.seleccionBaja(),
    }).subscribe({
      next: ({ creadas }) => {
        this.guardandoBajas.set(false);
        this.toast.success(`${creadas} baja(s) guardada(s) en el concentrado de la quincena.`);
        this.selectorBajas()?.limpiar();
        this.obsBaja.set('');
        this.panelBajas()?.recargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBajas.set(false);
        this.toast.error(err.error?.message ?? 'No se pudieron guardar las bajas.');
      },
    });
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
