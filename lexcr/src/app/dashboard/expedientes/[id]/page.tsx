import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, PenLine, Trash2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { MATERIAS } from '@/lib/config';
import { prisma } from '@/lib/db';
import { diasHasta, fmtFecha, toInputDate } from '@/lib/fechas';
import { AlertaFila } from '@/components/AlertaFila';
import { ConfirmButton } from '@/components/ConfirmButton';
import { crearAlerta } from '../../alertas/actions';
import { actualizarExpediente, agregarActuacion, borrarActuacion, borrarExpediente } from '../actions';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const e = await prisma.expediente.findFirst({
    where: { id, despachoId: user.despachoId },
    include: {
      cliente: true,
      actuaciones: { orderBy: { fecha: 'desc' }, include: { usuario: { select: { nombre: true } } } },
      alertas: { orderBy: { fechaVence: 'asc' } },
      documentos: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!e) notFound();
  const clientes = await prisma.cliente.findMany({ where: { despachoId: user.despachoId }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } });

  return (
    <>
      <Link href="/dashboard/expedientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Expedientes</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted">{e.numero}</p>
          <h1 className="text-3xl font-semibold">{e.titulo}</h1>
          <p className="text-muted">{e.materia}{e.cliente ? ` · ${e.cliente.nombre}` : ''}{e.despachoJudicial ? ` · ${e.despachoJudicial}` : ''}</p>
        </div>
        <Link className="btn" href={`/dashboard/redactor?expediente=${e.id}`}><PenLine size={15} /> Redactar para este expediente</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">Actuaciones</h2>
            <form action={agregarActuacion.bind(null, e.id)} className="mb-4 grid gap-2 md:grid-cols-[150px_1fr_auto]">
              <input className="input" type="date" name="fecha" defaultValue={toInputDate(new Date())} />
              <input className="input" name="descripcion" required placeholder="Se presentó escrito de contestación…" />
              <button className="btn">Agregar</button>
              <label className="flex items-center gap-2 text-xs text-muted md:col-span-3"><input type="checkbox" name="visiblePortal" /> Visible para el cliente</label>
            </form>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {e.actuaciones.map((a) => (
                <li key={a.id} className="group">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted">{fmtFecha(a.fecha)}{a.usuario ? ` · ${a.usuario.nombre}` : ''}{a.visiblePortal ? ' · visible al cliente' : ''}</div>
                      <div className="whitespace-pre-wrap">{a.descripcion}</div>
                    </div>
                    <form action={borrarActuacion.bind(null, a.id)}><button className="opacity-0 group-hover:opacity-100" aria-label="Eliminar"><Trash2 size={14} /></button></form>
                  </div>
                </li>
              ))}
              {!e.actuaciones.length && <li className="text-muted">Sin actuaciones registradas.</li>}
            </ol>
          </section>

          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">Plazos y alertas</h2>
            <form action={crearAlerta} className="mb-3 grid gap-2 md:grid-cols-[1fr_150px_130px_auto]">
              <input type="hidden" name="expedienteId" value={e.id} />
              <input className="input" name="titulo" required placeholder="Vence plazo para apelar" />
              <input className="input" type="date" name="fechaVence" required />
              <select className="input" name="tipo"><option value="plazo">Plazo</option><option value="audiencia">Audiencia</option><option value="vencimiento">Vencimiento</option><option value="recordatorio">Recordatorio</option></select>
              <button className="btn">Agregar</button>
            </form>
            <table className="table">
              <tbody>
                {e.alertas.map((a) => (
                  <AlertaFila key={a.id} id={a.id} titulo={a.titulo} tipo={a.tipo} fecha={fmtFecha(a.fechaVence)} dias={diasHasta(a.fechaVence)} completada={a.completada} mostrarExpediente={false} />
                ))}
                {!e.alertas.length && <tr><td className="text-muted">Sin plazos registrados.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Documentos</h2>
              <Link className="text-sm text-accent" href="/dashboard/documentos">Subir documento →</Link>
            </div>
            <ul className="space-y-1">
              {e.documentos.map((d) => (
                <li key={d.id}><Link className="flex items-center gap-2 hover:text-accent" href={`/dashboard/documentos/${d.id}`}><FileText size={14} /> {d.nombre} <span className="text-xs text-muted">· {fmtFecha(d.createdAt)}</span></Link></li>
              ))}
              {!e.documentos.length && <li className="text-muted">Sin documentos vinculados.</li>}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <form action={actualizarExpediente.bind(null, e.id)} className="card space-y-3">
            <h2 className="text-lg font-semibold">Datos del expediente</h2>
            <label className="label">Número<input className="input" name="numero" defaultValue={e.numero} required /></label>
            <label className="label">Asunto<input className="input" name="titulo" defaultValue={e.titulo} required /></label>
            <label className="label">Materia<select className="input" name="materia" defaultValue={e.materia}>{MATERIAS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="label">Estado
              <select className="input" name="estado" defaultValue={e.estado}><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="archivado">Archivado</option></select>
            </label>
            <label className="label">Cliente
              <select className="input" name="clienteId" defaultValue={e.clienteId ?? ''}><option value="">—</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            </label>
            <label className="label">Despacho u oficina<input className="input" name="despachoJudicial" defaultValue={e.despachoJudicial ?? ''} /></label>
            <label className="label">Contraparte<input className="input" name="contraparte" defaultValue={e.contraparte ?? ''} /></label>
            <label className="label">Descripción<textarea className="input min-h-20" name="descripcion" defaultValue={e.descripcion ?? ''} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visiblePortal" defaultChecked={e.visiblePortal} /> Mostrar en el Portal Cliente</label>
            <button className="btn w-full">Guardar</button>
          </form>
          <form action={borrarExpediente.bind(null, e.id)} className="text-right">
            <ConfirmButton mensaje="¿Eliminar el expediente con sus actuaciones y alertas?" className="btn-danger"><Trash2 size={14} /> Eliminar expediente</ConfirmButton>
          </form>
        </aside>
      </div>
    </>
  );
}
