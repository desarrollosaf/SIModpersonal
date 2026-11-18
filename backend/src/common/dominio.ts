/**
 * Reglas fijas del dominio, tomadas de CAP-MOP.p del sistema Progress original.
 */

/** Tipo de movimiento = primer carácter del TIP-MOV original. */
export const TIPOS_MOVIMIENTO = ['A', 'B', 'P', 'T', 'L'] as const;
export type TipoMov = (typeof TIPOS_MOVIMIENTO)[number];

/** Forma de contratación (TIP-CON): C,B,S,T,O. */
export const FORMAS_CONTRATACION: Record<string, string> = {
  C: 'CONFIANZA',
  B: 'BASE',
  S: 'SUPERNUMERARIO',
  T: 'TIEMPO DETERMINADO',
  O: 'OBRA TERMINADA',
};

/** Tipo de nómina (TIPO): D y P se muestran como CENTRAL, H como HONORARIOS. */
export const TIPOS_NOMINA: Record<string, string> = {
  D: 'CENTRAL',
  P: 'CENTRAL',
  H: 'HONORARIOS',
};

export const HORARIOS: Record<string, string> = {
  O: 'ORDINARIO',
  E: 'EXTRAORDINARIO',
  V: 'VIGILANTE',
};

/** Documentación (DOCUM_OK): S completa, N incompleta, T transmitido a nómina. */
export const DOCUM_TRANSMITIDO = 'T';

/** Máximo de percepciones por movimiento (CVES[7] / IMP[7]). */
export const MAX_PERCEPCIONES = 7;

/** El sistema original multiplica los importes del tabulador por 2 (quincenal -> mensual). */
export const FACTOR_TABULADOR = 2;

/** Claves que forman las "percepciones anteriores" en promociones y transferencias. */
export const CVES_PERCEPCIONES_ANTERIORES = [1, 5, 11, 12, 14, 17, 34];

/** Claves de nómina que se rescatan de PAG-DES para prellenar movimientos que no son alta. */
export const CVES_RESCATE = [1, 5, 11, 12, 14, 17, 31, 34];

export const CVE_SUELDO = 1; // nómina P
export const CVE_SUELDO_COMPACTADO = 5; // nómina D/H
export const CVE_COMPENSACION = 11;
export const CVE_GRATIFICACION = 12;

/** Quincenas por año. */
export const QUINCENAS = 24;

/** Folio "NNNNAA": 4 dígitos consecutivos + 2 dígitos del año. */
export const REGEX_FOLIO = /^\d{6}$/;
export const anioDeFolio = (folio: string) => folio.slice(4, 6);
export const primeros10 = (curp: string) =>
  (curp ?? '').trim().toUpperCase().slice(0, 10);
