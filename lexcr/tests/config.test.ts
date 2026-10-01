import { describe, expect, it } from 'vitest';
import { primerNombre } from '../src/lib/config';

describe('primerNombre', () => {
  it.each([
    ['Lic. Carlos Demo Rodríguez', 'Carlos'],
    ['Licda. Ana Mora', 'Ana'],
    ['Dr. José Pérez', 'José'],
    ['María Fernanda Solís', 'María'],
    ['msc Laura Díaz', 'Laura'],
  ])('%s → %s', (n, e) => expect(primerNombre(n)).toBe(e));
});
