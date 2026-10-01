'use client';

import { useActionState, useEffect, useRef } from 'react';
import { UserPlus } from 'lucide-react';
import { agregarMiembro, cambiarRol, quitarMiembro } from './actions';

export function FormMiembro() {
  const [estado, accion, pendiente] = useActionState(agregarMiembro, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok) ref.current?.reset(); }, [estado]);
  return (
    <form ref={ref} action={accion} className="card grid items-end gap-3 md:grid-cols-3">
      <label className="label">Nombre completo<input className="input" name="nombre" required /></label>
      <label className="label">Correo<input className="input" type="email" name="email" required /></label>
      <label className="label">Contraseña temporal<input className="input" type="text" name="password" minLength={8} required /></label>
      <label className="label">Carné profesional (opcional)<input className="input" name="carne" /></label>
      <label className="label">Rol<select className="input" name="rol"><option value="miembro">Miembro</option><option value="administrador">Administrador</option></select></label>
      <button className="btn" disabled={pendiente}><UserPlus size={15} /> Agregar al equipo</button>
      {estado.error && <p className="text-sm text-red-600 md:col-span-3">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-emerald-700 md:col-span-3">Miembro agregado. Comparta la contraseña temporal por un medio seguro; podrá cambiarla en Ajustes.</p>}
    </form>
  );
}

export function AccionesMiembro({ id, rol }: { id: string; rol: string }) {
  return (
    <div className="flex gap-2">
      <button className="btn-ghost" onClick={() => cambiarRol(id, rol === 'administrador' ? 'miembro' : 'administrador')}>
        {rol === 'administrador' ? 'Hacer miembro' : 'Hacer administrador'}
      </button>
      <button className="btn-danger" onClick={() => confirm('¿Quitar a esta persona del despacho?') && quitarMiembro(id)}>Quitar</button>
    </div>
  );
}
