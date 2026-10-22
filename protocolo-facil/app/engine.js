/*
 * Protocolo Fácil — núcleo de cálculo (sin DOM).
 *
 * Reconstrucción 0.3.0. Este módulo no toca el navegador: recibe datos y
 * devuelve datos, de modo que pueda ejercitarse con Node en `pruebas/`.
 *
 * Contiene: geometría del papel de protocolo, distribución del texto por
 * folio y cara, conversión de cantidades/fechas/horas a letras, exportación
 * CSV/RTF y validación del archivo de respaldo.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Perfil de papel por omisión
   * ------------------------------------------------------------------ */

  const defaults = {
    width: 216,
    height: 330,
    rows: 30,
    pitch: 8.5,
    font: 'Times New Roman',
    fontSize: 12,
    numberLines: false,
    justify: true,
    fill: false,
    front: { left: 30, right: 20, top: 35, x: 0, y: 0 },
    back: { left: 20, right: 30, top: 35, x: 0, y: 0 }
  };

  const STATUSES = ['Borrador', 'Revisada', 'Impresa', 'Firmada', 'No pasó'];
  const SIDES = ['front', 'back'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(text) {
    return String(text).normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\t\u00a0]/g, ' ');
  }

  /* ------------------------------------------------------------------ *
   * Validación de la geometría
   * ------------------------------------------------------------------ */

  function validate(p) {
    const errors = [];
    const finite = (v, a, b) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
    const ranges = [['width', 100, 500], ['height', 100, 600], ['rows', 1, 100],
      ['pitch', 2, 30], ['fontSize', 6, 36]];

    for (const [key, min, max] of ranges) {
      if (!finite(p[key], min, max)) errors.push('Valor inválido: ' + key);
    }
    if (!Number.isInteger(p.rows)) errors.push('Los renglones deben ser enteros.');
    if (p.pitch < p.fontSize * 25.4 / 72 * 1.2) {
      errors.push('La separación entre renglones es menor que la altura de la fuente.');
    }

    for (const side of SIDES) {
      const s = p[side];
      if (!s) { errors.push('Falta la cara ' + side); continue; }
      for (const key of ['left', 'right', 'top']) {
        if (!finite(s[key], 0, 200)) errors.push('Margen inválido: ' + side + ' ' + key);
      }
      for (const key of ['x', 'y']) {
        if (!finite(s[key], -100, 100)) errors.push('Calibración inválida: ' + side + ' ' + key);
      }
      if (p.width - s.left - s.right < 30) errors.push('El ancho útil debe ser al menos 30 mm.');
      if (s.left + s.x < 0 || p.width - s.right + s.x > p.width) {
        errors.push('La calibración horizontal sale del papel.');
      }
      if (s.top + s.y < 0 || s.top + s.y + (p.rows - 1) * p.pitch + p.fontSize * 25.4 / 72 > p.height) {
        errors.push('Los renglones salen del papel.');
      }
    }
    if (typeof p.font !== 'string' || !p.font.trim() || p.font.length > 100) {
      errors.push('Fuente inválida.');
    }
    return [...new Set(errors)];
  }

  /* ------------------------------------------------------------------ *
   * Distribución del texto por caras
   * ------------------------------------------------------------------ */

  function wrap(text, width, measure) {
    if (width <= 0) throw Error('Ancho útil inválido.');
    const words = normalize(text).trim().split(/\s+/u).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (measure(candidate) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      if (measure(word) <= width) { line = word; continue; }
      let chunk = '';
      for (const ch of Array.from(word)) {
        if (measure(ch) > width) throw Error('Un carácter excede el ancho útil.');
        if (chunk && measure(chunk + ch) > width) { lines.push(chunk); chunk = ''; }
        chunk += ch;
      }
      line = chunk;
    }
    if (line) lines.push(line);
    return lines;
  }

  /**
   * Reparte `text` a partir de `position` ({folio, side, line}) usando el
   * perfil `p`. Devuelve un arreglo de caras: {folio, side, start, lines}.
   * El ancho útil se recalcula en cada cara porque frente y vuelto tienen
   * márgenes distintos.
   */
  function paginate(text, p, position, measure) {
    const errors = validate(p);
    if (errors.length) throw Error(errors.join('\n'));
    if (!Number.isInteger(position.folio) || position.folio < 1 ||
        !Number.isInteger(position.line) || position.line < 1 || position.line > p.rows ||
        !SIDES.includes(position.side)) {
      throw Error('Posición inicial inválida.');
    }

    const words = normalize(text).trim().split(/\s+/u).filter(Boolean);
    const pages = [];
    let index = 0;
    let folio = position.folio;
    let side = position.side;
    let start = position.line;

    while (index < words.length) {
      if (pages.length >= 2000) throw Error('El documento excede 2000 caras. Divida el texto.');
      const s = p[side];
      const width = (p.width - s.left - s.right) * 96 / 25.4;
      const capacity = p.rows - start + 1;
      const lines = [];
      let line = '';

      while (index < words.length && lines.length < capacity) {
        const word = words[index];
        const candidate = line ? line + ' ' + word : word;
        if (measure(candidate) <= width) { line = candidate; index++; continue; }
        if (line) { lines.push(line); line = ''; continue; }
        // Palabra sola más ancha que el renglón: se parte por caracteres.
        let chunk = '';
        let used = 0;
        for (const ch of Array.from(word)) {
          if (measure(ch) > width) throw Error('Un carácter excede el ancho útil.');
          if (measure(chunk + ch) > width) break;
          chunk += ch;
          used += ch.length;
        }
        lines.push(chunk);
        if (used === word.length) index++; else words[index] = word.slice(used);
      }
      if (line) lines.push(line);

      pages.push({ folio, side, start, lines });
      if (side === 'front') side = 'back';
      else { side = 'front'; folio++; }
      start = 1;
    }
    if (pages.length) pages[pages.length - 1].isLast = true;
    return pages;
  }

  function positions(pages) {
    return pages.flatMap(p => p.lines.map((_, i) => `${p.folio}:${p.side}:${p.start + i}`));
  }

  /** Última posición ocupada, o null si no hay texto. */
  function endPosition(pages) {
    const last = pages[pages.length - 1];
    if (!last) return null;
    return { folio: last.folio, side: last.side, line: last.start + last.lines.length - 1 };
  }

  /** Renglón inmediatamente siguiente a `position`, dando vuelta la cara. */
  function nextPosition(position, rows) {
    let { folio, side, line } = position;
    line += 1;
    if (line > rows) {
      line = 1;
      if (side === 'front') side = 'back';
      else { side = 'front'; folio++; }
    }
    return { folio, side, line };
  }

  /* ------------------------------------------------------------------ *
   * Cantidades, fechas y horas en letras
   * ------------------------------------------------------------------ */

  const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
    'diecisiete', 'dieciocho', 'diecinueve'];
  const TWENTIES = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
    'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
    'ochenta', 'noventa'];
  const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  function numberWords(n) {
    if (!Number.isSafeInteger(n) || Math.abs(n) > 999999999999) {
      throw Error('Use un entero entre −999 999 999 999 y 999 999 999 999.');
    }
    if (n < 0) return 'menos ' + numberWords(-n);
    if (n < 10) return UNITS[n];
    if (n < 20) return TEENS[n - 10];
    if (n < 30) return TWENTIES[n - 20];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' y ' + UNITS[n % 10] : '');
    if (n === 100) return 'cien';
    if (n < 1000) return HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ' ' + numberWords(n % 100) : '');
    const apocope = s => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
    if (n < 1000000) {
      const q = Math.floor(n / 1000);
      return (q === 1 ? 'mil' : apocope(numberWords(q)) + ' mil') +
        (n % 1000 ? ' ' + numberWords(n % 1000) : '');
    }
    const q = Math.floor(n / 1000000);
    return (q === 1 ? 'un millón' : apocope(numberWords(q)) + ' millones') +
      (n % 1000000 ? ' ' + numberWords(n % 1000000) : '');
  }

  /** Cardinal concordado: 'm' apocopa (un, veintiún), 'f' feminiza (una, veintiuna). */
  function cardinalWords(n, gender) {
    const base = numberWords(n);
    if (gender === 'f') {
      return base.replace(/\bveintiuno\b/g, 'veintiuna')
        .replace(/\buno\b/g, 'una')
        .replace(/\bdoscientos\b/g, 'doscientas').replace(/\btrescientos\b/g, 'trescientas')
        .replace(/\bcuatrocientos\b/g, 'cuatrocientas').replace(/\bquinientos\b/g, 'quinientas')
        .replace(/\bseiscientos\b/g, 'seiscientas').replace(/\bsetecientos\b/g, 'setecientas')
        .replace(/\bochocientos\b/g, 'ochocientas').replace(/\bnovecientos\b/g, 'novecientas');
    }
    if (gender === 'm') {
      return base.replace(/\bveintiuno\b/g, 'veintiún').replace(/\buno\b/g, 'un');
    }
    return base;
  }

  const ORDINAL_UNITS = ['', 'primer', 'segund', 'tercer', 'cuart', 'quint', 'sext',
    'séptim', 'octav', 'noven'];
  const ORDINAL_TENS = ['', 'décim', 'vigésim', 'trigésim', 'cuadragésim', 'quincuagésim',
    'sexagésim', 'septuagésim', 'octogésim', 'nonagésim'];
  const ORDINAL_HUNDREDS = ['', 'centésim', 'ducentésim', 'tricentésim', 'cuadringentésim',
    'quingentésim', 'sexcentésim', 'septingentésim', 'octingentésim', 'noningentésim'];

  /**
   * Ordinal en letras entre 1 y 999. `gender` 'f' (por omisión) produce
   * "primera, segunda…", apto para cláusulas; 'm' produce "primero, segundo…".
   */
  function ordinalWords(n, gender) {
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      throw Error('El ordinal admite enteros entre uno y novecientos noventa y nueve.');
    }
    const end = gender === 'm' ? 'o' : 'a';
    const parts = [];
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    if (h) parts.push(ORDINAL_HUNDREDS[h] + end);
    if (t) parts.push(ORDINAL_TENS[t] + end);
    if (u) {
      // "primer"/"tercer" sólo apocopan ante sustantivo masculino suelto.
      let word = ORDINAL_UNITS[u];
      if (gender === 'm' && (u === 1 || u === 3)) word += 'o';
      else word += end;
      parts.push(word);
    }
    return parts.join(' ');
  }

  const CURRENCIES = {
    CRC: { singular: 'colón', plural: 'colones', centSingular: 'céntimo', centPlural: 'céntimos' },
    USD: { singular: 'dólar', plural: 'dólares', centSingular: 'centavo', centPlural: 'centavos' },
    EUR: { singular: 'euro', plural: 'euros', centSingular: 'céntimo', centPlural: 'céntimos' }
  };

  /**
   * Importe en letras, con céntimos. Acepta "1 234 567,89", "1,234,567.89"
   * o un número. Devuelve, por ejemplo:
   * "un millón doscientos treinta y cuatro mil quinientos sesenta y siete
   *  colones con ochenta y nueve céntimos".
   */
  function amountWords(value, currency) {
    const unit = CURRENCIES[currency || 'CRC'];
    if (!unit) throw Error('Moneda no reconocida. Use CRC, USD o EUR.');

    let whole;
    let cents;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw Error('Importe inválido.');
      const rounded = Math.round(Math.abs(value) * 100);
      whole = Math.floor(rounded / 100);
      cents = rounded % 100;
      if (value < 0) throw Error('Ingrese un importe positivo.');
    } else {
      let raw = String(value).trim().replace(/[₡$€\s]/g, '');
      if (!raw) throw Error('Ingrese un importe.');
      // El último separador que aparezca con 1 o 2 dígitos detrás es el decimal.
      const decimal = /[.,](\d{1,2})$/.exec(raw);
      let centPart = '';
      if (decimal) { centPart = decimal[1]; raw = raw.slice(0, decimal.index); }
      const digits = raw.replace(/[.,]/g, '');
      if (!/^\d+$/.test(digits)) throw Error('Importe inválido. Use dígitos y un separador decimal.');
      if (digits.length > 12) throw Error('Importe demasiado grande.');
      whole = Number(digits);
      cents = centPart ? Number(centPart.padEnd(2, '0')) : 0;
    }

    // "un millón DE colones", pero "un millón quinientos mil colones".
    const cardinal = cardinalWords(whole, 'm');
    const link = /mill(ón|ones)$/.test(cardinal) ? ' de ' : ' ';
    const head = cardinal + link + (whole === 1 ? unit.singular : unit.plural);
    if (!cents) return head;
    return head + ' con ' + cardinalWords(cents, 'm') + ' ' +
      (cents === 1 ? unit.centSingular : unit.centPlural);
  }

  function parseDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!m) throw Error('Fecha inválida.');
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (y < 100 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      throw Error('Fecha inválida.');
    }
    return { y, mo, d };
  }

  function dateWords(value) {
    const { y, mo, d } = parseDate(value);
    return numberWords(d) + ' de ' + MONTHS[mo - 1] + ' de ' + numberWords(y);
  }

  /** Hora en letras para la comparecencia: "las nueve horas treinta minutos". */
  function hourWords(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
    if (!m) throw Error('Hora inválida. Use el formato 14:30.');
    const h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) throw Error('Hora inválida.');
    const head = h === 1 ? 'la una hora' : 'las ' + cardinalWords(h, 'f') + ' horas';
    if (!mi) return head;
    return head + ' ' + cardinalWords(mi, 'm') + (mi === 1 ? ' minuto' : ' minutos');
  }

  /** Encabezado completo: "las nueve horas del cinco de marzo de dos mil veintiséis". */
  function dateTimeWords(date, time) {
    return hourWords(time) + ' del ' + dateWords(date);
  }

  /* ------------------------------------------------------------------ *
   * Exportación
   * ------------------------------------------------------------------ */

  function csv(rows) {
    return '\ufeff' + rows.map(r => r.map(v => {
      let s = String(v ?? '');
      if (/^[=+@-]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
  }

  function rtf(text) {
    let s = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 ';
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (text[i] === '\n') s += '\\par\n';
      else if ('\\{}'.includes(text[i])) s += '\\' + text[i];
      else if (c > 127) s += '\\u' + (c > 32767 ? c - 65536 : c) + '?';
      else s += text[i];
    }
    return s + '}';
  }

  /* ------------------------------------------------------------------ *
   * Estado persistido: esquema, migración y validación
   * ------------------------------------------------------------------ */

  const FORMAT = 'protocolo-facil';
  const VERSION = 2;

  function emptyNotary() {
    return { name: '', carne: '', cedula: '', place: '', office: '' };
  }

  function defaultTariff() {
    // Valores EDITABLES. Se entregan como punto de partida de trabajo y deben
    // confrontarse con el arancel y la normativa tributaria vigentes.
    return {
      moneda: 'CRC',
      honorarios: {
        minimo: 0,
        tramos: [
          { hasta: 11000000, porcentaje: 2 },
          { hasta: 22000000, porcentaje: 1.5 },
          { hasta: 33000000, porcentaje: 1.25 },
          { hasta: 44000000, porcentaje: 1 },
          { hasta: null, porcentaje: 0.75 }
        ]
      },
      timbres: [
        { nombre: 'Timbre fiscal', tipo: 'porcentaje', valor: 0, nota: 'Verificar vigencia' },
        { nombre: 'Derechos de registro', tipo: 'porcentaje', valor: 0, nota: 'Verificar vigencia' },
        { nombre: 'Timbre Archivo Nacional', tipo: 'fijo', valor: 0, nota: 'Verificar vigencia' },
        { nombre: 'Timbre agrario', tipo: 'porcentaje', valor: 0, nota: 'Verificar vigencia' },
        { nombre: 'Timbre municipal', tipo: 'fijo', valor: 0, nota: 'Verificar vigencia' },
        { nombre: 'Timbre Colegio de Abogados', tipo: 'fijo', valor: 0, nota: 'Verificar vigencia' }
      ]
    };
  }

  function initialState() {
    const book = { id: 'libro-inicial', name: 'Tomo primero', tomo: 1, totalFolios: 100,
      apertura: '', cierre: '' };
    return {
      format: FORMAT,
      version: VERSION,
      books: [book],
      docs: [],
      templates: [],
      profile: clone(defaults),
      notary: emptyNotary(),
      tariff: defaultTariff(),
      updated: new Date().toISOString()
    };
  }

  /** Acepta respaldos de la edición 0.1/0.2 (formato v1) y los eleva a v2. */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object') throw Error('Respaldo ilegible.');
    if (raw.format === FORMAT && raw.version === VERSION) return raw;
    if (raw.format === 'protocolo-facil-mac' && raw.version === 1) {
      const next = {
        format: FORMAT,
        version: VERSION,
        books: (raw.books || []).map((b, i) => ({
          id: b.id, name: b.name, tomo: i + 1, totalFolios: b.totalFolios || 100,
          apertura: '', cierre: ''
        })),
        docs: (raw.docs || []).map(d => ({ ...d, hour: '09:00', marginals: '' })),
        templates: raw.templates || [],
        profile: raw.profile || clone(defaults),
        notary: { ...emptyNotary(), name: raw.notary || '', place: raw.place || '' },
        tariff: defaultTariff(),
        updated: raw.updated || new Date().toISOString()
      };
      return next;
    }
    throw Error('Respaldo incompatible. Se admite JSON de Protocolo Fácil 0.1, 0.2 o 0.3.');
  }

  function checkState(input) {
    const s = migrate(input);
    if (!Array.isArray(s.books) || !Array.isArray(s.docs) || !Array.isArray(s.templates)) {
      throw Error('Respaldo incompleto.');
    }
    if (s.docs.length > 10000 || s.books.length > 1000 || s.templates.length > 1000) {
      throw Error('Respaldo demasiado grande.');
    }
    const errors = validate(s.profile || {});
    if (errors.length) throw Error(errors.join('\n'));

    const bookIds = new Set();
    for (const b of s.books) {
      if (typeof b.id !== 'string' || bookIds.has(b.id) || typeof b.name !== 'string') {
        throw Error('Libro inválido o repetido.');
      }
      if (!Number.isInteger(b.totalFolios) || b.totalFolios < 1 || b.totalFolios > 10000) {
        throw Error('Cantidad de folios inválida en el libro ' + b.name + '.');
      }
      bookIds.add(b.id);
    }

    const docIds = new Set();
    const numbers = new Set();
    for (const d of s.docs) {
      const ok = typeof d.id === 'string' && !docIds.has(d.id) && bookIds.has(d.bookId) &&
        typeof d.text === 'string' && d.text.length <= 2000000 &&
        Number.isInteger(d.number) && d.number >= 1 &&
        typeof d.title === 'string' && STATUSES.includes(d.status) &&
        Number.isInteger(d.folio) && d.folio >= 1 &&
        Number.isInteger(d.line) && d.line >= 1 && d.line <= s.profile.rows &&
        SIDES.includes(d.side) && typeof d.date === 'string' &&
        typeof d.parties === 'string' && typeof d.notes === 'string';
      if (!ok) throw Error('Escritura inválida (número ' + (d && d.number) + ').');
      dateWords(d.date);
      if (d.hour) hourWords(d.hour);
      const key = d.bookId + ':' + d.number;
      if (numbers.has(key)) throw Error('Números de escritura repetidos en el libro.');
      numbers.add(key);
      docIds.add(d.id);
    }

    for (const t of s.templates) {
      if (typeof t.id !== 'string' || typeof t.name !== 'string' || typeof t.text !== 'string') {
        throw Error('Plantilla inválida.');
      }
    }
    if (!s.notary || typeof s.notary !== 'object') s.notary = emptyNotary();
    if (!s.tariff || typeof s.tariff !== 'object') s.tariff = defaultTariff();
    return s;
  }

  const api = {
    defaults, STATUSES, SIDES, MONTHS, FORMAT, VERSION,
    clone, normalize, validate, wrap, paginate, positions, endPosition, nextPosition,
    numberWords, cardinalWords, ordinalWords, amountWords,
    parseDate, dateWords, hourWords, dateTimeWords,
    csv, rtf,
    emptyNotary, defaultTariff, initialState, migrate, checkState
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PF = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
