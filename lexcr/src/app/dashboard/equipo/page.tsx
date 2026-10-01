import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtFecha } from '@/lib/fechas';
import { PageHead } from '@/components/PageHead';
import { FormMiembro, AccionesMiembro } from './cliente';

export const metadata = { title: 'Equipo' };

export default async function Page() {
  const admin = await requireAdmin();
  const miembros = await prisma.usuario.findMany({ where: { despachoId: admin.despachoId }, orderBy: { createdAt: 'asc' } });
  return (
    <>
      <PageHead titulo="Equipo" descripcion="Abogados, notarios y asistentes con acceso al despacho." />
      <FormMiembro />
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th className="pl-5">Nombre</th><th>Correo</th><th>Carné</th><th>Rol</th><th>Desde</th><th /></tr></thead>
          <tbody>
            {miembros.map((m) => (
              <tr key={m.id}>
                <td className="pl-5 font-medium">{m.nombre}{m.id === admin.id && <span className="ml-2 text-xs text-muted">(usted)</span>}</td>
                <td>{m.email}</td>
                <td>{m.carne ?? '—'}</td>
                <td>{m.rol === 'administrador' ? 'Administrador' : 'Miembro'}</td>
                <td className="text-muted">{fmtFecha(m.createdAt)}</td>
                <td>{m.id !== admin.id && <AccionesMiembro id={m.id} rol={m.rol} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
