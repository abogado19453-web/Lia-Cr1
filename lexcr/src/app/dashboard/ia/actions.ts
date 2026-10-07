'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { cifrar, descifrar } from '@/lib/cifrado';
import { prisma } from '@/lib/db';
import { baseUrlValida, listarModelos, probarProveedor } from '@/lib/ia-admin';
import { TIPOS_IA, esTipoIA } from '@/lib/ia-catalogo';

type Resultado = { ok?: string; error?: string; modelos?: string[] };
const txt = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

async function propio(despachoId: string, id: string) {
  return prisma.proveedorIA.findFirst({ where: { id, despachoId } });
}

async function claveDe(fd: FormData, despachoId: string) {
  const nueva = txt(fd.get('apiKey'));
  if (nueva) return nueva;
  const id = txt(fd.get('id'));
  if (!id) return '';
  const p = await propio(despachoId, id);
  return p?.apiKeyCifrada ? descifrar(p.apiKeyCifrada) : '';
}

export async function guardarProveedor(_: Resultado, fd: FormData): Promise<Resultado> {
  const admin = await requireAdmin();
  const tipo = fd.get('tipo');
  if (!esTipoIA(tipo)) return { error: 'Elija el tipo de proveedor.' };
  const nombre = txt(fd.get('nombre')) || TIPOS_IA[tipo].nombre;
  const modelo = txt(fd.get('modelo'));
  if (!modelo) return { error: 'Indique el modelo (use «Detectar modelos» para ver los disponibles).' };
  const base = baseUrlValida(tipo, txt(fd.get('baseUrl')));
  if ('error' in base) return base;
  const apiKey = txt(fd.get('apiKey'));
  const id = txt(fd.get('id'));
  const existente = id ? await propio(admin.despachoId, id) : null;
  if (id && !existente) return { error: 'Proveedor no encontrado.' };
  if (TIPOS_IA[tipo].requiereClave && !apiKey && !existente?.apiKeyCifrada) return { error: 'Ingrese la clave de API.' };

  const datos = {
    nombre,
    tipo,
    modelo,
    baseUrl: TIPOS_IA[tipo].baseEditable ? base.url : null,
    ...(apiKey ? { apiKeyCifrada: cifrar(apiKey), apiKeyFinal: apiKey.slice(-4) } : {}),
  };
  const primero = (await prisma.proveedorIA.count({ where: { despachoId: admin.despachoId } })) === 0;
  if (existente) await prisma.proveedorIA.update({ where: { id: existente.id }, data: datos });
  else await prisma.proveedorIA.create({ data: { ...datos, despachoId: admin.despachoId, predeterminado: primero } });
  revalidatePath('/dashboard/ia');
  return { ok: existente ? 'Cambios guardados.' : 'Proveedor agregado. Pruébelo y autorice a los usuarios que lo usarán.' };
}

export async function detectarModelos(_: Resultado, fd: FormData): Promise<Resultado> {
  const admin = await requireAdmin();
  const tipo = fd.get('tipo');
  if (!esTipoIA(tipo)) return { error: 'Elija el tipo de proveedor.' };
  const base = baseUrlValida(tipo, txt(fd.get('baseUrl')));
  if ('error' in base) return base;
  try {
    const modelos = await listarModelos(tipo, base.url, await claveDe(fd, admin.despachoId));
    return modelos.length ? { ok: `${modelos.length} modelo(s) disponibles.`, modelos } : { error: 'El servicio no informó modelos.' };
  } catch (e) {
    const m = (e as Error).message;
    return { error: /fetch failed|ECONNREFUSED/i.test(m) ? `Sin conexión con ${base.url}. ¿Está encendido el servicio?` : `No se pudieron listar los modelos: ${m.slice(0, 200)}` };
  }
}

export async function probarConexion(id: string): Promise<{ ok: boolean; mensaje: string }> {
  const admin = await requireAdmin();
  const p = await propio(admin.despachoId, id);
  if (!p || !esTipoIA(p.tipo)) return { ok: false, mensaje: 'Proveedor no encontrado.' };
  let apiKey = '';
  try {
    apiKey = p.apiKeyCifrada ? descifrar(p.apiKeyCifrada) : '';
  } catch {
    return { ok: false, mensaje: 'No se pudo leer la clave guardada; vuelva a ingresarla.' };
  }
  const base = baseUrlValida(p.tipo, p.baseUrl);
  if ('error' in base) return { ok: false, mensaje: base.error };
  return probarProveedor(p.tipo, base.url, apiKey, p.modelo);
}

export async function alternarActivo(id: string) {
  const admin = await requireAdmin();
  const p = await propio(admin.despachoId, id);
  if (p) await prisma.proveedorIA.update({ where: { id }, data: { activo: !p.activo } });
  revalidatePath('/dashboard/ia');
}

export async function hacerPredeterminado(id: string) {
  const admin = await requireAdmin();
  if (!(await propio(admin.despachoId, id))) return;
  await prisma.$transaction([
    prisma.proveedorIA.updateMany({ where: { despachoId: admin.despachoId }, data: { predeterminado: false } }),
    prisma.proveedorIA.update({ where: { id }, data: { predeterminado: true } }),
  ]);
  revalidatePath('/dashboard/ia');
}

export async function eliminarProveedor(id: string) {
  const admin = await requireAdmin();
  await prisma.proveedorIA.deleteMany({ where: { id, despachoId: admin.despachoId } });
  revalidatePath('/dashboard/ia');
}

export async function cambiarPermiso(proveedorId: string, usuarioId: string, autorizado: boolean) {
  const admin = await requireAdmin();
  const [p, u] = await Promise.all([
    propio(admin.despachoId, proveedorId),
    prisma.usuario.findFirst({ where: { id: usuarioId, despachoId: admin.despachoId }, select: { id: true } }),
  ]);
  if (!p || !u) return;
  if (autorizado) {
    await prisma.permisoIA.upsert({ where: { proveedorId_usuarioId: { proveedorId, usuarioId } }, create: { proveedorId, usuarioId }, update: {} });
  } else {
    await prisma.permisoIA.deleteMany({ where: { proveedorId, usuarioId } });
  }
  revalidatePath('/dashboard/ia');
}
