import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { proveedoresDisponibles } from '@/lib/ia-proveedores';
import { Chat } from '@/components/Chat';

export const metadata = { title: 'Asistente IA' };

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const user = await requireUser();
  const { c, q } = await searchParams;
  const conversaciones = await prisma.conversacion.findMany({
    where: { usuarioId: user.id, modo: 'consulta' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, titulo: true },
  });
  const actual = c
    ? await prisma.conversacion.findFirst({
        where: { id: c, usuarioId: user.id },
        include: { mensajes: { orderBy: { createdAt: 'asc' } } },
      })
    : null;
  return (
    <Chat
      modo="consulta"
      titulo="Asistente IA"
      descripcion="Consultas jurídicas con enfoque en el ordenamiento costarricense."
      base="/dashboard/asistente"
      conversaciones={conversaciones}
      actualId={actual?.id}
      proveedores={await proveedoresDisponibles(user)}
      inicial={actual?.mensajes.map((m) => ({ rol: m.rol, contenido: m.contenido, fuentes: m.fuentes ? JSON.parse(m.fuentes) : [], proveedor: m.proveedor })) ?? []}
      pregunta={q}
    />
  );
}
