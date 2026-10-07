import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { toInputDate } from '@/lib/fechas';
import { PageHead } from '@/components/PageHead';
import { Protocolo } from './protocolo';

export const metadata = { title: 'Protocolo' };

export default async function Page({ searchParams }: { searchParams: Promise<{ tomo?: string; q?: string }> }) {
  const user = await requireUser();
  const { tomo, q } = await searchParams;
  const tomos = await prisma.escritura.groupBy({ by: ['tomo'], where: { despachoId: user.despachoId }, _max: { numero: true }, orderBy: { tomo: 'desc' } });
  const tomoActual = tomo ? Number(tomo) : tomos[0]?.tomo;
  const escrituras = await prisma.escritura.findMany({
    where: {
      despachoId: user.despachoId,
      ...(tomoActual ? { tomo: tomoActual } : {}),
      ...(q ? { OR: [{ acto: { contains: q } }, { otorgantes: { contains: q } }] } : {}),
    },
    orderBy: [{ tomo: 'desc' }, { numero: 'desc' }],
  });
  const ultimo = tomos.find((t) => t.tomo === tomoActual)?._max.numero ?? 0;
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() <= 15 ? 1 : 16);

  return (
    <>
      <PageHead titulo="Protocolo" descripcion="Control de instrumentos autorizados, estado registral e índice notarial." />
      <Protocolo
        escrituras={escrituras.map((e) => ({ ...e, fecha: e.fecha.toISOString() , createdAt: e.createdAt.toISOString() }))}
        tomos={tomos.map((t) => t.tomo)}
        tomoActual={tomoActual}
        siguiente={{ tomo: tomoActual ?? 1, numero: ultimo + 1 }}
        q={q ?? ''}
        rangoIndice={{ desde: toInputDate(desde), hasta: toInputDate(hoy) }}
      />
    </>
  );
}
