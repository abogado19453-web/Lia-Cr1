import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { marca } from './config';

export const MODELO = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

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

/** Respuesta 503 si la IA no está configurada; se evalúa antes de descontar cupo. */
export function iaNoConfigurada() {
  return process.env.ANTHROPIC_API_KEY
    ? null
    : Response.json(
        { error: 'La inteligencia artificial aún no está activada: falta la clave de Anthropic (ANTHROPIC_API_KEY) en el archivo .env.' },
        { status: 503 },
      );
}

let cliente: Anthropic | null = null;
export function claude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no está configurada en el archivo .env.');
  }
  // Se fija la dirección oficial: una variable ANTHROPIC_BASE_URL del sistema (definida por otras
  // herramientas) desviaría las consultas a otro servidor. LEXCR_ANTHROPIC_BASE_URL permite cambiarla a propósito.
  cliente ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    authToken: null,
    baseURL: process.env.LEXCR_ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });
  return cliente;
}

const BASE = `Usted es el asistente jurídico de ${marca.nombre}, al servicio de abogados y notarios en ejercicio en Costa Rica.
Responda en español con el léxico del foro jurídico costarricense (por ejemplo: "finca inscrita en el partido de", "cédula jurídica", "afecciones y gravámenes", "timbres de ley", "fe cartular").
El usuario es el profesional responsable: vaya directo al análisis, sin advertencias genéricas ni recomendaciones de consultar a un abogado.
Fundamente con la normativa costarricense aplicable (Código Civil, Código de Comercio, Código Notarial, Código de Trabajo, Código Procesal Civil, LGAP, Ley General de Arrendamientos Urbanos y Suburbanos, directrices de la DNN, normativa del Registro Nacional) y con jurisprudencia de las Salas de la Corte Suprema de Justicia o del Tribunal Registral Administrativo cuando sea pertinente.
Cite artículos con su número. Si no tiene certeza del texto literal de una norma o del número de un voto, dígalo expresamente e indique dónde verificarlo (SCIJ, Nexus PJ); nunca invente números de resolución, fechas ni citas textuales.`;

export const PROMPTS = {
  consulta: BASE,
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

/**
 * Ejecuta una solicitud en streaming y emite eventos NDJSON.
 * Reanuda automáticamente los turnos `pause_turn` de la búsqueda web.
 */
export async function* generar(
  modo: Modo,
  mensajes: Anthropic.Beta.BetaMessageParam[],
  opciones: { effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'; maxTokens?: number } = {},
): AsyncGenerator<EventoStream, string> {
  const client = claude();
  const historial = [...mensajes];
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
      model: MODELO,
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
  if (e instanceof Anthropic.AuthenticationError) return 'La clave de API de Anthropic no es válida.';
  if (e instanceof Anthropic.RateLimitError) return 'Límite de uso alcanzado. Intente de nuevo en unos minutos.';
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
