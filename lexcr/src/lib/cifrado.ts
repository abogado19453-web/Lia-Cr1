import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Clave AES-256 derivada de LEXCR_CLAVE_CIFRADO (o, en su defecto, de AUTH_SECRET). */
function clave() {
  const base = process.env.LEXCR_CLAVE_CIFRADO || process.env.AUTH_SECRET;
  if (!base) throw new Error('Falta AUTH_SECRET para cifrar las claves de IA.');
  return createHash('sha256').update('lexcr-ia:' + base).digest();
}

/** Cifra con AES-256-GCM. Formato: v1.iv.tag.datos (base64url). */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), datos.toString('base64url')].join('.');
}

export function descifrar(valor: string): string {
  const [v, iv, tag, datos] = valor.split('.');
  if (v !== 'v1' || !iv || !tag || !datos) throw new Error('Formato de clave cifrada inválido.');
  const d = createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(datos, 'base64url')), d.final()]).toString('utf8');
}
