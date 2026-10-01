'use client';

export function BotonImprimir() {
  return <button className="btn-ghost print:hidden" onClick={() => window.print()}>Imprimir</button>;
}
