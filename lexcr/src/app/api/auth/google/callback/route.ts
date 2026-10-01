import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { canjearCodigo, googleHabilitado, urlBase } from '@/lib/google';
import { SESSION_COOKIE, firmarSesion, sessionCookieOptions } from '@/lib/session';

export async function GET(req: Request) {
  const base = urlBase(req);
  const fallo = (motivo: string) => Response.redirect(`${base}/ingresar?error=${motivo}`);
  if (!googleHabilitado()) return fallo('google');

  const url = new URL(req.url);
  const jar = await cookies();
  const esperado = jar.get('lexcr_oauth_state')?.value;
  jar.delete({ name: 'lexcr_oauth_state', path: '/api/auth/google' });
  const code = url.searchParams.get('code');
  if (!code || !esperado || url.searchParams.get('state') !== esperado) return fallo('estado');

  let identidad;
  try {
    identidad = await canjearCodigo(req, code);
  } catch {
    return fallo('google');
  }

  let usuario = await prisma.usuario.findUnique({ where: { email: identidad.email } });
  if (!usuario) {
    // Primera vez: se crea un despacho nuevo con el usuario como administrador.
    usuario = await prisma.usuario.create({
      data: {
        nombre: identidad.nombre,
        email: identidad.email,
        rol: 'administrador',
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
        despacho: { create: { nombre: `Despacho de ${identidad.nombre}` } },
      },
    });
  }

  jar.set(SESSION_COOKIE, await firmarSesion({ uid: usuario.id, did: usuario.despachoId, rol: usuario.rol }), sessionCookieOptions);
  return Response.redirect(`${base}/dashboard`);
}
