'use client';

import { useActionState } from 'react';
import { cambiarPassword, guardarPerfil } from './actions';

type Estado = { error?: string; ok?: string };

function Mensaje({ e }: { e: Estado }) {
  if (e.error) return <p className="text-sm text-red-600">{e.error}</p>;
  if (e.ok) return <p className="text-sm text-emerald-700">{e.ok}</p>;
  return null;
}

export function FormPerfil(p: { nombre: string; carne: string; email: string; despacho: string; esAdmin: boolean }) {
  const [estado, accion, pend] = useActionState(guardarPerfil, {});
  return (
    <form action={accion} className="card space-y-3">
      <h2 className="text-lg font-semibold">Perfil</h2>
      <label className="label">Nombre completo<input className="input" name="nombre" defaultValue={p.nombre} required /></label>
      <label className="label">Carné profesional<input className="input" name="carne" defaultValue={p.carne} /></label>
      <label className="label">Correo<input className="input" value={p.email} disabled /></label>
      <label className="label">Nombre del despacho<input className="input" name="despacho" defaultValue={p.despacho} disabled={!p.esAdmin} /></label>
      <Mensaje e={estado} />
      <button className="btn" disabled={pend}>Guardar</button>
    </form>
  );
}

export function FormPassword() {
  const [estado, accion, pend] = useActionState(cambiarPassword, {});
  return (
    <form action={accion} className="card space-y-3">
      <h2 className="text-lg font-semibold">Contraseña</h2>
      <label className="label">Contraseña actual<input className="input" type="password" name="actual" required autoComplete="current-password" /></label>
      <label className="label">Nueva contraseña<input className="input" type="password" name="nueva" minLength={8} required autoComplete="new-password" /></label>
      <label className="label">Confirmar<input className="input" type="password" name="confirmar" minLength={8} required autoComplete="new-password" /></label>
      <Mensaje e={estado} />
      <button className="btn" disabled={pend}>Cambiar contraseña</button>
    </form>
  );
}
