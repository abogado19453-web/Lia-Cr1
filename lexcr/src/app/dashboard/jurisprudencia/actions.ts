'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFechaInput } from '@/lib/fechas';

const s = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export async function guardarResolucion(fd: FormData) {
  const user = await requireUser();
  const numero = s(fd.get('numero'));
  const tribunal = s(fd.get('tribunal'));
  const tema = s(fd.get('tema'));
  const extracto = s(fd.get('extracto'));
  if (!numero || !tribunal || !tema || !extracto) return;
  await prisma.resolucion.create({
    data: {
      despachoId: user.despachoId,
      numero,
      tribunal,
      tema,
      extracto,
      fecha: parseFechaInput(fd.get('fecha')),
      materia: s(fd.get('materia')),
      enlace: s(fd.get('enlace')),
    },
  });
  revalidatePath('/dashboard/jurisprudencia');
}

export async function borrarResolucion(id: string) {
  const user = await requireUser();
  await prisma.resolucion.deleteMany({ where: { id, despachoId: user.despachoId } });
  revalidatePath('/dashboard/jurisprudencia');
}
