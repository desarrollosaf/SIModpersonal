import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CatAdscripcion } from '../database/models/cat-adscripcion.model';
import { CatPuesto } from '../database/models/cat-puesto.model';
import { CatPercepcion } from '../database/models/cat-percepcion.model';
import { TipoMovimiento } from '../database/models/tipo-movimiento.model';
import { SubtipoMovimiento } from '../database/models/subtipo-movimiento.model';
import { TablaNivel } from '../database/models/tabla-nivel.model';
import { TablaRango } from '../database/models/tabla-rango.model';
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
    @InjectModel(TablaNivel) private readonly niveles: typeof TablaNivel,
    @InjectModel(TablaRango) private readonly rangos: typeof TablaRango,
  ) {}

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
      where: tipoNomina ? { tipoNomina } : {},
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
    return this.niveles.findByPk(nivel, {
      include: [{ model: TablaRango, order: [['rango', 'ASC']] }],
    });
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
