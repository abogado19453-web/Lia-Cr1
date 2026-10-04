'use client';

import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import type { ProveedorDisponible } from '@/lib/ia-catalogo';

const CLAVE = 'lexcr-proveedor-ia';

/** Proveedor elegido por el usuario (recordado en este navegador). */
export function useProveedorIA(proveedores: ProveedorDisponible[]) {
  const porDefecto = proveedores.find((p) => p.predeterminado)?.id ?? proveedores[0]?.id ?? '';
  const [id, setId] = useState(porDefecto);
  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g && proveedores.some((p) => p.id === g)) setId(g);
    } catch {}
  }, [proveedores]);
  const elegir = (v: string) => {
    setId(v);
    try {
      localStorage.setItem(CLAVE, v);
    } catch {}
  };
  return [id, elegir] as const;
}

export function SelectorIA({ proveedores, valor, onChange }: { proveedores: ProveedorDisponible[]; valor: string; onChange: (v: string) => void }) {
  if (!proveedores.length) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        No tiene autorizado ningún proveedor de inteligencia artificial. Solicítelo al administrador del despacho.
      </p>
    );
  }
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <Cpu size={15} />
      <span className="shrink-0">IA:</span>
      {proveedores.length === 1 ? (
        <span className="text-ink">{proveedores[0].nombre} <span className="text-muted">· {proveedores[0].modelo}</span></span>
      ) : (
        <select className="input w-auto py-1" value={valor} onChange={(e) => onChange(e.target.value)} aria-label="Proveedor de inteligencia artificial">
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.modelo}</option>)}
        </select>
      )}
    </label>
  );
}
