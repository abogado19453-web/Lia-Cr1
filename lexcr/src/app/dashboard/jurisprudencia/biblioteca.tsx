'use client';

import type { Resolucion } from '@prisma/client';
import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { MATERIAS } from '@/lib/config';
import { fmtFecha } from '@/lib/fechas';
import { borrarResolucion, guardarResolucion } from './actions';

const TRIBUNALES = ['Sala Primera', 'Sala Segunda', 'Sala Tercera', 'Sala Constitucional', 'Tribunal Registral Administrativo', 'Tribunal de Apelación Civil', 'Tribunal Contencioso Administrativo', 'Procuraduría General (dictamen)', 'Dirección Nacional de Notariado'];

export function Biblioteca({ resoluciones, q }: { resoluciones: Resolucion[]; q: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <>
      <h1 className="text-3xl font-semibold">Biblioteca de jurisprudencia</h1>
      <p className="mb-6 text-muted">Votos y criterios que el despacho utiliza con frecuencia.</p>

      <details className="card mb-6">
        <summary className="cursor-pointer font-semibold">Agregar resolución</summary>
        <form ref={form} action={async (fd) => { await guardarResolucion(fd); form.current?.reset(); }} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="label">Número de voto/resolución<input className="input" name="numero" required placeholder="2023-000123" /></label>
          <label className="label">Tribunal
            <input className="input" name="tribunal" list="tribunales" required />
            <datalist id="tribunales">{TRIBUNALES.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label className="label">Fecha<input className="input" type="date" name="fecha" /></label>
          <label className="label">Materia<select className="input" name="materia"><option value="">—</option>{MATERIAS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="label md:col-span-2">Tema<input className="input" name="tema" required /></label>
          <label className="label md:col-span-3">Extracto o tesis<textarea className="input min-h-24" name="extracto" required /></label>
          <label className="label md:col-span-2">Enlace (Nexus PJ / SCIJ)<input className="input" type="url" name="enlace" /></label>
          <div className="flex items-end"><button className="btn">Guardar</button></div>
        </form>
      </details>

      <form className="mb-4"><input type="hidden" name="tab" value="biblioteca" /><input className="input" name="q" defaultValue={q} placeholder="Buscar por tema, número, tribunal o texto…" /></form>

      <div className="space-y-3">
        {resoluciones.map((r) => (
          <article key={r.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{r.tribunal} · Voto {r.numero}</h3>
                <p className="text-sm text-muted">{fmtFecha(r.fecha)}{r.materia ? ` · ${r.materia}` : ''} · {r.tema}</p>
              </div>
              <button className="btn-ghost" onClick={() => confirm('¿Eliminar esta resolución?') && borrarResolucion(r.id)} aria-label="Eliminar"><Trash2 size={14} /></button>
            </div>
            <p className="prose-legal mt-3">{r.extracto}</p>
            {r.enlace && <a className="mt-2 inline-block text-sm text-accent underline" href={r.enlace} target="_blank" rel="noopener noreferrer">Ver texto completo ↗</a>}
          </article>
        ))}
        {!resoluciones.length && <p className="card text-center text-muted">Sin resoluciones{q ? ' que coincidan' : ''}.</p>}
      </div>
    </>
  );
}
