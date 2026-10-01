import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { SESSION_COOKIE, verificarSesion } from './session';

/** Usuario autenticado o redirección al ingreso. */
export async function requireUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verificarSesion(token);
  if (!s) redirect('/ingresar');
  const user = await prisma.usuario.findUnique({ where: { id: s.uid }, include: { despacho: true } });
  if (!user) redirect('/ingresar');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== 'administrador') redirect('/dashboard');
  return user;
}

/** Administrador de la plataforma (PLATFORM_ADMIN_EMAILS). */
export async function requirePlatformAdmin() {
  const { esAdminPlataforma } = await import('./suscripcion');
  const user = await requireUser();
  if (!esAdminPlataforma(user.email)) redirect('/dashboard');
  return user;
}
