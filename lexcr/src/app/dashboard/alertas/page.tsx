import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { diasHasta, fmtFecha } from '@/lib/fechas';
import { AlertaFila } from '@/components/AlertaFila';
import { PageHead } from '@/components/PageHead';
import { crearAlerta } from './actions';

export const metadata = { title: 'Alertas' };

export default async function Page({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const user = await requireUser();
  const { ver } = await searchParams;
  const [alertas, expedientes] = await Promise.all([
    prisma.alerta.findMany({
      where: { despachoId: user.despachoId, ...(ver === 'todas' ? {} : { completada: false }) },
      orderBy: { fechaVence: 'asc' },
      include: { expediente: { select: { id: true, numero: true } } },
    }),
    prisma.expediente.findMany({ where: { despachoId: user.despachoId, estado: { not: 'archivado' } }, select: { id: true, numero: true, titulo: true }, orderBy: { updatedAt: 'desc' } }),
  ]);

  return (
    <>
      <PageHead titulo="Alertas" descripcion="Plazos procesales, audiencias y vencimientos del despacho.">
        <a className="btn-ghost" href={ver === 'todas' ? '/dashboard/alertas' : '/dashboard/alertas?ver=todas'}>{ver === 'todas' ? 'Solo pendientes' : 'Ver atendidas'}</a>
      </PageHead>

      <form action={crearAlerta} className="card mb-6 grid items-end gap-3 md:grid-cols-[1fr_150px_160px_220px_auto]">
        <label className="label">Descripción<input className="input" name="titulo" required placeholder="Contestar audiencia de la demanda" /></label>
        <label className="label">Tipo
          <select className="input" name="tipo"><option value="plazo">Plazo</option><option value="audiencia">Audiencia</option><option value="vencimiento">Vencimiento</option><option value="recordatorio">Recordatorio</option></select>
        </label>
        <label className="label">Fecha<input className="input" type="date" name="fechaVence" required /></label>
        <label className="label">Expediente
          <select className="input" name="expedienteId"><option value="">—</option>{expedientes.map((e) => <option key={e.id} value={e.id}>{e.numero}</option>)}</select>
        </label>
        <button className="btn">Agregar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="pl-5" /><th>Descripción</th><th>Tipo</th><th>Expediente</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {alertas.map((a) => (
              <AlertaFila key={a.id} id={a.id} titulo={a.titulo} tipo={a.tipo} fecha={fmtFecha(a.fechaVence)} dias={diasHasta(a.fechaVence)} completada={a.completada} expediente={a.expediente} />
            ))}
            {!alertas.length && <tr><td colSpan={7} className="py-10 text-center text-muted">Sin alertas pendientes.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Los días se cuentan en naturales. Verifique el cómputo procesal (días hábiles, feriados y cierres colectivos del Poder Judicial) conforme a la norma aplicable.</p>
    </>
  );
}
