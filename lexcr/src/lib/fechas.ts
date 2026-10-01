const MS_DIA = 86_400_000;

/** Días naturales desde hoy (hora local) hasta la fecha indicada. Negativo si ya venció. */
export function diasHasta(fecha: Date, hoy: Date = new Date()): number {
  const a = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((b - a) / MS_DIA);
}

export function fmtFecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Convierte 'AAAA-MM-DD' de un input date en Date a mediodía local (evita saltos de zona horaria). */
export function parseFechaInput(v: FormDataEntryValue | null): Date | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function toInputDate(d: Date | null | undefined): string {
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
