/**
 * Cálculo de derechos laborales al término de la relación (Código de Trabajo de Costa Rica).
 * - Preaviso: art. 28.
 * - Auxilio de cesantía: art. 29 (reforma Ley de Protección al Trabajador N.° 7983), tope de 8 años.
 * - Salario diario: promedio de los últimos 6 meses / 30 (art. 30).
 * - Vacaciones: art. 153 y 156.
 * - Aguinaldo: Ley N.° 2412 (salarios ordinarios y extraordinarios del 1 de diciembre al 30 de noviembre / 12).
 */

/** Días de salario por año laborado según la antigüedad total (art. 29 inciso 3). Índice = años completos. */
const TABLA_CESANTIA: Record<number, number> = {
  1: 19.5,
  2: 20,
  3: 20.5,
  4: 21,
  5: 21.24,
  6: 21.5,
  7: 22,
  8: 22,
  9: 22,
  10: 21.5,
  11: 21,
  12: 20.5,
};
const CESANTIA_13_O_MAS = 20;
const TOPE_ANOS_CESANTIA = 8;

export type Terminacion = 'con_responsabilidad' | 'sin_responsabilidad';

export interface DatosLiquidacion {
  fechaIngreso: Date;
  fechaSalida: Date;
  salarioPromedioMensual: number; // promedio de los últimos 6 meses
  terminacion: Terminacion;
  preavisoOtorgado: boolean;
  diasVacacionesPendientes: number;
  salariosDesdeDiciembre?: number; // si no se indica, se estima con el promedio
}

export interface Rubro {
  rubro: string;
  dias?: number;
  monto: number;
  fundamento: string;
}

export interface ResultadoLiquidacion {
  mesesLaborados: number;
  salarioDiario: number;
  rubros: Rubro[];
  total: number;
}

/** Meses completos y fracción entre dos fechas. */
export function mesesEntre(a: Date, b: Date): number {
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  let dias = b.getDate() - a.getDate();
  if (dias < 0) {
    meses -= 1;
    const finMesAnterior = new Date(b.getFullYear(), b.getMonth(), 0).getDate();
    dias += finMesAnterior;
  }
  return Math.max(0, meses + dias / 30);
}

export function diasPreaviso(meses: number): number {
  if (meses < 3) return 0;
  if (meses < 6) return 7;
  if (meses < 12) return 15;
  return 30;
}

export function diasCesantia(meses: number): number {
  if (meses < 3) return 0;
  if (meses < 6) return 7;
  if (meses < 12) return 14;
  const anos = meses / 12;
  const completos = Math.floor(anos);
  const tasa = completos >= 13 ? CESANTIA_13_O_MAS : TABLA_CESANTIA[completos];
  return tasa * Math.min(anos, TOPE_ANOS_CESANTIA);
}

/** Último 1.° de diciembre anterior o igual a la fecha. */
function inicioPeriodoAguinaldo(fecha: Date): Date {
  const y = fecha.getMonth() === 11 ? fecha.getFullYear() : fecha.getFullYear() - 1;
  return new Date(y, 11, 1);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularLiquidacion(d: DatosLiquidacion): ResultadoLiquidacion {
  if (d.fechaSalida < d.fechaIngreso) throw new Error('La fecha de salida es anterior a la de ingreso.');
  if (!(d.salarioPromedioMensual > 0)) throw new Error('Indique el salario promedio mensual.');

  const meses = mesesEntre(d.fechaIngreso, d.fechaSalida);
  const diario = d.salarioPromedioMensual / 30;
  const rubros: Rubro[] = [];

  if (d.terminacion === 'con_responsabilidad') {
    if (!d.preavisoOtorgado) {
      const dp = diasPreaviso(meses);
      if (dp) rubros.push({ rubro: 'Preaviso', dias: dp, monto: r2(dp * diario), fundamento: 'Art. 28 Código de Trabajo' });
    }
    const dc = diasCesantia(meses);
    if (dc) rubros.push({ rubro: 'Auxilio de cesantía', dias: r2(dc), monto: r2(dc * diario), fundamento: 'Art. 29 Código de Trabajo' });
  }

  if (d.diasVacacionesPendientes > 0) {
    rubros.push({
      rubro: 'Vacaciones no disfrutadas',
      dias: d.diasVacacionesPendientes,
      monto: r2(d.diasVacacionesPendientes * diario),
      fundamento: 'Arts. 153 y 156 Código de Trabajo',
    });
  }

  const inicio = inicioPeriodoAguinaldo(d.fechaSalida);
  const desde = d.fechaIngreso > inicio ? d.fechaIngreso : inicio;
  const base = d.salariosDesdeDiciembre ?? d.salarioPromedioMensual * mesesEntre(desde, d.fechaSalida);
  if (base > 0) {
    rubros.push({ rubro: 'Aguinaldo proporcional', monto: r2(base / 12), fundamento: 'Ley N.° 2412' });
  }

  return {
    mesesLaborados: r2(meses),
    salarioDiario: r2(diario),
    rubros,
    total: r2(rubros.reduce((s, r) => s + r.monto, 0)),
  };
}
