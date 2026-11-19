import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import {
  Op,
  QueryTypes,
  Sequelize,
  Transaction,
  WhereOptions,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import * as XLSX from 'xlsx';
import { Movimiento } from '../database/models/movimiento.model';
import { MovimientoPercepcion } from '../database/models/movimiento-percepcion.model';
import { MovimientoBitacora } from '../database/models/movimiento-bitacora.model';
import { LoteNomina } from '../database/models/lote-nomina.model';
import { MovimientoHistorico } from '../database/models/movimiento-historico.model';
import { BitacoraMovimiento } from '../database/models/bitacora-movimiento.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { EmpleadosService } from '../empleados/empleados.service';
import { BajasService } from '../bajas/bajas.service';
import {
  CVE_COMPENSACION,
  CVE_GRATIFICACION,
  CVE_SUELDO,
  CVE_SUELDO_COMPACTADO,
  DOCUM_TRANSMITIDO,
  FACTOR_TABULADOR,
  FORMAS_CONTRATACION,
  HORARIOS,
  MAX_PERCEPCIONES,
  TIPOS_NOMINA,
} from '../common/dominio';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { GuardarMovimientoDto } from './dto/guardar-movimiento.dto';
import { FiltroMovimientosDto } from './dto/filtro-movimientos.dto';

/** Tipos que se eligen de la plantilla activa (saf.s_usuario): promoción, transferencia y licencia. */
const PLANTILLA_ACTIVA = ['P', 'T', 'L'];

const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class MovimientosService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Movimiento) private readonly movimientos: typeof Movimiento,
    @InjectModel(MovimientoPercepcion)
    private readonly percepciones: typeof MovimientoPercepcion,
    @InjectModel(MovimientoBitacora)
    private readonly bitacora: typeof MovimientoBitacora,
    @InjectModel(MovimientoHistorico) private readonly historico: typeof MovimientoHistorico,
    @InjectModel(BitacoraMovimiento) private readonly bitacoraGeneral: typeof BitacoraMovimiento,
    @InjectModel(SUsuario, 'external') private readonly plantilla: typeof SUsuario,
    @InjectModel(TDependencia, 'external')
    private readonly dependencias: typeof TDependencia,
    @InjectModel(TDireccion, 'external')
    private readonly direcciones: typeof TDireccion,
    @InjectModel(TDepartamento, 'external')
    private readonly departamentos: typeof TDepartamento,
    @InjectModel(CatPuesto) private readonly puestos: typeof CatPuesto,
    @InjectModel(CatPercepcion)
    private readonly catPercepciones: typeof CatPercepcion,
    @InjectModel(SubtipoMovimiento)
    private readonly subtipos: typeof SubtipoMovimiento,
    @InjectModel(TipoMovimiento) private readonly tipos: typeof TipoMovimiento,
    private readonly empleados: EmpleadosService,
    private readonly bajasSvc: BajasService,
  ) {}

  // ------------------------------------------------------------------ folios

  /** Siguiente folio "NNNNAA" del año indicado (por default el actual). */
  async siguienteFolio(anio?: string): Promise<{ folio: string }> {
    const aa = anio ?? fechaHoyMexico().slice(2, 4);
    const [fila] = await this.sequelize.query<{ max: string | null }>(
      `SELECT MAX(substr(folio, 1, 4)) AS max FROM movimientos WHERE substr(folio, 5, 2) = :aa`,
      { replacements: { aa }, type: QueryTypes.SELECT },
    );
    const siguiente = (fila?.max ? parseInt(fila.max, 10) : 0) + 1;
    if (siguiente > 9999)
      throw new ConflictException('Se agotaron los folios del año');
    return { folio: `${String(siguiente).padStart(4, '0')}${aa}` };
  }

  // ----------------------------------------------------------------- consulta

  private construirWhere(f: FiltroMovimientosDto): WhereOptions {
    const aa = f.anio ?? fechaHoyMexico().slice(2, 4);
    const condiciones: WhereOptions[] = [
      sqlWhere(fn('substr', col('folio'), 5, 2), aa),
    ];
    if (f.qnaInicial) condiciones.push({ noQna: { [Op.gte]: f.qnaInicial } });
    if (f.qnaFinal) condiciones.push({ noQna: { [Op.lte]: f.qnaFinal } });
    if (f.tipoMov) condiciones.push({ tipoMov: f.tipoMov });
    if (f.nomina)
      condiciones.push({
        tipoNomina: { [Op.in]: f.nomina === 'HONORARIOS' ? ['H'] : ['D', 'P'] },
      });
    const q = f.q?.trim();
    if (q) {
      const t = q.toUpperCase();
      condiciones.push({
        [Op.or]: [
          { folio: { [Op.like]: `${t}%` } },
          { nombre: { [Op.like]: `%${q}%` } },
          { curp: { [Op.like]: `${t}%` } },
          { rfc: { [Op.like]: `${t}%` } },
        ],
      });
    }
    return { [Op.and]: condiciones };
  }

  /** Las bajas del concentrado se muestran junto a los movimientos, salvo que el filtro las excluya. */
  private incluyeBajas(f: FiltroMovimientosDto) {
    return (!f.tipoMov || f.tipoMov === 'B') && !f.nomina;
  }

  async listar(f: FiltroMovimientosDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 25;

    // Con bajas se mezclan las dos fuentes: de cada una se toman las primeras (página × tamaño) filas,
    // se ordenan juntas por fecha y se corta la página.
    const bajas = this.incluyeBajas(f) ? await this.bajasSvc.paraConsulta(f, page * limit) : null;
    if (bajas && bajas.count > 0) {
      const { rows: filas, count } = await this.movimientos.findAndCountAll({
        where: this.construirWhere(f),
        order: [['fecMov', 'DESC'], ['folio', 'DESC']],
        limit: page * limit,
      });
      const movs = await this.enriquecer(filas);
      const mezcla = [...movs, ...bajas.rows].sort(
        (a, b) => b.fecMov.localeCompare(a.fecMov) || (b.folio ?? '').localeCompare(a.folio ?? ''),
      );
      return {
        total: count + bajas.count,
        page,
        limit,
        datos: mezcla.slice((page - 1) * limit, page * limit),
      };
    }

    const { rows, count } = await this.movimientos.findAndCountAll({
      where: this.construirWhere(f),
      order: [
        ['fecMov', 'DESC'],
        ['folio', 'DESC'],
      ],
      limit,
      offset: (page - 1) * limit,
    });
    return { total: count, page, limit, datos: await this.enriquecer(rows) };
  }

  async obtener(folio: string) {
    const mov = await this.movimientos.findByPk(folio, {
      include: [
        {
          model: MovimientoPercepcion,
          separate: true,
          order: [['orden', 'ASC']],
        },
      ],
    });
    if (!mov) throw new NotFoundException('Folio inexistente');
    const [detalle] = await this.enriquecer([mov]);
    const lineas = (mov.percepciones ?? []).map((p) => ({
      cve: p.cve,
      importe: Number(p.importe),
    }));
    return {
      ...detalle,
      percepciones: await this.empleados.conDescripcion(lineas, mov.tipoNomina),
      totalPercepciones: redondear(lineas.reduce((s, l) => s + l.importe, 0)),
      percepcionesAnteriores:
        mov.tipoMov === 'P' || mov.tipoMov === 'T'
          ? await this.empleados.percepcionesAnteriores(mov.curp)
          : null,
    };
  }

  /** La dependencia debe existir y la dirección / departamento deben pertenecer a la selección superior. */
  private async validarAdscripcion(dto: GuardarMovimientoDto) {
    const dependencia = await this.dependencias.findByPk(dto.dependenciaId);
    if (!dependencia) throw new BadRequestException('Dependencia inexistente');

    if (dto.direccionId != null) {
      const direccion = await this.direcciones.findByPk(dto.direccionId);
      if (!direccion || direccion.id_Dependencia !== dto.dependenciaId)
        throw new BadRequestException('La dirección no pertenece a la dependencia');
    }
    if (dto.departamentoId != null) {
      if (dto.direccionId == null)
        throw new BadRequestException('Selecciona la dirección del departamento');
      const departamento = await this.departamentos.findByPk(dto.departamentoId);
      if (!departamento || departamento.id_Direccion !== dto.direccionId)
        throw new BadRequestException('El departamento no pertenece a la dirección');
    }
  }

  /** Agrega descripciones de adscripción, puesto, tipo y subtipo para mostrar en pantalla. */
  private async enriquecer(rows: Movimiento[]) {
    const ids = (campo: 'dependenciaId' | 'direccionId' | 'departamentoId') => [
      ...new Set(rows.map((r) => r[campo]).filter((v): v is number => v != null)),
    ];
    const [deps, dirs, deptos, pues, tipos, subs] = await Promise.all([
      this.dependencias.findAll({ where: { id_Dependencia: { [Op.in]: ids('dependenciaId') } } }),
      this.direcciones.findAll({ where: { id_Direccion: { [Op.in]: ids('direccionId') } } }),
      this.departamentos.findAll({ where: { id_Departamento: { [Op.in]: ids('departamentoId') } } }),
      this.puestos.findAll({
        where: {
          clave: { [Op.in]: [...new Set(rows.map((r) => r.puestoClave).filter((c): c is string => !!c))] },
        },
      }),
      this.tipos.findAll(),
      this.subtipos.findAll(),
    ]);
    const depPor = new Map(deps.map((d) => [d.id_Dependencia, d.Nombre]));
    const dirPor = new Map(dirs.map((d) => [d.id_Direccion, d.nombre_completo || d.Nombre]));
    const deptoPor = new Map(
      deptos.map((d) => [d.id_Departamento, `${d.c_presup} - ${d.nombre_completo || d.Nombre}`]),
    );
    const pPor = new Map(pues.map((p) => [p.clave, p]));
    const tPor = new Map(tipos.map((t) => [t.clave, t.nombre]));
    const sPor = new Map(subs.map((s) => [`${s.tipo}${s.clave}`, s.nombre]));
    return rows.map((r) => {
      const plano = r.get({ plain: true }) as Movimiento;
      const dependencia = r.dependenciaId != null ? (depPor.get(r.dependenciaId) ?? null) : null;
      const direccion = r.direccionId != null ? (dirPor.get(r.direccionId) ?? null) : null;
      const departamento = r.departamentoId != null ? (deptoPor.get(r.departamentoId) ?? null) : null;
      return {
        ...plano,
        tipMov: `${r.tipoMov}${r.subtipoMov}`,
        tipoMovNombre: tPor.get(r.tipoMov) ?? r.tipoMov,
        subtipoMovNombre:
          sPor.get(`${r.tipoMov}${r.subtipoMov}`) ?? r.subtipoMov,
        dependencia,
        direccion,
        departamento,
        adscripcion: [dependencia, direccion, departamento].filter(Boolean).join(' / ') || null,
        puesto: pPor.get(r.puestoClave ?? '')?.descripcion ?? null,
        nivel: pPor.get(r.puestoClave ?? '')?.nivel ?? null,
        transmitido: r.documOk === DOCUM_TRANSMITIDO,
      };
    });
  }

  // --------------------------------------------------------------- escritura

  async crear(dto: GuardarMovimientoDto, rfcUsuario: string) {
    const anioMov = dto.fecMov.slice(2, 4);
    if (dto.folio && dto.folio.slice(4, 6) !== anioMov) {
      throw new BadRequestException(
        `El folio ${dto.folio} termina en ${dto.folio.slice(4, 6)}, pero la fecha del movimiento es del año ${anioMov}. Los dos últimos dígitos del folio son el año.`,
      );
    }
    const folio = dto.folio ?? (await this.siguienteFolio(anioMov)).folio;
    if (await this.movimientos.findByPk(folio))
      throw new ConflictException(`El folio ${folio} ya existe`);
    const datos = await this.validarYNormalizar(dto);

    await this.sequelize.transaction(async (transaction) => {
      await this.movimientos.create(
        {
          ...datos.campos,
          folio,
          creadoPor: rfcUsuario,
          actualizadoPor: rfcUsuario,
        },
        { transaction },
      );
      await this.percepciones.bulkCreate(
        datos.percepciones.map((p, i) => ({
          folio,
          orden: i + 1,
          cve: p.cve,
          importe: p.importe,
        })),
        { transaction },
      );
      await this.bitacora.create(
        {
          folio,
          accion: 'CREAR',
          usuarioRfc: rfcUsuario,
          datos: { ...dto, folio },
        },
        { transaction },
      );
    });
    return this.obtener(folio);
  }

  async actualizar(
    folio: string,
    dto: GuardarMovimientoDto,
    rfcUsuario: string,
  ) {
    const actual = await this.movimientos.findByPk(folio);
    if (!actual) throw new NotFoundException('Folio inexistente');
    this.asegurarNoTransmitido(actual);
    const datos = await this.validarYNormalizar(dto);

    await this.sequelize.transaction(async (transaction) => {
      await actual.update(
        // Si se modifica un movimiento ya validado, vuelve a captura para validarse otra vez.
        { ...datos.campos, actualizadoPor: rfcUsuario, validadoPor: null, validadoAt: null },
        { transaction },
      );
      await this.percepciones.destroy({ where: { folio }, transaction });
      await this.percepciones.bulkCreate(
        datos.percepciones.map((p, i) => ({
          folio,
          orden: i + 1,
          cve: p.cve,
          importe: p.importe,
        })),
        { transaction },
      );
      await this.bitacora.create(
        {
          folio,
          accion: 'MODIFICAR',
          usuarioRfc: rfcUsuario,
          datos: { ...dto, folio },
        },
        { transaction },
      );
    });
    return this.obtener(folio);
  }

  // ------------------------------------------- validación y envío (los orquesta ValidacionService)

  /** Movimientos de una quincena. El año sale de los dos últimos dígitos del folio. */
  filasDeQuincena(anio: number, noQna: number) {
    return this.movimientos.findAll({
      where: {
        [Op.and]: [sqlWhere(fn('substr', col('folio'), 5, 2), String(anio).slice(2)), { noQna }],
      },
      order: [['folio', 'ASC']],
    });
  }

  /** Movimientos de cualquier quincena que todavía no se envían a nómina (capturados o validados). */
  filasPendientes() {
    return this.movimientos.findAll({
      where: { documOk: { [Op.ne]: DOCUM_TRANSMITIDO } },
      order: [['noQna', 'DESC'], ['folio', 'ASC']],
    });
  }

  enriquecerFilas(rows: Movimiento[]) {
    return this.enriquecer(rows);
  }

  /** Capturado = sin validar y sin transmitir. */
  private capturadosTx(t: Transaction, anio: number, noQna: number) {
    return this.movimientos.findAll({
      where: {
        [Op.and]: [
          sqlWhere(fn('substr', col('folio'), 5, 2), String(anio).slice(2)),
          { noQna, documOk: { [Op.ne]: DOCUM_TRANSMITIDO }, validadoAt: null },
        ],
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
  }

  async pendientesTx(t: Transaction, anio: number, noQna: number): Promise<number> {
    return (await this.capturadosTx(t, anio, noQna)).length;
  }

  /**
   * Valida los movimientos capturados de la quincena. Solo se validan los que tienen la documentación
   * completa (misma regla que exigía la transmisión); los demás se quedan en captura.
   */
  async validarTx(t: Transaction, anio: number, noQna: number, usuarioRfc: string) {
    const filas = await this.capturadosTx(t, anio, noQna);
    const ahora = new Date();
    let validadas = 0;
    for (const m of filas) {
      if (m.documOk !== 'S') continue;
      await m.update({ validadoPor: usuarioRfc, validadoAt: ahora }, { transaction: t });
      await this.bitacora.create({ folio: m.folio, accion: 'VALIDAR', usuarioRfc }, { transaction: t });
      await this.bitacoraGeneral.create(
        {
          tipoMov: m.tipoMov, folio: m.folio, accion: 'validacion', estatusAnterior: 'capturada', estatusNuevo: 'validada',
          anio, noQna, rfcPersonal: m.rfc ?? m.curp, usuarioRfc,
        },
        { transaction: t },
      );
      validadas++;
    }
    return { validadas, incompletas: filas.length - validadas };
  }

  /** Marca como transmitidos (DOCUM_OK = 'T') los movimientos validados, los copia al histórico y los liga al lote. */
  async transferirTx(t: Transaction, lote: LoteNomina, anio: number, noQna: number, usuarioRfc: string): Promise<number> {
    const filas = await this.movimientos.findAll({
      where: {
        [Op.and]: [
          sqlWhere(fn('substr', col('folio'), 5, 2), String(anio).slice(2)),
          { noQna, documOk: { [Op.ne]: DOCUM_TRANSMITIDO }, validadoAt: { [Op.ne]: null } },
        ],
      },
      include: [{ model: MovimientoPercepcion, separate: true, order: [['orden', 'ASC']] }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const ahora = new Date();
    for (const m of filas) {
      const copia = m.get({ plain: true });
      await m.update(
        { documOk: DOCUM_TRANSMITIDO, transmitidoPor: usuarioRfc, transmitidoAt: ahora, loteId: lote.id, actualizadoPor: usuarioRfc },
        { transaction: t },
      );
      await this.historico.create(
        {
          tipoMov: m.tipoMov, folio: m.folio, loteId: lote.id, anio, noQna, fechaMov: m.fecMov,
          rfc: m.rfc ?? m.curp, curp: m.curp, nombre: m.nombre, puesto: m.puestoClave,
          dependenciaId: m.dependenciaId, direccionId: m.direccionId, departamentoId: m.departamentoId,
          subtipo: m.subtipoMov, creadoPor: m.creadoPor, validadoPor: m.validadoPor, transmitidoPor: usuarioRfc,
          datos: copia,
        },
        { transaction: t },
      );
      await this.bitacora.create({ folio: m.folio, accion: 'TRANSMITIR', usuarioRfc }, { transaction: t });
      await this.bitacoraGeneral.create(
        {
          tipoMov: m.tipoMov, folio: m.folio, loteId: lote.id, accion: 'transferencia', estatusAnterior: 'validada',
          estatusNuevo: 'transmitida', anio, noQna, rfcPersonal: m.rfc ?? m.curp, usuarioRfc,
        },
        { transaction: t },
      );
    }
    return filas.length;
  }

  /** Marca el movimiento como transmitido a nómina (DOCUM_OK = 'T'): ya no se puede modificar. */
  async transmitir(folio: string, rfcUsuario: string) {
    const mov = await this.movimientos.findByPk(folio);
    if (!mov) throw new NotFoundException('Folio inexistente');
    this.asegurarNoTransmitido(mov);
    if (mov.documOk !== 'S') {
      throw new BadRequestException(
        'La documentación debe estar completa antes de transmitir a nómina',
      );
    }
    await this.sequelize.transaction(async (transaction) => {
      await mov.update(
        { documOk: DOCUM_TRANSMITIDO, actualizadoPor: rfcUsuario },
        { transaction },
      );
      await this.bitacora.create(
        { folio, accion: 'TRANSMITIR', usuarioRfc: rfcUsuario },
        { transaction },
      );
    });
    return this.obtener(folio);
  }

  async eliminar(folio: string, rfcUsuario: string) {
    const mov = await this.movimientos.findByPk(folio);
    if (!mov) throw new NotFoundException('Folio inexistente');
    this.asegurarNoTransmitido(mov);
    await this.sequelize.transaction(async (transaction) => {
      await this.bitacora.create(
        {
          folio,
          accion: 'ELIMINAR',
          usuarioRfc: rfcUsuario,
          datos: mov.get({ plain: true }),
        },
        { transaction },
      );
      await mov.destroy({ transaction });
    });
    return { folio, eliminado: true };
  }

  private asegurarNoTransmitido(mov: Movimiento) {
    if (mov.documOk === DOCUM_TRANSMITIDO) {
      throw new ForbiddenException(
        'El movimiento ya está transmitido a nómina, es imposible modificarlo',
      );
    }
  }

  // ------------------------------------------------------------- validaciones

  /**
   * Reglas de CAP-MOP.p (procedure salvar-inf y triggers de captura) trasladadas al servidor.
   * Devuelve los campos listos para guardar y las percepciones validadas.
   */
  private async validarYNormalizar(dto: GuardarMovimientoDto) {
    const hoy = fechaHoyMexico();
    if (dto.fecMov.slice(0, 4) !== hoy.slice(0, 4)) {
      throw new BadRequestException(
        'El año de la fecha del movimiento no coincide con el año actual',
      );
    }

    // Transferencia: el subtipo es siempre TRA.
    const subtipo = dto.tipoMov === 'T' ? 'TRA' : dto.subtipoMov.toUpperCase();
    if (
      !(await this.subtipos.findOne({
        where: { tipo: dto.tipoMov, clave: subtipo },
      }))
    ) {
      throw new BadRequestException(
        'El subtipo no corresponde al tipo de movimiento',
      );
    }

    const clave = `${dto.tipoMov}${subtipo}`;
    const esAlta = dto.tipoMov === 'A';
    const esReingreso = clave === 'AREI' || clave === 'ARIN';
    const curp = dto.curp.trim().toUpperCase();

    const empleado = await this.empleados.buscarPorCurp(curp);
    if (esAlta) {
      // Una alta nueva no puede existir ya en nómina (los reingresos sí).
      if (!esReingreso && empleado) {
        throw new BadRequestException(
          `Esta CURP ya existe en nómina para el empleado ${empleado.nombre}`,
        );
      }
      if (!dto.tipCon)
        throw new BadRequestException(
          'El tipo de contrato no puede ir en blanco',
        );
    } else if (!empleado) {
      // Una promoción se elige de la plantilla activa (saf.s_usuario, Estado = 1); los demás tipos siguen
      // exigiendo que la CURP esté en nómina.
      const enPlantilla =
        PLANTILLA_ACTIVA.includes(dto.tipoMov)
          ? await this.plantilla.findOne({
              where: { Estado: 1, [Op.and]: [sqlWhere(fn('substr', col('curp'), 1, 10), curp.slice(0, 10))] },
            })
          : null;
      if (!enPlantilla) {
        throw new BadRequestException(
          PLANTILLA_ACTIVA.includes(dto.tipoMov)
            ? 'Esta CURP no pertenece a ninguna persona activa de la plantilla'
            : 'Esta CURP no pertenece a ningún empleado',
        );
      }
    }

    // La licencia no captura adscripción, puesto ni rango; los demás tipos sí.
    if (dto.dependenciaId) await this.validarAdscripcion(dto);
    const puesto = dto.puestoClave ? await this.puestos.findByPk(dto.puestoClave) : null;
    if (dto.tipoMov !== 'L' && !puesto) throw new BadRequestException('Puesto inexistente');

    if (dto.tipoMov === 'B' && !dto.fTerm) {
      throw new BadRequestException(
        'La fecha de término es obligatoria en una baja',
      );
    }
    if (dto.fAlta && dto.fTerm && dto.fTerm < dto.fAlta) {
      throw new BadRequestException(
        'La fecha de término no puede ser anterior a la fecha de alta',
      );
    }

    const percepciones = await this.validarPercepciones(
      dto,
      puesto?.nivel ?? 0,
      esAlta,
    );

    const total = redondear(percepciones.reduce((s, p) => s + p.importe, 0));
    const anteriores =
      dto.tipoMov === 'P' || dto.tipoMov === 'T'
        ? await this.empleados.percepcionesAnteriores(curp)
        : null;

    const nombres = dto.nombres.trim().toUpperCase();
    const primerApellido = dto.primerApellido.trim().toUpperCase();
    const segundoApellido = dto.segundoApellido?.trim().toUpperCase() || null;
    const nombreCompleto = [primerApellido, segundoApellido, nombres]
      .filter(Boolean)
      .join(' ');
    if (nombreCompleto.length > 60) {
      throw new BadRequestException(
        'El nombre completo (apellidos y nombres) no puede pasar de 60 caracteres',
      );
    }

    return {
      percepciones,
      total,
      campos: {
        fecMov: dto.fecMov,
        noQna: dto.noQna,
        tipoMov: dto.tipoMov,
        subtipoMov: subtipo,
        curp,
        rfc: dto.rfc?.trim().toUpperCase() || empleado?.rfc || null,
        homoclave: dto.homoclave?.trim().toUpperCase() || null,
        nombre: nombreCompleto,
        nombres,
        primerApellido,
        segundoApellido,
        sexo: dto.sexo ?? null,
        adsAnt: null,
        adsAct: null,
        dependenciaId: dto.dependenciaId || null,
        direccionId: dto.direccionId ?? null,
        departamentoId: dto.departamentoId ?? null,
        puestoClave: dto.puestoClave || null,
        rango: dto.rango || null,
        percepA: anteriores,
        tipCon: dto.tipCon ?? null,
        tipoNomina: dto.tipoNomina,
        fAlta: dto.fAlta ?? (esAlta ? null : (empleado?.fAlta ?? null)),
        fTerm: dto.fTerm ?? null,
        reemp: dto.reemp?.trim().toUpperCase() || null,
        horario: dto.horario ?? null,
        hMat: dto.hMat ?? null,
        hVes: dto.hVes ?? null,
        tarj: dto.tarj ?? null,
        ctaBan: dto.ctaBan ?? (esAlta ? null : (empleado?.ctaBan ?? null)),
        obs: dto.obs?.trim() || null,
        documOk: dto.documOk ?? 'N',
      },
    };
  }

  /**
   * Percepciones: máximo 7, sin claves repetidas, cada clave debe existir en el catálogo de la nómina,
   * y las claves ligadas al tabulador (sueldo 01/05, gratificación 12, compensación 11) se recalculan
   * desde nivel/rango en altas, promociones y transferencias.
   */
  private async validarPercepciones(
    dto: GuardarMovimientoDto,
    nivel: number,
    esAlta: boolean,
  ) {
    const lineas = dto.percepciones ?? [];
    if (lineas.length > MAX_PERCEPCIONES) {
      throw new BadRequestException(
        `Un movimiento admite máximo ${MAX_PERCEPCIONES} percepciones`,
      );
    }
    if (new Set(lineas.map((l) => l.cve)).size !== lineas.length) {
      throw new BadRequestException('Hay claves de percepción repetidas');
    }
    if (esAlta && lineas.length === 0) {
      throw new BadRequestException('Un alta requiere al menos una percepción');
    }

    if (lineas.length) {
      const cat = await this.catPercepciones.findAll({
        where: {
          tipoNomina: dto.tipoNomina,
          activo: true,
          cve: { [Op.in]: lineas.map((l) => l.cve) },
        },
      });
      const existentes = new Set(cat.map((c) => c.cve));
      const faltantes = lineas
        .filter((l) => !existentes.has(l.cve))
        .map((l) => l.cve);
      if (faltantes.length) {
        throw new BadRequestException(
          `Clave(s) ${faltantes.join(', ')} inexistente(s) en el catálogo para el tipo de nómina ${
            TIPOS_NOMINA[dto.tipoNomina] ?? dto.tipoNomina
          }`,
        );
      }
    }

    const recalcula =
      dto.tipoMov === 'A' || dto.tipoMov === 'P' || dto.tipoMov === 'T';
    if (!recalcula)
      return lineas.map((l) => ({ cve: l.cve, importe: redondear(l.importe) }));

    const { impNivel, impRango, impComp } =
      await this.empleados.importesTabulador(nivel, dto.rango);
    return lineas.map((l) => {
      const porTabulador: Record<number, number> = {
        [CVE_SUELDO]: impNivel,
        [CVE_SUELDO_COMPACTADO]: impNivel,
        [CVE_GRATIFICACION]: impRango,
        [CVE_COMPENSACION]: impComp,
      };
      const importe =
        l.cve in porTabulador
          ? porTabulador[l.cve] * FACTOR_TABULADOR
          : l.importe;
      return { cve: l.cve, importe: redondear(importe) };
    });
  }

  // --------------------------------------------------------------- exportación

  /** Exporta a Excel la consulta por periodo (equivale a MCONS-AC / MCONS-TO y su salida a Excel). */
  async exportarExcel(f: FiltroMovimientosDto): Promise<Buffer> {
    const rows = await this.movimientos.findAll({
      where: this.construirWhere(f),
      order: [
        ['noQna', 'ASC'],
        ['folio', 'ASC'],
      ],
      include: [
        {
          model: MovimientoPercepcion,
          separate: true,
          order: [['orden', 'ASC']],
        },
      ],
    });
    const detalle = await this.enriquecer(rows);

    const filas = detalle.map((d, i) => {
      const mov = rows[i];
      const total = (mov.percepciones ?? []).reduce(
        (s, p) => s + Number(p.importe),
        0,
      );
      return {
        FOLIO: d.folio,
        FECHA: d.fecMov,
        QNA: d.noQna,
        TIPO: d.tipoMovNombre,
        SUBTIPO: d.subtipoMovNombre,
        CURP: d.curp,
        RFC: `${d.rfc ?? ''}${(mov.homoclave ?? '')}`,
        NOMBRE: d.nombre,
        ADSCRIPCION: d.adscripcion ?? '',
        PUESTO: d.puesto ?? '',
        NIVEL: d.nivel ?? '',
        RANGO: d.rango,
        CONTRATO: FORMAS_CONTRATACION[mov.tipCon ?? ''] ?? '',
        NOMINA: TIPOS_NOMINA[mov.tipoNomina] ?? mov.tipoNomina,
        'A PARTIR': mov.fAlta ?? '',
        'F. TERMINO': mov.fTerm ?? '',
        HORARIO: HORARIOS[mov.horario ?? ''] ?? '',
        'TOTAL PERCEPCIONES': redondear(total),
        DOCUMENTACION:
          mov.documOk === 'T'
            ? 'TRANSMITIDO'
            : mov.documOk === 'S'
              ? 'COMPLETA'
              : 'INCOMPLETA',
        OBSERVACIONES: mov.obs ?? '',
      };
    });

    // Bajas del concentrado (sin folio ni percepciones).
    if (this.incluyeBajas(f)) {
      const bajas = await this.bajasSvc.paraConsulta(f, 100000);
      for (const b of bajas.rows) {
        filas.push({
          FOLIO: '',
          FECHA: b.fecMov,
          QNA: b.noQna,
          TIPO: b.tipoMovNombre,
          SUBTIPO: b.subtipoMovNombre,
          CURP: b.curp,
          RFC: b.rfc ?? '',
          NOMBRE: b.nombre,
          ADSCRIPCION: b.adscripcion ?? '',
          PUESTO: b.puesto ?? '',
          NIVEL: '',
          RANGO: '',
          CONTRATO: '',
          NOMINA: '',
          'A PARTIR': '',
          'F. TERMINO': b.fecMov,
          HORARIO: '',
          'TOTAL PERCEPCIONES': 0,
          DOCUMENTACION: b.estatusBaja === 'transmitida' ? 'TRANSMITIDO' : `BAJA ${String(b.estatusBaja).toUpperCase()}`,
          OBSERVACIONES: '',
        } as unknown as (typeof filas)[number]);
      }
    }

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(filas),
      'Movimientos',
    );
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
