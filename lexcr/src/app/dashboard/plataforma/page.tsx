import { requirePlatformAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { fmtFecha, toInputDate } from '@/lib/fechas';
import { planesActivos, PLANES, colones, inicioMes, planEfectivo, type PlanId } from '@/lib/planes';
import { PageHead } from '@/components/PageHead';
import { ConfirmButton } from '@/components/ConfirmButton';
import { aprobarPago, asignarPlan, rechazarPago } from './actions';

export const metadata = { title: 'Plataforma' };

const METODO: Record<string, string> = { sinpe: 'SINPE Móvil', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };

export default async function Page() {
  if (!planesActivos()) redirect('/dashboard');
  await requirePlatformAdmin();
  const mes = inicioMes();
  const [pendientes, despachos, ingresosMes, usos] = await Promise.all([
    prisma.pago.findMany({ where: { estado: 'pendiente', metodo: { not: 'tarjeta' } }, orderBy: { createdAt: 'asc' }, include: { despacho: { select: { nombre: true } } } }),
    prisma.despacho.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { usuarios: true, expedientes: true } }, usuarios: { where: { rol: 'administrador' }, take: 1, select: { email: true } } } }),
    prisma.pago.aggregate({ where: { estado: 'aprobado', revisadoEn: { gte: mes } }, _sum: { monto: true } }),
    prisma.usoIA.groupBy({ by: ['despachoId'], where: { createdAt: { gte: mes } }, _count: true }),
  ]);
  const usoPor = new Map(usos.map((u) => [u.despachoId, u._count]));
  const activos = despachos.filter((d) => planEfectivo(d.plan, d.planVence) !== 'gratis').length;

  return (
    <>
      <PageHead titulo="Plataforma" descripcion="Administración de suscripciones, pagos y despachos." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ['Despachos registrados', despachos.length.toLocaleString('es-CR')],
          ['Con plan pagado vigente', activos.toLocaleString('es-CR')],
          ['Ingresos aprobados este mes', colones(ingresosMes._sum.monto ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="card"><p className="text-xs uppercase tracking-wide text-muted">{k}</p><p className="mt-1 font-serif text-3xl font-semibold">{v}</p></div>
        ))}
      </div>

      <section className="card mb-6 overflow-x-auto p-0">
        <h2 className="px-5 pt-5 text-lg font-semibold">Pagos por verificar ({pendientes.length})</h2>
        <table className="table mt-3">
          <thead><tr><th className="pl-5">Fecha</th><th>Despacho</th><th>Plan</th><th>Método / referencia</th><th className="text-right">Monto</th><th>Comprobante</th><th>Acciones</th></tr></thead>
          <tbody>
            {pendientes.map((p) => (
              <tr key={p.id}>
                <td className="pl-5">{fmtFecha(p.createdAt)}</td>
                <td>{p.despacho.nombre}</td>
                <td>{PLANES[p.plan as PlanId]?.nombre} · {p.periodo}</td>
                <td>{METODO[p.metodo]}<div className="font-mono text-xs">{p.referencia}</div></td>
                <td className="text-right font-mono">{colones(p.monto)}</td>
                <td>{p.comprobante ? <a className="text-accent underline" href={`/api/pagos/${p.id}/comprobante`} target="_blank" rel="noopener">Ver</a> : '—'}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={aprobarPago.bind(null, p.id)}><ConfirmButton mensaje="¿Confirma que el dinero ingresó y desea activar el plan?" className="btn">Aprobar</ConfirmButton></form>
                    <form action={rechazarPago.bind(null, p.id)} className="flex gap-1">
                      <input className="input w-40" name="motivo" placeholder="Motivo" />
                      <button className="btn-danger">Rechazar</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!pendientes.length && <tr><td colSpan={7} className="py-8 text-center text-muted">No hay pagos pendientes.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-5 pt-5 text-lg font-semibold">Despachos</h2>
        <table className="table mt-3">
          <thead><tr><th className="pl-5">Despacho</th><th>Administrador</th><th>Usuarios</th><th>Expedientes</th><th>IA (mes)</th><th>Plan</th><th>Asignar plan</th></tr></thead>
          <tbody>
            {despachos.map((d) => {
              const efectivo = planEfectivo(d.plan, d.planVence);
              return (
                <tr key={d.id}>
                  <td className="pl-5">{d.nombre}<div className="text-xs text-muted">desde {fmtFecha(d.createdAt)}</div></td>
                  <td className="text-sm">{d.usuarios[0]?.email ?? '—'}</td>
                  <td>{d._count.usuarios}</td>
                  <td>{d._count.expedientes}</td>
                  <td>{usoPor.get(d.id) ?? 0}</td>
                  <td>{PLANES[efectivo].nombre}{d.planVence && efectivo !== 'gratis' && <div className="text-xs text-muted">hasta {fmtFecha(d.planVence)}</div>}{d.plan !== efectivo && <div className="text-xs text-red-600">{PLANES[d.plan as PlanId]?.nombre} vencido</div>}</td>
                  <td>
                    <form action={asignarPlan.bind(null, d.id)} className="flex flex-wrap gap-1">
                      <select className="input w-32" name="plan" defaultValue={d.plan}>{Object.entries(PLANES).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}</select>
                      <input className="input w-36" type="date" name="hasta" defaultValue={toInputDate(d.planVence)} />
                      <button className="btn-ghost">Guardar</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
