import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';
import { leerArchivo } from '@/lib/storage';
import { esAdminPlataforma } from '@/lib/suscripcion';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return new Response('No autenticado', { status: 401 });
  const { id } = await params;
  const [pago, user] = await Promise.all([
    prisma.pago.findUnique({ where: { id } }),
    prisma.usuario.findUnique({ where: { id: s.uid }, select: { email: true, despachoId: true, rol: true } }),
  ]);
  const permitido = user && (esAdminPlataforma(user.email) || (pago?.despachoId === user.despachoId && user.rol === 'administrador'));
  if (!pago?.comprobante || !permitido) return new Response('No encontrado', { status: 404 });
  const ext = pago.comprobante.split('.').pop()?.toLowerCase();
  const tipo = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Response(new Uint8Array(await leerArchivo(pago.comprobante)), {
    headers: { 'Content-Type': tipo, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' },
  });
}
