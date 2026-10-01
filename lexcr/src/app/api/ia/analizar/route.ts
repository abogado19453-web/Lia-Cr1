import { cookies } from 'next/headers';
import { z } from 'zod';
import { generar, iaNoConfigurada, respuestaStream } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';
import { consumirIA } from '@/lib/suscripcion';

const Body = z.object({ documentoId: z.string(), enfoque: z.string().max(4000).optional() });
const MAX_CHARS = 400_000;

export async function POST(req: Request) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });

  const doc = await prisma.documento.findFirst({ where: { id: p.data.documentoId, despachoId: s.did } });
  if (!doc) return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
  if (!doc.contenido?.trim()) {
    return Response.json({ error: 'No se pudo extraer texto de este archivo (use PDF con texto, DOCX o TXT).' }, { status: 422 });
  }
  if (doc.contenido.length > MAX_CHARS) {
    return Response.json({ error: 'El documento excede el tamaño máximo de análisis. Divídalo en partes.' }, { status: 413 });
  }

  const sinIA = iaNoConfigurada();
  if (sinIA) return sinIA;
  const limite = await consumirIA(s.did, s.uid, 'analisis');
  if (limite) return Response.json({ error: limite }, { status: 402 });

  const pedido = `Documento: ${doc.nombre}
${p.data.enfoque ? `Enfoque solicitado: ${p.data.enfoque}\n` : ''}
<documento>
${doc.contenido}
</documento>`;

  return respuestaStream(generar('analisis', [{ role: 'user', content: pedido }], { effort: 'high' }), async (texto) => {
    await prisma.documento.update({ where: { id: doc.id }, data: { analisis: texto } });
  });
}
