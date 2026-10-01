'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { subirDocumento } from './actions';

export function FormSubir({ expedientes }: { expedientes: { id: string; numero: string; titulo: string }[] }) {
  const [estado, accion, pendiente] = useActionState(subirDocumento, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok) ref.current?.reset(); }, [estado]);
  return (
    <form ref={ref} action={accion} className="card grid items-end gap-3 md:grid-cols-[1fr_260px_auto]">
      <label className="label">Archivo (PDF, DOCX, TXT u otro, máx. 20 MB)
        <input className="input file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1 file:text-white" type="file" name="archivo" required />
      </label>
      <label className="label">Expediente
        <select className="input" name="expedienteId">
          <option value="">Sin expediente</option>
          {expedientes.map((x) => <option key={x.id} value={x.id}>{x.numero} — {x.titulo}</option>)}
        </select>
      </label>
      <button className="btn" disabled={pendiente}><Upload size={15} /> {pendiente ? 'Subiendo…' : 'Subir'}</button>
      {estado.error && <p className="text-sm text-red-600 md:col-span-3">{estado.error}</p>}
    </form>
  );
}
