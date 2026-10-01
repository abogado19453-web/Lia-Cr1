import Link from 'next/link';
import { BotonGoogle } from '@/components/BotonGoogle';
import { googleHabilitado } from '@/lib/google';
import { FormRegistro } from './form';

export const metadata = { title: 'Registro' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <h2 className="mb-1 text-xl font-semibold">Registrar despacho</h2>
      <p className="mb-4 text-sm text-muted">Usted será el administrador y podrá invitar a su equipo.</p>
      {googleHabilitado() && <BotonGoogle />}
      <FormRegistro />
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tiene cuenta? <Link className="text-accent underline" href="/ingresar">Ingresar</Link>
      </p>
    </>
  );
}
