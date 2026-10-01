import Link from 'next/link';
import { FormRegistro } from './form';

export const metadata = { title: 'Registro' };

export default function Page() {
  return (
    <>
      <h2 className="mb-1 text-xl font-semibold">Registrar despacho</h2>
      <p className="mb-4 text-sm text-muted">Usted será el administrador y podrá invitar a su equipo.</p>
      <FormRegistro />
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tiene cuenta? <Link className="text-accent underline" href="/ingresar">Ingresar</Link>
      </p>
    </>
  );
}
