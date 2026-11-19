import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PersonalBaja {
  id: number;
  rfc: string;
  curp: string | null;
  nombre: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  puesto: string | null;
  dependenciaId: number | null;
  direccionId: number | null;
  departamentoId: number | null;
  adscripcion: string;
}

export interface MotivoBaja {
  clave: string;
  nombre: string;
}

export type EstatusBaja = 'capturada' | 'validada' | 'transmitida' | 'cancelada';

export interface Baja {
  id: number;
  anio: number;
  noQna: number;
  rfc: string;
  curp: string | null;
  nombre: string;
  puesto: string | null;
  adscripcion: string;
  subtipo: string;
  motivo: string;
  fechaBaja: string;
  observaciones: string | null;
  estatus: EstatusBaja;
  loteId: number | null;
}

export interface Concentrado {
  resumen: Record<EstatusBaja, number>;
  bajas: Baja[];
}

export interface ResumenQuincena {
  anio: number;
  noQna: number;
  capturada: number;
  validada: number;
  transmitida: number;
  cancelada: number;
}

export interface CrearBajas {
  anio: number;
  noQna: number;
  fechaBaja: string;
  subtipo: string;
  observaciones?: string;
  personal: number[];
}

export interface RegistroBitacora {
  id: number;
  tipoMov: string;
  folio: string | null;
  accion: string;
  estatusAnterior: string | null;
  estatusNuevo: string | null;
  anio: number | null;
  noQna: number | null;
  rfcPersonal: string | null;
  usuarioRfc: string | null;
  detalle: Record<string, unknown> | null;
  loteId: number | null;
  createdAt: string;
}

export interface RegistroHistorico {
  id: number;
  tipoMov: string;
  folio: string | null;
  loteId: number;
  anio: number;
  noQna: number;
  rfc: string;
  nombre: string;
  puesto: string | null;
  adscripcion: string;
  motivo: string;
  fechaMov: string | null;
  fechaBaja: string | null;
  transmitidoPor: string | null;
  createdAt: string;
}

export interface Pagina<T> {
  total: number;
  registros: T[];
}

@Injectable({ providedIn: 'root' })
export class BajasService {
  private readonly url = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  motivos(): Observable<MotivoBaja[]> {
    return this.http.get<MotivoBaja[]>(`${this.url}/bajas/motivos`);
  }

  personal(q: string): Observable<PersonalBaja[]> {
    return this.http.get<PersonalBaja[]>(`${this.url}/bajas/personal`, { params: { q } });
  }

  quincenas(): Observable<ResumenQuincena[]> {
    return this.http.get<ResumenQuincena[]>(`${this.url}/bajas/quincenas`);
  }

  concentrado(anio: number, noQna: number): Observable<Concentrado> {
    return this.http.get<Concentrado>(`${this.url}/bajas`, { params: { anio, noQna } });
  }

  crear(datos: CrearBajas): Observable<{ creadas: number }> {
    return this.http.post<{ creadas: number }>(`${this.url}/bajas`, datos);
  }

  cancelar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.url}/bajas/${id}`);
  }

  bitacora(f: { anio?: number; noQna?: number; rfc?: string; accion?: string; pagina?: number }): Observable<Pagina<RegistroBitacora>> {
    return this.http.get<Pagina<RegistroBitacora>>(`${this.url}/bitacora-movimientos`, { params: this.params(f) });
  }

  historico(f: { anio?: number; noQna?: number; rfc?: string; pagina?: number }): Observable<Pagina<RegistroHistorico>> {
    return this.http.get<Pagina<RegistroHistorico>>(`${this.url}/historico-movimientos`, { params: this.params(f) });
  }

  private params(f: Record<string, string | number | undefined>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') p = p.set(k, String(v));
    return p;
  }
}
