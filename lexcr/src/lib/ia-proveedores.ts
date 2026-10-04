import 'server-only';
import { descifrar } from './cifrado';
import { prisma } from './db';
import { TIPOS_IA, esTipoIA, type ProveedorDisponible, type TipoIA } from './ia-catalogo';

/** Proveedor listo para usar en el servidor (incluye la clave descifrada). */
export type ProveedorResuelto = {
  id: string;
  nombre: string;
  tipo: TipoIA;
  baseUrl: string;
  apiKey: string;
  modelo: string;
};

export const ID_SISTEMA = 'sistema';

/** Clave de Anthropic del archivo .env: respaldo mientras el despacho no configure proveedores. */
function proveedorSistema(): ProveedorResuelto | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return {
    id: ID_SISTEMA,
    nombre: 'Claude (configuración del servidor)',
    tipo: 'anthropic',
    baseUrl: process.env.LEXCR_ANTHROPIC_BASE_URL || TIPOS_IA.anthropic.baseUrl,
    apiKey,
    modelo: process.env.CLAUDE_MODEL || TIPOS_IA.anthropic.modeloSugerido,
  };
}

type Usuario = { id: string; despachoId: string; rol: string };

async function proveedoresDelUsuario(u: Usuario) {
  return prisma.proveedorIA.findMany({
    where: {
      despachoId: u.despachoId,
      activo: true,
      ...(u.rol === 'administrador' ? {} : { permisos: { some: { usuarioId: u.id } } }),
    },
    orderBy: [{ predeterminado: 'desc' }, { createdAt: 'asc' }],
  });
}

/** Proveedores que el usuario puede elegir. Los administradores ven todos los activos. */
export async function proveedoresDisponibles(u: Usuario): Promise<ProveedorDisponible[]> {
  const lista = (await proveedoresDelUsuario(u))
    .filter((p) => esTipoIA(p.tipo))
    .map((p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo as TipoIA, modelo: p.modelo, predeterminado: p.predeterminado }));
  if (lista.length) return lista;
  const configurados = await prisma.proveedorIA.count({ where: { despachoId: u.despachoId } });
  const sis = configurados === 0 ? proveedorSistema() : null;
  return sis ? [{ id: sis.id, nombre: sis.nombre, tipo: sis.tipo, modelo: sis.modelo, predeterminado: true }] : [];
}

/** Resuelve el proveedor solicitado (o el predeterminado) verificando la autorización del usuario. */
export async function resolverProveedor(u: Usuario, solicitado?: string | null): Promise<ProveedorResuelto | { error: string }> {
  const lista = await proveedoresDelUsuario(u);
  if (!lista.length) {
    const configurados = await prisma.proveedorIA.count({ where: { despachoId: u.despachoId } });
    const sis = configurados === 0 ? proveedorSistema() : null;
    if (sis && (!solicitado || solicitado === ID_SISTEMA)) return sis;
    return {
      error:
        u.rol === 'administrador'
          ? 'No hay inteligencia artificial configurada. Agréguela en Administración → Inteligencia artificial.'
          : 'No tiene autorizado ningún proveedor de inteligencia artificial. Solicítelo al administrador del despacho.',
    };
  }
  const elegido = (solicitado && lista.find((p) => p.id === solicitado)) || lista[0];
  if (!esTipoIA(elegido.tipo)) return { error: 'Proveedor de IA con tipo desconocido.' };
  let apiKey = '';
  if (elegido.apiKeyCifrada) {
    try {
      apiKey = descifrar(elegido.apiKeyCifrada);
    } catch {
      return { error: `No se pudo leer la clave de «${elegido.nombre}» (¿cambió AUTH_SECRET?). El administrador debe volver a ingresarla.` };
    }
  }
  return {
    id: elegido.id,
    nombre: elegido.nombre,
    tipo: elegido.tipo,
    baseUrl: (TIPOS_IA[elegido.tipo].baseEditable ? elegido.baseUrl : null) || TIPOS_IA[elegido.tipo].baseUrl,
    apiKey,
    modelo: elegido.modelo,
  };
}
