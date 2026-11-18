import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Percepcion } from './movimientos.service';

export interface Opcion {
  clave: string;
  nombre: string;
}
export interface Adscripcion {
  id: number;
  descripcion: string;
}
export interface Puesto {
  clave: string;
  descripcion: string;
  nivel: number;
}
export interface CatPercepcion {
  cve: number;
  tipoNomina: string;
  descripcion: string;
}
export interface TipoMovimiento {
  clave: string;
  nombre: string;
  subtipos: Opcion[];
}
export interface CatalogosFijos {
  formasContratacion: Opcion[];
  tiposNomina: Opcion[];
  horarios: Opcion[];
}
export interface Prellenado {
  curp: string;
  rfc: string | null;
  nombre: string;
  adscripcionId: number | null;
  adscripcion: string | null;
  puestoClave: string | null;
  puesto: string | null;
  nivel: number | null;
  rango: number | null;
  tipoNomina: string | null;
  fAlta: string | null;
  ctaBan: string | null;
  horario: { hMat: string | null; hVes: string | null; tarj: number | null } | null;
  percepciones: Percepcion[];
  percepcionesAnteriores: number;
}
export interface EmpleadoBusqueda {
  curp: string;
  rfc: string | null;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly url = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  fijos(): Observable<CatalogosFijos> {
    return this.http.get<CatalogosFijos>(`${this.url}/catalogos/fijos`);
  }
  adscripciones(): Observable<Adscripcion[]> {
    return this.http.get<Adscripcion[]>(`${this.url}/catalogos/adscripciones`);
  }
  puestos(nivel?: number): Observable<Puesto[]> {
    let params = new HttpParams();
    if (nivel != null) params = params.set('nivel', nivel);
    return this.http.get<Puesto[]>(`${this.url}/catalogos/puestos`, { params });
  }
  percepciones(tipoNomina: string): Observable<CatPercepcion[]> {
    return this.http.get<CatPercepcion[]>(`${this.url}/catalogos/percepciones`, { params: { tipoNomina } });
  }
  tiposMovimiento(): Observable<TipoMovimiento[]> {
    return this.http.get<TipoMovimiento[]>(`${this.url}/catalogos/tipos-movimiento`);
  }
  buscarEmpleados(q: string): Observable<EmpleadoBusqueda[]> {
    return this.http.get<EmpleadoBusqueda[]>(`${this.url}/empleados/buscar`, { params: { q } });
  }
  prellenado(curp: string): Observable<Prellenado> {
    return this.http.get<Prellenado>(`${this.url}/empleados/prellenado`, { params: { curp } });
  }
  sugeridasAlta(puesto: string, rango: number, tipoNomina: string): Observable<Percepcion[]> {
    return this.http.get<Percepcion[]>(`${this.url}/empleados/sugeridas-alta`, {
      params: { puesto, rango, tipoNomina },
    });
  }
}
