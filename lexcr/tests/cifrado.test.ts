import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('cifrado de claves', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = 'secreto-de-prueba-0123456789';
  });

  it('cifra y descifra', async () => {
    const { cifrar, descifrar } = await import('../src/lib/cifrado');
    const c = cifrar('sk-ant-api03-ejemplo');
    expect(c).not.toContain('sk-ant');
    expect(descifrar(c)).toBe('sk-ant-api03-ejemplo');
  });

  it('cada cifrado es distinto (IV aleatorio)', async () => {
    const { cifrar } = await import('../src/lib/cifrado');
    expect(cifrar('x')).not.toBe(cifrar('x'));
  });

  it('rechaza datos alterados', async () => {
    const { cifrar, descifrar } = await import('../src/lib/cifrado');
    const partes = cifrar('clave').split('.');
    partes[3] = Buffer.from('otro').toString('base64url');
    expect(() => descifrar(partes.join('.'))).toThrow();
  });
});
