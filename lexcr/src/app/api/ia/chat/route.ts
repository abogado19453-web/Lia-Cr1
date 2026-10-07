import { z } from 'zod';
import { generar, respuestaStream, type MensajeIA } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { prepararIA } from '@/lib/ia-ruta';

const Body = z.object({
  conversacionId: z.string().optional(),
  mensaje: z.string().trim().min(1).max(20000),
  modo: z.enum(['consulta', 'jurisprudencia']).default('consulta'),
  proveedorId: z.string().optional(),
});

export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const { mensaje, modo, proveedorId } = p.data;

  const ctx = await prepararIA(proveedorId, modo === 'jurisprudencia' ? 'jurisprudencia' : 'consulta');
  if (ctx instanceof Response) return ctx;
  const { usuario, proveedor } = ctx;

  let conv = p.data.conversacionId
    ? await prisma.conversacion.findFirst({
        where: { id: p.data.conversacionId, usuarioId: usuario.id },
        include: { mensajes: { orderBy: { createdAt: 'asc' } } },
      })
    : null;
  if (!conv) {
    conv = await prisma.conversacion.create({
      data: { despachoId: usuario.despachoId, usuarioId: usuario.id, modo, titulo: mensaje.slice(0, 80) },
      include: { mensajes: true },
    });
  }

  const historial: MensajeIA[] = conv.mensajes.map((m) => ({ role: m.rol === 'assistant' ? 'assistant' : 'user', content: m.contenido }));
  historial.push({ role: 'user', content: mensaje });
  await prisma.mensaje.create({ data: { conversacionId: conv.id, rol: 'user', contenido: mensaje } });

  const convId = conv.id;
  const esJuris = conv.modo === 'jurisprudencia';
  const res = respuestaStream(
    generar(esJuris ? 'jurisprudencia' : 'consulta', historial, proveedor, { effort: esJuris ? 'high' : 'medium' }),
    async (texto, fuentes) => {
      await prisma.mensaje.create({
        data: {
          conversacionId: convId,
          rol: 'assistant',
          contenido: texto || '[Sin respuesta]',
          fuentes: fuentes.length ? JSON.stringify(fuentes) : null,
          proveedor: `${proveedor.nombre} · ${proveedor.modelo}`,
        },
      });
      await prisma.conversacion.update({ where: { id: convId }, data: { updatedAt: new Date() } });
    },
  );
  res.headers.set('X-Conversacion-Id', convId);
  return res;
}
