'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function guardarPerfil(_: unknown, fd: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const nombre = String(fd.get('nombre') || '').trim();
  if (nombre.length < 3) return { error: 'Indique su nombre completo.' };
  await prisma.usuario.update({ where: { id: user.id }, data: { nombre, carne: String(fd.get('carne') || '').trim() || null } });
  const despacho = String(fd.get('despacho') || '').trim();
  if (user.rol === 'administrador' && despacho.length >= 2) {
    await prisma.despacho.update({ where: { id: user.despachoId }, data: { nombre: despacho } });
  }
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Datos guardados.' };
}

export async function cambiarPassword(_: unknown, fd: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const actual = String(fd.get('actual') || '');
  const nueva = String(fd.get('nueva') || '');
  if (!(await bcrypt.compare(actual, user.passwordHash))) return { error: 'La contraseña actual no es correcta.' };
  if (nueva.length < 8) return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  if (nueva !== fd.get('confirmar')) return { error: 'Las contraseñas no coinciden.' };
  await prisma.usuario.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(nueva, 12) } });
  return { ok: 'Contraseña actualizada.' };
}
