import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TabuladorService } from '../tabulador/tabulador.service';
import { TDependencia } from '../database/models/t-dependencia.model';
import { TDireccion } from '../database/models/t-direccion.model';
import { TDepartamento } from '../database/models/t-departamento.model';
import { FORMAS_CONTRATACION, HORARIOS } from '../common/dominio';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectModel(CatAdscripcion)
    private readonly adscripciones: typeof CatAdscripcion,
    @InjectModel(CatPuesto) private readonly puestos: typeof CatPuesto,
    @InjectModel(CatPercepcion)
    private readonly percepciones: typeof CatPercepcion,
    @InjectModel(TipoMovimiento) private readonly tipos: typeof TipoMovimiento,
    @InjectModel(SubtipoMovimiento)
    private readonly subtipos: typeof SubtipoMovimiento,
    private readonly tabuladorService: TabuladorService,
    @InjectModel(TDependencia, 'external')
    private readonly dependencias: typeof TDependencia,
    @InjectModel(TDireccion, 'external')
    private readonly direcciones: typeof TDireccion,
    @InjectModel(TDepartamento, 'external')
    private readonly departamentos: typeof TDepartamento,
  ) {}

  // Dependencia > Dirección > Departamento: catálogo de personal (saf), solo los vigentes (Estado = 1).

  async listarDependencias() {
    const filas = await this.dependencias.findAll({
      where: { Estado: 1 },
      order: [['orden', 'ASC'], ['Nombre', 'ASC']],
    });
    return filas.map((f) => ({ id: f.id_Dependencia, nombre: f.Nombre }));
  }

  async listarDirecciones(dependenciaId: number) {
    const filas = await this.direcciones.findAll({
      where: { Estado: 1, id_Dependencia: dependenciaId },
      order: [['nombre_completo', 'ASC']],
    });
    return filas.map((f) => ({ id: f.id_Direccion, nombre: f.nombre_completo || f.Nombre }));
  }

  async listarDepartamentos(direccionId: number) {
    const filas = await this.departamentos.findAll({
      where: { Estado: 1, id_Direccion: direccionId },
      order: [['Nombre', 'ASC']],
    });
    // Departamento: nombre completo + clave presupuestal, ej. "11040 - UNIDAD DE ASISTENCIA SOCIAL".
    return filas.map((f) => ({
      id: f.id_Departamento,
      nombre: `${f.c_presup} - ${f.nombre_completo || f.Nombre}`,
    }));
  }

  listarAdscripciones() {
    return this.adscripciones.findAll({
      where: { activo: true },
      order: [['descripcion', 'ASC']],
    });
  }

  listarPuestos(nivel?: number) {
    return this.puestos.findAll({
      where: { activo: true, ...(nivel != null ? { nivel } : {}) },
      order: [
        ['nivel', 'ASC'],
        ['descripcion', 'ASC'],
      ],
    });
  }

  listarPercepciones(tipoNomina?: string) {
    return this.percepciones.findAll({
      where: { activo: true, ...(tipoNomina ? { tipoNomina } : {}) },
      order: [['cve', 'ASC']],
    });
  }

  async tiposMovimiento() {
    const tipos = await this.tipos.findAll({ order: [['clave', 'ASC']] });
    const subtipos = await this.subtipos.findAll({
      where: { activo: true },
      order: [['clave', 'ASC']],
    });
    return tipos.map((t) => ({
      clave: t.clave,
      nombre: t.nombre,
      subtipos: subtipos
        .filter((s) => s.tipo === t.clave)
        .map((s) => ({ clave: s.clave, nombre: s.nombre })),
    }));
  }

  /** Importes del tabulador para un nivel (Imp-Nivel y arreglos Imp-Rang[] / Imp-Comp[]). */
  tabulador(nivel: number) {
    return this.tabuladorService.detalleNivel(nivel);
  }

  /** Catálogos fijos del formulario (combos de CAP-MOP). */
  fijos() {
    return {
      formasContratacion: Object.entries(FORMAS_CONTRATACION).map(
        ([clave, nombre]) => ({ clave, nombre }),
      ),
      // En pantalla solo se elige CENTRAL (P) u HONORARIOS (H); D existe solo en nómina heredada.
      tiposNomina: [
        { clave: 'P', nombre: 'CENTRAL' },
        { clave: 'H', nombre: 'HONORARIOS' },
      ],
      horarios: Object.entries(HORARIOS).map(([clave, nombre]) => ({
        clave,
        nombre,
      })),
    };
  }
}
