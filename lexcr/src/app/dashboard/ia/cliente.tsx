'use client';

import { useRef, useState, useTransition } from 'react';
import { CheckCircle2, KeyRound, Pencil, Plug, Star, Trash2, XCircle } from 'lucide-react';
import { TIPOS_IA, type TipoIA } from '@/lib/ia-catalogo';
import { alternarActivo, cambiarPermiso, detectarModelos, eliminarProveedor, guardarProveedor, hacerPredeterminado, probarConexion } from './actions';

type Inicial = { id: string; nombre: string; tipo: TipoIA; modelo: string; baseUrl: string; claveFinal: string | null };

export function FormProveedor({ inicial, alGuardar }: { inicial?: Inicial; alGuardar?: () => void }) {
  const [tipo, setTipo] = useState<TipoIA>(inicial?.tipo ?? 'anthropic');
  const [base, setBase] = useState(inicial?.baseUrl || TIPOS_IA[inicial?.tipo ?? 'anthropic'].baseUrl);
  const [modelo, setModelo] = useState(inicial?.modelo ?? TIPOS_IA.anthropic.modeloSugerido);
  // Se envía manualmente para que React no reinicie el formulario entre «Detectar» y «Guardar».
  const formRef = useRef<HTMLFormElement>(null);
  const [guardado, setGuardado] = useState<{ ok?: string; error?: string }>({});
  const [deteccion, setDeteccion] = useState<{ ok?: string; error?: string; modelos?: string[] }>({});
  const [guardando, startGuardar] = useTransition();
  const [detectando, startDetectar] = useTransition();

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startGuardar(async () => {
      const r = await guardarProveedor({}, fd);
      setGuardado(r);
      if (!r.ok) return;
      if (alGuardar) alGuardar();
      else {
        formRef.current?.reset();
        setTipo('anthropic');
        setBase(TIPOS_IA.anthropic.baseUrl);
        setModelo(TIPOS_IA.anthropic.modeloSugerido);
        setDeteccion({});
      }
    });
  }

  function detectar() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startDetectar(async () => setDeteccion(await detectarModelos({}, fd)));
  }
  const cat = TIPOS_IA[tipo];
  const lista = `modelos-${inicial?.id ?? 'nuevo'}`;

  return (
    <form ref={formRef} onSubmit={guardar} className="grid gap-3 md:grid-cols-2">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <label className="label md:col-span-2">Tipo de proveedor
        <select
          className="input"
          name="tipo"
          value={tipo}
          onChange={(e) => {
            const t = e.target.value as TipoIA;
            setTipo(t);
            setBase(TIPOS_IA[t].baseUrl);
            setModelo(TIPOS_IA[t].modeloSugerido);
          }}
        >
          {(Object.keys(TIPOS_IA) as TipoIA[]).map((t) => <option key={t} value={t}>{TIPOS_IA[t].nombre}</option>)}
        </select>
        <span className="text-xs font-normal">{cat.descripcion}</span>
      </label>
      <label className="label">Nombre visible para los usuarios
        <input className="input" name="nombre" defaultValue={inicial?.nombre} placeholder={cat.nombre} />
      </label>
      <label className="label">Dirección (URL base)
        <input className="input" name="baseUrl" value={base} onChange={(e) => setBase(e.target.value)} readOnly={!cat.baseEditable} placeholder="https://…/v1" />
      </label>
      <label className="label">Clave de API {cat.requiereClave ? '' : '(opcional)'}
        <input
          className="input"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={inicial?.claveFinal ? `Guardada (…${inicial.claveFinal}). Déjela vacía para conservarla.` : cat.requiereClave ? `Se obtiene en ${cat.ayudaClave}` : 'Normalmente no requiere clave'}
        />
      </label>
      <label className="label">Modelo
        <input className="input" name="modelo" list={lista} value={modelo} onChange={(e) => setModelo(e.target.value)} required placeholder="Pulse «Detectar modelos»" />
        <datalist id={lista}>{deteccion.modelos?.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      {deteccion.modelos && deteccion.modelos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:col-span-2">
          {deteccion.modelos.slice(0, 40).map((m) => (
            <button key={m} type="button" onClick={() => setModelo(m)} className={`rounded-full border px-2.5 py-0.5 text-xs ${m === modelo ? 'border-accent bg-accent/10' : 'border-line'}`}>{m}</button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button type="button" className="btn-ghost" onClick={detectar} disabled={detectando}><Plug size={14} /> {detectando ? 'Consultando…' : 'Detectar modelos'}</button>
        <button className="btn" disabled={guardando}><KeyRound size={14} /> {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Agregar proveedor'}</button>
        {deteccion.error && <span className="text-sm text-red-600">{deteccion.error}</span>}
        {deteccion.ok && !guardado.ok && !guardado.error && <span className="text-sm text-emerald-700">{deteccion.ok}</span>}
        {guardado.error && <span className="text-sm text-red-600">{guardado.error}</span>}
        {guardado.ok && <span className="text-sm text-emerald-700">{guardado.ok}</span>}
      </div>
    </form>
  );
}

type Prov = Inicial & { tipoNombre: string; activo: boolean; predeterminado: boolean; autorizados: string[] };

export function TarjetaProveedor({ proveedor: p, usuarios }: { proveedor: Prov; usuarios: { id: string; nombre: string }[] }) {
  const [editando, setEditando] = useState(false);
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [probando, startProbar] = useTransition();
  const [, start] = useTransition();

  return (
    <article className={`card ${p.activo ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {p.nombre}
            {p.predeterminado && <span className="tag text-accent"><Star size={11} className="mr-1 inline" />Predeterminado</span>}
            {!p.activo && <span className="tag">Desactivado</span>}
          </h3>
          <p className="text-sm text-muted">
            {p.tipoNombre} · Modelo <code>{p.modelo}</code>
            {p.baseUrl && <> · <code>{p.baseUrl}</code></>}
            {p.claveFinal ? <> · Clave …{p.claveFinal}</> : <> · Sin clave</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={probando} onClick={() => startProbar(async () => setPrueba(await probarConexion(p.id)))}>
            <Plug size={14} /> {probando ? 'Probando…' : 'Probar'}
          </button>
          {!p.predeterminado && <button className="btn-ghost" onClick={() => start(() => hacerPredeterminado(p.id))}><Star size={14} /> Predeterminar</button>}
          <button className="btn-ghost" onClick={() => start(() => alternarActivo(p.id))}>{p.activo ? 'Desactivar' : 'Activar'}</button>
          <button className="btn-ghost" onClick={() => setEditando(!editando)}><Pencil size={14} /> Editar</button>
          <button className="btn-danger" onClick={() => confirm(`¿Eliminar «${p.nombre}»? Los usuarios perderán el acceso.`) && start(() => eliminarProveedor(p.id))}><Trash2 size={14} /></button>
        </div>
      </div>
      {prueba && (
        <p className={`mt-3 flex items-center gap-2 text-sm ${prueba.ok ? 'text-emerald-700' : 'text-red-600'}`}>
          {prueba.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {prueba.mensaje}
        </p>
      )}
      {editando && (
        <div className="mt-4 border-t border-line pt-4">
          <FormProveedor inicial={p} alGuardar={() => setEditando(false)} />
        </div>
      )}
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Usuarios autorizados</p>
        {usuarios.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {usuarios.map((u) => (
              <label key={u.id} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={p.autorizados.includes(u.id)} onChange={(e) => start(() => cambiarPermiso(p.id, u.id, e.target.checked))} />
                {u.nombre}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No hay otros usuarios en el despacho. Los administradores tienen acceso a todos los proveedores.</p>
        )}
      </div>
    </article>
  );
}
