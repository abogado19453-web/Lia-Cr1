'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const SUGERENCIAS = [
  'Redactar un recurso de apelación',
  'Buscar jurisprudencia sobre responsabilidad civil extracontractual',
  'Analizar un contrato de arrendamiento',
  'Requisitos para inscribir un traspaso de finca con hipoteca',
];

export function ConsultaRapida() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const enviar = (texto: string) => router.push(`/dashboard/asistente?q=${encodeURIComponent(texto)}`);
  return (
    <section className="card mt-8">
      <h2 className="mb-3 font-sans text-base font-semibold">Consulta directa</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) enviar(q.trim());
        }}
        className="relative"
      >
        <textarea
          className="input min-h-28 pr-28"
          placeholder="Ejemplo: Busque jurisprudencia sobre despido sin responsabilidad patronal…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && q.trim()) enviar(q.trim());
          }}
        />
        <button className="btn absolute bottom-3 right-3" disabled={!q.trim()}>Enviar <ChevronRight size={15} /></button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button key={s} onClick={() => setQ(s)} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink">{s}</button>
        ))}
      </div>
    </section>
  );
}
