import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Chat } from '@/components/Chat';
import { Biblioteca } from './biblioteca';

export const metadata = { title: 'Jurisprudencia' };

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; tab?: string; q?: string }> }) {
  const user = await requireUser();
  const { c, tab, q } = await searchParams;
  const enBiblioteca = tab === 'biblioteca';

  const pestañas = (
    <div className="mb-6 inline-flex rounded-lg border border-line p-1 text-sm">
      <Link href="/dashboard/jurisprudencia" className={`rounded-md px-4 py-1.5 ${!enBiblioteca ? 'bg-accent text-white' : ''}`}>Búsqueda asistida</Link>
      <Link href="/dashboard/jurisprudencia?tab=biblioteca" className={`rounded-md px-4 py-1.5 ${enBiblioteca ? 'bg-accent text-white' : ''}`}>Biblioteca del despacho</Link>
    </div>
  );

  if (enBiblioteca) {
    const resoluciones = await prisma.resolucion.findMany({
      where: {
        despachoId: user.despachoId,
        ...(q ? { OR: [{ tema: { contains: q } }, { extracto: { contains: q } }, { numero: { contains: q } }, { tribunal: { contains: q } }] } : {}),
      },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
    return (
      <>
        {pestañas}
        <Biblioteca resoluciones={resoluciones} q={q ?? ''} />
      </>
    );
  }

  const conversaciones = await prisma.conversacion.findMany({
    where: { usuarioId: user.id, modo: 'jurisprudencia' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, titulo: true },
  });
  const actual = c
    ? await prisma.conversacion.findFirst({ where: { id: c, usuarioId: user.id }, include: { mensajes: { orderBy: { createdAt: 'asc' } } } })
    : null;

  return (
    <>
      {pestañas}
      <Chat
        modo="jurisprudencia"
        titulo="Jurisprudencia"
        descripcion="Búsqueda en fuentes oficiales: Poder Judicial (Nexus), SCIJ/PGR, Tribunal Registral Administrativo y DNN."
        base="/dashboard/jurisprudencia"
        conversaciones={conversaciones}
        actualId={actual?.id}
        inicial={actual?.mensajes.map((m) => ({ rol: m.rol, contenido: m.contenido, fuentes: m.fuentes ? JSON.parse(m.fuentes) : [] })) ?? []}
        placeholder="Describa el punto jurídico. Ej.: criterio de la Sala Primera sobre prescripción de la acción de daño moral"
      />
    </>
  );
}
