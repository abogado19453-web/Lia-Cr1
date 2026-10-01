import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileDown } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';
import { DetalleDocumento } from './detalle';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await prisma.documento.findFirst({
    where: { id, despachoId: user.despachoId },
    include: { expediente: { select: { id: true, numero: true } } },
  });
  if (!doc) notFound();

  return (
    <>
      <Link href="/dashboard/documentos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Documentos</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{doc.nombre}</h1>
          <p className="text-muted">
            {doc.tipo === 'subido' ? 'Subido' : 'Generado'} el {fmtFecha(doc.createdAt)}
            {doc.expediente && <> · Expediente <Link className="underline" href={`/dashboard/expedientes/${doc.expediente.id}`}>{doc.expediente.numero}</Link></>}
          </p>
        </div>
        <div className="flex gap-2">
          {doc.ruta && <a className="btn-ghost" href={`/api/documentos/${doc.id}`}><Download size={14} /> Descargar original</a>}
          {doc.contenido && <a className="btn-ghost" href={`/api/documentos/${doc.id}/docx`}><FileDown size={14} /> Exportar a Word</a>}
        </div>
      </div>
      <DetalleDocumento
        id={doc.id}
        generado={doc.tipo === 'generado'}
        contenido={doc.contenido ?? ''}
        analisis={doc.analisis ?? ''}
        visiblePortal={doc.visiblePortal}
        tieneTexto={!!doc.contenido?.trim()}
      />
    </>
  );
}
