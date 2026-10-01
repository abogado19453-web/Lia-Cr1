import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PageHead } from '@/components/PageHead';
import { Redactor } from './redactor';

export const metadata = { title: 'Redactor Legal' };

export default async function Page({ searchParams }: { searchParams: Promise<{ expediente?: string }> }) {
  const user = await requireUser();
  const { expediente } = await searchParams;
  const expedientes = await prisma.expediente.findMany({
    where: { despachoId: user.despachoId, estado: { not: 'archivado' } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, numero: true, titulo: true },
  });
  return (
    <>
      <PageHead titulo="Redactor Legal" descripcion="Genere un primer borrador con estructura profesional. Las escrituras se redactan en formato de protocolo." />
      <Redactor expedientes={expedientes} expedienteInicial={expediente} />
    </>
  );
}
