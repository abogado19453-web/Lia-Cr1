import { z } from 'zod';
import { generar, respuestaStream } from '@/lib/ai';
import { prepararIA } from '@/lib/ia-ruta';

const Body = z.object({
  clase: z.enum(['escritura', 'contrato', 'procesal', 'otro']),
  tipo: z.string().trim().min(2).max(200),
  datos: z.string().max(20000).default(''),
  instrucciones: z.string().max(20000).default(''),
  proveedorId: z.string().optional(),
});

const CLASES = {
  escritura: 'ESCRITURA PÚBLICA (formato de protocolo notarial)',
  contrato: 'CONTRATO PRIVADO',
  procesal: 'ESCRITO PROCESAL',
  otro: 'DOCUMENTO JURÍDICO',
};

export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const { clase, tipo, datos, instrucciones } = p.data;
  const ctx = await prepararIA(p.data.proveedorId, 'redaccion');
  if (ctx instanceof Response) return ctx;

  const pedido = `Clase de documento: ${CLASES[clase]}
Tipo: ${tipo}

Datos suministrados:
${datos || '(ninguno; use marcadores entre corchetes)'}

Instrucciones adicionales:
${instrucciones || '(ninguna)'}`;

  return respuestaStream(generar('redactor', [{ role: 'user', content: pedido }], ctx.proveedor, { effort: 'high' }));
}
