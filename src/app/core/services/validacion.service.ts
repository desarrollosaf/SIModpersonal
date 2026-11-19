import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstatusValidacion = 'capturada' | 'validada' | 'transmitida' | 'cancelada';

export interface FilaValidacion {
  origen: 'movimiento' | 'baja';
  anio: number;
  noQna: number;
  clave: string;
  folio: string | null;
  tipoMov: string;
  tipo: string;
  rfc: string | null;
  curp: string | null;
  nombre: string;
  puesto: string | null;
  adscripcion: string | null;
  motivo: string | null;
  fecha: string;
  documOk: string | null;
  estatus: EstatusValidacion;
  id: number | null;
}

export interface ConcentradoValidacion {
  resumen: Record<EstatusValidacion, number>;
  filas: FilaValidacion[];
}

@Injectable({ providedIn: 'root' })
export class ValidacionService {
  private readonly url = `${environment.apiUrl}/validacion`;

  constructor(private readonly http: HttpClient) {}

  listar(anio: number, noQna: number): Observable<ConcentradoValidacion> {
    return this.http.get<ConcentradoValidacion>(this.url, { params: { anio, noQna } });
  }

  /** Todo lo pendiente por enviar a nómina, de cualquier quincena. */
  pendientes(): Observable<ConcentradoValidacion> {
    return this.http.get<ConcentradoValidacion>(`${this.url}/pendientes`);
  }

  validarPendientes(): Observable<{ movimientos: number; bajas: number; incompletos: number; quincenas: number }> {
    return this.http.post<{ movimientos: number; bajas: number; incompletos: number; quincenas: number }>(`${this.url}/validar-pendientes`, {});
  }

  enviarPendientes(): Observable<{ total: number; lotes: { lote: number; anio: number; noQna: number; total: number }[] }> {
    return this.http.post<{ total: number; lotes: { lote: number; anio: number; noQna: number; total: number }[] }>(`${this.url}/enviar-pendientes`, {});
  }

  validar(anio: number, noQna: number): Observable<{ movimientos: number; bajas: number; incompletos: number }> {
    return this.http.post<{ movimientos: number; bajas: number; incompletos: number }>(`${this.url}/validar`, { anio, noQna });
  }

  enviar(anio: number, noQna: number): Observable<{ lote: number; total: number; movimientos: number; bajas: number }> {
    return this.http.post<{ lote: number; total: number; movimientos: number; bajas: number }>(`${this.url}/enviar`, { anio, noQna });
  }
}
