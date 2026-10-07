import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';

const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function fecha(v: string | null, finDeDia = false) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return finDeDia ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d);
}

/** Índice de instrumentos autorizados en un rango de fechas, para su remisión al Archivo Notarial. */
export async function GET(req: Request) {
  const s = await verificarSesion((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return new Response('No autenticado', { status: 401 });
  const url = new URL(req.url);
  const desde = fecha(url.searchParams.get('desde'));
  const hasta = fecha(url.searchParams.get('hasta'), true);
  if (!desde || !hasta) return new Response('Rango de fechas inválido', { status: 400 });

  const filas = await prisma.escritura.findMany({
    where: { despachoId: s.did, fecha: { gte: desde, lte: hasta } },
    orderBy: [{ tomo: 'asc' }, { numero: 'asc' }],
  });
  const encabezado = ['Tomo', 'Número', 'Folio inicial', 'Folio final', 'Fecha', 'Acto o contrato', 'Otorgantes', 'Cuantía'];
  const cuerpo = filas.map((e) =>
    [e.tomo, e.numero, e.folioInicio, e.folioFin, e.fecha.toLocaleDateString('es-CR'), e.acto, e.otorgantes, e.valor].map(csv).join(','),
  );
  const contenido = '﻿' + [encabezado.map(csv).join(','), ...cuerpo].join('\r\n');
  const nombre = `indice-notarial-${url.searchParams.get('desde')}-a-${url.searchParams.get('hasta')}.csv`;
  return new Response(contenido, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nombre}"` },
  });
}
