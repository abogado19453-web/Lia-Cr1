/* Pruebas de la capa de persistencia con un almacenamiento simulado. */
'use strict';
const assert = require('assert');
const PF = require('../app/engine.js');
const PFStore = require('../app/store.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FALLA ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

/** localStorage de mentira, con límite de tamaño opcional. */
function fakeStorage(limit) {
  const data = new Map();
  return {
    data,
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      const size = [...data.entries()].reduce((n, [key, val]) => n + key.length + val.length, 0);
      if (limit && size - (data.get(k) || '').length + v.length > limit) {
        throw Error('QuotaExceededError');
      }
      data.set(k, String(v));
    },
    removeItem: k => { data.delete(k); }
  };
}

console.log('store.js');

test('load devuelve un estado inicial cuando no hay datos', () => {
  const store = PFStore.createStore(fakeStorage());
  const loaded = store.load();
  assert.strictEqual(loaded.writable, true);
  assert.strictEqual(loaded.state.version, PF.VERSION);
});

test('save y load conservan el estado', () => {
  const storage = fakeStorage();
  const store = PFStore.createStore(storage);
  const state = PF.initialState();
  state.books[0].name = 'Tomo cuarto';
  assert.strictEqual(store.save(state), true);
  assert.strictEqual(PFStore.createStore(storage).load().state.books[0].name, 'Tomo cuarto');
});

test('load eleva un respaldo guardado con la clave anterior', () => {
  const storage = fakeStorage();
  storage.setItem(PFStore.LEGACY_KEY, JSON.stringify({
    format: 'protocolo-facil-mac', version: 1,
    books: [{ id: 'b1', name: 'Viejo', totalFolios: 40 }],
    docs: [], templates: [], profile: PF.clone(PF.defaults), notary: 'Ana', place: 'Cartago'
  }));
  const loaded = PFStore.createStore(storage).load();
  assert.strictEqual(loaded.state.version, 2);
  assert.strictEqual(loaded.state.notary.name, 'Ana');
});

test('load avisa cuando los datos están corrompidos', () => {
  const storage = fakeStorage();
  storage.setItem(PFStore.KEY, '{no es json');
  const loaded = PFStore.createStore(storage).load();
  assert.strictEqual(loaded.writable, false);
  assert.ok(loaded.reason);
});

test('las instantáneas se acumulan y se recuperan', () => {
  const store = PFStore.createStore(fakeStorage());
  const state = PF.initialState();
  state.books[0].name = 'Antes';
  store.snapshot(state, 'Antes de borrar');
  const list = store.snapshots();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].label, 'Antes de borrar');
  assert.strictEqual(store.restoreSnapshot(0).books[0].name, 'Antes');
});

test('el anillo de instantáneas no supera el límite', () => {
  const store = PFStore.createStore(fakeStorage());
  for (let i = 0; i < PFStore.SNAP_LIMIT + 6; i++) store.snapshot(PF.initialState(), 'cambio ' + i);
  assert.strictEqual(store.snapshots().length, PFStore.SNAP_LIMIT);
  assert.strictEqual(store.snapshots()[0].label, 'cambio ' + (PFStore.SNAP_LIMIT + 5));
});

test('restoreSnapshot falla con un índice inexistente', () => {
  const store = PFStore.createStore(fakeStorage());
  assert.throws(() => store.restoreSnapshot(3), /ya no está disponible/);
});

test('un almacenamiento lleno marca la sesión como no escribible', () => {
  const store = PFStore.createStore(fakeStorage(50));
  assert.strictEqual(store.save(PF.initialState()), false);
  assert.strictEqual(store.isWritable(), false);
});

/* ---------------- Aplicación de escritorio ---------------- */

/** Simula el puente nativo: el mismo trato que localStorage, sobre archivos. */
function conPuenteNativo(fn) {
  const archivos = fakeStorage();
  globalThis.pfNativo = {
    almacen: {
      getItem: k => archivos.getItem(k),
      setItem: (k, v) => archivos.setItem(k, v),
      removeItem: k => archivos.removeItem(k)
    }
  };
  try { return fn(archivos); } finally { delete globalThis.pfNativo; }
}

test('con el puente nativo se escribe en los archivos de la aplicación', () => {
  conPuenteNativo(archivos => {
    const store = PFStore.createStore();
    assert.strictEqual(store.isNative(), true);
    const state = PF.initialState();
    state.books[0].name = 'Tomo nativo';
    assert.strictEqual(store.save(state), true);
    assert.ok(archivos.data.has('datos.json'), 'debió escribir datos.json');
    assert.ok(!archivos.data.has(PFStore.KEY), 'no debe usar la clave del navegador');
    assert.strictEqual(PFStore.createStore().load().state.books[0].name, 'Tomo nativo');
  });
});

test('las instantáneas nativas van a su propio archivo', () => {
  conPuenteNativo(archivos => {
    const store = PFStore.createStore();
    store.snapshot(PF.initialState(), 'Antes de borrar');
    assert.ok(archivos.data.has('instantaneas.json'));
    assert.strictEqual(store.snapshots()[0].label, 'Antes de borrar');
  });
});

test('sin puente nativo se sigue usando el almacenamiento del navegador', () => {
  const storage = fakeStorage();
  const store = PFStore.createStore(storage);
  assert.strictEqual(store.isNative(), false);
  store.save(PF.initialState());
  assert.ok(storage.data.has(PFStore.KEY));
});

console.log(passed + ' pruebas superadas en store.js');
