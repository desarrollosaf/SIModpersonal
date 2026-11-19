import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { BajaTemporal, EstatusBaja } from '../database/models/baja-temporal.model';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { MovimientoHistorico } from '../database/models/movimiento-historico.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { CrearBajasDto } from './dto/bajas.dto';

/** Estatus que impiden volver a dar de baja a la misma persona. */
const ESTATUS_ACTIVOS: EstatusBaja[] = ['capturada', 'validada', 'transmitida'];

/**
 * s_usuario guarda el nombre completo en Nombre como "PATERNO MATERNO NOMBRES". Si trae los apellidos en
 * A_Paterno / A_Materno se usan; si no, se separa por posición (apellidos compuestos se corrigen en pantalla).
 */
function partesNombre(u: SUsuario) {
  const completo = (u.Nombre ?? '').trim().replace(/\s+/g, ' ');
  const paterno = (u.A_Paterno && u.A_Paterno !== 'NULL' ? u.A_Paterno : '').trim();
  const materno = (u.A_Materno && u.A_Materno !== 'NULL' ? u.A_Materno : '').trim();
  if (paterno) {
    const apellidos = [paterno, materno].filter(Boolean).join(' ');
    const nombres = completo.startsWith(apellidos) ? completo.slice(apellidos.length).trim() : completo;
    return { nombres, primerApellido: paterno, segundoApellido: materno };
  }
  const p = completo.split(' ').filter(Boolean);
  if (p.length <= 1) return { nombres: '', primerApellido: p[0] ?? '', segundoApellido: '' };
  if (p.length === 2) return { nombres: p[1], primerApellido: p[0], segundoApellido: '' };
  return { nombres: p.slice(2).join(' '), primerApellido: p[0], segundoApellido: p[1] };
}

const nombreCompleto = (u: SUsuario) =>
  [u.Nombre, u.A_Paterno, u.A_Materno].filter((p) => p && p !== 'NULL').join(' ').trim();

@Injectable()
export class BajasService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(BajaTemporal) private readonly bajas: typeof BajaTemporal,
    @InjectModel(LoteNomina) private readonly lotes: typeof LoteNomina,
    @InjectModel(MovimientoHistorico) private readonly historico: typeof MovimientoHistorico,
    @InjectModel(BitacoraMovimiento) private readonly bitacora: typeof BitacoraMovimiento,
    @InjectModel(SubtipoMovimiento) private readonly subtipos: typeof SubtipoMovimiento,
    @InjectModel(SUsuario, 'external') private readonly personal: typeof SUsuario,
    @InjectModel(TDependencia, 'external') private readonly dependencias: typeof TDependencia,
    @InjectModel(TDireccion, 'external') private readonly direcciones: typeof TDireccion,
    @InjectModel(TDepartamento, 'external') private readonly departamentos: typeof TDepartamento,
  ) {}

  // ------------------------------------------------------------------ catálogos

  /** Motivos de baja (subtipos del tipo B). */
  motivos() {
    return this.subtipos.findAll({ where: { tipo: 'B' }, order: [['nombre', 'ASC']] });
  }

  // ------------------------------------------------------- selección de personal

  /** Personal activo de saf.s_usuario que todavía no tiene una baja capturada, validada o transmitida. */
  async buscarPersonal(q: string, dependencia?: number, limite = 30) {
    const t = (q ?? '').trim();
    if (t.length < 3 && !dependencia) return [];

    const where: Record<string | symbol, unknown> = { Estado: 1 };
    if (dependencia) where.id_Dependencia = dependencia;
    if (t.length >= 3) {
      const mayus = t.toUpperCase();
      where[Op.or] = [
        { N_Usuario: { [Op.like]: `${mayus}%` } },
        { curp: { [Op.like]: `${mayus}%` } },
        { Nombre: { [Op.like]: `%${t}%` } },
        { A_Paterno: { [Op.like]: `%${t}%` } },
        { A_Materno: { [Op.like]: `%${t}%` } },
      ];
    }
    const filas = await this.personal.findAll({
      where,
      order: [['Nombre', 'ASC']],
      limit: limite * 2,
    });
    if (!filas.length) return [];

    const ocupados = await this.bajas.findAll({
      attributes: ['rfc'],
      where: { rfc: { [Op.in]: filas.map((f) => f.N_Usuario) }, estatus: { [Op.in]: ESTATUS_ACTIVOS } },
    });
    const bloqueados = new Set(ocupados.map((o) => o.rfc));
    const disponibles = filas.filter((f) => !bloqueados.has(f.N_Usuario)).slice(0, limite);

    const nombres = await this.nombresAdscripcion(disponibles);
    return disponibles.map((f) => ({
      id: f.id_Usuario,
      rfc: f.N_Usuario,
      curp: f.curp,
      nombre: nombreCompleto(f),
      ...partesNombre(f),
      puesto: f.Puesto,
      dependenciaId: f.id_Dependencia,
      direccionId: f.id_Direccion,
      departamentoId: f.id_Departamento,
      adscripcion: nombres(f.id_Dependencia, f.id_Direccion, f.id_Departamento),
    }));
  }

  // ------------------------------------------------------------------- captura

  async crear(dto: CrearBajasDto, usuarioRfc: string) {
    const anio = dto.anio ?? Number(fechaHoyMexico().slice(0, 4));
    const motivo = await this.subtipos.findOne({ where: { tipo: 'B', clave: dto.subtipo } });
    if (!motivo) throw new BadRequestException('Motivo de baja inexistente');

    const ids = [...new Set(dto.personal)];
    const personas = await this.personal.findAll({ where: { id_Usuario: { [Op.in]: ids }, Estado: 1 } });
    if (personas.length !== ids.length) {
      throw new BadRequestException('Alguna de las personas seleccionadas no existe o ya no está activa');
    }

    return this.sequelize.transaction(async (t) => {
      const yaEnBaja = await this.bajas.findAll({
        where: { rfc: { [Op.in]: personas.map((p) => p.N_Usuario) }, estatus: { [Op.in]: ESTATUS_ACTIVOS } },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (yaEnBaja.length) {
        throw new ConflictException(
          `Ya tienen una baja registrada: ${yaEnBaja.map((b) => `${b.nombre} (${b.rfc})`).join(', ')}`,
        );
      }

      const creadas: BajaTemporal[] = [];
      for (const p of personas) {
        const baja = await this.bajas.create(
          {
            anio,
            noQna: dto.noQna,
            sUsuarioId: p.id_Usuario,
            rfc: p.N_Usuario,
            curp: p.curp,
            nombre: nombreCompleto(p),
            puesto: p.Puesto,
            dependenciaId: p.id_Dependencia,
            direccionId: p.id_Direccion,
            departamentoId: p.id_Departamento,
            subtipo: dto.subtipo,
            fechaBaja: dto.fechaBaja,
            observaciones: dto.observaciones?.trim() || null,
            estatus: 'capturada',
            creadoPor: usuarioRfc,
          },
          { transaction: t },
        );
        creadas.push(baja);
        await this.registrar(t, {
          entidadId: baja.id,
          accion: 'captura',
          estatusNuevo: 'capturada',
          anio,
          noQna: dto.noQna,
          rfcPersonal: baja.rfc,
          detalle: { subtipo: dto.subtipo, fechaBaja: dto.fechaBaja, nombre: baja.nombre },
          usuarioRfc,
        });
      }
      return { creadas: creadas.length };
    });
  }

  // ----------------------------------------------------------------- concentrado

  async listar(anio: number, noQna: number, estatus?: string) {
    const filas = await this.bajas.findAll({
      where: { anio, noQna, ...(estatus ? { estatus } : {}) },
      order: [['nombre', 'ASC']],
    });
    const resumen: Record<string, number> = { capturada: 0, validada: 0, transmitida: 0, cancelada: 0 };
    for (const f of filas) resumen[f.estatus] = (resumen[f.estatus] ?? 0) + 1;
    return { resumen, bajas: await this.conDescripciones(filas) };
  }

  /**
   * Bajas del concentrado con la forma de una fila de la consulta de movimientos (sin folio), para
   * mostrarlas junto a los movimientos. Se excluyen las canceladas. Los filtros son los de la consulta.
   */
  async paraConsulta(f: { anio?: string; qnaInicial?: number; qnaFinal?: number; q?: string }, tomar: number) {
    const aa = f.anio ?? fechaHoyMexico().slice(2, 4);
    const and: Record<string | symbol, unknown>[] = [{ anio: 2000 + Number(aa), estatus: { [Op.ne]: 'cancelada' } }];
    if (f.qnaInicial) and.push({ noQna: { [Op.gte]: f.qnaInicial } });
    if (f.qnaFinal) and.push({ noQna: { [Op.lte]: f.qnaFinal } });
    const q = f.q?.trim();
    if (q) {
      const t = q.toUpperCase();
      and.push({
        [Op.or]: [{ nombre: { [Op.like]: `%${q}%` } }, { curp: { [Op.like]: `${t}%` } }, { rfc: { [Op.like]: `${t}%` } }],
      });
    }
    const { rows, count } = await this.bajas.findAndCountAll({
      where: { [Op.and]: and },
      order: [['fechaBaja', 'DESC'], ['id', 'DESC']],
      limit: tomar,
    });
    const detalle = await this.conDescripciones(rows);
    return {
      count,
      rows: detalle.map((b) => ({
        id: b.id,
        esBaja: true,
        estatusBaja: b.estatus,
        folio: '',
        fecMov: b.fechaBaja,
        noQna: b.noQna,
        tipoMov: 'B',
        subtipoMov: b.subtipo,
        tipMov: `B${b.subtipo}`,
        tipoMovNombre: 'BAJA',
        subtipoMovNombre: b.motivo,
        curp: b.curp ?? '',
        rfc: b.rfc,
        nombre: b.nombre,
        adscripcion: b.adscripcion,
        puesto: b.puesto,
        nivel: null,
        documOk: b.estatus === 'transmitida' ? 'T' : 'S',
        transmitido: b.estatus === 'transmitida',
      })),
    };
  }

  /** Bajas de cualquier quincena que todavía no se envían a nómina (capturadas o validadas). */
  async pendientes() {
    const filas = await this.bajas.findAll({
      where: { estatus: { [Op.in]: ['capturada', 'validada'] } },
      order: [['anio', 'DESC'], ['noQna', 'DESC'], ['nombre', 'ASC']],
    });
    return this.conDescripciones(filas);
  }

  private async conDescripciones(filas: BajaTemporal[]) {
    const nombres = await this.nombresAdscripcion(
      filas.map((f) => ({ id_Dependencia: f.dependenciaId, id_Direccion: f.direccionId, id_Departamento: f.departamentoId })),
    );
    const motivos = new Map((await this.motivos()).map((m) => [m.clave, m.nombre]));
    return filas.map((f) => ({
      ...f.get({ plain: true }),
      motivo: motivos.get(f.subtipo) ?? f.subtipo,
      adscripcion: nombres(f.dependenciaId, f.direccionId, f.departamentoId),
    }));
  }

  /** Quincenas que tienen bajas (más recientes primero), con el conteo por estatus. Para saltar a la que tiene pendientes. */
  async quincenas() {
    const filas = await this.bajas.findAll({
      attributes: ['anio', 'noQna', 'estatus', [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'n']],
      group: ['anio', 'no_qna', 'estatus'],
      raw: true,
    });
    const mapa = new Map<string, { anio: number; noQna: number; capturada: number; validada: number; transmitida: number; cancelada: number }>();
    for (const f of filas as unknown as { anio: number; noQna: number; estatus: EstatusBaja; n: string }[]) {
      const k = `${f.anio}-${f.noQna}`;
      const q = mapa.get(k) ?? { anio: f.anio, noQna: f.noQna, capturada: 0, validada: 0, transmitida: 0, cancelada: 0 };
      q[f.estatus] = Number(f.n);
      mapa.set(k, q);
    }
    return [...mapa.values()].sort((a, b) => b.anio - a.anio || b.noQna - a.noQna).slice(0, 24);
  }

  async cancelar(id: number, usuarioRfc: string) {
    const baja = await this.bajas.findByPk(id);
    if (!baja) throw new NotFoundException('Baja inexistente');
    if (baja.estatus === 'transmitida') throw new ConflictException('Una baja transmitida a nómina ya no se puede cancelar');
    if (baja.estatus === 'cancelada') return { ok: true };

    await this.sequelize.transaction(async (t) => {
      const anterior = baja.estatus;
      await baja.update({ estatus: 'cancelada' }, { transaction: t });
      await this.registrar(t, {
        entidadId: baja.id, accion: 'cancelacion', estatusAnterior: anterior, estatusNuevo: 'cancelada',
        anio: baja.anio, noQna: baja.noQna, rfcPersonal: baja.rfc, usuarioRfc,
      });
    });
    return { ok: true };
  }

  // ----------------------------------------- validación y envío (los orquesta ValidacionService)

  pendientesTx(t: Transaction, anio: number, noQna: number) {
    return this.bajas.count({ where: { anio, noQna, estatus: 'capturada' }, transaction: t });
  }

  /** Pasa a "validada" todas las bajas capturadas de la quincena. Devuelve cuántas. */
  async validarTx(t: Transaction, anio: number, noQna: number, usuarioRfc: string): Promise<number> {
    const filas = await this.bajas.findAll({
      where: { anio, noQna, estatus: 'capturada' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const ahora = new Date();
    for (const f of filas) {
      await f.update({ estatus: 'validada', validadoPor: usuarioRfc, validadoAt: ahora }, { transaction: t });
      await this.registrar(t, {
        entidadId: f.id, accion: 'validacion', estatusAnterior: 'capturada', estatusNuevo: 'validada',
        anio, noQna, rfcPersonal: f.rfc, usuarioRfc,
      });
    }
    return filas.length;
  }

  /** Pasa las bajas validadas a "transmitida", las copia al histórico y las liga al lote. Devuelve cuántas. */
  async transferirTx(t: Transaction, lote: LoteNomina, anio: number, noQna: number, usuarioRfc: string): Promise<number> {
    const filas = await this.bajas.findAll({
      where: { anio, noQna, estatus: 'validada' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const ahora = new Date();
    for (const f of filas) {
      await f.update(
        { estatus: 'transmitida', transmitidoPor: usuarioRfc, transmitidoAt: ahora, loteId: lote.id },
        { transaction: t },
      );
      await this.historico.create(
        {
          tipoMov: 'B', origenId: f.id, loteId: lote.id, anio, noQna,
          sUsuarioId: f.sUsuarioId, rfc: f.rfc, curp: f.curp, nombre: f.nombre, puesto: f.puesto,
          dependenciaId: f.dependenciaId, direccionId: f.direccionId, departamentoId: f.departamentoId,
          subtipo: f.subtipo, fechaBaja: f.fechaBaja, fechaMov: f.fechaBaja, observaciones: f.observaciones,
          creadoPor: f.creadoPor, validadoPor: f.validadoPor, transmitidoPor: usuarioRfc,
        },
        { transaction: t },
      );
      await this.registrar(t, {
        entidadId: f.id, loteId: lote.id, accion: 'transferencia', estatusAnterior: 'validada', estatusNuevo: 'transmitida',
        anio, noQna, rfcPersonal: f.rfc, usuarioRfc,
      });
    }
    return filas.length;
  }

  // ------------------------------------------------------ bitácora e histórico

  async consultarBitacora(f: { anio?: number; noQna?: number; rfc?: string; accion?: string; pagina?: number; limite?: number }) {
    const limite = Math.min(f.limite ?? 50, 200);
    const where = {
      ...(f.anio ? { anio: f.anio } : {}),
      ...(f.noQna ? { noQna: f.noQna } : {}),
      ...(f.rfc ? { rfcPersonal: f.rfc.trim().toUpperCase() } : {}),
      ...(f.accion ? { accion: f.accion } : {}),
    };
    const { rows, count } = await this.bitacora.findAndCountAll({
      where, order: [['id', 'DESC']], limit: limite, offset: ((f.pagina ?? 1) - 1) * limite,
    });
    return { total: count, registros: rows };
  }

  async consultarHistorico(f: { anio?: number; noQna?: number; rfc?: string; pagina?: number; limite?: number }) {
    const limite = Math.min(f.limite ?? 50, 200);
    const where = {
      ...(f.anio ? { anio: f.anio } : {}),
      ...(f.noQna ? { noQna: f.noQna } : {}),
      ...(f.rfc ? { rfc: f.rfc.trim().toUpperCase() } : {}),
    };
    const { rows, count } = await this.historico.findAndCountAll({
      where, order: [['id', 'DESC']], limit: limite, offset: ((f.pagina ?? 1) - 1) * limite,
    });
    const nombres = await this.nombresAdscripcion(
      rows.map((r) => ({ id_Dependencia: r.dependenciaId, id_Direccion: r.direccionId, id_Departamento: r.departamentoId })),
    );
    // Nombre del subtipo según el tipo de movimiento (NUE de altas, REN de bajas, etc.).
    const subtipos = new Map((await this.subtipos.findAll()).map((s) => [`${s.tipo}${s.clave}`, s.nombre]));
    return {
      total: count,
      registros: rows.map((r) => ({
        ...r.get({ plain: true }),
        motivo: subtipos.get(`${r.tipoMov}${r.subtipo}`) ?? r.subtipo,
        adscripcion: nombres(r.dependenciaId, r.direccionId, r.departamentoId),
      })),
    };
  }

  // -------------------------------------------------------------------- apoyo

  private registrar(
    t: Transaction,
    r: {
      entidadId?: number; loteId?: number; accion: BitacoraMovimiento['accion']; estatusAnterior?: string;
      estatusNuevo?: string; anio?: number; noQna?: number; rfcPersonal?: string; detalle?: object; usuarioRfc: string;
    },
  ) {
    return this.bitacora.create(
      {
        tipoMov: 'B', entidadId: r.entidadId ?? null, loteId: r.loteId ?? null, accion: r.accion,
        estatusAnterior: r.estatusAnterior ?? null, estatusNuevo: r.estatusNuevo ?? null,
        anio: r.anio ?? null, noQna: r.noQna ?? null, rfcPersonal: r.rfcPersonal ?? null,
        detalle: r.detalle ?? null, usuarioRfc: r.usuarioRfc,
      },
      { transaction: t },
    );
  }

  /** Devuelve una función que arma "Dependencia / Dirección / Departamento" a partir de sus ids. */
  private async nombresAdscripcion(
    filas: { id_Dependencia?: number | null; id_Direccion?: number | null; id_Departamento?: number | null }[],
  ) {
    const ids = (campo: 'id_Dependencia' | 'id_Direccion' | 'id_Departamento') => [
      ...new Set(filas.map((f) => f[campo]).filter((v): v is number => v != null)),
    ];
    const [deps, dirs, deptos] = await Promise.all([
      this.dependencias.findAll({ where: { id_Dependencia: { [Op.in]: ids('id_Dependencia') } } }),
      this.direcciones.findAll({ where: { id_Direccion: { [Op.in]: ids('id_Direccion') } } }),
      this.departamentos.findAll({ where: { id_Departamento: { [Op.in]: ids('id_Departamento') } } }),
    ]);
    const dep = new Map(deps.map((d) => [d.id_Dependencia, d.Nombre]));
    const dir = new Map(dirs.map((d) => [d.id_Direccion, d.nombre_completo || d.Nombre]));
    const depto = new Map(deptos.map((d) => [d.id_Departamento, `${d.c_presup} - ${d.nombre_completo || d.Nombre}`]));
    return (a?: number | null, b?: number | null, c?: number | null) =>
      [a != null ? dep.get(a) : null, b != null ? dir.get(b) : null, c != null ? depto.get(c) : null]
        .filter(Boolean)
        .join(' / ');
  }
}
