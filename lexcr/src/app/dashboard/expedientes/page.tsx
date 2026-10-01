import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { MATERIAS } from '@/lib/config';
import { prisma } from '@/lib/db';
import { diasHasta, fmtFecha } from '@/lib/fechas';
import { PageHead } from '@/components/PageHead';
import { crearExpediente } from './actions';

export const metadata = { title: 'Expedientes' };

const ESTADOS: Record<string, string> = { activo: 'Activo', suspendido: 'Suspendido', archivado: 'Archivado' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; materia?: string }> }) {
  const user = await requireUser();
  const { q, estado, materia } = await searchParams;
  const [expedientes, clientes] = await Promise.all([
    prisma.expediente.findMany({
      where: {
        despachoId: user.despachoId,
        ...(estado ? { estado } : { estado: { not: 'archivado' } }),
        ...(materia ? { materia } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { titulo: { contains: q } }, { contraparte: { contains: q } }, { cliente: { nombre: { contains: q } } }] } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        cliente: { select: { nombre: true } },
        alertas: { where: { completada: false }, orderBy: { fechaVence: 'asc' }, take: 1 },
      },
    }),
    prisma.cliente.findMany({ where: { despachoId: user.despachoId }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
  ]);

  return (
    <>
      <PageHead titulo="Expedientes" descripcion="Asuntos judiciales, notariales y administrativos del despacho." />

      <details className="card mb-6">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Plus size={16} /> Nuevo expediente</summary>
        <form action={crearExpediente} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="label">Número o referencia<input className="input" name="numero" required placeholder="24-000123-0180-CI" /></label>
          <label className="label md:col-span-2">Título o asunto<input className="input" name="titulo" required placeholder="Ordinario de daños y perjuicios" /></label>
          <label className="label">Materia<select className="input" name="materia">{MATERIAS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="label">Cliente
            <select className="input" name="clienteId"><option value="">—</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
          </label>
          <label className="label">Despacho u oficina<input className="input" name="despachoJudicial" placeholder="Juzgado, Registro, notaría…" /></label>
          <label className="label">Contraparte<input className="input" name="contraparte" /></label>
          <label className="label md:col-span-2">Descripción<input className="input" name="descripcion" /></label>
          <div><button className="btn">Crear expediente</button></div>
        </form>
        {!clientes.length && <p className="mt-3 text-xs text-muted">Registre clientes en <Link className="underline" href="/dashboard/portal">Portal Cliente</Link> para vincularlos.</p>}
      </details>

      <form className="mb-3 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Buscar número, asunto, cliente…" />
        <select className="input w-40" name="estado" defaultValue={estado ?? ''}>
          <option value="">Abiertos</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-44" name="materia" defaultValue={materia ?? ''}>
          <option value="">Todas las materias</option>
          {MATERIAS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <button className="btn-ghost">Filtrar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="pl-5">Número</th><th>Asunto</th><th>Cliente</th><th>Materia</th><th>Próximo plazo</th><th>Estado</th></tr></thead>
          <tbody>
            {expedientes.map((e) => {
              const a = e.alertas[0];
              const d = a ? diasHasta(a.fechaVence) : null;
              return (
                <tr key={e.id}>
                  <td className="pl-5"><Link className="font-medium hover:text-accent" href={`/dashboard/expedientes/${e.id}`}>{e.numero}</Link></td>
                  <td>{e.titulo}</td>
                  <td>{e.cliente?.nombre ?? '—'}</td>
                  <td>{e.materia}</td>
                  <td>{a ? <span className={d! <= 3 ? 'font-semibold text-red-600' : ''}>{fmtFecha(a.fechaVence)} · {a.titulo}</span> : <span className="text-muted">—</span>}</td>
                  <td><span className="tag">{ESTADOS[e.estado] ?? e.estado}</span></td>
                </tr>
              );
            })}
            {!expedientes.length && <tr><td colSpan={6} className="py-10 text-center text-muted">Sin expedientes.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
