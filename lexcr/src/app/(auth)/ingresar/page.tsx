import Link from 'next/link';
import { FormIngreso } from './form';

export const metadata = { title: 'Ingresar' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Ingresar</h2>
      <FormIngreso next={next} />
      <p className="mt-4 text-center text-sm text-muted">
        ¿No tiene cuenta? <Link className="text-accent underline" href="/registro">Registre su despacho</Link>
      </p>
    </>
  );
}
