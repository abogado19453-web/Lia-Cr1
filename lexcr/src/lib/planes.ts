/**
 * Planes de suscripción. Ajuste precios y límites aquí.
 * Los montos están en colones (CRC); el anual equivale a diez meses.
 */
export const PLANES = {
  gratis: {
    nombre: 'Gratis',
    descripcion: 'Para probar la plataforma.',
    precioMensual: 0,
    limites: { consultasIA: 25, usuarios: 1, almacenamientoMB: 200 },
    beneficios: ['25 usos de IA al mes', '1 usuario', '200 MB de documentos', 'Todos los módulos'],
  },
  profesional: {
    nombre: 'Profesional',
    descripcion: 'Para el abogado o notario independiente.',
    precioMensual: 19_900,
    limites: { consultasIA: 400, usuarios: 3, almacenamientoMB: 5_000 },
    beneficios: ['400 usos de IA al mes', 'Hasta 3 usuarios', '5 GB de documentos', 'Portal Cliente ilimitado', 'Soporte por correo'],
  },
  despacho: {
    nombre: 'Despacho',
    descripcion: 'Para equipos y firmas.',
    precioMensual: 49_900,
    limites: { consultasIA: 2_000, usuarios: 15, almacenamientoMB: 25_000 },
    beneficios: ['2 000 usos de IA al mes', 'Hasta 15 usuarios', '25 GB de documentos', 'Portal Cliente ilimitado', 'Soporte prioritario'],
  },
} as const;

export type PlanId = keyof typeof PLANES;

/** Interruptor general: con PLANES_ACTIVOS distinto de "true" no hay límites ni cobros. */
export const planesActivos = () => process.env.PLANES_ACTIVOS === 'true';
export type Periodo = 'mensual' | 'anual';
export const PLANES_PAGOS: PlanId[] = ['profesional', 'despacho'];

export const esPlan = (v: unknown): v is PlanId => typeof v === 'string' && v in PLANES;
export const esPeriodo = (v: unknown): v is Periodo => v === 'mensual' || v === 'anual';

export function precio(plan: PlanId, periodo: Periodo): number {
  const m = PLANES[plan].precioMensual;
  return periodo === 'anual' ? m * 10 : m;
}

/** Plan efectivo: si el plan pagado venció, el despacho vuelve a Gratis. */
export function planEfectivo(plan: string, vence: Date | null, ahora = new Date()): PlanId {
  if (!esPlan(plan) || plan === 'gratis') return 'gratis';
  if (!vence || vence < ahora) return 'gratis';
  return plan;
}

/**
 * Nueva fecha de vencimiento al acreditar un pago. Si se renueva el mismo plan vigente,
 * el periodo se suma al vencimiento actual; en otro caso, corre desde hoy.
 */
export function calcularVigencia(
  actual: { plan: string; vence: Date | null },
  nuevo: { plan: PlanId; periodo: Periodo },
  ahora = new Date(),
): { desde: Date; hasta: Date } {
  const vigente = planEfectivo(actual.plan, actual.vence, ahora) === nuevo.plan && actual.vence;
  const desde = vigente ? new Date(actual.vence!) : new Date(ahora);
  const hasta = new Date(desde);
  if (nuevo.periodo === 'anual') hasta.setFullYear(hasta.getFullYear() + 1);
  else hasta.setMonth(hasta.getMonth() + 1);
  return { desde, hasta };
}

export function inicioMes(ahora = new Date()) {
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
}

export const colones = (n: number) => '₡' + n.toLocaleString('es-CR', { maximumFractionDigits: 0 });
