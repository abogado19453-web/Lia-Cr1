import 'server-only';
import { prisma } from './db';
import { PLANES, calcularVigencia, esPeriodo, esPlan, inicioMes, planEfectivo, planesActivos, type PlanId } from './planes';

export type TipoUsoIA = 'consulta' | 'jurisprudencia' | 'redaccion' | 'analisis';

export async function estadoSuscripcion(despachoId: string) {
  const d = await prisma.despacho.findUniqueOrThrow({ where: { id: despachoId }, select: { plan: true, planVence: true } });
  const plan = planEfectivo(d.plan, d.planVence);
  const [usoIA, usuarios, almacen] = await Promise.all([
    prisma.usoIA.count({ where: { despachoId, createdAt: { gte: inicioMes() } } }),
    prisma.usuario.count({ where: { despachoId } }),
    prisma.documento.aggregate({ where: { despachoId }, _sum: { tamano: true } }),
  ]);
  return {
    plan,
    planContratado: d.plan,
    vence: plan === 'gratis' ? null : d.planVence,
    vencido: d.plan !== 'gratis' && plan === 'gratis',
    limites: PLANES[plan].limites,
    uso: { consultasIA: usoIA, usuarios, almacenamientoMB: (almacen._sum.tamano ?? 0) / 1_048_576 },
  };
}

/** Verifica el cupo mensual de IA y, si hay disponibilidad, registra el uso. */
export async function consumirIA(despachoId: string, usuarioId: string, tipo: TipoUsoIA): Promise<string | null> {
  if (!planesActivos()) {
    await prisma.usoIA.create({ data: { despachoId, usuarioId, tipo } });
    return null;
  }
  const e = await estadoSuscripcion(despachoId);
  if (e.uso.consultasIA >= e.limites.consultasIA) {
    return `Alcanzó el límite de ${e.limites.consultasIA} usos de IA de este mes en el plan ${PLANES[e.plan].nombre}. Puede ampliarlo en «Mejorar mi plan».`;
  }
  await prisma.usoIA.create({ data: { despachoId, usuarioId, tipo } });
  return null;
}

export async function puedeAgregarUsuario(despachoId: string) {
  if (!planesActivos()) return null;
  const e = await estadoSuscripcion(despachoId);
  return e.uso.usuarios < e.limites.usuarios ? null : `El plan ${PLANES[e.plan].nombre} permite ${e.limites.usuarios} usuario(s). Mejore su plan para agregar más.`;
}

export async function puedeSubir(despachoId: string, bytes: number) {
  if (!planesActivos()) return null;
  const e = await estadoSuscripcion(despachoId);
  return e.uso.almacenamientoMB + bytes / 1_048_576 <= e.limites.almacenamientoMB
    ? null
    : `Se excede el almacenamiento del plan ${PLANES[e.plan].nombre} (${e.limites.almacenamientoMB} MB).`;
}

/** Acredita un pago y activa el plan. Es idempotente: un pago ya aprobado no se vuelve a aplicar. */
export async function acreditarPago(pagoId: string, revisadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUniqueOrThrow({ where: { id: pagoId }, include: { despacho: true } });
    if (pago.estado === 'aprobado') return pago;
    if (!esPlan(pago.plan) || !esPeriodo(pago.periodo)) throw new Error('Pago con plan o periodo inválido');
    const v = calcularVigencia({ plan: pago.despacho.plan, vence: pago.despacho.planVence }, { plan: pago.plan as PlanId, periodo: pago.periodo });
    await tx.despacho.update({ where: { id: pago.despachoId }, data: { plan: pago.plan, planVence: v.hasta } });
    return tx.pago.update({
      where: { id: pagoId },
      data: { estado: 'aprobado', revisadoPor, revisadoEn: new Date(), vigenteDesde: v.desde, vigenteHasta: v.hasta },
    });
  });
}

export function esAdminPlataforma(email: string) {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const datosPago = () => ({
  sinpe: process.env.PAGO_SINPE_NUMERO || '',
  iban: process.env.PAGO_IBAN || '',
  titular: process.env.PAGO_TITULAR || '',
  tarjeta: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
});
