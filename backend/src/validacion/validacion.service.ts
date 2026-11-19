import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Movimiento } from '../database/models/movimiento.model';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { DOCUM_TRANSMITIDO } from '../common/dominio';
import { BajasService } from '../bajas/bajas.service';
import { MovimientosService } from '../movimientos/movimientos.service';

export type EstatusValidacion = 'capturada' | 'validada' | 'transmitida' | 'cancelada';

export interface FilaValidacion {
  origen: 'movimiento' | 'baja';
  anio: number;
  noQna: number;
  /** Folio (movimientos) o id del concentrado de bajas. */
  clave: string;
  folio: string | null;
  tipoMov: string;
  tipo: string;
  rfc: string | null;
  curp: string | null;
  nombre: string;
  puesto: string | null;
  adscripcion: string | null;
  motivo: string | null;
  fecha: string;
  /** Documentación completa (S/N); solo aplica a los movimientos con folio. */
  documOk: string | null;
  estatus: EstatusValidacion;
  id: number | null;
}

/**
 * Concentra, por quincena, los movimientos de la tabla movimientos (altas, promociones, transferencias,
 * licencias) y las bajas del concentrado temporal, para validarlos y enviarlos juntos a nómina.
 */
@Injectable()
export class ValidacionService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(LoteNomina) private readonly lotes: typeof LoteNomina,
    @InjectModel(BitacoraMovimiento) private readonly bitacora: typeof BitacoraMovimiento,
    private readonly movimientos: MovimientosService,
    private readonly bajas: BajasService,
  ) {}

  private estatusDe(m: Movimiento): EstatusValidacion {
    if (m.documOk === DOCUM_TRANSMITIDO) return 'transmitida';
    return m.validadoAt ? 'validada' : 'capturada';
  }

  /** Une movimientos (con folio) y bajas (concentrado) en filas con la misma forma. */
  private async unir(filasMov: Movimiento[], bajas: Awaited<ReturnType<BajasService['listar']>>['bajas'], anioDe: (m: Movimiento) => number) {
    const enriquecidos = await this.movimientos.enriquecerFilas(filasMov);

    const deMovimientos: FilaValidacion[] = enriquecidos.map((m, i) => ({
      origen: 'movimiento',
      anio: anioDe(filasMov[i]),
      noQna: m.noQna,
      clave: m.folio,
      folio: m.folio,
      tipoMov: m.tipoMov,
      tipo: m.tipoMovNombre,
      rfc: m.rfc,
      curp: m.curp,
      nombre: m.nombre,
      puesto: m.puesto,
      adscripcion: m.adscripcion,
      motivo: m.subtipoMovNombre,
      fecha: m.fecMov,
      documOk: m.documOk === DOCUM_TRANSMITIDO ? 'S' : m.documOk,
      estatus: this.estatusDe(filasMov[i]),
      id: null,
    }));

    const deBajas: FilaValidacion[] = bajas.map((b) => ({
      origen: 'baja',
      anio: b.anio,
      noQna: b.noQna,
      clave: `B${b.id}`,
      folio: null,
      tipoMov: 'B',
      tipo: 'BAJA',
      rfc: b.rfc,
      curp: b.curp,
      nombre: b.nombre,
      puesto: b.puesto,
      adscripcion: b.adscripcion,
      motivo: b.motivo,
      fecha: b.fechaBaja,
      documOk: null,
      estatus: b.estatus,
      id: b.id,
    }));

    return [...deMovimientos, ...deBajas];
  }

  private resumir(filas: FilaValidacion[]) {
    const resumen: Record<EstatusValidacion, number> = { capturada: 0, validada: 0, transmitida: 0, cancelada: 0 };
    for (const f of filas) resumen[f.estatus]++;
    return resumen;
  }

  async listar(anio: number, noQna: number) {
    const [filasMov, concentrado] = await Promise.all([
      this.movimientos.filasDeQuincena(anio, noQna),
      this.bajas.listar(anio, noQna),
    ]);
    const filas = (await this.unir(filasMov, concentrado.bajas, () => anio)).sort(
      (a, b) => a.tipoMov.localeCompare(b.tipoMov) || a.nombre.localeCompare(b.nombre),
    );
    return { resumen: this.resumir(filas), filas };
  }

  /** Todo lo que aún no se envía a nómina, de cualquier quincena (más reciente primero). */
  async pendientes() {
    const [filasMov, bajas] = await Promise.all([this.movimientos.filasPendientes(), this.bajas.pendientes()]);
    // El año de un movimiento con folio son los dos últimos dígitos del folio.
    const filas = (await this.unir(filasMov, bajas, (m) => 2000 + Number(m.folio.slice(4, 6)))).sort(
      (a, b) => b.anio - a.anio || b.noQna - a.noQna || a.tipoMov.localeCompare(b.tipoMov) || a.nombre.localeCompare(b.nombre),
    );
    return { resumen: this.resumir(filas), filas };
  }

  // ------------------------------------------------------------------ validar

  private async validarTx(t: Transaction, anio: number, noQna: number, usuarioRfc: string) {
    const mov = await this.movimientos.validarTx(t, anio, noQna, usuarioRfc);
    const bajas = await this.bajas.validarTx(t, anio, noQna, usuarioRfc);
    return { movimientos: mov.validadas, bajas, incompletos: mov.incompletas };
  }

  /** Valida todos los movimientos y bajas capturados de una quincena. */
  async validar(anio: number, noQna: number, usuarioRfc: string) {
    return this.sequelize.transaction((t) => this.validarTx(t, anio, noQna, usuarioRfc));
  }

  /** Valida todo lo capturado, de todas las quincenas con pendientes. */
  async validarPendientes(usuarioRfc: string) {
    const quincenas = await this.quincenasPendientes();
    return this.sequelize.transaction(async (t) => {
      const total = { movimientos: 0, bajas: 0, incompletos: 0 };
      for (const q of quincenas) {
        const r = await this.validarTx(t, q.anio, q.noQna, usuarioRfc);
        total.movimientos += r.movimientos;
        total.bajas += r.bajas;
        total.incompletos += r.incompletos;
      }
      return { ...total, quincenas: quincenas.length };
    });
  }

  // -------------------------------------------------------------------- enviar

  /**
   * Envía a nómina todo lo validado de una quincena en un solo lote. Exige que no quede nada sin validar.
   * El envío real al sistema de nómina está por integrarse: el lote queda en "pendiente_envio".
   */
  private async enviarTx(t: Transaction, anio: number, noQna: number, usuarioRfc: string) {
    const sinValidar =
      (await this.movimientos.pendientesTx(t, anio, noQna)) + (await this.bajas.pendientesTx(t, anio, noQna));
    if (sinValidar) {
      throw new ConflictException(
        `Hay ${sinValidar} movimiento(s) sin validar en la quincena ${noQna}/${anio}. Valídalos (con la documentación completa) o cancélalos antes de enviar a nómina.`,
      );
    }

    const lote = await this.lotes.create(
      { tipoMov: 'M', anio, noQna, total: 0, estatus: 'pendiente_envio', generadoPor: usuarioRfc },
      { transaction: t },
    );
    const movimientos = await this.movimientos.transferirTx(t, lote, anio, noQna, usuarioRfc);
    const bajas = await this.bajas.transferirTx(t, lote, anio, noQna, usuarioRfc);
    const total = movimientos + bajas;
    if (!total) throw new BadRequestException(`No hay movimientos validados para enviar en la quincena ${noQna}/${anio}`);

    await lote.update({ total }, { transaction: t });
    await this.bitacora.create(
      {
        tipoMov: 'M', loteId: lote.id, accion: 'transferencia', anio, noQna, usuarioRfc,
        detalle: { total, movimientos, bajas, lote: lote.id },
      },
      { transaction: t },
    );
    return { lote: lote.id, total, movimientos, bajas, estatus: lote.estatus };
    // TODO(nómina): al integrar el sistema de nómina, enviar el lote aquí y actualizar
    // lotes_nomina.estatus / enviado_at / respuesta.
  }

  async enviar(anio: number, noQna: number, usuarioRfc: string) {
    return this.sequelize.transaction((t) => this.enviarTx(t, anio, noQna, usuarioRfc));
  }

  /** Envía a nómina todo lo validado de todas las quincenas con pendientes: un lote por quincena. */
  async enviarPendientes(usuarioRfc: string) {
    const quincenas = await this.quincenasPendientes();
    if (!quincenas.length) throw new BadRequestException('No hay movimientos pendientes por enviar');
    return this.sequelize.transaction(async (t) => {
      const lotes: { lote: number; anio: number; noQna: number; total: number }[] = [];
      for (const q of quincenas) {
        const r = await this.enviarTx(t, q.anio, q.noQna, usuarioRfc);
        lotes.push({ lote: r.lote, anio: q.anio, noQna: q.noQna, total: r.total });
      }
      return { lotes, total: lotes.reduce((s, l) => s + l.total, 0) };
    });
  }

  /** Quincenas (año y número) que tienen algo pendiente por enviar, de la más antigua a la más reciente. */
  private async quincenasPendientes() {
    const { filas } = await this.pendientes();
    const vistas = new Map<string, { anio: number; noQna: number }>();
    for (const f of filas) vistas.set(`${f.anio}-${f.noQna}`, { anio: f.anio, noQna: f.noQna });
    return [...vistas.values()].sort((a, b) => a.anio - b.anio || a.noQna - b.noQna);
  }
}
