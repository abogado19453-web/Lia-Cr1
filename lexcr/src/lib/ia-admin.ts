import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { TIPOS_IA, type TipoIA } from './ia-catalogo';

const PRIVADA = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?|.*\.local$)/i;

/** Dirección final del proveedor; valida formato y, si así se configuró, bloquea redes privadas. */
export function baseUrlValida(tipo: TipoIA, valor: string | null | undefined): { url: string } | { error: string } {
  const cat = TIPOS_IA[tipo];
  const url = (cat.baseEditable ? (valor || '').trim() : cat.baseUrl).replace(/\/+$/, '') || cat.baseUrl;
  if (!url) return { error: 'Indique la dirección (URL base) del servicio.' };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { error: 'La dirección no es una URL válida (ej.: http://localhost:11434/v1).' };
  }
  if (!/^https?:$/.test(u.protocol)) return { error: 'La dirección debe empezar con http:// o https://.' };
  if (process.env.LEXCR_BLOQUEAR_IA_LOCAL === 'true' && PRIVADA.test(u.hostname)) {
    return { error: 'Este servidor no permite conectar IA en redes locales (LEXCR_BLOQUEAR_IA_LOCAL).' };
  }
  return { url };
}

/** Lista los modelos que ofrece el proveedor. */
export async function listarModelos(tipo: TipoIA, baseUrl: string, apiKey: string): Promise<string[]> {
  if (tipo === 'anthropic') {
    const c = new Anthropic({ apiKey, authToken: null, baseURL: baseUrl, maxRetries: 0, timeout: 20_000 });
    const ids: string[] = [];
    for await (const m of c.models.list({ limit: 100 })) ids.push(m.id);
    return ids;
  }
  const r = await fetch(baseUrl + '/models', {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  const j = (await r.json()) as { data?: { id: string }[]; models?: { name?: string; id?: string }[] };
  const lista = j.data?.map((m) => m.id) ?? j.models?.map((m) => m.id ?? m.name ?? '') ?? [];
  return lista.filter(Boolean).map((id) => id.replace(/^models\//, '')).sort();
}

/** Envía una consulta mínima para comprobar clave, saldo y modelo. */
export async function probarProveedor(tipo: TipoIA, baseUrl: string, apiKey: string, modelo: string): Promise<{ ok: boolean; mensaje: string }> {
  const inicio = Date.now();
  try {
    let texto = '';
    if (tipo === 'anthropic') {
      const c = new Anthropic({ apiKey, authToken: null, baseURL: baseUrl, maxRetries: 0, timeout: 60_000 });
      const r = await c.messages.create({
        model: modelo,
        max_tokens: 512,
        messages: [{ role: 'user', content: 'Responda solo con la palabra: listo' }],
      });
      texto = r.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
    } else {
      const r = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: 'Responda solo con la palabra: listo' }] }),
        signal: AbortSignal.timeout(120_000),
      });
      const cuerpo = await r.text();
      if (!r.ok) {
        let msg = cuerpo.slice(0, 300);
        try {
          const j = JSON.parse(cuerpo);
          msg = j?.error?.message || j?.message || msg;
        } catch {}
        return { ok: false, mensaje: `HTTP ${r.status}: ${msg}` };
      }
      texto = JSON.parse(cuerpo)?.choices?.[0]?.message?.content?.trim() ?? '';
    }
    return { ok: true, mensaje: `Respondió «${texto.slice(0, 40) || '(vacío)'}» en ${((Date.now() - inicio) / 1000).toFixed(1)} s.` };
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      const det = (e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message.replace(/^\d+\s+/, '');
      if (/credit balance/i.test(det)) return { ok: false, mensaje: 'La cuenta no tiene saldo (compre créditos en console.anthropic.com → Billing).' };
      if (e.status === 401) return { ok: false, mensaje: 'HTTP 401: la clave no es válida o fue revocada.' };
      if (e.status === 404) return { ok: false, mensaje: `HTTP 404: el modelo «${modelo}» no está disponible para esta cuenta. Use «Detectar modelos».` };
      return { ok: false, mensaje: `HTTP ${e.status ?? '—'}: ${det.slice(0, 300)}` };
    }
    const msg = (e as Error).message;
    return { ok: false, mensaje: /fetch failed|ECONNREFUSED|timeout/i.test(msg) ? `Sin conexión con ${baseUrl}. ¿Está encendido el servicio?` : msg };
  }
}
