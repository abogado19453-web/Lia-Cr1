import Link from 'next/link';
import { BotonGoogle } from '@/components/BotonGoogle';
import { googleHabilitado } from '@/lib/google';
import { FormIngreso } from './form';

export const metadata = { title: 'Ingresar' };
export const dynamic = 'force-dynamic';

const ERRORES: Record<string, string> = {
  google: 'No fue posible ingresar con Google. Intente de nuevo o use su correo y contraseña.',
  estado: 'La sesión de ingreso con Google expiró. Intente de nuevo.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Ingresar</h2>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{ERRORES[error] ?? 'No fue posible ingresar.'}</p>}
      {googleHabilitado() && <BotonGoogle />}
      <FormIngreso next={next} />
      <p className="mt-4 text-center text-sm text-muted">
        ¿No tiene cuenta? <Link className="text-accent underline" href="/registro">Registre su despacho</Link>
      </p>
    </>
  );
}
