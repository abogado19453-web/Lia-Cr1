import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { diasHasta, fmtFecha } from '@/lib/fechas';
import { PLANES, planEfectivo } from '@/lib/planes';
import { esAdminPlataforma } from '@/lib/suscripcion';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const urgentes = await prisma.alerta.count({
    where: { despachoId: user.despachoId, completada: false, fechaVence: { lte: limite } },
  });
  const { plan, planVence } = user.despacho;
  const efectivo = planEfectivo(plan, planVence);
  const diasPlan = efectivo !== 'gratis' && planVence ? diasHasta(planVence) : null;
  const vencido = plan !== 'gratis' && efectivo === 'gratis';

  return (
    <div className="md:flex">
      <Sidebar
        nombre={user.nombre}
        email={user.email}
        rol={user.rol}
        despacho={user.despacho.nombre}
        alertasUrgentes={urgentes}
        plan={PLANES[efectivo].nombre}
        pagado={efectivo !== 'gratis'}
        adminPlataforma={esAdminPlataforma(user.email)}
      />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          {(vencido || (diasPlan !== null && diasPlan <= 7)) && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <span>
                {vencido
                  ? `Su plan ${PLANES[plan as keyof typeof PLANES]?.nombre ?? ''} venció; el despacho opera con los límites del plan Gratis.`
                  : `Su plan ${PLANES[efectivo].nombre} vence el ${fmtFecha(planVence)}.`}
              </span>
              <Link className="font-semibold underline" href="/dashboard/plan">Renovar</Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
