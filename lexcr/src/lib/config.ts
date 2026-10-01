/** Identidad de la plataforma. Cambie aquí el nombre y se actualiza en toda la aplicación. */
export const marca = {
  nombre: 'LexCR',
  lema: 'Despacho legal y notarial',
  pais: 'Costa Rica',
};

const TITULOS = /^(lic|licda|licdo|dr|dra|msc|máster|master|mag|ing|sr|sra|srta|don|doña)\.?$/i;

/** Primer nombre sin títulos profesionales ("Lic. Carlos Demo" → "Carlos"). */
export function primerNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter((p) => !TITULOS.test(p));
  return (partes[0] ?? nombre.trim()).replace(/[.,]+$/, '');
}

export const MATERIAS = [
  'Notarial',
  'Registral',
  'Civil',
  'Comercial',
  'Laboral',
  'Familia',
  'Administrativo',
  'Constitucional',
  'Agrario',
  'Tránsito',
] as const;
