'use client';

import { useCallback, useRef, useState } from 'react';

export type Fuente = { url: string; titulo: string | null };

/** Consume un endpoint NDJSON de IA y expone el texto acumulado. */
export function useIAStream() {
  const [texto, setTexto] = useState('');
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ejecutar = useCallback(async (url: string, body: unknown, onHeaders?: (h: Headers) => void) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setTexto('');
    setFuentes([]);
    setError(null);
    setCargando(true);
    let acumulado = '';
    let fts: Fuente[] = [];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      onHeaders?.(res.headers);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const linea = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!linea) continue;
          const ev = JSON.parse(linea);
          if (ev.t === 'text') {
            acumulado += ev.v;
            setTexto(acumulado);
          } else if (ev.t === 'sources') {
            fts = ev.v;
            setFuentes(ev.v);
          }
          else if (ev.t === 'error') setError(ev.v);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setCargando(false);
    }
    return { texto: acumulado, fuentes: fts };
  }, []);

  const detener = useCallback(() => abortRef.current?.abort(), []);

  return { texto, fuentes, error, cargando, ejecutar, detener, setTexto };
}
