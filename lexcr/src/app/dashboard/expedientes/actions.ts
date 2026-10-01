'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFechaInput } from '@/lib/fechas';

const s = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);

async function clienteValido(despachoId: string, v: FormDataEntryValue | null) {
  const id = s(v);
  if (!id) return null;
  return (await prisma.cliente.findFirst({ where: { id, despachoId }, select: { id: true } }))?.id ?? null;
}

async function expedientePropio(despachoId: string, id: string) {
  const e = await prisma.expediente.findFirst({ where: { id, despachoId }, select: { id: true } });
  if (!e) throw new Error('Expediente no encontrado');
  return e.id;
}

export async function crearExpediente(fd: FormData) {
  const user = await requireUser();
  const numero = s(fd.get('numero'));
  const titulo = s(fd.get('titulo'));
  const materia = s(fd.get('materia'));
  if (!numero || !titulo || !materia) return;
  const e = await prisma.expediente.create({
    data: {
      despachoId: user.despachoId,
      numero,
      titulo,
      materia,
      clienteId: await clienteValido(user.despachoId, fd.get('clienteId')),
      despachoJudicial: s(fd.get('despachoJudicial')),
      contraparte: s(fd.get('contraparte')),
      descripcion: s(fd.get('descripcion')),
    },
  });
  redirect(`/dashboard/expedientes/${e.id}`);
}

export async function actualizarExpediente(id: string, fd: FormData) {
  const user = await requireUser();
  await expedientePropio(user.despachoId, id);
  await prisma.expediente.update({
    where: { id },
    data: {
      numero: s(fd.get('numero')) ?? undefined,
      titulo: s(fd.get('titulo')) ?? undefined,
      materia: s(fd.get('materia')) ?? undefined,
      estado: s(fd.get('estado')) ?? undefined,
      clienteId: await clienteValido(user.despachoId, fd.get('clienteId')),
      despachoJudicial: s(fd.get('despachoJudicial')),
      contraparte: s(fd.get('contraparte')),
      descripcion: s(fd.get('descripcion')),
      visiblePortal: fd.get('visiblePortal') === 'on',
    },
  });
  revalidatePath(`/dashboard/expedientes/${id}`);
}

export async function borrarExpediente(id: string) {
  const user = await requireUser();
  await prisma.expediente.deleteMany({ where: { id, despachoId: user.despachoId } });
  redirect('/dashboard/expedientes');
}

export async function agregarActuacion(expedienteId: string, fd: FormData) {
  const user = await requireUser();
  await expedientePropio(user.despachoId, expedienteId);
  const descripcion = s(fd.get('descripcion'));
  if (!descripcion) return;
  await prisma.actuacion.create({
    data: {
      expedienteId,
      usuarioId: user.id,
      descripcion,
      fecha: parseFechaInput(fd.get('fecha')) ?? new Date(),
      visiblePortal: fd.get('visiblePortal') === 'on',
    },
  });
  await prisma.expediente.update({ where: { id: expedienteId }, data: { updatedAt: new Date() } });
  revalidatePath(`/dashboard/expedientes/${expedienteId}`);
}

export async function borrarActuacion(id: string) {
  const user = await requireUser();
  const a = await prisma.actuacion.findFirst({ where: { id, expediente: { despachoId: user.despachoId } } });
  if (!a) return;
  await prisma.actuacion.delete({ where: { id } });
  revalidatePath(`/dashboard/expedientes/${a.expedienteId}`);
}
