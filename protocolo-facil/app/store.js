/*
 * Protocolo Fácil — capa de persistencia.
 *
 * Guarda el conjunto de datos en el almacenamiento local del navegador y
 * mantiene un anillo de instantáneas para deshacer un cambio desafortunado
 * sin depender de un respaldo externo.
 *
 * Límite conocido: el almacenamiento local NO equivale a archivos en disco.
 * El respaldo JSON sigue siendo el único resguardo que sobrevive al borrado
 * de datos del navegador.
 */
(function (root) {
  'use strict';

  const PF = root.PF || (typeof require !== 'undefined' ? require('./engine.js') : null);
  if (!PF) throw Error('engine.js debe cargarse antes que store.js.');

  const KEY = 'protocolo-facil-v2';
  const LEGACY_KEY = 'protocolo-facil-mac-v1';
  const SNAP_KEY = 'protocolo-facil-v2-snapshots';
  const SNAP_LIMIT = 12;

  function createStore(storage) {
    const backing = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    let writable = Boolean(backing);
    const listeners = [];

    function notify(event) {
      for (const fn of listeners) fn(event);
    }

    /** Carga el estado; eleva un respaldo v1 si es lo único disponible. */
    function load() {
      if (!backing) return { state: PF.initialState(), writable: false, reason: 'sin almacenamiento' };
      try {
        const raw = backing.getItem(KEY) || backing.getItem(LEGACY_KEY);
        if (!raw) return { state: PF.initialState(), writable: true };
        return { state: PF.checkState(JSON.parse(raw)), writable: true };
      } catch (e) {
        writable = false;
        return { state: PF.initialState(), writable: false, reason: e.message };
      }
    }

    /** Escribe el estado. Devuelve true si llegó al almacenamiento. */
    function save(state) {
      state.updated = new Date().toISOString();
      if (!backing || !writable) return false;
      try {
        backing.setItem(KEY, JSON.stringify(state));
        notify({ type: 'saved', at: state.updated });
        return true;
      } catch (e) {
        writable = false;
        notify({ type: 'error', message: e.message });
        return false;
      }
    }

    /* ---------------- Instantáneas ---------------- */

    function readSnapshots() {
      if (!backing) return [];
      try {
        const raw = backing.getItem(SNAP_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    }

    /**
     * Guarda una instantánea rotulada antes de una operación destructiva.
     * Si el almacenamiento se llena, descarta las más antiguas y reintenta.
     */
    function snapshot(state, label) {
      if (!backing || !writable) return false;
      let list = readSnapshots();
      list.unshift({ at: new Date().toISOString(), label: String(label || 'cambio'), state });
      list = list.slice(0, SNAP_LIMIT);
      while (list.length) {
        try {
          backing.setItem(SNAP_KEY, JSON.stringify(list));
          notify({ type: 'snapshot', label });
          return true;
        } catch (e) {
          list.pop();
        }
      }
      try { backing.removeItem(SNAP_KEY); } catch (e) { /* sin espacio ni para limpiar */ }
      return false;
    }

    function snapshots() {
      return readSnapshots().map((s, i) => ({ index: i, at: s.at, label: s.label }));
    }

    /** Recupera una instantánea validada por índice. */
    function restoreSnapshot(index) {
      const list = readSnapshots();
      const item = list[index];
      if (!item) throw Error('La instantánea ya no está disponible.');
      return PF.checkState(item.state);
    }

    function clearSnapshots() {
      if (!backing) return;
      try { backing.removeItem(SNAP_KEY); } catch (e) { /* nada que hacer */ }
    }

    return {
      KEY, LEGACY_KEY, SNAP_KEY, SNAP_LIMIT,
      load, save, snapshot, snapshots, restoreSnapshot, clearSnapshots,
      isWritable: () => writable,
      onEvent: fn => { listeners.push(fn); }
    };
  }

  const api = { createStore, KEY, LEGACY_KEY, SNAP_KEY, SNAP_LIMIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PFStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
