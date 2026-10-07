'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puedeAgregarUsuario } from '@/lib/suscripcion';

const Miembro = z.object({
  nombre: z.string().trim().min(3, 'Indique el nombre.'),
  email: z.string().trim().toLowerCase().email('Correo inválido.'),
  password: z.string().min(8, 'La contraseña temporal debe tener al menos 8 caracteres.'),
  rol: z.enum(['administrador', 'miembro']),
  carne: z.string().trim().optional(),
});

export async function agregarMiembro(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const p = Miembro.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await prisma.usuario.findUnique({ where: { email: p.data.email } })) return { error: 'Ese correo ya está registrado.' };
  const limite = await puedeAgregarUsuario(admin.despachoId);
  if (limite) return { error: limite };
  await prisma.usuario.create({
    data: {
      despachoId: admin.despachoId,
      nombre: p.data.nombre,
      email: p.data.email,
      rol: p.data.rol,
      carne: p.data.carne || null,
      passwordHash: await bcrypt.hash(p.data.password, 12),
    },
  });
  revalidatePath('/dashboard/equipo');
  return { ok: true };
}

async function quedaOtroAdmin(despachoId: string, excluir: string) {
  return (await prisma.usuario.count({ where: { despachoId, rol: 'administrador', id: { not: excluir } } })) > 0;
}

export async function cambiarRol(id: string, rol: 'administrador' | 'miembro') {
  const admin = await requireAdmin();
  if (rol === 'miembro' && !(await quedaOtroAdmin(admin.despachoId, id))) return;
  await prisma.usuario.updateMany({ where: { id, despachoId: admin.despachoId }, data: { rol } });
  revalidatePath('/dashboard/equipo');
}

export async function quitarMiembro(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) return;
  await prisma.usuario.deleteMany({ where: { id, despachoId: admin.despachoId } });
  revalidatePath('/dashboard/equipo');
}
