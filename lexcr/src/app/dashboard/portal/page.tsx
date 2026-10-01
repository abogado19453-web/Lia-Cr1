import { headers } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PageHead } from '@/components/PageHead';
import { crearCliente } from './actions';
import { FilaCliente } from './fila';

export const metadata = { title: 'Portal Cliente' };

export default async function Page() {
  const user = await requireUser();
  const h = await headers();
  const origen = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const clientes = await prisma.cliente.findMany({
    where: { despachoId: user.despachoId },
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { expedientes: true } } },
  });

  return (
    <>
      <PageHead titulo="Portal Cliente" descripcion="Comparta con cada cliente un enlace privado para consultar el estado de sus asuntos." />
      <form action={crearCliente} className="card mb-6 grid items-end gap-3 md:grid-cols-[1fr_180px_220px_160px_auto]">
        <label className="label">Nombre o razón social<input className="input" name="nombre" required /></label>
        <label className="label">Cédula<input className="input" name="cedula" /></label>
        <label className="label">Correo<input className="input" type="email" name="email" /></label>
        <label className="label">Teléfono<input className="input" name="telefono" /></label>
        <button className="btn">Agregar cliente</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="pl-5">Cliente</th><th>Contacto</th><th>Expedientes</th><th>Acceso al portal</th><th /></tr></thead>
          <tbody>
            {clientes.map((c) => (
              <FilaCliente
                key={c.id}
                id={c.id}
                nombre={c.nombre}
                cedula={c.cedula}
                contacto={[c.email, c.telefono].filter(Boolean).join(' · ')}
                expedientes={c._count.expedientes}
                enlace={c.portalToken ? `${origen}/portal/${c.portalToken}` : null}
              />
            ))}
            {!clientes.length && <tr><td colSpan={5} className="py-10 text-center text-muted">Sin clientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">El cliente solo verá los expedientes, actuaciones y documentos que usted marque como visibles. Revocar el acceso invalida el enlace de inmediato.</p>
    </>
  );
}
