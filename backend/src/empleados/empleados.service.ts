import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col, fn, where as sqlWhere } from 'sequelize';
import { Empleado } from '../database/models/empleado.model';
import { Horario } from '../database/models/horario.model';
import { PagoDescuento } from '../database/models/pago-descuento.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TabuladorService } from '../tabulador/tabulador.service';
import {
  CVES_PERCEPCIONES_ANTERIORES,
  CVES_RESCATE,
  CVE_COMPENSACION,
  CVE_GRATIFICACION,
  CVE_SUELDO,
  CVE_SUELDO_COMPACTADO,
  FACTOR_TABULADOR,
  MAX_PERCEPCIONES,
  primeros10,
} from '../common/dominio';

export interface LineaPercepcion {
  cve: number;
  descripcion?: string;
  importe: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectModel(Empleado) private readonly empleados: typeof Empleado,
    @InjectModel(Horario) private readonly horarios: typeof Horario,
    @InjectModel(PagoDescuento) private readonly pagos: typeof PagoDescuento,
    @InjectModel(CatPuesto) private readonly puestos: typeof CatPuesto,
    @InjectModel(SUsuario, 'external')
    private readonly sUsuarios: typeof SUsuario,
    @InjectModel(CatPercepcion)
    private readonly catPercepciones: typeof CatPercepcion,
    private readonly tabulador: TabuladorService,
  ) {}

  /** El sistema original identifica al empleado por los primeros 10 caracteres de la CURP. */
  buscarPorCurp(curp: string) {
    return this.empleados.findOne({
      where: sqlWhere(fn('substr', col('curp'), 1, 10), primeros10(curp)),
    });
  }

  buscarPorRfc(rfc: string) {
    return this.empleados.findOne({ where: { rfc: rfc.trim().toUpperCase() } });
  }

  /** Búsqueda para el autocompletado del formulario (CURP, RFC o nombre). */
  async buscar(texto: string, limite = 15) {
    const t = (texto ?? '').trim().toUpperCase();
    if (t.length < 3) return [];
    return this.empleados.findAll({
      where: {
        [Op.or]: [
          { curp: { [Op.like]: `${t}%` } },
          { rfc: { [Op.like]: `${t}%` } },
          { nombre: { [Op.like]: `%${t}%` } },
        ],
      },
      order: [['nombre', 'ASC']],
      limit: limite,
    });
  }

  /**
   * Equivale a "rescata-campos-fal" de CAP-MOP: con la CURP trae del empleado lo que el movimiento
   * necesita (adscripción, puesto, nivel, rango, nómina, cuenta, horario y percepciones vigentes).
   */
  async prellenado(curp: string) {
    const emp = await this.buscarPorCurp(curp);
    if (!emp)
      throw new NotFoundException('Esta CURP no pertenece a ningún empleado');

    const [horario, puesto, personal, percepcionesVigentes] =
      await Promise.all([
        this.horarios.findOne({
          where: sqlWhere(fn('substr', col('curp'), 1, 10), primeros10(curp)),
        }),
        emp.puestoClave ? this.puestos.findByPk(emp.puestoClave) : null,
        // Dependencia / dirección / departamento del empleado, según el catálogo de personal (saf).
        this.sUsuarios.findOne({ where: { curp: emp.curp } }),
        this.percepcionesVigentes(curp),
      ]);

    return {
      curp: emp.curp,
      rfc: emp.rfc,
      nombre: emp.nombre,
      dependenciaId: personal?.id_Dependencia ?? null,
      direccionId: personal?.id_Direccion ?? null,
      departamentoId: personal?.id_Departamento ?? null,
      puestoClave: emp.puestoClave,
      puesto: puesto?.descripcion ?? null,
      nivel: puesto?.nivel ?? null,
      rango: emp.rango,
      // El sistema original muestra D como CENTRAL y al guardar lo normaliza a P.
      tipoNomina: emp.tipoNomina === 'D' ? 'P' : emp.tipoNomina,
      fAlta: emp.fAlta,
      ctaBan: emp.ctaBan,
      horario: horario
        ? { hMat: horario.hMat, hVes: horario.hVes, tarj: horario.tarj }
        : null,
      percepciones: percepcionesVigentes,
      percepcionesAnteriores: await this.percepcionesAnteriores(curp),
    };
  }

  /** Percepciones vigentes (PAG-DES con T-M = 'C'), máximo 7, importes ×2 como en el original. */
  async percepcionesVigentes(curp: string): Promise<LineaPercepcion[]> {
    const filas = await this.pagos.findAll({
      where: {
        [Op.and]: [
          sqlWhere(fn('substr', col('curp'), 1, 10), primeros10(curp)),
          { tM: 'C', cve: { [Op.in]: CVES_RESCATE } },
        ],
      },
    });
    // Orden fijo del original: 1/5 (sueldo), 11, 12, 14, 17, 31, 34.
    const orden = (cve: number) =>
      cve === 1 || cve === 5 ? 0 : CVES_RESCATE.indexOf(cve);
    return filas
      .sort((a, b) => orden(a.cve) - orden(b.cve))
      .slice(0, MAX_PERCEPCIONES)
      .map((f) => ({
        cve: f.cve,
        importe: redondear(Number(f.imp) * FACTOR_TABULADOR),
      }));
  }

  /** Total de percepciones anteriores: solo promociones y transferencias lo muestran. */
  async percepcionesAnteriores(curp: string): Promise<number> {
    const filas = await this.pagos.findAll({
      where: {
        [Op.and]: [
          sqlWhere(fn('substr', col('curp'), 1, 10), primeros10(curp)),
          { tM: 'C', cve: { [Op.in]: CVES_PERCEPCIONES_ANTERIORES } },
        ],
      },
    });
    return redondear(
      filas.reduce((s, f) => s + Number(f.imp) * FACTOR_TABULADOR, 0),
    );
  }

  /**
   * Percepciones sugeridas para un ALTA (rama "A" de reg-percep): sueldo según nómina, gratificación
   * (12) y compensación (11), todo desde el tabulador de nivel/rango y ×2.
   */
  async sugeridasAlta(
    puestoClave: string,
    rango: number,
    tipoNomina: string,
  ): Promise<LineaPercepcion[]> {
    const puesto = await this.puestos.findByPk(puestoClave);
    if (!puesto) throw new NotFoundException('Puesto inexistente');
    const { impNivel, impRango, impComp } = await this.importesTabulador(
      puesto.nivel,
      rango,
    );

    const cveSueldo =
      tipoNomina === 'P' || tipoNomina === 'D'
        ? CVE_SUELDO
        : CVE_SUELDO_COMPACTADO;
    const lineas: LineaPercepcion[] = [
      { cve: cveSueldo, importe: impNivel * FACTOR_TABULADOR },
      { cve: CVE_GRATIFICACION, importe: impRango * FACTOR_TABULADOR },
      { cve: CVE_COMPENSACION, importe: impComp * FACTOR_TABULADOR },
    ];
    return this.conDescripcion(
      lineas.map((l) => ({ ...l, importe: redondear(l.importe) })),
      tipoNomina,
    );
  }

  /** Importes de tabulador para un nivel/rango (Imp-Nivel, Imp-Rang[rango], Imp-Comp[rango]). */
  async importesTabulador(nivel: number, rango: number) {
    return this.tabulador.importes(nivel, rango);
  }

  /** Agrega la descripción de cada clave según el catálogo de la nómina. */
  async conDescripcion(
    lineas: LineaPercepcion[],
    tipoNomina: string,
  ): Promise<LineaPercepcion[]> {
    if (!lineas.length) return lineas;
    const cat = await this.catPercepciones.findAll({
      where: { cve: { [Op.in]: lineas.map((l) => l.cve) }, tipoNomina, activo: true },
    });
    const porCve = new Map(cat.map((c) => [c.cve, c.descripcion]));
    return lineas.map((l) => ({
      ...l,
      descripcion: porCve.get(l.cve) ?? l.descripcion,
    }));
  }
}
