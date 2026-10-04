import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { resolverProveedor, type ProveedorResuelto } from './ia-proveedores';
import { SESSION_COOKIE, verificarSesion } from './session';
import { consumirIA, type TipoUsoIA } from './suscripcion';

/**
 * Autentica, resuelve el proveedor de IA autorizado y descuenta el cupo.
 * Devuelve una Response de error o el contexto para continuar.
 */
export async function prepararIA(
  proveedorId: string | undefined,
  tipo: TipoUsoIA,
): Promise<Response | { usuario: { id: string; despachoId: string; rol: string }; proveedor: ProveedorResuelto }> {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const usuario = await prisma.usuario.findUnique({ where: { id: s.uid }, select: { id: true, despachoId: true, rol: true } });
  if (!usuario) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const proveedor = await resolverProveedor(usuario, proveedorId);
  if ('error' in proveedor) return Response.json({ error: proveedor.error }, { status: 503 });
  const limite = await consumirIA(usuario.despachoId, usuario.id, tipo);
  if (limite) return Response.json({ error: limite }, { status: 402 });
  return { usuario, proveedor };
}
