import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { marca } from '@/lib/config';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';
import { PLANES, colones, type PlanId } from '@/lib/planes';
import { BotonImprimir } from './imprimir';

export const metadata = { title: 'Recibo' };

export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const p = await prisma.pago.findFirst({ where: { id, despachoId: admin.despachoId, estado: 'aprobado' }, include: { despacho: true } });
  if (!p) notFound();
  const filas: [string, string][] = [
    ['Recibo N.°', p.id.slice(-10).toUpperCase()],
    ['Fecha de pago', fmtFecha(p.revisadoEn ?? p.createdAt)],
    ['Cliente', p.despacho.nombre],
    ['Concepto', `Plan ${PLANES[p.plan as PlanId]?.nombre ?? p.plan} — ${p.periodo}`],
    ['Vigencia', `${fmtFecha(p.vigenteDesde)} al ${fmtFecha(p.vigenteHasta)}`],
    ['Método', p.metodo === 'tarjeta' ? 'Tarjeta' : p.metodo === 'sinpe' ? 'SINPE Móvil' : 'Transferencia'],
    ['Referencia', p.referencia ?? '—'],
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{marca.nombre}</h1>
            <p className="text-sm text-muted">Comprobante de pago de suscripción</p>
          </div>
          <BotonImprimir />
        </div>
        <table className="table">
          <tbody>
            {filas.map(([k, v]) => <tr key={k}><td className="w-48 text-muted">{k}</td><td>{v}</td></tr>)}
            <tr><td className="font-semibold">Total</td><td className="font-mono text-lg font-semibold">{colones(p.monto)}</td></tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-muted">Este comprobante no sustituye la factura electrónica.</p>
      </div>
    </div>
  );
}
