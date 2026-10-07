import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verificarSesion } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const s = await verificarSesion(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const url = new URL('/ingresar', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/api/ia/:path*', '/api/documentos/:path*', '/api/protocolo/:path*', '/api/pagos/:path*'] };
