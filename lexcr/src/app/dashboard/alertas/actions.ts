'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFechaInput } from '@/lib/fechas';

function refrescar(expedienteId?: string | null) {
  revalidatePath('/dashboard', 'layout');
  if (expedienteId) revalidatePath(`/dashboard/expedientes/${expedienteId}`);
}

export async function crearAlerta(fd: FormData) {
  const user = await requireUser();
  const titulo = String(fd.get('titulo') || '').trim();
  const fecha = parseFechaInput(fd.get('fechaVence'));
  if (!titulo || !fecha) return;
  let expedienteId = String(fd.get('expedienteId') || '') || null;
  if (expedienteId) {
    const e = await prisma.expediente.findFirst({ where: { id: expedienteId, despachoId: user.despachoId }, select: { id: true } });
    expedienteId = e?.id ?? null;
  }
  await prisma.alerta.create({
    data: { despachoId: user.despachoId, expedienteId, titulo, fechaVence: fecha, tipo: String(fd.get('tipo') || 'plazo') },
  });
  refrescar(expedienteId);
}

export async function alternarAlerta(id: string, completada: boolean) {
  const user = await requireUser();
  const a = await prisma.alerta.findFirst({ where: { id, despachoId: user.despachoId } });
  if (!a) return;
  await prisma.alerta.update({ where: { id }, data: { completada } });
  refrescar(a.expedienteId);
}

export async function borrarAlerta(id: string) {
  const user = await requireUser();
  const a = await prisma.alerta.findFirst({ where: { id, despachoId: user.despachoId } });
  if (!a) return;
  await prisma.alerta.delete({ where: { id } });
  refrescar(a.expedienteId);
}
