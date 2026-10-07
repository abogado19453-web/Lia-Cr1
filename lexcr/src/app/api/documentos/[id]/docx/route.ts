import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { generarDocx } from '@/lib/docx';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return new Response('No autenticado', { status: 401 });
  const { id } = await params;
  const doc = await prisma.documento.findFirst({ where: { id, despachoId: s.did } });
  if (!doc?.contenido) return new Response('No encontrado', { status: 404 });
  const buf = await generarDocx(doc.contenido, { escritura: doc.clase === 'escritura' });
  const nombre = doc.nombre.replace(/\.[^.]+$/, '') + '.docx';
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    },
  });
}
