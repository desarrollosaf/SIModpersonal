const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Q1 — 1-15 Ene, Q2 — 16-fin Ene ... Q24 — 16-fin Dic. */
export const QUINCENAS = MESES.flatMap((mes, i) => [
  { numero: i * 2 + 1, etiqueta: `Q${i * 2 + 1} — 1-15 ${mes}` },
  { numero: i * 2 + 2, etiqueta: `Q${i * 2 + 2} — 16-fin ${mes}` },
]);

export function quincenaActual(hoy = new Date()): number {
  return hoy.getMonth() * 2 + (hoy.getDate() <= 15 ? 1 : 2);
}

export function fechaLocalISO(hoy = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`;
}
