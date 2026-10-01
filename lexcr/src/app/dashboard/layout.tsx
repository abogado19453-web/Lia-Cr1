import { Sidebar } from '@/components/Sidebar';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const urgentes = await prisma.alerta.count({
    where: { despachoId: user.despachoId, completada: false, fechaVence: { lte: limite } },
  });
  return (
    <div className="md:flex">
      <Sidebar nombre={user.nombre} email={user.email} rol={user.rol} despacho={user.despacho.nombre} alertasUrgentes={urgentes} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
