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
  WhereOptions,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import * as XLSX from 'xlsx';
import { Movimiento } from '../database/models/movimiento.model';
import { MovimientoPercepcion } from '../database/models/movimiento-percepcion.model';
import { MovimientoBitacora } from '../database/models/movimiento-bitacora.model';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { EmpleadosService } from '../empleados/empleados.service';
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
    @InjectModel(CatAdscripcion)
    private readonly adscripciones: typeof CatAdscripcion,
    @InjectModel(CatPuesto) private readonly puestos: typeof CatPuesto,
    @InjectModel(CatPercepcion)
    private readonly catPercepciones: typeof CatPercepcion,
    @InjectModel(SubtipoMovimiento)
    private readonly subtipos: typeof SubtipoMovimiento,
    @InjectModel(TipoMovimiento) private readonly tipos: typeof TipoMovimiento,
    private readonly empleados: EmpleadosService,
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

  async listar(f: FiltroMovimientosDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 25;
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

  /** Agrega descripciones de adscripción, puesto, tipo y subtipo para mostrar en pantalla. */
  private async enriquecer(rows: Movimiento[]) {
    const [ads, pues, tipos, subs] = await Promise.all([
      this.adscripciones.findAll(),
      this.puestos.findAll({
        where: {
          clave: { [Op.in]: [...new Set(rows.map((r) => r.puestoClave))] },
        },
      }),
      this.tipos.findAll(),
      this.subtipos.findAll(),
    ]);
    const adsPor = new Map(ads.map((a) => [a.id, a.descripcion]));
    const pPor = new Map(pues.map((p) => [p.clave, p]));
    const tPor = new Map(tipos.map((t) => [t.clave, t.nombre]));
    const sPor = new Map(subs.map((s) => [`${s.tipo}${s.clave}`, s.nombre]));
    return rows.map((r) => {
      const plano = r.get({ plain: true }) as Movimiento;
      return {
        ...plano,
        tipMov: `${r.tipoMov}${r.subtipoMov}`,
        tipoMovNombre: tPor.get(r.tipoMov) ?? r.tipoMov,
        subtipoMovNombre:
          sPor.get(`${r.tipoMov}${r.subtipoMov}`) ?? r.subtipoMov,
        adscripcion: adsPor.get(r.adsAct) ?? null,
        puesto: pPor.get(r.puestoClave)?.descripcion ?? null,
        nivel: pPor.get(r.puestoClave)?.nivel ?? null,
        transmitido: r.documOk === DOCUM_TRANSMITIDO,
      };
    });
  }

  // --------------------------------------------------------------- escritura

  async crear(dto: GuardarMovimientoDto, rfcUsuario: string) {
    const folio =
      dto.folio ?? (await this.siguienteFolio(dto.fecMov.slice(2, 4))).folio;
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
        { ...datos.campos, actualizadoPor: rfcUsuario },
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
      throw new BadRequestException('Esta CURP no pertenece a ningún empleado');
    }

    if (!(await this.adscripciones.findByPk(dto.adsAct)))
      throw new BadRequestException('Adscripción inexistente');
    const puesto = await this.puestos.findByPk(dto.puestoClave);
    if (!puesto) throw new BadRequestException('Puesto inexistente');

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
      puesto.nivel,
      esAlta,
    );

    const total = redondear(percepciones.reduce((s, p) => s + p.importe, 0));
    const anteriores =
      dto.tipoMov === 'P' || dto.tipoMov === 'T'
        ? await this.empleados.percepcionesAnteriores(curp)
        : null;

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
        nombre: dto.nombre.trim().toUpperCase(),
        sexo: dto.sexo ?? null,
        adsAnt: dto.adsAnt ?? empleado?.adscripcionId ?? null,
        adsAct: dto.adsAct,
        puestoClave: dto.puestoClave,
        rango: dto.rango,
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
        RFC: d.rfc ?? '',
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

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(filas),
      'Movimientos',
    );
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
