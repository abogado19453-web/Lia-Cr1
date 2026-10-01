'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { calcularLiquidacion, type Terminacion } from '@/lib/laboral';

const num = (n: number, d = 2) => n.toLocaleString('es-CR', { minimumFractionDigits: d, maximumFractionDigits: d });
const colones = (n: number) => '₡' + n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fecha(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function Calculadora() {
  const [ingreso, setIngreso] = useState('');
  const [salida, setSalida] = useState('');
  const [salario, setSalario] = useState('');
  const [terminacion, setTerminacion] = useState<Terminacion>('con_responsabilidad');
  const [preaviso, setPreaviso] = useState(false);
  const [vacaciones, setVacaciones] = useState('0');
  const [aguinaldoBase, setAguinaldoBase] = useState('');

  const { resultado, error } = useMemo(() => {
    const fi = fecha(ingreso);
    const fs = fecha(salida);
    const sal = Number(salario.replace(/[^\d.]/g, ''));
    if (!fi || !fs || !sal) return { resultado: null, error: null };
    try {
      return {
        resultado: calcularLiquidacion({
          fechaIngreso: fi,
          fechaSalida: fs,
          salarioPromedioMensual: sal,
          terminacion,
          preavisoOtorgado: preaviso,
          diasVacacionesPendientes: Number(vacaciones) || 0,
          salariosDesdeDiciembre: aguinaldoBase ? Number(aguinaldoBase.replace(/[^\d.]/g, '')) : undefined,
        }),
        error: null,
      };
    } catch (e) {
      return { resultado: null, error: (e as Error).message };
    }
  }, [ingreso, salida, salario, terminacion, preaviso, vacaciones, aguinaldoBase]);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="card space-y-3 self-start">
        <div className="grid grid-cols-2 gap-3">
          <label className="label">Fecha de ingreso<input className="input" type="date" value={ingreso} onChange={(e) => setIngreso(e.target.value)} /></label>
          <label className="label">Fecha de salida<input className="input" type="date" value={salida} onChange={(e) => setSalida(e.target.value)} /></label>
        </div>
        <label className="label">Salario mensual promedio (últimos 6 meses), ₡
          <input className="input" inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="600000" />
        </label>
        <label className="label">Forma de terminación
          <select className="input" value={terminacion} onChange={(e) => setTerminacion(e.target.value as Terminacion)}>
            <option value="con_responsabilidad">Despido con responsabilidad patronal</option>
            <option value="sin_responsabilidad">Renuncia o despido sin responsabilidad patronal</option>
          </select>
        </label>
        {terminacion === 'con_responsabilidad' && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preaviso} onChange={(e) => setPreaviso(e.target.checked)} /> El patrono otorgó el preaviso</label>
        )}
        <label className="label">Días de vacaciones pendientes
          <input className="input" type="number" min={0} step="0.5" value={vacaciones} onChange={(e) => setVacaciones(e.target.value)} />
        </label>
        <label className="label">Salarios devengados desde el 1.° de diciembre, ₡ (opcional)
          <input className="input" inputMode="decimal" value={aguinaldoBase} onChange={(e) => setAguinaldoBase(e.target.value)} placeholder="Si se omite, se estima con el promedio" />
        </label>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Liquidación</h2>
        {error && <p className="text-red-600">{error}</p>}
        {!resultado && !error && <p className="text-muted">Complete fechas y salario para ver el cálculo.</p>}
        {resultado && (
          <>
            <p className="mb-4 text-sm text-muted">
              Tiempo laborado: {num(resultado.mesesLaborados / 12)} años ({num(resultado.mesesLaborados, 1)} meses) · Salario diario: {colones(resultado.salarioDiario)}
            </p>
            <table className="table">
              <thead><tr><th>Rubro</th><th>Días</th><th>Fundamento</th><th className="text-right">Monto</th></tr></thead>
              <tbody>
                {resultado.rubros.map((r) => (
                  <tr key={r.rubro}><td>{r.rubro}</td><td>{r.dias == null ? '—' : num(r.dias, Number.isInteger(r.dias) ? 0 : 2)}</td><td className="text-muted">{r.fundamento}</td><td className="text-right font-mono">{colones(r.monto)}</td></tr>
                ))}
                <tr><td colSpan={3} className="font-semibold">Total</td><td className="text-right font-mono text-lg font-semibold">{colones(resultado.total)}</td></tr>
              </tbody>
            </table>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                className="btn-ghost"
                href={`/dashboard/redactor`}
              >Redactar carta de liquidación o demanda</Link>
            </div>
          </>
        )}
        <details className="mt-6 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-ink">Metodología</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Salario diario: promedio mensual de los últimos seis meses entre treinta (art. 30).</li>
            <li>Preaviso (art. 28): de tres a seis meses, una semana; de seis meses a un año, quince días; más de un año, un mes.</li>
            <li>Cesantía (art. 29): de tres a seis meses, siete días; de seis meses a un año, catorce días; más de un año, días por año según la tabla del inciso 3 conforme a la antigüedad, con tope de ocho años; las fracciones de año se calculan en forma proporcional.</li>
            <li>Vacaciones: días pendientes por el salario diario (arts. 153 y 156).</li>
            <li>Aguinaldo: salarios del periodo 1.° de diciembre – 30 de noviembre entre doce (Ley N.° 2412).</li>
            <li>No incluye horas extra, salarios adeudados, intereses ni indexación. Verifique los extremos según el caso concreto.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
