import Link from 'next/link';
import { marca } from '@/lib/config';
import { PageHead } from '@/components/PageHead';

export const metadata = { title: 'Guía de uso' };

const SECCIONES = [
  { href: '/dashboard/expedientes', t: 'Expedientes', d: 'Registre cada asunto con número, materia, cliente, despacho y contraparte. Anote las actuaciones en la bitácora y vincule documentos y plazos. Archive el expediente al concluir.' },
  { href: '/dashboard/alertas', t: 'Alertas', d: 'Registre plazos, audiencias y vencimientos. El menú muestra cuántos vencen en los próximos tres días. Los días se cuentan en naturales: verifique el cómputo procesal.' },
  { href: '/dashboard/asistente', t: 'Asistente IA', d: 'Plantee consultas jurídicas. Las conversaciones se guardan y puede retomarlas. El asistente debe advertir cuando no tenga certeza de una cita; verifique siempre en SCIJ o Nexus.' },
  { href: '/dashboard/jurisprudencia', t: 'Jurisprudencia', d: 'La búsqueda asistida consulta únicamente fuentes oficiales (Poder Judicial, PGR/SCIJ, TRA, DNN) y muestra los enlaces consultados. La biblioteca guarda los votos que el despacho usa con frecuencia.' },
  { href: '/dashboard/redactor', t: 'Redactor Legal', d: 'Elija la clase y el tipo de documento, aporte los datos y genere el borrador. Las escrituras salen en texto corrido con cantidades en letras; al exportar a Word se numeran las líneas por página. Lo que falte queda entre corchetes.' },
  { href: '/dashboard/documentos', t: 'Documentos', d: 'Suba PDF, DOCX o TXT y analícelos con IA (requisitos formales, riesgos y puntos clave). Los borradores generados también se guardan aquí y pueden editarse.' },
  { href: '/dashboard/laboral', t: 'Derecho Laboral', d: 'Calcule preaviso, cesantía, vacaciones y aguinaldo a partir de fechas y salario promedio, con la fundamentación de cada rubro.' },
  { href: '/dashboard/protocolo', t: 'Protocolo', d: 'Lleve el control de escrituras por tomo y folio, su estado registral y citas de presentación. Descargue el índice de instrumentos por quincena en CSV.' },
  { href: '/dashboard/portal', t: 'Portal Cliente', d: 'Registre clientes y genere un enlace privado. El cliente solo ve los expedientes, actuaciones y documentos marcados como visibles.' },
  { href: '/dashboard/equipo', t: 'Equipo', d: 'Los administradores agregan miembros con una contraseña temporal y asignan roles.' },
  { href: '/dashboard/plan', t: 'Mi plan', d: 'Consulte el consumo del mes y amplíe su plan. Pague con tarjeta (activación inmediata) o por SINPE Móvil o transferencia, reportando el comprobante. Descargue los recibos de cada pago.' },
];

export default function Page() {
  return (
    <>
      <PageHead titulo="Guía de uso" descripcion={`Cómo aprovechar ${marca.nombre} en el trabajo diario del despacho.`} />
      <div className="grid gap-4 md:grid-cols-2">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="card transition hover:border-accent">
            <h2 className="text-lg font-semibold">{s.t}</h2>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </Link>
        ))}
      </div>
      <section className="card mt-6 text-sm text-muted">
        <h2 className="mb-2 text-lg font-semibold text-ink">Confidencialidad</h2>
        <p>Los textos que envía al asistente, al redactor o al análisis se procesan con la API de Anthropic. Evalúe, conforme al secreto profesional, qué datos de clientes incluir; puede trabajar con marcadores y completar los datos sensibles en el documento final.</p>
      </section>
    </>
  );
}
