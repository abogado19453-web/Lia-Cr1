import Link from 'next/link';
import { FileText, Sparkles } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';
import { PageHead } from '@/components/PageHead';
import { FormSubir } from './subir';

export const metadata = { title: 'Documentos' };

const tam = (n: number | null) => (n == null ? '—' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const user = await requireUser();
  const { q, tipo } = await searchParams;
  const [documentos, expedientes] = await Promise.all([
    prisma.documento.findMany({
      where: {
        despachoId: user.despachoId,
        ...(tipo === 'subido' || tipo === 'generado' ? { tipo } : {}),
        ...(q ? { nombre: { contains: q } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { expediente: { select: { id: true, numero: true } } },
      take: 200,
    }),
    prisma.expediente.findMany({ where: { despachoId: user.despachoId, estado: { not: 'archivado' } }, select: { id: true, numero: true, titulo: true }, orderBy: { updatedAt: 'desc' } }),
  ]);

  return (
    <>
      <PageHead titulo="Documentos" descripcion="Archivos del despacho y borradores generados. Suba un PDF, DOCX o TXT para analizarlo con IA.">
        <Link className="btn" href="/dashboard/redactor"><Sparkles size={15} /> Nuevo borrador</Link>
      </PageHead>
      <FormSubir expedientes={expedientes} />

      <form className="mb-3 mt-6 flex flex-wrap gap-2">
        <input className="input max-w-sm" name="q" defaultValue={q} placeholder="Buscar por nombre…" />
        <select className="input w-44" name="tipo" defaultValue={tipo ?? ''}>
          <option value="">Todos</option>
          <option value="subido">Subidos</option>
          <option value="generado">Generados</option>
        </select>
        <button className="btn-ghost">Filtrar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="pl-5">Nombre</th><th>Origen</th><th>Expediente</th><th>Tamaño</th><th>Fecha</th><th>Análisis</th></tr></thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id}>
                <td className="pl-5"><Link className="flex items-center gap-2 font-medium hover:text-accent" href={`/dashboard/documentos/${d.id}`}><FileText size={15} />{d.nombre}</Link></td>
                <td><span className="tag">{d.tipo === 'subido' ? 'Subido' : 'Generado'}</span></td>
                <td>{d.expediente ? <Link className="underline" href={`/dashboard/expedientes/${d.expediente.id}`}>{d.expediente.numero}</Link> : '—'}</td>
                <td className="text-muted">{tam(d.tamano)}</td>
                <td className="text-muted">{fmtFecha(d.createdAt)}</td>
                <td>{d.analisis ? <span className="tag text-emerald-700">Listo</span> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
            {!documentos.length && <tr><td colSpan={6} className="py-10 text-center text-muted">Sin documentos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
