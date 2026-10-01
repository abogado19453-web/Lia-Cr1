'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, firmarSesion, sessionCookieOptions } from '@/lib/session';

export type EstadoForm = { error?: string } | undefined;

async function abrirSesion(u: { id: string; despachoId: string; rol: string }) {
  const token = await firmarSesion({ uid: u.id, did: u.despachoId, rol: u.rol });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

function destinoSeguro(v: FormDataEntryValue | null) {
  return typeof v === 'string' && v.startsWith('/dashboard') ? v : '/dashboard';
}

export async function ingresar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: 'Correo o contraseña incorrectos.' };
  }
  await abrirSesion(u);
  redirect(destinoSeguro(fd.get('next')));
}

const RegistroSchema = z.object({
  nombre: z.string().trim().min(3, 'Indique su nombre completo.'),
  despacho: z.string().trim().min(2, 'Indique el nombre del despacho.'),
  email: z.string().trim().toLowerCase().email('Correo inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export async function registrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const p = RegistroSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await prisma.usuario.findUnique({ where: { email: p.data.email } })) {
    return { error: 'Ya existe una cuenta con ese correo.' };
  }
  const u = await prisma.usuario.create({
    data: {
      nombre: p.data.nombre,
      email: p.data.email,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      rol: 'administrador',
      despacho: { create: { nombre: p.data.despacho } },
    },
  });
  await abrirSesion(u);
  redirect('/dashboard');
}

export async function cerrarSesion() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/ingresar');
}
