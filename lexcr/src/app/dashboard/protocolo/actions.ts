'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFechaInput } from '@/lib/fechas';

const s = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const ESTADOS_REGISTRALES = ['no_aplica', 'pendiente', 'presentado', 'inscrito', 'defectuoso'] as const;

export async function registrarEscritura(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  const numero = Number(fd.get('numero'));
  const tomo = Number(fd.get('tomo'));
  const fecha = parseFechaInput(fd.get('fecha'));
  const folioInicio = s(fd.get('folioInicio'));
  const acto = s(fd.get('acto'));
  const otorgantes = s(fd.get('otorgantes'));
  if (!Number.isInteger(numero) || numero < 1 || !Number.isInteger(tomo) || tomo < 1) return { error: 'Número y tomo deben ser enteros positivos.' };
  if (!fecha || !folioInicio || !acto || !otorgantes) return { error: 'Complete fecha, folio, acto y otorgantes.' };
  const estado = String(fd.get('estadoRegistral'));
  try {
    await prisma.escritura.create({
      data: {
        despachoId: user.despachoId,
        numero,
        tomo,
        fecha,
        folioInicio,
        folioFin: s(fd.get('folioFin')),
        acto,
        otorgantes,
        valor: s(fd.get('valor')),
        estadoRegistral: (ESTADOS_REGISTRALES as readonly string[]).includes(estado) ? estado : 'no_aplica',
        presentacion: s(fd.get('presentacion')),
        notas: s(fd.get('notas')),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: `Ya existe la escritura número ${numero} en el tomo ${tomo}.` };
    }
    throw e;
  }
  revalidatePath('/dashboard/protocolo');
  return { ok: true };
}

export async function actualizarEstadoRegistral(id: string, estado: string, presentacion: string) {
  const user = await requireUser();
  if (!(ESTADOS_REGISTRALES as readonly string[]).includes(estado)) return;
  await prisma.escritura.updateMany({ where: { id, despachoId: user.despachoId }, data: { estadoRegistral: estado, presentacion: presentacion.trim() || null } });
  revalidatePath('/dashboard/protocolo');
}

export async function borrarEscritura(id: string) {
  const user = await requireUser();
  await prisma.escritura.deleteMany({ where: { id, despachoId: user.despachoId } });
  revalidatePath('/dashboard/protocolo');
}
