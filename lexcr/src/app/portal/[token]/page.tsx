import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { marca } from '@/lib/config';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';

export const metadata = { title: 'Portal del cliente', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const cliente = await prisma.cliente.findUnique({
    where: { portalToken: token },
    include: {
      despacho: { select: { nombre: true } },
      expedientes: {
        where: { visiblePortal: true },
        orderBy: { updatedAt: 'desc' },
        include: {
          actuaciones: { where: { visiblePortal: true }, orderBy: { fecha: 'desc' } },
          documentos: { where: { visiblePortal: true }, orderBy: { createdAt: 'desc' }, select: { id: true, nombre: true, createdAt: true } },
        },
      },
    },
  });
  if (!cliente) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 border-b border-line pb-6">
        <p className="text-sm uppercase tracking-widest text-accent">{cliente.despacho.nombre}</p>
        <h1 className="mt-1 text-3xl font-semibold">Estado de sus asuntos</h1>
        <p className="text-muted">{cliente.nombre}</p>
      </header>
      {cliente.expedientes.map((e) => (
        <section key={e.id} className="card mb-6">
          <p className="font-mono text-xs text-muted">{e.numero}</p>
          <h2 className="text-xl font-semibold">{e.titulo}</h2>
          <p className="mb-4 text-sm text-muted">{e.materia} · Estado: {e.estado.charAt(0).toUpperCase() + e.estado.slice(1)}{e.despachoJudicial ? ` · ${e.despachoJudicial}` : ''}</p>
          {e.actuaciones.length > 0 && (
            <ol className="mb-4 space-y-2 border-l border-line pl-4">
              {e.actuaciones.map((a) => (
                <li key={a.id}><span className="text-xs text-muted">{fmtFecha(a.fecha)}</span><div>{a.descripcion}</div></li>
              ))}
            </ol>
          )}
          {e.documentos.length > 0 && (
            <ul className="space-y-1 border-t border-line pt-3">
              {e.documentos.map((d) => (
                <li key={d.id}><a className="flex items-center gap-2 text-accent underline" href={`/portal/${token}/doc/${d.id}`}><FileText size={14} /> {d.nombre}</a></li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {!cliente.expedientes.length && <p className="card text-center text-muted">Aún no hay información publicada.</p>}
      <footer className="mt-10 text-center text-xs text-muted">{marca.nombre}</footer>
    </main>
  );
}
