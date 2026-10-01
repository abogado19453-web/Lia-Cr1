'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { actualizarEstadoRegistral, borrarEscritura, registrarEscritura } from './actions';

const ESTADOS: Record<string, string> = {
  no_aplica: 'No aplica',
  pendiente: 'Pendiente de presentar',
  presentado: 'Presentado',
  inscrito: 'Inscrito',
  defectuoso: 'Defectuoso',
};
const COLOR: Record<string, string> = { pendiente: 'text-amber-600', presentado: 'text-sky-700', inscrito: 'text-emerald-700', defectuoso: 'text-red-600 font-semibold' };

type Esc = {
  id: string; numero: number; tomo: number; folioInicio: string; folioFin: string | null; fecha: string;
  acto: string; otorgantes: string; valor: string | null; estadoRegistral: string; presentacion: string | null; notas: string | null;
};

type Props = {
  escrituras: Esc[];
  tomos: number[];
  tomoActual?: number;
  siguiente: { tomo: number; numero: number };
  q: string;
  rangoIndice: { desde: string; hasta: string };
};

export function Protocolo({ escrituras, tomos, tomoActual, siguiente, q, rangoIndice }: Props) {
  const [estado, accion, pendiente] = useActionState(registrarEscritura, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok) ref.current?.reset(); }, [estado]);

  return (
    <>
      <details className="card mb-6" open={!escrituras.length}>
        <summary className="cursor-pointer font-semibold">Registrar escritura</summary>
        <form ref={ref} action={accion} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="label">Tomo<input className="input" type="number" name="tomo" min={1} required defaultValue={siguiente.tomo} key={`t${siguiente.tomo}`} /></label>
          <label className="label">Escritura N.°<input className="input" type="number" name="numero" min={1} required defaultValue={siguiente.numero} key={`n${siguiente.numero}`} /></label>
          <label className="label">Folio inicial<input className="input" name="folioInicio" required placeholder="15 frente" /></label>
          <label className="label">Folio final<input className="input" name="folioFin" placeholder="16 vuelto" /></label>
          <label className="label">Fecha de otorgamiento<input className="input" type="date" name="fecha" required /></label>
          <label className="label md:col-span-2">Acto o contrato<input className="input" name="acto" required placeholder="Compraventa de finca del partido de San José" /></label>
          <label className="label">Valor / cuantía<input className="input" name="valor" placeholder="₡25 000 000" /></label>
          <label className="label md:col-span-2">Otorgantes<input className="input" name="otorgantes" required placeholder="Nombre y cédula de cada otorgante" /></label>
          <label className="label">Estado registral
            <select className="input" name="estadoRegistral" defaultValue="pendiente">{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="label">Citas de presentación<input className="input" name="presentacion" placeholder="Tomo/asiento del Diario" /></label>
          <label className="label md:col-span-3">Notas<input className="input" name="notas" /></label>
          <div className="flex items-end"><button className="btn w-full" disabled={pendiente}>{pendiente ? 'Registrando…' : 'Registrar'}</button></div>
          {estado.error && <p className="text-sm text-red-600 md:col-span-4">{estado.error}</p>}
        </form>
      </details>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap gap-2">
          <select className="input w-36" name="tomo" defaultValue={tomoActual ?? ''}>
            {tomos.map((t) => <option key={t} value={t}>Tomo {t}</option>)}
            {!tomos.length && <option value="">Sin tomos</option>}
          </select>
          <input className="input w-64" name="q" defaultValue={q} placeholder="Buscar acto u otorgante…" />
          <button className="btn-ghost">Filtrar</button>
        </form>
        <form action="/api/protocolo/indice" className="flex flex-wrap items-end gap-2">
          <label className="label">Índice desde<input className="input" type="date" name="desde" defaultValue={rangoIndice.desde} /></label>
          <label className="label">hasta<input className="input" type="date" name="hasta" defaultValue={rangoIndice.hasta} /></label>
          <button className="btn-ghost"><Download size={14} /> Índice (CSV)</button>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="whitespace-nowrap pl-5">N.°</th><th>Tomo / folios</th><th>Fecha</th><th>Acto</th><th>Otorgantes</th><th>Estado registral</th><th /></tr></thead>
          <tbody>
            {escrituras.map((e) => (
              <tr key={e.id}>
                <td className="pl-5 font-mono">{e.numero}</td>
                <td className="whitespace-nowrap">T. {e.tomo} · F. {e.folioInicio}{e.folioFin ? ` – ${e.folioFin}` : ''}</td>
                <td className="whitespace-nowrap">{new Date(e.fecha).toLocaleDateString('es-CR')}</td>
                <td>{e.acto}{e.valor && <div className="text-xs text-muted">{e.valor}</div>}</td>
                <td className="text-sm">{e.otorgantes}</td>
                <td>
                  <select
                    className={`rounded border border-line bg-transparent px-1 py-0.5 text-sm ${COLOR[e.estadoRegistral] ?? ''}`}
                    defaultValue={e.estadoRegistral}
                    onChange={(ev) => {
                      const pres = ev.target.value === 'presentado' ? prompt('Citas de presentación (tomo/asiento):', e.presentacion ?? '') ?? '' : e.presentacion ?? '';
                      actualizarEstadoRegistral(e.id, ev.target.value, pres);
                    }}
                  >
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {e.presentacion && <div className="text-xs text-muted">{e.presentacion}</div>}
                </td>
                <td><button aria-label="Eliminar" onClick={() => confirm(`¿Eliminar la escritura ${e.numero} del control?`) && borrarEscritura(e.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!escrituras.length && <tr><td colSpan={7} className="py-10 text-center text-muted">Sin escrituras registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
