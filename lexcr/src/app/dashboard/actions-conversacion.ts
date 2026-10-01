'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function borrarConversacion(id: string) {
  const user = await requireUser();
  await prisma.conversacion.deleteMany({ where: { id, usuarioId: user.id } });
  revalidatePath('/dashboard/asistente');
  revalidatePath('/dashboard/jurisprudencia');
}
