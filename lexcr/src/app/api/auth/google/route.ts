import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { googleHabilitado, urlAutorizacion, urlBase } from '@/lib/google';

export async function GET(req: Request) {
  if (!googleHabilitado()) return Response.redirect(`${urlBase(req)}/ingresar?error=google`);
  const state = randomBytes(24).toString('base64url');
  (await cookies()).set('lexcr_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google',
    maxAge: 600,
  });
  return Response.redirect(urlAutorizacion(req, state));
}
