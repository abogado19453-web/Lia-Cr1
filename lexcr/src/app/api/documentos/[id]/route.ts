import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';
import { leerArchivo } from '@/lib/storage';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return new Response('No autenticado', { status: 401 });
  const { id } = await params;
  const doc = await prisma.documento.findFirst({ where: { id, despachoId: s.did } });
  if (!doc?.ruta) return new Response('No encontrado', { status: 404 });
  const data = await leerArchivo(doc.ruta);
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': doc.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.nombre)}`,
    },
  });
}
