import { cookies } from 'next/headers';
import { z } from 'zod';
import { generar, iaNoConfigurada, respuestaStream } from '@/lib/ai';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';
import { consumirIA } from '@/lib/suscripcion';

const Body = z.object({
  clase: z.enum(['escritura', 'contrato', 'procesal', 'otro']),
  tipo: z.string().trim().min(2).max(200),
  datos: z.string().max(20000).default(''),
  instrucciones: z.string().max(20000).default(''),
});

const CLASES = {
  escritura: 'ESCRITURA PÚBLICA (formato de protocolo notarial)',
  contrato: 'CONTRATO PRIVADO',
  procesal: 'ESCRITO PROCESAL',
  otro: 'DOCUMENTO JURÍDICO',
};

export async function POST(req: Request) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const { clase, tipo, datos, instrucciones } = p.data;
  const sinIA = iaNoConfigurada();
  if (sinIA) return sinIA;
  const limite = await consumirIA(s.did, s.uid, 'redaccion');
  if (limite) return Response.json({ error: limite }, { status: 402 });

  const pedido = `Clase de documento: ${CLASES[clase]}
Tipo: ${tipo}

Datos suministrados:
${datos || '(ninguno; use marcadores entre corchetes)'}

Instrucciones adicionales:
${instrucciones || '(ninguna)'}`;

  return respuestaStream(generar('redactor', [{ role: 'user', content: pedido }], { effort: 'high' }));
}
