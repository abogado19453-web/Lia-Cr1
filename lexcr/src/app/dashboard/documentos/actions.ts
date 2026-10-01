'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extraerTexto } from '@/lib/extract';
import { borrarArchivo, guardarArchivo } from '@/lib/storage';
import { puedeSubir } from '@/lib/suscripcion';

const MAX_BYTES = 20 * 1024 * 1024;

async function expedienteDelDespacho(despachoId: string, id: FormDataEntryValue | null) {
  if (typeof id !== 'string' || !id) return null;
  const e = await prisma.expediente.findFirst({ where: { id, despachoId }, select: { id: true } });
  return e?.id ?? null;
}

export async function subirDocumento(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  const archivo = fd.get('archivo');
  if (!(archivo instanceof File) || !archivo.size) return { error: 'Seleccione un archivo.' };
  if (archivo.size > MAX_BYTES) return { error: 'El archivo excede 20 MB.' };
  const limite = await puedeSubir(user.despachoId, archivo.size);
  if (limite) return { error: limite };
  const buf = Buffer.from(await archivo.arrayBuffer());
  const ruta = await guardarArchivo(user.despachoId, archivo.name, buf);
  let contenido: string | null = null;
  try {
    contenido = await extraerTexto(buf, archivo.type, archivo.name);
  } catch {
    contenido = null;
  }
  await prisma.documento.create({
    data: {
      despachoId: user.despachoId,
      expedienteId: await expedienteDelDespacho(user.despachoId, fd.get('expedienteId')),
      nombre: archivo.name,
      tipo: 'subido',
      mime: archivo.type || 'application/octet-stream',
      ruta,
      contenido,
      tamano: archivo.size,
    },
  });
  revalidatePath('/dashboard/documentos');
  return { ok: true };
}

export async function guardarGenerado(input: { nombre: string; clase: string; contenido: string; expedienteId?: string }) {
  const user = await requireUser();
  const doc = await prisma.documento.create({
    data: {
      despachoId: user.despachoId,
      expedienteId: await expedienteDelDespacho(user.despachoId, input.expedienteId ?? null),
      nombre: input.nombre.slice(0, 200) || 'Documento',
      tipo: 'generado',
      clase: input.clase,
      mime: 'text/plain',
      contenido: input.contenido,
      tamano: Buffer.byteLength(input.contenido),
    },
  });
  revalidatePath('/dashboard/documentos');
  return doc.id;
}

export async function actualizarContenido(id: string, contenido: string) {
  const user = await requireUser();
  await prisma.documento.updateMany({ where: { id, despachoId: user.despachoId, tipo: 'generado' }, data: { contenido } });
  revalidatePath(`/dashboard/documentos/${id}`);
}

export async function alternarPortal(id: string, visible: boolean) {
  const user = await requireUser();
  await prisma.documento.updateMany({ where: { id, despachoId: user.despachoId }, data: { visiblePortal: visible } });
  revalidatePath(`/dashboard/documentos/${id}`);
}

export async function borrarDocumento(id: string) {
  const user = await requireUser();
  const doc = await prisma.documento.findFirst({ where: { id, despachoId: user.despachoId } });
  if (!doc) return;
  if (doc.ruta) await borrarArchivo(doc.ruta);
  await prisma.documento.delete({ where: { id: doc.id } });
  revalidatePath('/dashboard/documentos');
  redirect('/dashboard/documentos');
}
