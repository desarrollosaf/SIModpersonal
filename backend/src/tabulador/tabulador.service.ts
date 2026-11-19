import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TabuladorVersion } from '../database/models/tabulador-version.model';
import { TablaRang } from '../database/models/tabla-rang.model';

/** Lectura del tabulador (TABLA-RANG): siempre sobre la versión vigente, o la que se pida. */
@Injectable()
export class TabuladorService {
  constructor(
    @InjectModel(TabuladorVersion) private readonly versiones: typeof TabuladorVersion,
    @InjectModel(TablaRang) private readonly tablaRang: typeof TablaRang,
  ) {}

  async versionVigente(): Promise<TabuladorVersion> {
    const v = await this.versiones.findOne({ where: { estatus: 'vigente' } });
    if (!v) throw new NotFoundException('No hay un tabulador vigente');
    return v;
  }

  private async renglon(nivel: number, versionId?: number) {
    const version = versionId ?? (await this.versionVigente()).id;
    return this.tablaRang.findOne({ where: { versionId: version, nivel } });
  }

  /** Imp-Nivel, Imp-Rang[rango] e Imp-Comp[rango] del renglón del nivel. */
  async importes(nivel: number, rango: number, versionId?: number) {
    const fila = await this.renglon(nivel, versionId);
    if (!fila) throw new NotFoundException(`El nivel ${nivel} no existe en el tabulador`);
    return {
      impNivel: Number(fila.impNivel),
      impRango: fila.impRang(rango),
      impComp: fila.impComp(rango),
    };
  }

  /** El renglón completo del nivel, con los arreglos de rangos 1 a 5 (para el catálogo). */
  async detalleNivel(nivel: number, versionId?: number) {
    const fila = await this.renglon(nivel, versionId);
    if (!fila) return null;
    const rangos = [1, 2, 3, 4, 5];
    return {
      versionId: fila.versionId,
      nivel: fila.nivel,
      impNivel: Number(fila.impNivel),
      impRang: rangos.map((r) => fila.impRang(r)),
      impComp: rangos.map((r) => fila.impComp(r)),
    };
  }
}
