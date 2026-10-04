'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Plus, Send, Square, Trash2 } from 'lucide-react';
import { borrarConversacion } from '@/app/dashboard/actions-conversacion';
import type { ProveedorDisponible } from '@/lib/ia-catalogo';
import { Fuentes } from './Fuentes';
import { SelectorIA, useProveedorIA } from './SelectorIA';
import { useIAStream, type Fuente } from './useIAStream';

type Msg = { rol: string; contenido: string; fuentes: Fuente[]; proveedor?: string | null };

type Props = {
  modo: 'consulta' | 'jurisprudencia';
  titulo: string;
  descripcion: string;
  base: string;
  conversaciones: { id: string; titulo: string }[];
  actualId?: string;
  inicial: Msg[];
  pregunta?: string;
  placeholder?: string;
  proveedores: ProveedorDisponible[];
};

export function Chat({ modo, titulo, descripcion, base, conversaciones, actualId, inicial, pregunta, placeholder, proveedores }: Props) {
  const [proveedorId, setProveedorId] = useProveedorIA(proveedores);
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Msg[]>(inicial);
  const [entrada, setEntrada] = useState('');
  const [convId, setConvId] = useState(actualId);
  const [, startTransition] = useTransition();
  const ia = useIAStream();
  const finRef = useRef<HTMLDivElement>(null);
  const lanzado = useRef(false);

  useEffect(() => {
    setMensajes(inicial);
    setConvId(actualId);
  }, [actualId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), [mensajes, ia.texto]);

  async function enviar(texto: string) {
    if (!texto.trim() || ia.cargando) return;
    setEntrada('');
    setMensajes((m) => [...m, { rol: 'user', contenido: texto, fuentes: [] }]);
    let nuevoId: string | undefined;
    const r = await ia.ejecutar('/api/ia/chat', { conversacionId: convId, mensaje: texto, modo, proveedorId: proveedorId || undefined }, (h) => {
      nuevoId = h.get('X-Conversacion-Id') ?? undefined;
    });
    if (r.texto) setMensajes((m) => [...m, { rol: 'assistant', contenido: r.texto, fuentes: r.fuentes, proveedor: proveedores.find((x) => x.id === proveedorId)?.nombre }]);
    if (nuevoId && nuevoId !== convId) {
      setConvId(nuevoId);
      startTransition(() => router.replace(`${base}?c=${nuevoId}`, { scroll: false }));
    }
    router.refresh();
  }

  useEffect(() => {
    if (pregunta && !lanzado.current) {
      lanzado.current = true;
      enviar(pregunta);
    }
  }, [pregunta]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="order-2 lg:order-1">
        <Link href={base} className="btn-ghost mb-3 w-full"><Plus size={15} /> Nueva conversación</Link>
        <ul className="space-y-1 text-sm">
          {conversaciones.map((c) => (
            <li key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${c.id === convId ? 'bg-surface ring-1 ring-line' : 'hover:bg-surface'}`}>
              <Link href={`${base}?c=${c.id}`} className="min-w-0 flex-1 truncate">{c.titulo}</Link>
              <button
                aria-label="Eliminar conversación"
                className="opacity-0 group-hover:opacity-100"
                onClick={async () => {
                  if (!confirm('¿Eliminar esta conversación?')) return;
                  await borrarConversacion(c.id);
                  if (c.id === convId) router.push(base);
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {!conversaciones.length && <li className="px-2 text-muted">Sin conversaciones.</li>}
        </ul>
      </aside>

      <section className="order-1 flex min-h-[70vh] flex-col lg:order-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{titulo}</h1>
            <p className="text-muted">{descripcion}</p>
          </div>
          <SelectorIA proveedores={proveedores} valor={proveedorId} onChange={setProveedorId} />
        </div>
        <div className="card flex-1 space-y-4 overflow-y-auto">
          {!mensajes.length && !ia.cargando && <p className="py-10 text-center text-muted">Escriba su consulta para comenzar.</p>}
          {mensajes.map((m, i) => (
            <div key={i} className={m.rol === 'user' ? 'ml-auto max-w-[85%] rounded-xl bg-accent/10 px-4 py-3' : 'max-w-full'}>
              <div className={m.rol === 'user' ? 'whitespace-pre-wrap' : 'prose-legal'}>{m.contenido}</div>
              <Fuentes fuentes={m.fuentes} />
              {m.rol !== 'user' && m.proveedor && <div className="mt-1 text-xs text-muted">Respondió: {m.proveedor}</div>}
            </div>
          ))}
          {ia.cargando && (
            <div>
              <div className="prose-legal">{ia.texto || <span className="animate-pulse text-muted">{modo === 'jurisprudencia' ? 'Buscando en fuentes oficiales…' : 'Analizando…'}</span>}</div>
            </div>
          )}
          {ia.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{ia.error}</p>}
          <div ref={finRef} />
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(entrada);
          }}
        >
          <textarea
            className="input min-h-[52px] flex-1 resize-y"
            rows={2}
            placeholder={placeholder ?? 'Escriba su consulta… (Ctrl+Enter para enviar)'}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(entrada);
            }}
          />
          {ia.cargando ? (
            <button type="button" className="btn" onClick={ia.detener}><Square size={15} /> Detener</button>
          ) : (
            <button className="btn" disabled={!entrada.trim()}><Send size={15} /> Enviar</button>
          )}
        </form>
      </section>
    </div>
  );
}
