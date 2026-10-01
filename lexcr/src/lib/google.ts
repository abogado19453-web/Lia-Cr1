import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const googleHabilitado = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function urlBase(req: Request) {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
}

export const redirectUri = (req: Request) => `${urlBase(req)}/api/auth/google/callback`;

export function urlAutorizacion(req: Request, state: string) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  return u.toString();
}

/** Canjea el código por un id_token y lo verifica con las llaves públicas de Google. */
export async function canjearCodigo(req: Request, code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('Google rechazó el código de autorización.');
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error('Google no devolvió identidad.');
  const { payload } = await jwtVerify(id_token, JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.email_verified !== true || typeof payload.email !== 'string') {
    throw new Error('El correo de Google no está verificado.');
  }
  return { email: payload.email.toLowerCase(), nombre: typeof payload.name === 'string' ? payload.name : payload.email };
}
