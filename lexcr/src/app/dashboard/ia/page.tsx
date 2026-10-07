import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TIPOS_IA, esTipoIA } from '@/lib/ia-catalogo';
import { PageHead } from '@/components/PageHead';
import { FormProveedor, TarjetaProveedor } from './cliente';

export const metadata = { title: 'Inteligencia artificial' };

export default async function Page() {
  const admin = await requireAdmin();
  const [proveedores, miembros] = await Promise.all([
    prisma.proveedorIA.findMany({
      where: { despachoId: admin.despachoId },
      orderBy: [{ predeterminado: 'desc' }, { createdAt: 'asc' }],
      include: { permisos: { select: { usuarioId: true } } },
    }),
    prisma.usuario.findMany({ where: { despachoId: admin.despachoId }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, rol: true } }),
  ]);
  const usuarios = miembros.filter((m) => m.rol !== 'administrador');
  const envActiva = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <PageHead
        titulo="Inteligencia artificial"
        descripcion="Proveedores de IA del despacho. Solo los administradores pueden agregarlos y decidir qué usuarios los usan."
      />

      {!proveedores.length && (
        <p className="mb-6 rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          {envActiva
            ? 'Por ahora el despacho usa la clave de Anthropic del archivo .env. Al agregar el primer proveedor aquí, esa clave deja de usarse y cada usuario necesitará autorización.'
            : 'Aún no hay inteligencia artificial configurada. Agregue un proveedor para activar el Asistente, el Redactor, el Análisis y la Jurisprudencia.'}
        </p>
      )}

      <div className="space-y-4">
        {proveedores.map((p) => (
          <TarjetaProveedor
            key={p.id}
            proveedor={{
              id: p.id,
              nombre: p.nombre,
              tipo: esTipoIA(p.tipo) ? p.tipo : 'compatible',
              tipoNombre: esTipoIA(p.tipo) ? TIPOS_IA[p.tipo].nombre : p.tipo,
              modelo: p.modelo,
              baseUrl: p.baseUrl ?? '',
              claveFinal: p.apiKeyFinal,
              activo: p.activo,
              predeterminado: p.predeterminado,
              autorizados: p.permisos.map((x) => x.usuarioId),
            }}
            usuarios={usuarios}
          />
        ))}
      </div>

      <section className="card mt-6">
        <h2 className="mb-1 text-lg font-semibold">Agregar proveedor</h2>
        <p className="mb-4 text-sm text-muted">La clave se guarda cifrada y no vuelve a mostrarse; solo se ven sus últimos 4 caracteres.</p>
        <FormProveedor />
      </section>

      <section className="card mt-6 text-sm text-muted">
        <h2 className="mb-2 text-base font-semibold text-ink">IA local (Ollama o LM Studio)</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Instale <b>Ollama</b> (ollama.com) o <b>LM Studio</b> (lmstudio.ai) en esta computadora y descargue un modelo desde esa aplicación.</li>
          <li>Agregue aquí un proveedor de tipo «IA local». Dirección: <code>http://localhost:11434/v1</code> para Ollama o <code>http://localhost:1234/v1</code> para LM Studio (con su servidor local activado).</li>
          <li>Pulse «Detectar modelos», elija el modelo descargado y guarde.</li>
        </ol>
        <p className="mt-2">Con IA local los textos no salen de su red ni tienen costo por consulta. La calidad depende del modelo y de la potencia del equipo. La búsqueda de jurisprudencia en fuentes oficiales solo está disponible con Anthropic.</p>
      </section>
    </>
  );
}
