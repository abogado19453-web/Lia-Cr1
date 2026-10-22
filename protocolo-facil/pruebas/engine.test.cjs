/* Pruebas del núcleo: geometría, paginación, letras y respaldos. */
'use strict';
const assert = require('assert');
const PF = require('../app/engine.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FALLA ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

/* Medición determinista: cada carácter mide 10 unidades. */
const measure = text => text.length * 10;
const profile = () => PF.clone(PF.defaults);

console.log('engine.js');

test('normalize unifica saltos y espacios duros', () => {
  assert.strictEqual(PF.normalize('a\r\nb\tc d'), 'a\nb c d');
});

test('validate acepta el perfil por omisión', () => {
  assert.deepStrictEqual(PF.validate(PF.defaults), []);
});

test('validate rechaza renglones fuera del papel', () => {
  const p = profile();
  p.rows = 90;
  assert.ok(PF.validate(p).some(e => /salen del papel/.test(e)));
});

test('validate rechaza separación menor que la fuente', () => {
  const p = profile();
  p.pitch = 3;
  p.fontSize = 12;
  assert.ok(PF.validate(p).some(e => /separación/.test(e)));
});

test('wrap respeta el ancho y conserva las palabras', () => {
  const lines = PF.wrap('uno dos tres cuatro cinco', 100, measure);
  assert.ok(lines.every(l => measure(l) <= 100));
  assert.strictEqual(lines.join(' '), 'uno dos tres cuatro cinco');
});

test('wrap parte una palabra más ancha que el renglón', () => {
  const lines = PF.wrap('a'.repeat(25), 100, measure);
  assert.deepStrictEqual(lines, ['a'.repeat(10), 'a'.repeat(10), 'a'.repeat(5)]);
});

test('paginate conserva todo el texto entre caras', () => {
  const text = Array.from({ length: 400 }, (_, i) => 'palabra' + i).join(' ');
  const pages = PF.paginate(text, PF.defaults, { folio: 1, side: 'front', line: 1 }, measure);
  const rebuilt = pages.flatMap(p => p.lines).join(' ');
  assert.strictEqual(rebuilt.replace(/\s+/g, ' '), text);
});

test('paginate arranca en el renglón indicado y respeta la capacidad', () => {
  const text = Array.from({ length: 200 }, () => 'palabra').join(' ');
  const pages = PF.paginate(text, PF.defaults, { folio: 4, side: 'back', line: 25 }, measure);
  assert.strictEqual(pages[0].folio, 4);
  assert.strictEqual(pages[0].side, 'back');
  assert.strictEqual(pages[0].start, 25);
  assert.ok(pages[0].lines.length <= PF.defaults.rows - 25 + 1);
  assert.strictEqual(pages[1].folio, 5);
  assert.strictEqual(pages[1].side, 'front');
  assert.strictEqual(pages[1].start, 1);
});

test('paginate usa el ancho propio de cada cara', () => {
  const p = profile();
  p.front.left = 60;
  const text = Array.from({ length: 300 }, () => 'palabra').join(' ');
  const pages = PF.paginate(text, p, { folio: 1, side: 'front', line: 1 }, measure);
  const frontWidth = (p.width - p.front.left - p.front.right) * 96 / 25.4;
  const backWidth = (p.width - p.back.left - p.back.right) * 96 / 25.4;
  assert.ok(pages[0].lines.every(l => measure(l) <= frontWidth));
  assert.ok(pages[1].lines.every(l => measure(l) <= backWidth));
  assert.ok(frontWidth < backWidth);
});

test('paginate marca la última cara y calcula la posición final', () => {
  const pages = PF.paginate('texto breve', PF.defaults, { folio: 2, side: 'front', line: 7 }, measure);
  assert.strictEqual(pages[pages.length - 1].isLast, true);
  assert.deepStrictEqual(PF.endPosition(pages), { folio: 2, side: 'front', line: 7 });
});

test('positions no repite renglones', () => {
  const text = Array.from({ length: 500 }, () => 'palabra').join(' ');
  const pages = PF.paginate(text, PF.defaults, { folio: 1, side: 'front', line: 1 }, measure);
  const pos = PF.positions(pages);
  assert.strictEqual(new Set(pos).size, pos.length);
});

test('nextPosition da vuelta la cara y avanza el folio', () => {
  const rows = PF.defaults.rows;
  assert.deepStrictEqual(PF.nextPosition({ folio: 3, side: 'front', line: rows }, rows),
    { folio: 3, side: 'back', line: 1 });
  assert.deepStrictEqual(PF.nextPosition({ folio: 3, side: 'back', line: rows }, rows),
    { folio: 4, side: 'front', line: 1 });
});

test('numberWords cubre los casos del español', () => {
  assert.strictEqual(PF.numberWords(0), 'cero');
  assert.strictEqual(PF.numberWords(16), 'dieciséis');
  assert.strictEqual(PF.numberWords(21), 'veintiuno');
  assert.strictEqual(PF.numberWords(100), 'cien');
  assert.strictEqual(PF.numberWords(101), 'ciento uno');
  assert.strictEqual(PF.numberWords(1000), 'mil');
  assert.strictEqual(PF.numberWords(21000), 'veintiún mil');
  assert.strictEqual(PF.numberWords(1000000), 'un millón');
  assert.strictEqual(PF.numberWords(2026), 'dos mil veintiséis');
});

test('cardinalWords concuerda en género', () => {
  assert.strictEqual(PF.cardinalWords(1, 'm'), 'un');
  assert.strictEqual(PF.cardinalWords(1, 'f'), 'una');
  assert.strictEqual(PF.cardinalWords(21, 'm'), 'veintiún');
  assert.strictEqual(PF.cardinalWords(200, 'f'), 'doscientas');
});

test('ordinalWords produce ordinales compuestos', () => {
  assert.strictEqual(PF.ordinalWords(1, 'f'), 'primera');
  assert.strictEqual(PF.ordinalWords(1, 'm'), 'primero');
  assert.strictEqual(PF.ordinalWords(3, 'm'), 'tercero');
  assert.strictEqual(PF.ordinalWords(12, 'f'), 'décima segunda');
  assert.strictEqual(PF.ordinalWords(21, 'f'), 'vigésima primera');
  assert.strictEqual(PF.ordinalWords(100, 'm'), 'centésimo');
});

test('amountWords convierte importes con céntimos', () => {
  assert.strictEqual(PF.amountWords(1, 'CRC'), 'un colón');
  assert.strictEqual(PF.amountWords('1.234.567,89', 'CRC'),
    'un millón doscientos treinta y cuatro mil quinientos sesenta y siete colones con ochenta y nueve céntimos');
  assert.strictEqual(PF.amountWords('1,234,567.05', 'USD'),
    'un millón doscientos treinta y cuatro mil quinientos sesenta y siete dólares con cinco centavos');
  assert.strictEqual(PF.amountWords('25 000 000', 'CRC'), 'veinticinco millones de colones');
  assert.strictEqual(PF.amountWords('1 500 000', 'CRC'), 'un millón quinientos mil colones');
});

test('amountWords rechaza entradas sin dígitos', () => {
  assert.throws(() => PF.amountWords('abc', 'CRC'), /Importe inválido/);
});

test('dateWords y hourWords siguen el uso notarial', () => {
  assert.strictEqual(PF.dateWords('2026-03-05'), 'cinco de marzo de dos mil veintiséis');
  assert.strictEqual(PF.hourWords('09:00'), 'las nueve horas');
  assert.strictEqual(PF.hourWords('01:00'), 'la una hora');
  assert.strictEqual(PF.hourWords('14:30'), 'las catorce horas treinta minutos');
  assert.strictEqual(PF.dateTimeWords('2026-03-05', '09:15'),
    'las nueve horas quince minutos del cinco de marzo de dos mil veintiséis');
});

test('dateWords rechaza fechas imposibles', () => {
  assert.throws(() => PF.dateWords('2026-02-30'), /Fecha inválida/);
  assert.throws(() => PF.hourWords('25:00'), /Hora inválida/);
});

test('csv neutraliza fórmulas y escapa comillas', () => {
  const out = PF.csv([['=SUMA(A1)', 'con "comillas"']]);
  assert.ok(out.startsWith('﻿'));
  assert.ok(out.includes("'=SUMA(A1)"));
  assert.ok(out.includes('con ""comillas""'));
});

test('rtf escapa llaves y caracteres fuera de ASCII', () => {
  const out = PF.rtf('á {x}\n');
  assert.ok(out.includes('\\u225?'));
  assert.ok(out.includes('\\{x\\}'));
  assert.ok(out.includes('\\par'));
});

test('checkState valida un estado inicial', () => {
  const state = PF.initialState();
  assert.strictEqual(PF.checkState(state).version, PF.VERSION);
});

test('checkState eleva un respaldo de la edición anterior', () => {
  const legacy = {
    format: 'protocolo-facil-mac', version: 1,
    books: [{ id: 'b1', name: 'Tomo uno', totalFolios: 50 }],
    docs: [{
      id: 'd1', bookId: 'b1', number: 1, date: '2026-01-10', status: 'Borrador',
      folio: 1, side: 'front', line: 1, title: 'Acto', parties: '', text: '', notes: ''
    }],
    templates: [], profile: PF.clone(PF.defaults), notary: 'Juana Pérez', place: 'San José'
  };
  const next = PF.checkState(legacy);
  assert.strictEqual(next.version, 2);
  assert.strictEqual(next.notary.name, 'Juana Pérez');
  assert.strictEqual(next.notary.place, 'San José');
  assert.strictEqual(next.books[0].tomo, 1);
  assert.strictEqual(next.docs[0].hour, '09:00');
});

test('checkState rechaza números de escritura repetidos', () => {
  const state = PF.initialState();
  const base = {
    bookId: state.books[0].id, number: 1, date: '2026-01-10', hour: '09:00', status: 'Borrador',
    folio: 1, side: 'front', line: 1, title: 'Acto', parties: '', text: '', notes: ''
  };
  state.docs = [Object.assign({ id: 'a' }, base), Object.assign({ id: 'b' }, base)];
  assert.throws(() => PF.checkState(state), /repetidos/);
});

test('checkState rechaza un formato desconocido', () => {
  assert.throws(() => PF.checkState({ format: 'otro', version: 9 }), /incompatible/);
});

console.log(passed + ' pruebas superadas en engine.js');
