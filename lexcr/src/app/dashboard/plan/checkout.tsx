'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Check, CreditCard, Smartphone } from 'lucide-react';
import { PLANES, colones, precio, type Periodo, type PlanId } from '@/lib/planes';
import { pagarConTarjeta, reportarPago } from './actions';

type Props = {
  planActual: PlanId;
  vence: string | null;
  datos: { sinpe: string; iban: string; titular: string; tarjeta: boolean };
  planInicial?: string;
};

export function Checkout({ planActual, datos, planInicial }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('mensual');
  const [plan, setPlan] = useState<PlanId | null>(planInicial === 'profesional' || planInicial === 'despacho' ? planInicial : null);
  const [metodo, setMetodo] = useState<'sinpe' | 'transferencia' | 'tarjeta'>(datos.tarjeta ? 'tarjeta' : 'sinpe');
  const [estado, accion, pendiente] = useActionState(reportarPago, {});
  const formRef = useRef<HTMLFormElement>(null);
  const pagoRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (estado.ok) { formRef.current?.reset(); setPlan(null); } }, [estado]);
  useEffect(() => { if (plan) pagoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [plan]);

  const ids = Object.keys(PLANES) as PlanId[];
  const hayManual = Boolean(datos.sinpe || datos.iban);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Mejorar mi plan</h2>
        <div className="inline-flex rounded-lg border border-line p-1 text-sm">
          {(['mensual', 'anual'] as const).map((p) => (
            <button key={p} onClick={() => setPeriodo(p)} className={`rounded-md px-4 py-1.5 ${periodo === p ? 'bg-accent text-white' : ''}`}>
              {p === 'mensual' ? 'Mensual' : 'Anual (2 meses gratis)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {ids.map((id) => {
          const p = PLANES[id];
          const actual = id === planActual;
          const destacado = id === 'profesional';
          return (
            <div key={id} className={`card flex flex-col ${destacado ? 'ring-2 ring-accent' : ''} ${plan === id ? 'bg-accent/5' : ''}`}>
              {destacado && <span className="mb-2 self-start rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">Recomendado</span>}
              <h3 className="text-xl font-semibold">{p.nombre}</h3>
              <p className="text-sm text-muted">{p.descripcion}</p>
              <p className="my-4">
                <span className="font-serif text-3xl font-semibold">{p.precioMensual ? colones(precio(id, periodo)) : '₡0'}</span>
                {p.precioMensual > 0 && <span className="text-sm text-muted"> / {periodo === 'anual' ? 'año' : 'mes'}</span>}
              </p>
              <ul className="mb-5 flex-1 space-y-1.5 text-sm">
                {p.beneficios.map((b) => <li key={b} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-accent" />{b}</li>)}
              </ul>
              {id === 'gratis' ? (
                <button className="btn-ghost" disabled>{actual ? 'Plan actual' : 'Incluido'}</button>
              ) : (
                <button className="btn" onClick={() => setPlan(id)}>{actual ? 'Renovar' : `Elegir ${p.nombre}`}</button>
              )}
            </div>
          );
        })}
      </div>

      {plan && (
        <div ref={pagoRef} className="card mt-6 scroll-mt-6">
          <h3 className="text-lg font-semibold">Pago del plan {PLANES[plan].nombre} ({periodo}) — {colones(precio(plan, periodo))}</h3>
          <div className="my-4 inline-flex flex-wrap rounded-lg border border-line p-1 text-sm">
            {datos.tarjeta && <button onClick={() => setMetodo('tarjeta')} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 ${metodo === 'tarjeta' ? 'bg-accent text-white' : ''}`}><CreditCard size={15} /> Tarjeta</button>}
            {datos.sinpe && <button onClick={() => setMetodo('sinpe')} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 ${metodo === 'sinpe' ? 'bg-accent text-white' : ''}`}><Smartphone size={15} /> SINPE Móvil</button>}
            {datos.iban && <button onClick={() => setMetodo('transferencia')} className={`rounded-md px-4 py-1.5 ${metodo === 'transferencia' ? 'bg-accent text-white' : ''}`}>Transferencia</button>}
          </div>

          {!datos.tarjeta && !hayManual && <p className="text-sm text-red-600">No hay métodos de pago configurados. El administrador de la plataforma debe definirlos.</p>}

          {metodo === 'tarjeta' && datos.tarjeta && (
            <form action={pagarConTarjeta} className="space-y-3">
              <input type="hidden" name="plan" value={plan} />
              <input type="hidden" name="periodo" value={periodo} />
              <p className="text-sm text-muted">Será dirigido a la página segura de pago. El plan se activa automáticamente al confirmarse el cobro.</p>
              <button className="btn"><CreditCard size={15} /> Pagar {colones(precio(plan, periodo))}</button>
            </form>
          )}

          {(metodo === 'sinpe' || metodo === 'transferencia') && hayManual && (
            <form ref={formRef} action={accion} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="plan" value={plan} />
              <input type="hidden" name="periodo" value={periodo} />
              <input type="hidden" name="metodo" value={metodo} />
              <div className="rounded-lg border border-line bg-bg p-4 text-sm md:col-span-2">
                {metodo === 'sinpe' ? (
                  <>Realice un SINPE Móvil por <b>{colones(precio(plan, periodo))}</b> al número <b className="font-mono">{datos.sinpe}</b>{datos.titular && <> a nombre de <b>{datos.titular}</b></>}.</>
                ) : (
                  <>Transfiera <b>{colones(precio(plan, periodo))}</b> a la cuenta IBAN <b className="font-mono">{datos.iban}</b>{datos.titular && <> a nombre de <b>{datos.titular}</b></>}.</>
                )}
                <div className="mt-1 text-muted">Luego registre aquí el número de comprobante. El plan se activa cuando se verifique el pago.</div>
              </div>
              <label className="label">Número de comprobante o referencia<input className="input" name="referencia" required minLength={4} /></label>
              <label className="label">Comprobante (imagen o PDF, opcional)<input className="input" type="file" name="comprobante" accept="image/png,image/jpeg,image/webp,application/pdf" /></label>
              <div className="md:col-span-2"><button className="btn" disabled={pendiente}>{pendiente ? 'Enviando…' : 'Reportar pago'}</button></div>
              {estado.error && <p className="text-sm text-red-600 md:col-span-2">{estado.error}</p>}
            </form>
          )}
        </div>
      )}
      {estado.ok && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Pago reportado. Le avisaremos aquí cuando se verifique.</p>}
    </>
  );
}
