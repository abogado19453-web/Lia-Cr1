'use client';

import { useActionState } from 'react';
import { registrar } from '../actions';

export function FormRegistro() {
  const [estado, accion, pendiente] = useActionState(registrar, undefined);
  return (
    <form action={accion} className="flex flex-col gap-3">
      <label className="label">Nombre completo<input className="input" name="nombre" required /></label>
      <label className="label">Nombre del despacho<input className="input" name="despacho" required /></label>
      <label className="label">Correo electrónico<input className="input" name="email" type="email" required autoComplete="email" /></label>
      <label className="label">Contraseña (mínimo 8 caracteres)<input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
      {estado?.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <button className="btn mt-2" disabled={pendiente}>{pendiente ? 'Creando…' : 'Crear cuenta'}</button>
    </form>
  );
}
