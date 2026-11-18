import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Percepcion {
  cve: number;
  descripcion?: string;
  importe: number;
}

export interface Movimiento {
  folio: string;
  fecMov: string;
  noQna: number;
  tipoMov: string;
  subtipoMov: string;
  tipMov: string;
  tipoMovNombre: string;
  subtipoMovNombre: string;
  curp: string;
  rfc: string | null;
  nombre: string;
  sexo: string | null;
  adsAnt: number | null;
  adsAct: number;
  adscripcion: string | null;
  puestoClave: string;
  puesto: string | null;
  nivel: number | null;
  rango: number;
  percepA: string | null;
  tipCon: string | null;
  tipoNomina: string;
  fAlta: string | null;
  fTerm: string | null;
  reemp: string | null;
  horario: string | null;
  hMat: string | null;
  hVes: string | null;
  tarj: number | null;
  ctaBan: string | null;
  obs: string | null;
  documOk: string;
  transmitido: boolean;
  percepciones?: Percepcion[];
  totalPercepciones?: number;
  percepcionesAnteriores?: number | null;
}

export interface GuardarMovimiento {
  folio?: string;
  fecMov: string;
  noQna: number;
  tipoMov: string;
  subtipoMov: string;
  curp: string;
  rfc?: string;
  nombre: string;
  sexo?: string;
  adsAnt?: number;
  adsAct: number;
  puestoClave: string;
  rango: number;
  tipCon?: string;
  tipoNomina: string;
  fAlta?: string;
  fTerm?: string;
  reemp?: string;
  horario?: string;
  hMat?: string;
  hVes?: string;
  tarj?: number;
  ctaBan?: string;
  obs?: string;
  documOk?: string;
  percepciones: { cve: number; importe: number }[];
}

export interface FiltroMovimientos {
  anio?: string;
  qnaInicial?: number | null;
  qnaFinal?: number | null;
  tipoMov?: string;
  nomina?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface PaginaMovimientos {
  total: number;
  page: number;
  limit: number;
  datos: Movimiento[];
}

function aParams(filtro: FiltroMovimientos): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== null && valor !== '') params = params.set(clave, String(valor));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private readonly url = `${environment.apiUrl}/movimientos`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: FiltroMovimientos): Observable<PaginaMovimientos> {
    return this.http.get<PaginaMovimientos>(this.url, { params: aParams(filtro) });
  }

  obtener(folio: string): Observable<Movimiento> {
    return this.http.get<Movimiento>(`${this.url}/${folio}`);
  }

  siguienteFolio(anio?: string): Observable<{ folio: string }> {
    return this.http.get<{ folio: string }>(`${this.url}/siguiente-folio`, { params: aParams({ anio }) });
  }

  crear(datos: GuardarMovimiento): Observable<Movimiento> {
    return this.http.post<Movimiento>(this.url, datos);
  }

  actualizar(folio: string, datos: GuardarMovimiento): Observable<Movimiento> {
    return this.http.put<Movimiento>(`${this.url}/${folio}`, datos);
  }

  transmitir(folio: string): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.url}/${folio}/transmitir`, {});
  }

  eliminar(folio: string): Observable<{ folio: string; eliminado: boolean }> {
    return this.http.delete<{ folio: string; eliminado: boolean }>(`${this.url}/${folio}`);
  }

  exportar(filtro: FiltroMovimientos): Observable<Blob> {
    return this.http.get(`${this.url}/exportar`, { params: aParams(filtro), responseType: 'blob' });
  }
}
