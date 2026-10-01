import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Evento = { id: string; titulo: string; fecha: Date; completada: boolean; expedienteId: string | null };

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const mesParam = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

/** Calendario mensual (lunes a domingo) de alertas. */
export function Calendario({ anio, mes, eventos, base }: { anio: number; mes: number; eventos: Evento[]; base: string }) {
  const primero = new Date(anio, mes, 1);
  const offset = (primero.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = Math.ceil((offset + diasMes) / 7) * 7;
  const porDia = new Map<string, Evento[]>();
  for (const e of eventos) porDia.set(clave(e.fecha), [...(porDia.get(clave(e.fecha)) ?? []), e]);
  const hoy = clave(new Date());
  const prev = mes === 0 ? mesParam(anio - 1, 11) : mesParam(anio, mes - 1);
  const next = mes === 11 ? mesParam(anio + 1, 0) : mesParam(anio, mes + 1);
  const titulo = primero.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <Link className="btn-ghost" href={`${base}&mes=${prev}`} aria-label="Mes anterior"><ChevronLeft size={16} /></Link>
        <h2 className="text-xl font-semibold capitalize">{titulo}</h2>
        <Link className="btn-ghost" href={`${base}&mes=${next}`} aria-label="Mes siguiente"><ChevronRight size={16} /></Link>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm">
        {DIAS.map((d) => <div key={d} className="bg-surface py-2 text-center text-xs font-semibold uppercase text-muted">{d}</div>)}
        {Array.from({ length: celdas }, (_, i) => {
          const dia = i - offset + 1;
          if (dia < 1 || dia > diasMes) return <div key={i} className="min-h-24 bg-bg" />;
          const k = clave(new Date(anio, mes, dia));
          const evs = porDia.get(k) ?? [];
          return (
            <div key={i} className={`min-h-24 bg-surface p-1.5 ${k === hoy ? 'ring-2 ring-inset ring-accent' : ''}`}>
              <div className={`mb-1 text-xs ${k === hoy ? 'font-bold text-accent' : 'text-muted'}`}>{dia}</div>
              {evs.map((e) => {
                const cls = `mb-1 block truncate rounded px-1.5 py-0.5 text-xs ${e.completada ? 'bg-bg text-muted line-through' : 'bg-accent/15 text-ink'}`;
                return e.expedienteId ? (
                  <Link key={e.id} href={`/dashboard/expedientes/${e.expedienteId}`} className={cls} title={e.titulo}>{e.titulo}</Link>
                ) : (
                  <span key={e.id} className={cls} title={e.titulo}>{e.titulo}</span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
