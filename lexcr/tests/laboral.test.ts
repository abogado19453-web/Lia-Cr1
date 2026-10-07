import { describe, expect, it } from 'vitest';
import { calcularLiquidacion, diasCesantia, diasPreaviso, mesesEntre } from '../src/lib/laboral';

describe('mesesEntre', () => {
  it('cuenta meses completos', () => {
    expect(mesesEntre(new Date(2020, 0, 15), new Date(2021, 0, 15))).toBe(12);
  });
  it('agrega fracción de mes', () => {
    expect(mesesEntre(new Date(2024, 0, 1), new Date(2024, 0, 16))).toBeCloseTo(0.5);
  });
});

describe('preaviso (art. 28)', () => {
  it.each([
    [2, 0],
    [4, 7],
    [8, 15],
    [30, 30],
  ])('%d meses → %d días', (m, d) => expect(diasPreaviso(m)).toBe(d));
});

describe('cesantía (art. 29)', () => {
  it('3 a 6 meses: 7 días', () => expect(diasCesantia(4)).toBe(7));
  it('6 a 12 meses: 14 días', () => expect(diasCesantia(9)).toBe(14));
  it('2 años: 20 días por año', () => expect(diasCesantia(24)).toBe(40));
  it('5 años: 21,24 días por año', () => expect(diasCesantia(60)).toBeCloseTo(106.2));
  it('tope de 8 años', () => expect(diasCesantia(10 * 12)).toBe(21.5 * 8));
  it('13 años o más: 20 días', () => expect(diasCesantia(15 * 12)).toBe(160));
});

describe('calcularLiquidacion', () => {
  it('despido con responsabilidad patronal', () => {
    const r = calcularLiquidacion({
      fechaIngreso: new Date(2022, 0, 1),
      fechaSalida: new Date(2024, 0, 1),
      salarioPromedioMensual: 600000,
      terminacion: 'con_responsabilidad',
      preavisoOtorgado: false,
      diasVacacionesPendientes: 5,
      salariosDesdeDiciembre: 600000,
    });
    const por = Object.fromEntries(r.rubros.map((x) => [x.rubro, x.monto]));
    expect(por['Preaviso']).toBe(600000);
    expect(por['Auxilio de cesantía']).toBe(800000);
    expect(por['Vacaciones no disfrutadas']).toBe(100000);
    expect(por['Aguinaldo proporcional']).toBe(50000);
    expect(r.total).toBe(1550000);
  });
  it('renuncia: sin preaviso ni cesantía', () => {
    const r = calcularLiquidacion({
      fechaIngreso: new Date(2022, 0, 1),
      fechaSalida: new Date(2024, 5, 1),
      salarioPromedioMensual: 300000,
      terminacion: 'sin_responsabilidad',
      preavisoOtorgado: false,
      diasVacacionesPendientes: 0,
    });
    expect(r.rubros.map((x) => x.rubro)).toEqual(['Aguinaldo proporcional']);
    expect(r.rubros[0].monto).toBe(150000); // 6 meses × 300 000 / 12
  });
});
