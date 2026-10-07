import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { marca } from './config';
import type { ProveedorResuelto } from './ia-proveedores';

/** Error de un proveedor compatible con OpenAI (o IA local), con su estado HTTP. */
export class ErrorProveedor extends Error {
  constructor(
    message: string,
    public status: number | null,
    public proveedor: string,
    public detalle = '',
  ) {
    super(message);
  }
}

const clientes = new Map<string, Anthropic>();
function clienteAnthropic(p: ProveedorResuelto) {
  const k = p.baseUrl + '|' + p.apiKey;
  let c = clientes.get(k);
  if (!c) {
    // Dirección explícita: una variable ANTHROPIC_BASE_URL del sistema no debe desviar las consultas.
    c = new Anthropic({ apiKey: p.apiKey, authToken: null, baseURL: p.baseUrl });
    clientes.set(k, c);
  }
  return c;
}

/** Dominios oficiales costarricenses permitidos para la búsqueda de jurisprudencia y normativa. */
export const DOMINIOS_OFICIALES = [
  'poder-judicial.go.cr',
  'pgrweb.go.cr',
  'pgr.go.cr',
  'tra.go.cr',
  'dnn.go.cr',
  'registronacional.go.cr',
  'asamblea.go.cr',
];

const BASE = `Usted es el asistente jurídico de ${marca.nombre}, al servicio de abogados y notarios en ejercicio en Costa Rica.
Responda en español con el léxico del foro jurídico costarricense (por ejemplo: "finca inscrita en el partido de", "cédula jurídica", "afecciones y gravámenes", "timbres de ley", "fe cartular").
El usuario es el profesional responsable: vaya directo al análisis, sin advertencias genéricas ni recomendaciones de consultar a un abogado.
Fundamente con la normativa costarricense aplicable (Código Civil, Código de Comercio, Código Notarial, Código de Trabajo, Código Procesal Civil, LGAP, Ley General de Arrendamientos Urbanos y Suburbanos, directrices de la DNN, normativa del Registro Nacional) y con jurisprudencia de las Salas de la Corte Suprema de Justicia o del Tribunal Registral Administrativo cuando sea pertinente.
Cite artículos con su número. Si no tiene certeza del texto literal de una norma o del número de un voto, dígalo expresamente e indique dónde verificarlo (SCIJ, Nexus PJ); nunca invente números de resolución, fechas ni citas textuales.`;

export const PROMPTS = {
  consulta: BASE,
  jurisprudenciaSinBusqueda: `${BASE}
Responda sobre jurisprudencia y criterios relevantes con base en su conocimiento. No dispone de búsqueda en fuentes oficiales: no invente números de voto ni fechas; cuando mencione una resolución, indique que debe verificarse en Nexus PJ o SCIJ.`,
  jurisprudencia: `${BASE}
Su tarea es localizar jurisprudencia y criterios oficiales con la herramienta de búsqueda web, limitada a fuentes oficiales costarricenses.
Para cada resolución relevante indique: tribunal, número de voto o resolución, fecha, tesis o criterio y su aplicación al caso. Cite únicamente lo que encontró en las fuentes; si la búsqueda no arroja resultados suficientes, dígalo.`,
  redactor: `${BASE}
Usted redacta documentos jurídicos listos para revisión del profesional. Reglas de formato obligatorias:
1. ESCRITURA PÚBLICA o TESTIMONIO: formato tradicional de protocolo notarial costarricense. Texto continuo y corrido, sin saltos de línea ni viñetas entre cláusulas. Todas las cantidades, fechas, cédulas, porcentajes y números en LETRAS (prohibido usar dígitos en el cuerpo). Apertura notarial formal ("NÚMERO ...: ANTE MÍ, ..., Notario Público con oficina abierta en ..., COMPARECEN: ..."). Cierre con lectura, aprobación y firma. No numere las líneas: la plataforma las numera al exportar.
2. CONTRATO PRIVADO, ESCRITO PROCESAL u OTROS: estructura moderna con títulos, cláusulas numeradas y combinación de letras y números para las cantidades.
3. Use corchetes como marcadores para todo dato que no se haya suministrado, por ejemplo: [Insertar Nombre Completo], [Insertar Cédula Identidad/Jurídica], [Insertar Citas de Inscripción: Tomo/Folio/Asiento o Matrícula].
Entregue solo el documento, sin comentarios previos ni posteriores.`,
  analisis: `${BASE}
Analice el documento suministrado y entregue, con títulos en negrita:
1. Naturaleza y partes del documento.
2. Requisitos formales (para escrituras: Código Notarial y lineamientos de la DNN; para contratos: elementos esenciales y de validez del Código Civil).
3. Riesgos, omisiones y cláusulas problemáticas, con su fundamento normativo.
4. Puntos clave (plazos, montos, obligaciones, garantías).
5. Recomendaciones concretas de corrección o redacción alternativa.`,
} as const;

export type Modo = keyof typeof PROMPTS;

export type Fuente = { url: string; titulo: string | null };

export type EventoStream =
  | { t: 'text'; v: string }
  | { t: 'sources'; v: Fuente[] }
  | { t: 'error'; v: string }
  | { t: 'done' };

export type MensajeIA = { role: 'user' | 'assistant'; content: string };

type OpcionesIA = { effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'; maxTokens?: number };

/** Ejecuta una solicitud en streaming con el proveedor indicado y emite eventos NDJSON. */
export async function* generar(
  modo: Modo,
  mensajes: MensajeIA[],
  proveedor: ProveedorResuelto,
  opciones: OpcionesIA = {},
): AsyncGenerator<EventoStream, string> {
  if (proveedor.tipo === 'anthropic') return yield* generarAnthropic(modo, mensajes, proveedor, opciones);
  let texto = '';
  let modoReal: Modo = modo;
  if (modo === 'jurisprudencia') {
    modoReal = 'jurisprudenciaSinBusqueda';
    const aviso = `[${proveedor.nombre} no tiene búsqueda en fuentes oficiales: esta respuesta proviene del conocimiento del modelo y debe verificarse en Nexus PJ o SCIJ.]\n\n`;
    texto += aviso;
    yield { t: 'text', v: aviso };
  }
  texto += yield* generarCompatible(modoReal, mensajes, proveedor);
  return texto;
}

/** Proveedores con API compatible con OpenAI (OpenAI, Gemini, OpenRouter, Ollama, LM Studio…). */
async function* generarCompatible(modo: Modo, mensajes: MensajeIA[], p: ProveedorResuelto): AsyncGenerator<EventoStream, string> {
  let res: Response;
  try {
    res = await fetch(p.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(p.apiKey ? { Authorization: `Bearer ${p.apiKey}` } : {}) },
      body: JSON.stringify({ model: p.modelo, stream: true, messages: [{ role: 'system', content: PROMPTS[modo] }, ...mensajes] }),
    });
  } catch (e) {
    throw new ErrorProveedor('sin conexión', null, p.nombre, `${p.baseUrl} · ${(e as Error).message}`);
  }
  if (!res.ok || !res.body) {
    const cuerpo = await res.text().catch(() => '');
    let msg = cuerpo.slice(0, 400);
    try {
      const j = JSON.parse(cuerpo);
      msg = j?.error?.message || j?.message || msg;
    } catch {}
    throw new ErrorProveedor(msg || `HTTP ${res.status}`, res.status, p.nombre);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let texto = '';
  let fin: string | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const linea = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!linea.startsWith('data:')) continue;
      const dato = linea.slice(5).trim();
      if (dato === '[DONE]') continue;
      try {
        const j = JSON.parse(dato);
        if (j.error) throw new ErrorProveedor(j.error.message || 'error', null, p.nombre);
        const delta = j.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          texto += delta;
          yield { t: 'text', v: delta };
        }
        fin = j.choices?.[0]?.finish_reason ?? fin;
      } catch (e) {
        if (e instanceof ErrorProveedor) throw e;
      }
    }
  }
  if (fin === 'length') {
    const aviso = '\n\n[Respuesta truncada por longitud. Solicite la continuación.]';
    texto += aviso;
    yield { t: 'text', v: aviso };
  }
  return texto;
}

/** Claude: streaming, búsqueda web para jurisprudencia y reanudación de `pause_turn`. */
async function* generarAnthropic(
  modo: Modo,
  mensajes: MensajeIA[],
  proveedor: ProveedorResuelto,
  opciones: OpcionesIA,
): AsyncGenerator<EventoStream, string> {
  const client = clienteAnthropic(proveedor);
  const historial: Anthropic.Beta.BetaMessageParam[] = mensajes.map((m) => ({ role: m.role, content: m.content }));
  const fuentes = new Map<string, Fuente>();
  let texto = '';

  const tools: Anthropic.Beta.BetaToolUnion[] =
    modo === 'jurisprudencia'
      ? [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8, allowed_domains: DOMINIOS_OFICIALES }]
      : [];

  // El respaldo del servidor ante rechazos es una función beta; si la cuenta no la admite
  // (error 400 antes de recibir texto), se repite la solicitud sin ella.
  let conRespaldo = true;
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const stream = client.beta.messages.stream({
      model: proveedor.modelo,
      max_tokens: opciones.maxTokens ?? 32000,
      ...(conRespaldo ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      output_config: { effort: opciones.effort ?? 'high' },
      system: [{ type: 'text', text: PROMPTS[modo], cache_control: { type: 'ephemeral' } }],
      messages: historial,
      ...(tools.length ? { tools } : {}),
    });

    let recibido = false;
    try {
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          recibido = true;
          texto += ev.delta.text;
          yield { t: 'text', v: ev.delta.text };
        }
      }
    } catch (e) {
      if (conRespaldo && !recibido && e instanceof Anthropic.BadRequestError) {
        conRespaldo = false;
        continue;
      }
      throw e;
    }
    const final = await stream.finalMessage();

    for (const block of final.content) {
      if (block.type === 'text' && block.citations) {
        for (const c of block.citations) {
          if (c.type === 'web_search_result_location' && !fuentes.has(c.url)) {
            fuentes.set(c.url, { url: c.url, titulo: c.title });
          }
        }
      }
    }

    if (final.stop_reason === 'pause_turn') {
      historial.push({ role: 'assistant', content: final.content });
      continue;
    }
    if (final.stop_reason === 'refusal') {
      const aviso = '\n\n[La solicitud no pudo completarse por las políticas de uso del modelo.]';
      texto += aviso;
      yield { t: 'text', v: aviso };
    }
    if (final.stop_reason === 'max_tokens') {
      const aviso = '\n\n[Respuesta truncada por longitud. Solicite la continuación.]';
      texto += aviso;
      yield { t: 'text', v: aviso };
    }
    break;
  }

  if (fuentes.size) yield { t: 'sources', v: [...fuentes.values()] };
  return texto;
}

/** Convierte errores del SDK en un mensaje legible. */
export function mensajeError(e: unknown): string {
  if (e instanceof ErrorProveedor) {
    if (e.status === null && e.message === 'sin conexión') {
      return `No hay conexión con «${e.proveedor}» (${e.detalle}). Si es una IA local, verifique que Ollama o LM Studio esté abierto.`;
    }
    if (e.status === 401 || e.status === 403) return `La clave de «${e.proveedor}» no es válida o no tiene permiso.`;
    if (e.status === 402 || /quota|credit|billing|balance/i.test(e.message)) return `La cuenta de «${e.proveedor}» no tiene saldo o cuota disponible.`;
    if (e.status === 404) return `«${e.proveedor}» no encontró el modelo o la dirección indicada: ${e.message}`;
    if (e.status === 429) return `«${e.proveedor}» alcanzó su límite de uso. Intente de nuevo en unos minutos.`;
    return `Error de «${e.proveedor}»${e.status ? ` (${e.status})` : ''}: ${e.message}`;
  }
  if (e instanceof Anthropic.AuthenticationError) return 'La clave de API de Anthropic no es válida.';
  if (e instanceof Anthropic.RateLimitError) return 'Límite de uso alcanzado. Intente de nuevo en unos minutos.';
  if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
    return 'La cuenta de Anthropic no tiene saldo. Compre créditos en console.anthropic.com → Settings → Billing; la misma clave funcionará en uno o dos minutos.';
  }
  if (e instanceof Anthropic.BadRequestError) return 'Solicitud rechazada por el servicio de IA: ' + e.message;
  if (e instanceof Anthropic.APIConnectionError) return 'No hay conexión con el servicio de IA.';
  if (e instanceof Anthropic.APIError) return `Error del servicio de IA (${e.status}).`;
  return e instanceof Error ? e.message : 'Error desconocido.';
}

/** Respuesta HTTP NDJSON a partir del generador. `alTerminar` recibe el texto completo. */
export function respuestaStream(
  gen: AsyncGenerator<EventoStream, string>,
  alTerminar?: (texto: string, fuentes: Fuente[]) => Promise<void>,
) {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(ctrl) {
        const send = (e: EventoStream) => ctrl.enqueue(enc.encode(JSON.stringify(e) + '\n'));
        let fuentes: Fuente[] = [];
        try {
          let r = await gen.next();
          while (!r.done) {
            if (r.value.t === 'sources') fuentes = r.value.v;
            send(r.value);
            r = await gen.next();
          }
          if (alTerminar) await alTerminar(r.value, fuentes);
          send({ t: 'done' });
        } catch (e) {
          send({ t: 'error', v: mensajeError(e) });
        } finally {
          ctrl.close();
        }
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}
