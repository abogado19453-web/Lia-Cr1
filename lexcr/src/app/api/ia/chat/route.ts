import type Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { generar, iaNoConfigurada, respuestaStream } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';
import { consumirIA } from '@/lib/suscripcion';

const Body = z.object({
  conversacionId: z.string().optional(),
  mensaje: z.string().trim().min(1).max(20000),
  modo: z.enum(['consulta', 'jurisprudencia']).default('consulta'),
});

export async function POST(req: Request) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const { mensaje, modo } = p.data;

  const existente = p.data.conversacionId
    ? await prisma.conversacion.findFirst({ where: { id: p.data.conversacionId, usuarioId: s.uid }, select: { modo: true } })
    : null;
  const sinIA = iaNoConfigurada();
  if (sinIA) return sinIA;
  const limite = await consumirIA(s.did, s.uid, (existente?.modo ?? modo) === 'jurisprudencia' ? 'jurisprudencia' : 'consulta');
  if (limite) return Response.json({ error: limite }, { status: 402 });

  let conv = p.data.conversacionId
    ? await prisma.conversacion.findFirst({
        where: { id: p.data.conversacionId, usuarioId: s.uid },
        include: { mensajes: { orderBy: { createdAt: 'asc' } } },
      })
    : null;
  if (!conv) {
    conv = await prisma.conversacion.create({
      data: { despachoId: s.did, usuarioId: s.uid, modo, titulo: mensaje.slice(0, 80) },
      include: { mensajes: true },
    });
  }

  const historial: Anthropic.Beta.BetaMessageParam[] = conv.mensajes.map((m) => ({
    role: m.rol as 'user' | 'assistant',
    content: m.contenido,
  }));
  historial.push({ role: 'user', content: mensaje });
  await prisma.mensaje.create({ data: { conversacionId: conv.id, rol: 'user', contenido: mensaje } });

  const convId = conv.id;
  const res = respuestaStream(
    generar(conv.modo === 'jurisprudencia' ? 'jurisprudencia' : 'consulta', historial, {
      effort: conv.modo === 'jurisprudencia' ? 'high' : 'medium',
    }),
    async (texto, fuentes) => {
      await prisma.mensaje.create({
        data: {
          conversacionId: convId,
          rol: 'assistant',
          contenido: texto || '[Sin respuesta]',
          fuentes: fuentes.length ? JSON.stringify(fuentes) : null,
        },
      });
      await prisma.conversacion.update({ where: { id: convId }, data: { updatedAt: new Date() } });
    },
  );
  res.headers.set('X-Conversacion-Id', convId);
  return res;
}
