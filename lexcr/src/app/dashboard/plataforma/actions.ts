'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFechaInput } from '@/lib/fechas';
import { esPlan } from '@/lib/planes';
import { acreditarPago } from '@/lib/suscripcion';

export async function aprobarPago(id: string) {
  const admin = await requirePlatformAdmin();
  await acreditarPago(id, admin.email);
  revalidatePath('/dashboard/plataforma');
}

export async function rechazarPago(id: string, fd: FormData) {
  const admin = await requirePlatformAdmin();
  const motivo = String(fd.get('motivo') || '').trim() || 'Pago no verificado';
  await prisma.pago.updateMany({
    where: { id, estado: 'pendiente' },
    data: { estado: 'rechazado', notas: motivo, revisadoPor: admin.email, revisadoEn: new Date() },
  });
  revalidatePath('/dashboard/plataforma');
}

/** Asignación manual (cortesías, convenios o correcciones). */
export async function asignarPlan(despachoId: string, fd: FormData) {
  await requirePlatformAdmin();
  const plan = fd.get('plan');
  if (!esPlan(plan)) return;
  const hasta = parseFechaInput(fd.get('hasta'));
  if (plan !== 'gratis' && !hasta) return;
  await prisma.despacho.update({ where: { id: despachoId }, data: { plan, planVence: plan === 'gratis' ? null : hasta } });
  revalidatePath('/dashboard/plataforma');
}
