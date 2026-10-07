'use client';

import { useState, useTransition } from 'react';
import { Save, Sparkles, Square, Trash2 } from 'lucide-react';
import { useIAStream } from '@/components/useIAStream';
import { SelectorIA, useProveedorIA } from '@/components/SelectorIA';
import type { ProveedorDisponible } from '@/lib/ia-catalogo';
import { actualizarContenido, alternarPortal, borrarDocumento } from '../actions';

type Props = { id: string; generado: boolean; contenido: string; analisis: string; visiblePortal: boolean; tieneTexto: boolean; proveedores: ProveedorDisponible[] };

export function DetalleDocumento({ id, generado, contenido, analisis, visiblePortal, tieneTexto, proveedores }: Props) {
  const [proveedorId, setProveedorId] = useProveedorIA(proveedores);
  const ia = useIAStream();
  const [texto, setTexto] = useState(contenido);
  const [enfoque, setEnfoque] = useState('');
  const [portal, setPortal] = useState(visiblePortal);
  const [pend, start] = useTransition();
  const resultado = ia.cargando || ia.texto ? ia.texto : analisis;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card flex min-h-[60vh] flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{generado ? 'Contenido (editable)' : 'Texto extraído'}</h2>
          {generado && (
            <button className="btn-ghost" disabled={pend || texto === contenido} onClick={() => start(() => actualizarContenido(id, texto))}>
              <Save size={14} /> {pend ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
        </div>
        {tieneTexto || generado ? (
          <textarea className="input prose-legal flex-1 resize-none" value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={!generado} />
        ) : (
          <p className="text-muted">No se pudo extraer texto de este archivo. Para analizarlo, súbalo como PDF con texto seleccionable, DOCX o TXT.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={portal} onChange={(e) => { setPortal(e.target.checked); start(() => alternarPortal(id, e.target.checked)); }} />
            Visible en el Portal Cliente
          </label>
          <button className="btn-danger" onClick={() => confirm('¿Eliminar este documento de forma permanente?') && start(() => borrarDocumento(id))}><Trash2 size={14} /> Eliminar</button>
        </div>
      </section>

      <section className="card flex flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Análisis con IA</h2>
          <SelectorIA proveedores={proveedores} valor={proveedorId} onChange={setProveedorId} />
        </div>
        <div className="mb-3 flex gap-2">
          <input className="input" placeholder="Enfoque opcional (ej.: riesgos para el comprador)" value={enfoque} onChange={(e) => setEnfoque(e.target.value)} />
          {ia.cargando ? (
            <button className="btn shrink-0" onClick={ia.detener}><Square size={14} /> Detener</button>
          ) : (
            <button className="btn shrink-0" disabled={!tieneTexto} onClick={() => ia.ejecutar('/api/ia/analizar', { documentoId: id, enfoque: enfoque || undefined, proveedorId: proveedorId || undefined })}>
              <Sparkles size={14} /> {analisis ? 'Volver a analizar' : 'Analizar'}
            </button>
          )}
        </div>
        {ia.error && <p className="mb-2 text-sm text-red-600">{ia.error}</p>}
        <div className="prose-legal flex-1 overflow-y-auto rounded-lg border border-line bg-bg p-4">
          {resultado || <span className="text-muted">{ia.cargando ? 'Analizando…' : 'Sin análisis todavía.'}</span>}
        </div>
      </section>
    </div>
  );
}
