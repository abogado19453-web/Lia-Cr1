import { requireUser } from '@/lib/auth';
import { PageHead } from '@/components/PageHead';
import { FormPassword, FormPerfil } from './forms';

export const metadata = { title: 'Ajustes' };

export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <PageHead titulo="Ajustes" descripcion="Datos personales, del despacho y seguridad de la cuenta." />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormPerfil nombre={user.nombre} carne={user.carne ?? ''} email={user.email} despacho={user.despacho.nombre} esAdmin={user.rol === 'administrador'} />
        <FormPassword />
      </div>
    </>
  );
}
