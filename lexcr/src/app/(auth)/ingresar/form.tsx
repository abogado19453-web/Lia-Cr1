'use client';

import { useActionState } from 'react';
import { ingresar } from '../actions';

export function FormIngreso({ next }: { next?: string }) {
  const [estado, accion, pendiente] = useActionState(ingresar, undefined);
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="label">Correo electrónico<input className="input" name="email" type="email" required autoComplete="email" /></label>
      <label className="label">Contraseña<input className="input" name="password" type="password" required autoComplete="current-password" /></label>
      {estado?.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <button className="btn mt-2" disabled={pendiente}>{pendiente ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  );
}
