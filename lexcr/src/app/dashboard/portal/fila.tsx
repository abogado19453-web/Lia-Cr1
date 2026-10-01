'use client';

import { useState } from 'react';
import { Copy, KeyRound, Trash2, XCircle } from 'lucide-react';
import { borrarCliente, generarAcceso, revocarAcceso } from './actions';

type Props = { id: string; nombre: string; cedula: string | null; contacto: string; expedientes: number; enlace: string | null };

export function FilaCliente({ id, nombre, cedula, contacto, expedientes, enlace }: Props) {
  const [copiado, setCopiado] = useState(false);
  return (
    <tr>
      <td className="pl-5"><div className="font-medium">{nombre}</div>{cedula && <div className="text-xs text-muted">{cedula}</div>}</td>
      <td className="text-sm text-muted">{contacto || '—'}</td>
      <td>{expedientes}</td>
      <td>
        {enlace ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}>
              <Copy size={13} /> {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <button className="btn-ghost" onClick={() => confirm('¿Revocar el acceso? El enlace actual dejará de funcionar.') && revocarAcceso(id)}><XCircle size={13} /> Revocar</button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => generarAcceso(id)}><KeyRound size={13} /> Generar enlace</button>
        )}
      </td>
      <td><button aria-label="Eliminar" onClick={() => confirm('¿Eliminar este cliente? Sus expedientes se conservan sin cliente asignado.') && borrarCliente(id)}><Trash2 size={14} /></button></td>
    </tr>
  );
}
