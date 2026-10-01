import { describe, expect, it } from 'vitest';
import { calcularVigencia, planEfectivo, precio } from '../src/lib/planes';

const d = (s: string) => new Date(s + 'T12:00:00');

describe('planEfectivo', () => {
  it('gratis siempre es gratis', () => expect(planEfectivo('gratis', null)).toBe('gratis'));
  it('plan vigente', () => expect(planEfectivo('profesional', d('2030-01-01'), d('2029-12-01'))).toBe('profesional'));
  it('plan vencido vuelve a gratis', () => expect(planEfectivo('despacho', d('2024-01-01'), d('2024-02-01'))).toBe('gratis'));
  it('plan desconocido es gratis', () => expect(planEfectivo('oro', d('2030-01-01'))).toBe('gratis'));
});

describe('precio', () => {
  it('anual equivale a diez meses', () => expect(precio('profesional', 'anual')).toBe(precio('profesional', 'mensual') * 10));
});

describe('calcularVigencia', () => {
  const hoy = d('2026-03-10');
  it('primer pago mensual corre desde hoy', () => {
    const v = calcularVigencia({ plan: 'gratis', vence: null }, { plan: 'profesional', periodo: 'mensual' }, hoy);
    expect(v.desde).toEqual(hoy);
    expect(v.hasta).toEqual(d('2026-04-10'));
  });
  it('renovación del mismo plan se suma al vencimiento', () => {
    const v = calcularVigencia({ plan: 'profesional', vence: d('2026-03-20') }, { plan: 'profesional', periodo: 'anual' }, hoy);
    expect(v.desde).toEqual(d('2026-03-20'));
    expect(v.hasta).toEqual(d('2027-03-20'));
  });
  it('cambio de plan corre desde hoy', () => {
    const v = calcularVigencia({ plan: 'profesional', vence: d('2026-03-20') }, { plan: 'despacho', periodo: 'mensual' }, hoy);
    expect(v.desde).toEqual(hoy);
  });
  it('plan vencido corre desde hoy', () => {
    const v = calcularVigencia({ plan: 'profesional', vence: d('2026-01-01') }, { plan: 'profesional', periodo: 'mensual' }, hoy);
    expect(v.desde).toEqual(hoy);
  });
});
