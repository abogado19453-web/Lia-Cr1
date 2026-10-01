'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const s = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export async function crearCliente(fd: FormData) {
  const user = await requireUser();
  const nombre = s(fd.get('nombre'));
  if (!nombre) return;
  await prisma.cliente.create({
    data: { despachoId: user.despachoId, nombre, cedula: s(fd.get('cedula')), email: s(fd.get('email')), telefono: s(fd.get('telefono')) },
  });
  revalidatePath('/dashboard/portal');
}

export async function generarAcceso(id: string) {
  const user = await requireUser();
  await prisma.cliente.updateMany({ where: { id, despachoId: user.despachoId }, data: { portalToken: randomBytes(24).toString('base64url') } });
  revalidatePath('/dashboard/portal');
}

export async function revocarAcceso(id: string) {
  const user = await requireUser();
  await prisma.cliente.updateMany({ where: { id, despachoId: user.despachoId }, data: { portalToken: null } });
  revalidatePath('/dashboard/portal');
}

export async function borrarCliente(id: string) {
  const user = await requireUser();
  await prisma.cliente.deleteMany({ where: { id, despachoId: user.despachoId } });
  revalidatePath('/dashboard/portal');
}
