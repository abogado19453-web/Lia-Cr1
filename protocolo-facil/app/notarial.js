/*
 * Protocolo Fácil — módulo notarial costarricense (sin DOM).
 *
 * Reúne lo propio del protocolo: razones de apertura y cierre del tomo,
 * razón de entrelineados y testaduras, razón de testimonio, mapa de folios
 * del tomo, índice de trabajo y cálculo estimado de honorarios y timbres.
 *
 * Advertencia de alcance: los textos son fórmulas de trabajo parametrizables,
 * no modelos oficiales; las tarifas son valores EDITABLES por el usuario.
 */
(function (root) {
  'use strict';

  const PF = root.PF || (typeof require !== 'undefined' ? require('./engine.js') : null);
  if (!PF) throw Error('engine.js debe cargarse antes que notarial.js.');

  const sideWord = side => (side === 'front' ? 'frente' : 'vuelto');

  /* ------------------------------------------------------------------ *
   * Entrelineados y testaduras
   * ------------------------------------------------------------------ */

  /**
   * Convenciones de marcado dentro del texto de la escritura:
   *   «texto»     → entrelineado   (se lee y vale)
   *   [[texto]]   → testadura      (no vale)
   * Devuelve las listas y el texto limpio, sin las marcas.
   */
  function marks(text) {
    const source = PF.normalize(text);
    const entrelineados = [];
    const testados = [];
    for (const m of source.matchAll(/«([^»]+)»/gu)) entrelineados.push(m[1].trim());
    for (const m of source.matchAll(/\[\[([^\]]+)\]\]/gu)) testados.push(m[1].trim());
    const clean = source.replace(/«([^»]+)»/gu, '$1').replace(/\[\[([^\]]+)\]\]/gu, '');
    return { entrelineados, testados, clean };
  }

  /**
   * Razón final de entrelineados y testaduras, para cerrar la escritura.
   * Devuelve cadena vacía si no hay marcas.
   */
  function razonEntrelineados(text) {
    const { entrelineados, testados } = marks(text);
    const partes = [];
    if (entrelineados.length) {
      partes.push('Entre líneas se lee: ' +
        entrelineados.map(t => '«' + t + '»').join('; ') + '. Vale.');
    }
    if (testados.length) {
      partes.push('Testado: ' + testados.map(t => '«' + t + '»').join('; ') + '. No vale.');
    }
    return partes.join(' ');
  }

  /* ------------------------------------------------------------------ *
   * Razones de apertura y cierre del tomo
   * ------------------------------------------------------------------ */

  function requireNotary(notary) {
    if (!notary || !String(notary.name || '').trim()) {
      throw Error('Registrá primero el nombre del notario en Herramientas → Datos del notario.');
    }
    return notary;
  }

  /** Razón de apertura del tomo. `opts`: {date, time, folios, tomo}. */
  function razonApertura(book, notary, opts) {
    requireNotary(notary);
    const o = opts || {};
    const tomo = Number(o.tomo || book.tomo || 1);
    const folios = Number(o.folios || book.totalFolios || 100);
    const lugar = String(notary.place || '[Insertar Lugar]').trim();
    const carne = String(notary.carne || '[Insertar Número de Carné]').trim();
    const cedula = String(notary.cedula || '[Insertar Cédula de Identidad]').trim();
    const fecha = PF.dateWords(o.date || isoToday());
    const hora = PF.hourWords(o.time || '08:00');

    return 'RAZÓN DE APERTURA. El suscrito ' + notary.name.trim().toUpperCase() +
      ', Notario Público con oficina abierta en ' + lugar +
      ', portador de la cédula de identidad número ' + cedula +
      ', carné número ' + carne +
      ', procede a abrir el tomo ' + PF.ordinalWords(tomo, 'm') +
      ' de su protocolo, el cual consta de ' + PF.numberWords(folios) +
      ' folios debidamente numerados y sellados por la Dirección Nacional de Notariado. ' +
      'Esta razón se consigna en ' + lugar + ', a ' + hora + ' del ' + fecha + '.';
  }

  /** Razón de cierre del tomo. `opts`: {date, time, motivo, ultimaEscritura, ultimoFolio}. */
  function razonCierre(book, notary, opts) {
    requireNotary(notary);
    const o = opts || {};
    const tomo = Number(o.tomo || book.tomo || 1);
    const lugar = String(notary.place || '[Insertar Lugar]').trim();
    const fecha = PF.dateWords(o.date || isoToday());
    const hora = PF.hourWords(o.time || '16:00');
    const motivo = String(o.motivo || 'por agotamiento de los folios del tomo').trim();
    const ultima = Number.isInteger(o.ultimaEscritura) && o.ultimaEscritura > 0
      ? 'La última escritura pasada ante mí es la número ' +
        PF.numberWords(o.ultimaEscritura) + '. '
      : '';
    const folio = Number.isInteger(o.ultimoFolio) && o.ultimoFolio > 0
      ? 'El último folio utilizado es el número ' + PF.numberWords(o.ultimoFolio) + '. '
      : '';

    return 'RAZÓN DE CIERRE. El suscrito ' + notary.name.trim().toUpperCase() +
      ', Notario Público, cierra el tomo ' + PF.ordinalWords(tomo, 'm') +
      ' de su protocolo ' + motivo + '. ' + ultima + folio +
      'Se consigna esta razón en ' + lugar + ', a ' + hora + ' del ' + fecha +
      ', para los efectos del informe y entrega que corresponden ante la Dirección Nacional de Notariado.';
  }

  /* ------------------------------------------------------------------ *
   * Testimonios
   * ------------------------------------------------------------------ */

  /**
   * Razón de testimonio. `opts`: {ordinal (1 = primer testimonio), date, time,
   * destino, folios}.
   */
  function razonTestimonio(doc, book, notary, opts) {
    requireNotary(notary);
    const o = opts || {};
    const ordinal = Number.isInteger(o.ordinal) && o.ordinal > 0 ? o.ordinal : 1;
    const lugar = String(notary.place || '[Insertar Lugar]').trim();
    const fecha = PF.dateWords(o.date || isoToday());
    const hora = PF.hourWords(o.time || '10:00');
    const destino = String(o.destino || 'su presentación ante el Registro Nacional').trim();
    const tomo = Number(book.tomo || 1);

    const calificacion = ordinal === 1
      ? 'ES PRIMER TESTIMONIO'
      : 'ES ' + PF.ordinalWords(ordinal, 'm').toUpperCase() + ' TESTIMONIO';

    return calificacion + ' de la escritura número ' + PF.numberWords(doc.number) +
      ', otorgada ante mí, visible al folio ' + PF.numberWords(doc.folio) + ' ' +
      sideWord(doc.side) + ' del tomo ' + PF.ordinalWords(tomo, 'm') +
      ' de mi protocolo, que expido en ' + lugar + ', a ' + hora + ' del ' + fecha +
      ', para ' + destino + '.';
  }

  /* ------------------------------------------------------------------ *
   * Mapa de folios y choques de posición
   * ------------------------------------------------------------------ */

  /**
   * Recorre las escrituras de un libro y arma el mapa de ocupación.
   * `layout(doc)` debe devolver las caras calculadas por PF.paginate.
   * Devuelve {entries, conflicts, lastUsed}.
   */
  function folioMap(docs, layout) {
    const occupied = new Map();
    const entries = [];
    const conflicts = [];
    let lastUsed = null;

    const ordered = [...docs].sort((a, b) => a.number - b.number);
    for (const doc of ordered) {
      if (!doc.text.trim()) {
        entries.push({ doc, pages: [], start: null, end: null });
        continue;
      }
      const pages = layout(doc);
      const end = PF.endPosition(pages);
      for (const key of PF.positions(pages)) {
        if (occupied.has(key)) {
          conflicts.push({ position: key, a: occupied.get(key), b: doc.number });
        } else {
          occupied.set(key, doc.number);
        }
      }
      entries.push({
        doc, pages,
        start: { folio: doc.folio, side: doc.side, line: doc.line },
        end
      });
      if (end && (!lastUsed || compare(end, lastUsed) > 0)) lastUsed = end;
    }
    return { entries, conflicts, lastUsed };
  }

  function compare(a, b) {
    if (a.folio !== b.folio) return a.folio - b.folio;
    if (a.side !== b.side) return a.side === 'front' ? -1 : 1;
    return a.line - b.line;
  }

  /** Primer renglón libre tras la última escritura del libro. */
  function suggestStart(docs, layout, rows) {
    const { lastUsed } = folioMap(docs, layout);
    if (!lastUsed) return { folio: 1, side: 'front', line: 1 };
    return PF.nextPosition(lastUsed, rows);
  }

  /* ------------------------------------------------------------------ *
   * Índice de trabajo
   * ------------------------------------------------------------------ */

  const INDEX_HEADERS = ['Tomo', 'Libro', 'Número', 'Fecha', 'Hora', 'Acto', 'Otorgantes',
    'Estado', 'Folio inicial', 'Cara inicial', 'Renglón inicial',
    'Folio final', 'Cara final', 'Renglón final', 'Caras'];

  function indexRows(book, docs, layout) {
    const rows = [INDEX_HEADERS];
    const { entries } = folioMap(docs, layout);
    for (const e of entries) {
      const d = e.doc;
      rows.push([
        book.tomo || '', book.name, d.number, d.date, d.hour || '', d.title, d.parties, d.status,
        d.folio, sideWord(d.side), d.line,
        e.end ? e.end.folio : '', e.end ? sideWord(e.end.side) : '', e.end ? e.end.line : '',
        e.pages.length
      ]);
    }
    return rows;
  }

  /* ------------------------------------------------------------------ *
   * Honorarios y timbres (estimación con tarifas editables)
   * ------------------------------------------------------------------ */

  /** Honorarios por tramos sobre la cuantía. Devuelve número redondeado a céntimos. */
  function honorarios(amount, tariff) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) throw Error('Cuantía inválida.');
    const conf = (tariff && tariff.honorarios) || PF.defaultTariff().honorarios;
    const tramos = Array.isArray(conf.tramos) ? conf.tramos : [];
    let total = 0;
    let previous = 0;
    for (const tramo of tramos) {
      const limit = tramo.hasta === null || tramo.hasta === undefined ? Infinity : Number(tramo.hasta);
      if (!Number.isFinite(limit) && limit !== Infinity) throw Error('Tramo de arancel inválido.');
      const base = Math.max(0, Math.min(value, limit) - previous);
      total += base * Number(tramo.porcentaje || 0) / 100;
      previous = limit;
      if (value <= limit) break;
    }
    const minimo = Number(conf.minimo || 0);
    return Math.round(Math.max(total, minimo) * 100) / 100;
  }

  /**
   * Desglose de timbres y derechos. Cada renglón de la tabla es
   * {nombre, tipo:'porcentaje'|'fijo', valor, nota}.
   */
  function timbres(amount, tariff) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) throw Error('Cuantía inválida.');
    const table = (tariff && Array.isArray(tariff.timbres)) ? tariff.timbres : [];
    const rows = table.map(item => {
      const v = Number(item.valor || 0);
      const monto = item.tipo === 'porcentaje'
        ? Math.round(value * v / 100 * 100) / 100
        : Math.round(v * 100) / 100;
      return { nombre: item.nombre, tipo: item.tipo, valor: v, nota: item.nota || '', monto };
    });
    const total = Math.round(rows.reduce((sum, r) => sum + r.monto, 0) * 100) / 100;
    return { rows, total };
  }

  /** Liquidación completa: honorarios + timbres, con totales. */
  function liquidacion(amount, tariff) {
    const fee = honorarios(amount, tariff);
    const stamps = timbres(amount, tariff);
    return {
      cuantia: Number(amount),
      honorarios: fee,
      timbres: stamps.rows,
      totalTimbres: stamps.total,
      total: Math.round((fee + stamps.total) * 100) / 100,
      moneda: (tariff && tariff.moneda) || 'CRC'
    };
  }

  /* ------------------------------------------------------------------ *
   * Sustitución de campos en plantillas
   * ------------------------------------------------------------------ */

  /**
   * Campos admitidos: {Numero} {NumeroOrdinal} {Fecha} {Hora} {FechaHora}
   * {Notario} {Carne} {Cedula} {Lugar} {Oficina} {Otorgantes} {Acto}
   * {Folio} {Cara} {Tomo}. Los campos sin dato quedan intactos para que se
   * vean pendientes en el editor.
   */
  function fillTemplate(source, context) {
    const { doc, book, notary } = context;
    const values = {
      Numero: PF.numberWords(doc.number),
      NumeroOrdinal: PF.ordinalWords(Math.min(doc.number, 999), 'f'),
      Fecha: PF.dateWords(doc.date),
      Hora: doc.hour ? PF.hourWords(doc.hour) : '',
      FechaHora: doc.hour ? PF.dateTimeWords(doc.date, doc.hour) : '',
      Notario: (notary.name || '').trim(),
      Carne: (notary.carne || '').trim(),
      Cedula: (notary.cedula || '').trim(),
      Lugar: (notary.place || '').trim(),
      Oficina: (notary.office || '').trim(),
      Otorgantes: doc.parties || '',
      Acto: doc.title || '',
      Folio: PF.numberWords(doc.folio),
      Cara: sideWord(doc.side),
      Tomo: PF.ordinalWords(Number(book.tomo || 1), 'm')
    };
    return PF.normalize(source).replace(/\{([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\}/g,
      (match, key) => (values[key] ? values[key] : match));
  }

  function isoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const api = {
    sideWord, marks, razonEntrelineados,
    razonApertura, razonCierre, razonTestimonio,
    folioMap, suggestStart, compare,
    INDEX_HEADERS, indexRows,
    honorarios, timbres, liquidacion,
    fillTemplate, isoToday
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PFN = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
