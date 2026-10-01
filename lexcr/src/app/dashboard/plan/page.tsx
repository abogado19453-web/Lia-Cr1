import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';
import { planesActivos, PLANES, colones, type PlanId } from '@/lib/planes';
import { datosPago, estadoSuscripcion } from '@/lib/suscripcion';
import { PageHead } from '@/components/PageHead';
import { ConfirmButton } from '@/components/ConfirmButton';
import { cancelarPago } from './actions';
import { Checkout } from './checkout';

export const metadata = { title: 'Mi plan' };

const AVISOS: Record<string, { t: string; c: string }> = {
  procesando: { t: 'Pago recibido por la pasarela. El plan se activará en cuanto se confirme (normalmente en segundos); recargue la página.', c: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  cancelado: { t: 'El pago con tarjeta fue cancelado. No se realizó ningún cargo.', c: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  error: { t: 'No fue posible iniciar el pago con tarjeta.', c: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
};
const ESTADO_PAGO: Record<string, string> = { pendiente: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const METODO: Record<string, string> = { sinpe: 'SINPE Móvil', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };

function Medidor({ etiqueta, uso, limite, unidad = '' }: { etiqueta: string; uso: number; limite: number; unidad?: string }) {
  const pct = Math.min(100, (uso / limite) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{etiqueta}</span><span className="text-muted">{Math.round(uso).toLocaleString('es-CR')} / {limite.toLocaleString('es-CR')}{unidad}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-bg ring-1 ring-line">
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ pago?: string; plan?: string }> }) {
  if (!planesActivos()) redirect('/dashboard');
  const user = await requireUser();
  const { pago, plan: planSel } = await searchParams;
  const [estado, pagos] = await Promise.all([
    estadoSuscripcion(user.despachoId),
    prisma.pago.findMany({ where: { despachoId: user.despachoId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const esAdmin = user.rol === 'administrador';
  const pendientes = pagos.filter((p) => p.estado === 'pendiente' && p.metodo !== 'tarjeta');

  return (
    <>
      <PageHead titulo="Mi plan" descripcion="Plan contratado, consumo del mes y pagos del despacho." />
      {pago && AVISOS[pago] && <p className={`mb-6 rounded-lg p-3 text-sm ${AVISOS[pago].c}`}>{AVISOS[pago].t}</p>}

      <section className="card mb-6 grid gap-6 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Plan actual</p>
          <h2 className="text-3xl font-semibold">{PLANES[estado.plan].nombre}</h2>
          {estado.vence && <p className="text-sm text-muted">Vigente hasta el {fmtFecha(estado.vence)}</p>}
          {estado.vencido && <p className="text-sm font-semibold text-red-600">Su plan {PLANES[estado.planContratado as PlanId]?.nombre ?? ''} venció. Renueve para recuperar sus límites.</p>}
          {pendientes.length > 0 && <p className="mt-2 text-sm text-amber-700">Tiene {pendientes.length} pago(s) en revisión.</p>}
        </div>
        <div className="space-y-4">
          <Medidor etiqueta="Usos de IA este mes" uso={estado.uso.consultasIA} limite={estado.limites.consultasIA} />
          <Medidor etiqueta="Usuarios" uso={estado.uso.usuarios} limite={estado.limites.usuarios} />
          <Medidor etiqueta="Almacenamiento" uso={estado.uso.almacenamientoMB} limite={estado.limites.almacenamientoMB} unidad=" MB" />
        </div>
      </section>

      {esAdmin ? (
        <Checkout planActual={estado.plan} vence={estado.vence?.toISOString() ?? null} datos={datosPago()} planInicial={planSel} />
      ) : (
        <p className="card text-muted">Solo un administrador del despacho puede cambiar el plan.</p>
      )}

      {esAdmin && (
        <section className="card mt-6 overflow-x-auto p-0">
          <h2 className="px-5 pt-5 text-lg font-semibold">Historial de pagos</h2>
          <table className="table mt-3">
            <thead><tr><th className="pl-5">Fecha</th><th>Plan</th><th>Método</th><th>Referencia</th><th className="text-right">Monto</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td className="pl-5">{fmtFecha(p.createdAt)}</td>
                  <td>{PLANES[p.plan as PlanId]?.nombre ?? p.plan} · {p.periodo}</td>
                  <td>{METODO[p.metodo] ?? p.metodo}</td>
                  <td className="font-mono text-xs">{p.referencia ?? '—'}</td>
                  <td className="text-right font-mono">{colones(p.monto)}</td>
                  <td>
                    <span className={`tag ${p.estado === 'aprobado' ? 'text-emerald-700' : p.estado === 'rechazado' ? 'text-red-600' : 'text-amber-700'}`}>{ESTADO_PAGO[p.estado] ?? p.estado}</span>
                    {p.notas && <div className="text-xs text-muted">{p.notas}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    {p.estado === 'aprobado' && <Link className="text-sm text-accent underline" href={`/dashboard/plan/recibo/${p.id}`}>Recibo</Link>}
                    {p.estado === 'pendiente' && p.metodo !== 'tarjeta' && (
                      <form action={cancelarPago.bind(null, p.id)}><ConfirmButton mensaje="¿Retirar este reporte de pago?" className="text-sm text-red-600 underline">Retirar</ConfirmButton></form>
                    )}
                  </td>
                </tr>
              ))}
              {!pagos.length && <tr><td colSpan={7} className="py-8 text-center text-muted">Sin pagos registrados.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
