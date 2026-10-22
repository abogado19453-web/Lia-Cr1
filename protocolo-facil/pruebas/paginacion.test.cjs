/* Ensayo masivo y reproducible de la paginación.
   Comprueba conservación del texto, capacidad por cara, ancho de cada
   renglón, unicidad de posiciones y marca de última cara. */
'use strict';
const assert = require('assert');
const PF = require('../app/engine.js');

/* Generador determinista (xorshift32) para que el ensayo sea repetible. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzáéíóúñ';
const SCENARIOS = 200;
let checks = 0;

for (let i = 0; i < SCENARIOS; i++) {
  const random = rng(i + 1);
  const pick = (a, b) => a + Math.floor(random() * (b - a + 1));

  const profile = PF.clone(PF.defaults);
  profile.rows = pick(8, 40);
  // Separación que cabe en el papel y supera la altura de la fuente.
  const fontHeight = profile.fontSize * 25.4 / 72;
  const maxPitch = (profile.height - profile.front.top - fontHeight) / Math.max(profile.rows - 1, 1);
  profile.pitch = Math.round(Math.min(maxPitch, 12) * 100) / 100;
  profile.front.left = pick(15, 45);
  profile.front.right = pick(10, 35);
  profile.back.left = pick(10, 35);
  profile.back.right = pick(15, 45);
  const errors = PF.validate(profile);
  if (errors.length) continue; // combinación imposible: no es caso de prueba

  // Cada carácter mide entre 6 y 14 unidades, constante dentro del escenario.
  const charWidth = pick(6, 14);
  const measure = text => Array.from(text).length * charWidth;

  const wordCount = pick(1, 600);
  const words = [];
  for (let w = 0; w < wordCount; w++) {
    const length = random() < 0.04 ? pick(30, 90) : pick(1, 14);
    let word = '';
    for (let c = 0; c < length; c++) word += ALPHABET[Math.floor(random() * ALPHABET.length)];
    words.push(word);
  }
  const text = words.join(' ');

  const start = {
    folio: pick(1, 40),
    side: random() < 0.5 ? 'front' : 'back',
    line: pick(1, profile.rows)
  };

  let pages;
  try {
    pages = PF.paginate(text, profile, start, measure);
  } catch (e) {
    // Sólo es admisible fallar si un carácter no cabe en el ancho útil.
    assert.match(e.message, /excede el ancho útil/, 'escenario ' + i + ': ' + e.message);
    continue;
  }

  // 1. Conservación de los caracteres. Se comparan sin espacios porque una
  //    palabra más ancha que el renglón se parte entre dos caras.
  const rebuilt = pages.flatMap(p => p.lines).join('').replace(/\s+/g, '');
  assert.strictEqual(rebuilt, text.replace(/\s+/g, ''),
    'escenario ' + i + ': se perdieron o duplicaron caracteres');

  // 2. Capacidad y ancho por cara.
  pages.forEach((page, index) => {
    assert.ok(page.lines.length <= profile.rows - page.start + 1,
      'escenario ' + i + ': cara ' + index + ' excede los renglones');
    const s = profile[page.side];
    const width = (profile.width - s.left - s.right) * 96 / 25.4;
    for (const line of page.lines) {
      assert.ok(measure(line) <= width + 1e-9,
        'escenario ' + i + ': renglón más ancho que el área útil');
    }
    if (index > 0) assert.strictEqual(page.start, 1, 'escenario ' + i + ': cara nueva sin empezar en 1');
  });

  // 3. Secuencia correcta de folios y caras.
  for (let k = 1; k < pages.length; k++) {
    const previous = pages[k - 1];
    const expected = previous.side === 'front'
      ? { folio: previous.folio, side: 'back' }
      : { folio: previous.folio + 1, side: 'front' };
    assert.strictEqual(pages[k].folio, expected.folio, 'escenario ' + i + ': folio fuera de secuencia');
    assert.strictEqual(pages[k].side, expected.side, 'escenario ' + i + ': cara fuera de secuencia');
  }

  // 4. Posiciones únicas.
  const positions = PF.positions(pages);
  assert.strictEqual(new Set(positions).size, positions.length,
    'escenario ' + i + ': posiciones repetidas');

  // 5. Marca de última cara y posición final coherente.
  assert.strictEqual(pages[pages.length - 1].isLast, true, 'escenario ' + i + ': falta isLast');
  const end = PF.endPosition(pages);
  const last = pages[pages.length - 1];
  assert.deepStrictEqual(end,
    { folio: last.folio, side: last.side, line: last.start + last.lines.length - 1 },
    'escenario ' + i + ': posición final incorrecta');

  checks++;
}

console.log('paginacion.test.cjs');
console.log('  ' + checks + ' escenarios de paginación comprobados de ' + SCENARIOS + ' generados');
assert.ok(checks > SCENARIOS * 0.6, 'demasiados escenarios descartados: la prueba perdió valor');
