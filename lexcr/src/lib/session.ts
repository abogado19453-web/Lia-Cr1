import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'lexcr_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = { uid: string; did: string; rol: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET no está configurado (mínimo 16 caracteres).');
  return new TextEncoder().encode(s);
}

export async function firmarSesion(p: SessionPayload) {
  return new SignJWT(p)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verificarSesion(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== 'string' || typeof payload.did !== 'string') return null;
    return { uid: payload.uid, did: payload.did, rol: String(payload.rol ?? 'miembro') };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE,
};
