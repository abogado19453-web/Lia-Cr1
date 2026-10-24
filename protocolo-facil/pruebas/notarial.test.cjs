/* Pruebas del módulo notarial costarricense. */
'use strict';
const assert = require('assert');
const PF = require('../app/engine.js');
const PFN = require('../app/notarial.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FALLA ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

const measure = text => text.length * 10;
const layout = doc => PF.paginate(doc.text, PF.defaults,
  { folio: doc.folio, side: doc.side, line: doc.line }, measure);

const notary = {
  name: 'Juana Pérez Rojas', cedula: '1-0234-0567', carne: '12345',
  place: 'San José', office: 'Avenida Central'
};
const book = { id: 'b1', name: 'Tomo primero', tomo: 1, totalFolios: 100 };

function doc(over) {
  return Object.assign({
    id: 'd' + Math.random(), bookId: 'b1', number: 1, date: '2026-03-05', hour: '09:00',
    status: 'Borrador', folio: 1, side: 'front', line: 1,
    title: 'Compraventa', parties: 'Pedro y Ana', text: '', notes: ''
  }, over);
}

console.log('notarial.js');

test('marks separa entrelineados y testaduras', () => {
  const r = PFN.marks('Se vende la finca «número cinco» y [[la casa]] contigua.');
  assert.deepStrictEqual(r.entrelineados, ['número cinco']);
  assert.deepStrictEqual(r.testados, ['la casa']);
  assert.strictEqual(r.clean, 'Se vende la finca número cinco y  contigua.');
});

test('razonEntrelineados arma la fórmula de cierre', () => {
  const razon = PFN.razonEntrelineados('Vende «el lote» y no [[la casa]].');
  assert.ok(razon.includes('Entre líneas se lee: «el lote». Vale.'));
  assert.ok(razon.includes('Testado: «la casa». No vale.'));
});

test('razonEntrelineados devuelve vacío sin marcas', () => {
  assert.strictEqual(PFN.razonEntrelineados('Texto sin marcas.'), '');
});

test('razonApertura cita tomo, folios y datos del notario', () => {
  const razon = PFN.razonApertura(book, notary, { date: '2026-01-05', time: '08:00', folios: 100 });
  assert.ok(razon.startsWith('RAZÓN DE APERTURA.'));
  assert.ok(razon.includes('JUANA PÉREZ ROJAS'));
  assert.ok(razon.includes('tomo primero'));
  assert.ok(razon.includes('cien folios'));
  assert.ok(razon.includes('cinco de enero de dos mil veintiséis'));
});

test('razonApertura exige el nombre del notario', () => {
  assert.throws(() => PFN.razonApertura(book, { name: '' }, {}), /nombre del notario/);
});

test('razonCierre incorpora última escritura y folio', () => {
  const razon = PFN.razonCierre(book, notary,
    { date: '2026-12-20', time: '16:00', ultimaEscritura: 148, ultimoFolio: 100 });
  assert.ok(razon.startsWith('RAZÓN DE CIERRE.'));
  assert.ok(razon.includes('ciento cuarenta y ocho'));
  assert.ok(razon.includes('cien'));
  assert.ok(razon.includes('Dirección Nacional de Notariado'));
});

test('razonTestimonio distingue el primero de los ulteriores', () => {
  const d = doc({ number: 12, folio: 7, side: 'back' });
  const primero = PFN.razonTestimonio(d, book, notary, { ordinal: 1, date: '2026-03-06' });
  assert.ok(primero.startsWith('ES PRIMER TESTIMONIO'));
  assert.ok(primero.includes('folio siete vuelto'));
  const segundo = PFN.razonTestimonio(d, book, notary, { ordinal: 2, date: '2026-03-06' });
  assert.ok(segundo.startsWith('ES SEGUNDO TESTIMONIO'));
});

test('folioMap detecta renglones ocupados por dos escrituras', () => {
  const text = Array.from({ length: 60 }, () => 'palabra').join(' ');
  const docs = [
    doc({ number: 1, text, folio: 1, side: 'front', line: 1 }),
    doc({ number: 2, text, folio: 1, side: 'front', line: 3 })
  ];
  const map = PFN.folioMap(docs, layout);
  assert.ok(map.conflicts.length > 0);
});

test('folioMap no reporta choques en escrituras consecutivas', () => {
  const text = Array.from({ length: 60 }, () => 'palabra').join(' ');
  const first = doc({ number: 1, text, folio: 1, side: 'front', line: 1 });
  const end = PF.endPosition(layout(first));
  const next = PF.nextPosition(end, PF.defaults.rows);
  const second = doc({ number: 2, text, folio: next.folio, side: next.side, line: next.line });
  const map = PFN.folioMap([first, second], layout);
  assert.deepStrictEqual(map.conflicts, []);
});

test('suggestStart propone el renglón libre siguiente', () => {
  const text = Array.from({ length: 60 }, () => 'palabra').join(' ');
  const first = doc({ number: 1, text });
  const end = PF.endPosition(layout(first));
  const expected = PF.nextPosition(end, PF.defaults.rows);
  assert.deepStrictEqual(PFN.suggestStart([first], layout, PF.defaults.rows), expected);
});

test('suggestStart arranca en el folio uno si el libro está vacío', () => {
  assert.deepStrictEqual(PFN.suggestStart([], layout, PF.defaults.rows),
    { folio: 1, side: 'front', line: 1 });
});

test('indexRows produce encabezados y posiciones finales', () => {
  const text = Array.from({ length: 40 }, () => 'palabra').join(' ');
  const rows = PFN.indexRows(book, [doc({ number: 3, text })], layout);
  assert.deepStrictEqual(rows[0], PFN.INDEX_HEADERS);
  assert.strictEqual(rows[1][2], 3);
  assert.strictEqual(rows[1][9], 'frente');
  assert.ok(Number(rows[1][14]) >= 1);
});

test('honorarios aplica los tramos de manera acumulativa', () => {
  const tariff = {
    honorarios: { minimo: 0, tramos: [{ hasta: 100, porcentaje: 10 }, { hasta: null, porcentaje: 5 }] },
    timbres: []
  };
  assert.strictEqual(PFN.honorarios(50, tariff), 5);
  assert.strictEqual(PFN.honorarios(100, tariff), 10);
  assert.strictEqual(PFN.honorarios(300, tariff), 20); // 10 + 5 % de 200
});

test('honorarios respeta el mínimo configurado', () => {
  const tariff = { honorarios: { minimo: 50, tramos: [{ hasta: null, porcentaje: 1 }] }, timbres: [] };
  assert.strictEqual(PFN.honorarios(100, tariff), 50);
});

test('timbres suma porcentajes y montos fijos', () => {
  const tariff = {
    honorarios: { minimo: 0, tramos: [] },
    timbres: [
      { nombre: 'Fiscal', tipo: 'porcentaje', valor: 2 },
      { nombre: 'Archivo', tipo: 'fijo', valor: 20 }
    ]
  };
  const r = PFN.timbres(1000, tariff);
  assert.strictEqual(r.rows[0].monto, 20);
  assert.strictEqual(r.rows[1].monto, 20);
  assert.strictEqual(r.total, 40);
});

test('liquidacion totaliza honorarios y timbres', () => {
  const tariff = {
    moneda: 'CRC',
    honorarios: { minimo: 0, tramos: [{ hasta: null, porcentaje: 1 }] },
    timbres: [{ nombre: 'Fijo', tipo: 'fijo', valor: 5 }]
  };
  const r = PFN.liquidacion(1000, tariff);
  assert.strictEqual(r.honorarios, 10);
  assert.strictEqual(r.totalTimbres, 5);
  assert.strictEqual(r.total, 15);
});

test('liquidacion rechaza cuantías inválidas', () => {
  assert.throws(() => PFN.liquidacion(-1, PF.defaultTariff()), /Cuantía inválida/);
});

test('fillTemplate reemplaza los campos conocidos', () => {
  const d = doc({ number: 7, date: '2026-03-05', hour: '10:30', parties: 'Pedro y Ana' });
  const out = PFN.fillTemplate(
    'NÚMERO {Numero}: Ante mí, {Notario}, comparecen {Otorgantes}, en {Lugar}, a {FechaHora}. Tomo {Tomo}.',
    { doc: d, book, notary });
  assert.ok(out.includes('NÚMERO siete'));
  assert.ok(out.includes('Juana Pérez Rojas'));
  assert.ok(out.includes('Pedro y Ana'));
  assert.ok(out.includes('las diez horas treinta minutos del cinco de marzo de dos mil veintiséis'));
  assert.ok(out.includes('Tomo primero'));
});

test('fillTemplate deja visibles los campos sin dato', () => {
  const out = PFN.fillTemplate('Oficina: {Oficina}. Desconocido: {NoExiste}.',
    { doc: doc({}), book, notary: { name: 'X', office: '' } });
  assert.ok(out.includes('{Oficina}'));
  assert.ok(out.includes('{NoExiste}'));
});

console.log(passed + ' pruebas superadas en notarial.js');
