import { prisma } from '@/lib/db';
import { generarDocx } from '@/lib/docx';
import { leerArchivo } from '@/lib/storage';

export async function GET(_: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const doc = await prisma.documento.findFirst({
    where: { id, visiblePortal: true, expediente: { visiblePortal: true, cliente: { portalToken: token } } },
  });
  if (!doc) return new Response('No encontrado', { status: 404 });
  const disp = (n: string) => `attachment; filename*=UTF-8''${encodeURIComponent(n)}`;
  if (doc.ruta) {
    return new Response(new Uint8Array(await leerArchivo(doc.ruta)), {
      headers: { 'Content-Type': doc.mime || 'application/octet-stream', 'Content-Disposition': disp(doc.nombre) },
    });
  }
  const buf = await generarDocx(doc.contenido ?? '', { escritura: doc.clase === 'escritura' });
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': disp(doc.nombre + '.docx') },
  });
}
