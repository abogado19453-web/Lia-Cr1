import { PageHead } from '@/components/PageHead';
import { Calculadora } from './calculadora';

export const metadata = { title: 'Derecho Laboral' };

export default function Page() {
  return (
    <>
      <PageHead titulo="Derecho Laboral" descripcion="Cálculo de derechos laborales al término de la relación conforme al Código de Trabajo." />
      <Calculadora />
    </>
  );
}
