import Link from 'next/link';
import { FileSearch, MessageCircle, PenLine, Scale, Zap } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { diasHasta, fmtFecha } from '@/lib/fechas';
import { ConsultaRapida } from './consulta-rapida';

const TARJETAS = [
  { href: '/dashboard/jurisprudencia', titulo: 'Buscar jurisprudencia', texto: 'Localice votos y criterios oficiales para fundamentar su caso.', cta: 'Buscar ahora', icon: Scale, tono: 'bg-[#f6ecdf] border-[#e8d2b6] text-[#a0652c] dark:bg-[#2a2019] dark:border-[#4a3626] dark:text-[#e0a374]' },
  { href: '/dashboard/redactor', titulo: 'Redactar un instrumento', texto: 'Escrituras en formato de protocolo, contratos y escritos procesales.', cta: 'Empezar a redactar', icon: PenLine, tono: 'bg-[#e9f1e6] border-[#c9dcc0] text-[#4f7a3a] dark:bg-[#1b261a] dark:border-[#2f4229] dark:text-[#9cc58a]' },
  { href: '/dashboard/documentos', titulo: 'Analizar un documento', texto: 'Suba un archivo y obtenga observaciones, riesgos y puntos clave.', cta: 'Subir documento', icon: FileSearch, tono: 'bg-[#e6edf3] border-[#c3d3e0] text-[#3a5f7a] dark:bg-[#18222b] dark:border-[#2b3d4d] dark:text-[#8fb4d1]' },
  { href: '/dashboard/asistente', titulo: 'Plantear una consulta', texto: 'Haga una pregunta jurídica con enfoque en derecho costarricense.', cta: 'Hacer consulta', icon: MessageCircle, tono: 'bg-[#efe8f3] border-[#d6c8de] text-[#6b4a80] dark:bg-[#241c29] dark:border-[#3f3149] dark:text-[#c3a3d6]' },
];

export default async function Inicio() {
  const user = await requireUser();
  const alertas = await prisma.alerta.findMany({
    where: { despachoId: user.despachoId, completada: false },
    orderBy: { fechaVence: 'asc' },
    take: 5,
    include: { expediente: { select: { id: true, numero: true } } },
  });

  return (
    <>
      <section className="mb-10 mt-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
          <Zap size={13} /> Punto de partida
        </span>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">¿En qué trabajamos hoy?</h1>
        <p className="mt-3 text-lg text-muted">Bienvenido, {user.nombre.split(' ')[0]}. Elija una tarea y avancemos paso a paso.</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {TARJETAS.map((t) => (
          <Link key={t.href} href={t.href} className={`group rounded-2xl border p-6 transition hover:-translate-y-0.5 hover:shadow-md ${t.tono}`}>
            <div className="flex gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/60 dark:bg-white/5"><t.icon size={20} /></div>
              <div>
                <h3 className="text-xl font-semibold text-ink">{t.titulo}</h3>
                <p className="mt-1 text-muted">{t.texto}</p>
                <span className="mt-4 inline-block text-sm font-semibold">{t.cta} →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <ConsultaRapida />

      {alertas.length > 0 && (
        <section className="card mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos vencimientos</h2>
            <Link href="/dashboard/alertas" className="text-sm text-accent">Ver todos →</Link>
          </div>
          <table className="table">
            <tbody>
              {alertas.map((a) => {
                const d = diasHasta(a.fechaVence);
                return (
                  <tr key={a.id}>
                    <td>{a.titulo}</td>
                    <td className="text-muted">{a.expediente ? <Link className="underline" href={`/dashboard/expedientes/${a.expediente.id}`}>{a.expediente.numero}</Link> : '—'}</td>
                    <td>{fmtFecha(a.fechaVence)}</td>
                    <td className={d <= 3 ? 'font-semibold text-red-600' : d <= 10 ? 'text-amber-600' : 'text-emerald-700'}>
                      {d < 0 ? `Vencido hace ${-d} d` : d === 0 ? 'Hoy' : `${d} d`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
