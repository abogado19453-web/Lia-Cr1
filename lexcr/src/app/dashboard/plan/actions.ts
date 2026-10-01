'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLANES, PLANES_PAGOS, esPeriodo, esPlan, planesActivos, precio } from '@/lib/planes';
import { guardarArchivo } from '@/lib/storage';
import { stripe } from '@/lib/stripe';
import { datosPago } from '@/lib/suscripcion';

const MAX_COMPROBANTE = 5 * 1024 * 1024;
const TIPOS_COMPROBANTE = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

function validarPlan(fd: FormData) {
  if (!planesActivos()) return null;
  const plan = fd.get('plan');
  const periodo = fd.get('periodo');
  if (!esPlan(plan) || !PLANES_PAGOS.includes(plan) || !esPeriodo(periodo)) return null;
  return { plan, periodo };
}

export async function reportarPago(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const sel = validarPlan(fd);
  if (!sel) return { error: 'Seleccione un plan y un periodo válidos.' };
  const metodo = fd.get('metodo');
  if (metodo !== 'sinpe' && metodo !== 'transferencia') return { error: 'Método de pago inválido.' };
  const referencia = String(fd.get('referencia') || '').trim();
  if (referencia.length < 4) return { error: 'Indique el número de comprobante o referencia del pago.' };

  let comprobante: string | null = null;
  const archivo = fd.get('comprobante');
  if (archivo instanceof File && archivo.size) {
    if (archivo.size > MAX_COMPROBANTE) return { error: 'El comprobante excede 5 MB.' };
    if (!TIPOS_COMPROBANTE.includes(archivo.type)) return { error: 'El comprobante debe ser imagen (PNG, JPG, WEBP) o PDF.' };
    comprobante = await guardarArchivo(`${admin.despachoId}/comprobantes`, archivo.name, Buffer.from(await archivo.arrayBuffer()));
  }

  await prisma.pago.create({
    data: {
      despachoId: admin.despachoId,
      usuarioId: admin.id,
      plan: sel.plan,
      periodo: sel.periodo,
      monto: precio(sel.plan, sel.periodo),
      metodo,
      referencia,
      comprobante,
    },
  });
  revalidatePath('/dashboard/plan');
  return { ok: true };
}

export async function pagarConTarjeta(fd: FormData) {
  const admin = await requireAdmin();
  const sel = validarPlan(fd);
  if (!sel || !datosPago().tarjeta) redirect('/dashboard/plan?pago=error');
  const h = await headers();
  const base = (process.env.APP_URL || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`).replace(/\/+$/, '');
  const monto = precio(sel.plan, sel.periodo);

  const pago = await prisma.pago.create({
    data: { despachoId: admin.despachoId, usuarioId: admin.id, plan: sel.plan, periodo: sel.periodo, monto, metodo: 'tarjeta' },
  });
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: admin.email,
    client_reference_id: pago.id,
    metadata: { pagoId: pago.id, despachoId: admin.despachoId },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'crc',
          unit_amount: monto * 100,
          product_data: { name: `Plan ${PLANES[sel.plan].nombre} (${sel.periodo})` },
        },
      },
    ],
    success_url: `${base}/dashboard/plan?pago=procesando`,
    cancel_url: `${base}/dashboard/plan?pago=cancelado`,
  });
  await prisma.pago.update({ where: { id: pago.id }, data: { stripeSession: session.id } });
  redirect(session.url!);
}

export async function cancelarPago(id: string) {
  const admin = await requireAdmin();
  await prisma.pago.deleteMany({ where: { id, despachoId: admin.despachoId, estado: 'pendiente', metodo: { not: 'tarjeta' } } });
  revalidatePath('/dashboard/plan');
}
