import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const RAIZ = path.resolve(process.env.UPLOAD_DIR || './uploads');

export async function guardarArchivo(despachoId: string, nombre: string, data: Buffer) {
  const dir = path.join(RAIZ, despachoId);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(nombre).slice(0, 10).replace(/[^.\w]/g, '');
  const rel = path.join(despachoId, randomUUID() + ext);
  await writeFile(path.join(RAIZ, rel), data);
  return rel;
}

function absoluta(rel: string) {
  const abs = path.resolve(RAIZ, rel);
  if (!abs.startsWith(RAIZ + path.sep)) throw new Error('Ruta inválida');
  return abs;
}

export const leerArchivo = (rel: string) => readFile(absoluta(rel));
export const borrarArchivo = (rel: string) => unlink(absoluta(rel)).catch(() => undefined);
