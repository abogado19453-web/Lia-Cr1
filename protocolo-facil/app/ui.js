/*
 * Protocolo Fácil — controlador de interfaz.
 *
 * Un solo módulo: lee el estado del almacén, dibuja las pantallas y aplica
 * los cambios. No se parchean funciones de otros archivos (ese fue el punto
 * débil de la edición 0.2).
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const today = () => PFN.isoToday();
  const sideWord = PFN.sideWord;

  const SECTIONS = {
    home: 'Inicio',
    editor: 'Escrituras',
    preview: 'Revisar e imprimir',
    tomo: 'Tomo y razones',
    index: 'Índice',
    templates: 'Plantillas',
    tools: 'Herramientas',
    settings: 'Configurar impresión'
  };

  const FIELDS = ['number', 'date', 'hour', 'status', 'folio', 'side', 'line',
    'title', 'parties', 'text', 'notes'];
  const NUMERIC_FIELDS = ['number', 'folio', 'line'];

  /* ------------------------------------------------------------------ *
   * Estado de la sesión
   * ------------------------------------------------------------------ */

  const store = PFStore.createStore();
  const loaded = store.load();
  let state = loaded.state;
  let storageOK = loaded.writable;
  let selectedBook = state.books[0] ? state.books[0].id : null;
  let selectedDoc = (state.docs.find(d => d.bookId === selectedBook) || {}).id || null;
  let templateId = '';
  let activeTab = 'home';
  let pages = [];
  let previewSignature = '';
  let zoom = 0.65;
  let saveTimer = null;
  let noticeTimer = null;
  let bookEditId = null;
  let lastFocus = null;
  let matchAt = -1;
  let modalInsertTarget = null;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  /* ------------------------------------------------------------------ *
   * Utilidades generales
   * ------------------------------------------------------------------ */

  function message(text, isError) {
    const box = $('notice');
    box.textContent = text;
    box.classList.toggle('error', Boolean(isError));
    box.style.display = 'block';
    const close = document.createElement('button');
    close.className = 'toastClose';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar aviso');
    close.onclick = () => { box.style.display = 'none'; };
    box.append(close);
    clearTimeout(noticeTimer);
    if (!isError) noticeTimer = setTimeout(() => { box.style.display = 'none'; }, 9000);
  }

  /** Envuelve un manejador para que cualquier error llegue al aviso visible. */
  function guard(fn) {
    return function (...args) {
      try { return fn.apply(this, args); } catch (e) { message(e.message || String(e), true); return null; }
    };
  }

  /** Puente con la aplicación de escritorio; null en el navegador. */
  const nativo = (typeof pfNativo !== 'undefined') ? pfNativo : null;

  const FILTRO_JSON = [{ name: 'Respaldo de Protocolo Fácil', extensions: ['json'] }];

  function extensionDe(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase() : 'txt';
  }

  /**
   * Entrega un archivo al usuario. En la aplicación abre el cuadro de
   * guardado del sistema; en el navegador descarga.
   */
  function download(name, body, type) {
    if (nativo) {
      const ext = extensionDe(name);
      nativo.guardarComo(name, body, [{ name: ext.toUpperCase(), extensions: [ext] }])
        .then(r => {
          if (r.ok) message('Guardado en ' + r.ruta + '.');
          else if (!r.cancelado) message(r.error || 'No se pudo guardar.', true);
        });
      return;
    }
    const blob = new Blob([body], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  /** Respaldo pedido por el usuario: elige dónde guardarlo. */
  function backup() {
    const nombre = 'ProtocoloFacil-respaldo-' + today() + '.json';
    const contenido = JSON.stringify(state, null, 2);
    if (nativo) {
      nativo.guardarComo(nombre, contenido, FILTRO_JSON).then(r => {
        if (r.ok) message('Respaldo guardado en ' + r.ruta + '.');
        else if (!r.cancelado) message(r.error || 'No se pudo guardar el respaldo.', true);
      });
      return;
    }
    download(nombre, contenido, 'application/json');
  }

  /**
   * Instantánea previa a una operación irreversible. En la aplicación deja
   * además una copia fechada en la carpeta de respaldos, sin interrumpir;
   * en el navegador descarga una copia, que es lo único disponible allí.
   */
  function guardChange(label) {
    store.snapshot(state, label);
    if (nativo) nativo.respaldoAutomatico(JSON.stringify(state, null, 2), label);
    else backup();
    renderSnapshots();
  }

  function persist() {
    const ok = store.save(state);
    if (!ok) storageOK = false;
    $('saveStatus').textContent = ok
      ? 'Guardado localmente · ' + new Date().toLocaleTimeString('es-CR')
      : 'Solo en memoria: descargá un respaldo';
    refreshSaveBadge();
    return ok;
  }

  function refreshSaveBadge() {
    const badge = $('globalSave');
    const text = $('saveStatus').textContent;
    const pending = text.indexOf('pendientes') >= 0;
    const failing = text.indexOf('memoria') >= 0;
    badge.classList.toggle('pending', pending);
    badge.classList.toggle('error', failing);
    badge.querySelector('span').textContent =
      failing ? 'Descargá un respaldo' : pending ? 'Guardando…' : 'Guardado';
  }

  const currentDoc = () => state.docs.find(d => d.id === selectedDoc) || null;
  const currentBook = () => state.books.find(b => b.id === selectedBook) || null;
  const bookDocs = () => state.docs.filter(d => d.bookId === selectedBook);

  function layout(doc) {
    const p = state.profile;
    measureCtx.font = (p.fontSize * 96 / 72) + 'px "' + p.font + '"';
    return PF.paginate(doc.text, p, { folio: doc.folio, side: doc.side, line: doc.line },
      text => measureCtx.measureText(text).width);
  }

  function blankDoc(bookId, number) {
    return {
      id: uid(), bookId, number: number || 1, date: today(), hour: '09:00',
      status: 'Borrador', folio: 1, side: 'front', line: 1,
      title: 'Nueva escritura', parties: '', text: '', notes: '',
      modified: new Date().toISOString()
    };
  }

  /* ------------------------------------------------------------------ *
   * Formulario de la escritura
   * ------------------------------------------------------------------ */

  function renderDoc() {
    const d = currentDoc();
    $('docForm').style.display = d ? 'block' : 'none';
    $('noDoc').hidden = Boolean(d);
    for (const id of ['save', 'exportText', 'exportRTF', 'deleteDoc', 'goPreview', 'makeTestimonio']) {
      $(id).disabled = !d;
    }
    $('docHeading').textContent = d ? 'Escritura ' + d.number : 'Creá una escritura';
    if (d) {
      for (const key of FIELDS) $(key).value = d[key] != null ? d[key] : '';
      $('docStatusBadge').textContent = d.status;
      $('docStatusBadge').className = 'statusPill' +
        (['Revisada', 'Impresa'].indexOf(d.status) >= 0 ? ' reviewed' : d.status === 'Firmada' ? ' signed' : '');
      $('positionSummary').textContent =
        'Folio ' + d.folio + ' · ' + sideWord(d.side) + ' · renglón ' + d.line;
      $('previewDocTitle').textContent = 'Escritura ' + d.number + ' · ' + d.title;
    }
    refreshCounts();
  }

  function refreshCounts() {
    const d = currentDoc();
    const count = d ? d.text.trim().split(/\s+/).filter(Boolean).length : 0;
    $('wordCount').textContent = count + ' palabras';
    $('readingTime').textContent = 'Lectura estimada: ' +
      (count < 200 ? 'menos de 1 min' : Math.ceil(count / 200) + ' min');
  }

  /** Lee el formulario, valida y vuelca sobre la escritura seleccionada. */
  function collect() {
    const d = currentDoc();
    if (!d) return;
    const next = Object.assign({}, d);
    for (const key of FIELDS) {
      next[key] = NUMERIC_FIELDS.indexOf(key) >= 0 ? Number($(key).value) : $(key).value;
    }
    if (!Number.isInteger(next.number) || next.number < 1 ||
        !Number.isInteger(next.folio) || next.folio < 1 ||
        !Number.isInteger(next.line) || next.line < 1 || next.line > state.profile.rows) {
      throw Error('Revisá número, folio y renglón inicial. Deben ser enteros válidos.');
    }
    PF.dateWords(next.date);
    if (next.hour) PF.hourWords(next.hour);
    if (state.docs.some(x => x.id !== d.id && x.bookId === d.bookId && x.number === next.number)) {
      throw Error('Ya existe una escritura con ese número en el libro.');
    }
    if (next.text.length > 2000000) throw Error('El texto excede los dos millones de caracteres.');
    if (FIELDS.some(k => d[k] !== next[k])) {
      Object.assign(d, next, { modified: new Date().toISOString() });
    }
    $('docHeading').textContent = 'Escritura ' + d.number;
    refreshCounts();
  }

  function flush() {
    clearTimeout(saveTimer);
    collect();
    persist();
  }

  for (const key of FIELDS) {
    $(key).addEventListener('input', () => {
      $('saveStatus').textContent = 'Cambios pendientes';
      refreshSaveBadge();
      if (['status', 'folio', 'side', 'line'].indexOf(key) >= 0) {
        $('docStatusBadge').textContent = $('status').value;
        $('positionSummary').textContent = 'Folio ' + $('folio').value + ' · ' +
          sideWord($('side').value) + ' · renglón ' + $('line').value;
      }
      clearTimeout(saveTimer);
      saveTimer = setTimeout(guard(() => { collect(); persist(); renderList(); }), 600);
    });
  }

  /* ------------------------------------------------------------------ *
   * Listas y pantalla de inicio
   * ------------------------------------------------------------------ */

  function renderBooks() {
    const sel = $('book');
    sel.replaceChildren();
    for (const b of state.books) sel.add(new Option(b.name, b.id));
    sel.value = selectedBook || '';
  }

  function renderList() {
    const q = $('search').value.toLocaleLowerCase('es');
    const docs = bookDocs()
      .filter(d => (d.number + ' ' + d.title + ' ' + d.parties).toLocaleLowerCase('es').indexOf(q) >= 0)
      .sort((a, b) => a.number - b.number);
    const list = $('docList');
    list.replaceChildren();
    for (const d of docs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'docItem' + (d.id === selectedDoc ? ' selected' : '');
      const strong = document.createElement('strong');
      strong.textContent = d.number + ' · ' + d.title;
      const small = document.createElement('small');
      small.textContent = d.date + ' · ' + d.status;
      btn.append(strong, small);
      btn.addEventListener('click', guard(() => {
        flush();
        selectedDoc = d.id;
        renderDoc();
        renderList();
      }));
      list.append(btn);
    }
    $('listCount').textContent = bookDocs().length;
    renderHome();
  }

  function statusPill(status) {
    const el = document.createElement('span');
    el.className = 'statusPill' +
      (['Revisada', 'Impresa'].indexOf(status) >= 0 ? ' reviewed' : status === 'Firmada' ? ' signed' : '');
    el.textContent = status;
    return el;
  }

  function renderHome() {
    const docs = bookDocs();
    const book = currentBook();
    $('statBooks').textContent = state.books.length;
    $('statDocs').textContent = docs.length;
    $('statDrafts').textContent = docs.filter(d => d.status === 'Borrador').length;
    $('statReviewed').textContent =
      docs.filter(d => ['Revisada', 'Impresa', 'Firmada'].indexOf(d.status) >= 0).length;

    let usedFolios = 0;
    try {
      const map = PFN.folioMap(docs, layout);
      usedFolios = map.lastUsed ? map.lastUsed.folio : 0;
    } catch (e) {
      usedFolios = 0;
    }
    $('statFolios').textContent = usedFolios;

    $('homeBookName').textContent = book ? book.name : 'Elegí o creá un libro';
    const notaryName = (state.notary.name || '').trim();
    $('welcomeTitle').textContent = notaryName
      ? 'Todo listo, ' + notaryName.split(' ')[0] + '.'
      : 'Todo listo para trabajar.';
    const initials = notaryName.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
    $('userAvatar').textContent = initials || 'PF';
    $('userAvatar').setAttribute('aria-label', notaryName || 'Mi espacio');

    const recent = docs
      .filter(d => d.text.trim() || d.title !== 'Nueva escritura')
      .sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || '')))
      .slice(0, 5);
    const box = $('recentDocs');
    box.replaceChildren();
    if (!recent.length) {
      const empty = document.createElement('div');
      empty.className = 'emptyState';
      const h = document.createElement('h3');
      h.textContent = 'Tu próxima escritura empieza aquí';
      const p = document.createElement('p');
      p.textContent = 'Abrí el editor y preparás el primer documento de este libro.';
      empty.append(h, p);
      box.append(empty);
    }
    for (const d of recent) {
      const row = document.createElement('div');
      row.className = 'recentRow';
      const info = document.createElement('div');
      info.className = 'recentInfo';
      const strong = document.createElement('strong');
      strong.textContent = d.number + ' · ' + d.title;
      const small = document.createElement('small');
      small.textContent = d.date.split('-').reverse().join('/') + ' · ' +
        (d.parties || 'Sin otorgantes registrados');
      info.append(strong, small);
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'ghost';
      open.textContent = 'Abrir';
      open.onclick = guard(() => {
        flush();
        selectedDoc = d.id;
        renderDoc();
        renderList();
        showTab('editor');
      });
      row.append(info, statusPill(d.status), open);
      box.append(row);
    }
    renderSnapshots();
  }

  function renderSnapshots() {
    const box = $('snapshotList');
    box.replaceChildren();
    const list = store.snapshots();
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'muted small';
      p.textContent = 'Todavía no hay instantáneas en esta sesión.';
      box.append(p);
      return;
    }
    for (const snap of list) {
      const row = document.createElement('div');
      row.className = 'snapshotRow';
      const info = document.createElement('div');
      info.className = 'recentInfo';
      const strong = document.createElement('strong');
      strong.textContent = snap.label;
      const small = document.createElement('small');
      small.textContent = new Date(snap.at).toLocaleString('es-CR');
      info.append(strong, small);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost';
      btn.textContent = 'Volver a este punto';
      btn.onclick = guard(() => {
        if (!confirm('¿Reemplazar los datos actuales por esta instantánea? Se descargará antes una copia del estado presente.')) return;
        const recovered = store.restoreSnapshot(snap.index);
        backup();
        state = recovered;
        selectedBook = state.books[0] ? state.books[0].id : null;
        selectedDoc = (state.docs.find(d => d.bookId === selectedBook) || {}).id || null;
        persist();
        renderEverything();
        message('Datos recuperados desde la instantánea.');
      });
      row.append(info, btn);
      box.append(row);
    }
  }

  /* ------------------------------------------------------------------ *
   * Navegación
   * ------------------------------------------------------------------ */

  function showTab(name) {
    if (activeTab === 'editor' && name !== 'editor') flush();
    activeTab = name;
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.id === name));
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === name) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    $('sectionTitle').textContent = SECTIONS[name] || name;
    if (name === 'home') renderHome();
    if (name === 'preview') { showPreview(); fitZoom(); }
    if (name === 'tomo') renderTomo();
    if (name === 'index') renderIndex();
    if (name === 'templates') renderTemplates();
    if (name === 'tools') renderTools();
    if (name === 'settings') renderProfile();
  }

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', guard(() => showTab(btn.dataset.tab)));
  });

  /* Los formularios que no envían nada se frenan acá y no con un atributo
     incrustado: la política de seguridad de la aplicación bloquea esos
     atributos, y sin este freno la página navegaría al pulsar Intro. */
  for (const id of ['docForm', 'tomoForm']) {
    $(id).addEventListener('submit', e => e.preventDefault());
  }

  /* ------------------------------------------------------------------ *
   * Libros y escrituras
   * ------------------------------------------------------------------ */

  $('book').onchange = guard(() => {
    flush();
    selectedBook = $('book').value;
    selectedDoc = (state.docs.find(d => d.bookId === selectedBook) || {}).id || null;
    renderDoc();
    renderList();
  });

  function openBookModal(edit) {
    flush();
    const b = edit ? currentBook() : null;
    bookEditId = b ? b.id : null;
    $('bookModalTitle').textContent = b ? 'Editar libro' : 'Nuevo libro';
    $('bookSubmit').textContent = b ? 'Guardar cambios' : 'Crear libro';
    $('bookNameInput').value = b ? b.name : '';
    $('bookTomoInput').value = b ? (b.tomo || 1) : state.books.length + 1;
    $('bookFoliosInput').value = b ? b.totalFolios : 100;
    openModal('bookModal');
  }

  $('newBook').onclick = guard(() => openBookModal(false));
  $('editBook').onclick = guard(() => openBookModal(true));
  $('closeBookModal').onclick = () => closeModal('bookModal');

  $('bookModalForm').onsubmit = guard(e => {
    e.preventDefault();
    const name = $('bookNameInput').value.trim();
    const tomo = Number($('bookTomoInput').value);
    const total = Number($('bookFoliosInput').value);
    if (!name || !Number.isInteger(total) || total < 1 || total > 10000 ||
        !Number.isInteger(tomo) || tomo < 1) {
      throw Error('Revisá el nombre, el número de tomo y la cantidad de folios.');
    }
    if (bookEditId) {
      Object.assign(state.books.find(b => b.id === bookEditId), { name, tomo, totalFolios: total });
    } else {
      const b = { id: uid(), name, tomo, totalFolios: total, apertura: '', cierre: '' };
      state.books.push(b);
      selectedBook = b.id;
      selectedDoc = null;
    }
    persist();
    renderBooks();
    renderDoc();
    renderList();
    closeModal('bookModal');
    message(bookEditId ? 'Libro actualizado.' : 'Libro creado.');
  });

  $('newDoc').onclick = guard(() => {
    flush();
    if (!selectedBook) throw Error('Creá primero un libro.');
    const siblings = bookDocs();
    const doc = blankDoc(selectedBook, Math.max(0, ...siblings.map(d => d.number)) + 1);
    const suggestion = PFN.suggestStart(siblings, layout, state.profile.rows);
    doc.folio = suggestion.folio;
    doc.side = suggestion.side;
    doc.line = suggestion.line;
    if (state.notary.name) doc.title = 'Nueva escritura';
    state.docs.push(doc);
    selectedDoc = doc.id;
    persist();
    renderDoc();
    renderList();
    showTab('editor');
    $('title').focus();
  });

  $('emptyNew').onclick = () => $('newDoc').click();
  $('homeNew').onclick = guard(() => { $('newDoc').click(); });
  $('homeAll').onclick = guard(() => showTab('editor'));
  $('homeCalibrate').onclick = guard(() => showTab('settings'));
  $('backEditor').onclick = guard(() => showTab('editor'));
  $('previewCalibrate').onclick = guard(() => showTab('settings'));
  $('search').oninput = renderList;
  $('save').onclick = guard(() => { flush(); renderList(); message('Escritura guardada.'); });
  $('goPreview').onclick = guard(() => showTab('preview'));

  $('suggestPosition').onclick = guard(() => {
    const d = currentDoc();
    if (!d) throw Error('Seleccioná una escritura.');
    const others = bookDocs().filter(x => x.id !== d.id);
    const suggestion = PFN.suggestStart(others, layout, state.profile.rows);
    $('folio').value = suggestion.folio;
    $('side').value = suggestion.side;
    $('line').value = suggestion.line;
    flush();
    renderDoc();
    message('Posición propuesta: folio ' + suggestion.folio + ' ' + sideWord(suggestion.side) +
      ', renglón ' + suggestion.line + '. Revisala si trabajás fuera de secuencia.');
  });

  $('deleteDoc').onclick = guard(() => {
    flush();
    const d = currentDoc();
    if (!d) return;
    if (!confirm('¿Eliminar la escritura ' + d.number + '? Se guardará antes una instantánea y se descargará un respaldo.')) return;
    guardChange('Antes de eliminar la escritura ' + d.number);
    state.docs = state.docs.filter(x => x.id !== d.id);
    selectedDoc = (state.docs.find(x => x.bookId === selectedBook) || {}).id || null;
    persist();
    renderDoc();
    renderList();
  });

  /* ------------------------------------------------------------------ *
   * Respaldo, restauración, importación y exportación
   * ------------------------------------------------------------------ */

  $('backup').onclick = guard(() => {
    flush();
    backup();
    message('Respaldo JSON preparado. Conservá una copia fuera de la aplicación.');
  });

  $('restore').onclick = guard(() => {
    if (!nativo) { $('restoreFile').click(); return; }
    nativo.abrirArchivo(FILTRO_JSON).then(guard(r => {
      if (!r.ok) {
        if (!r.cancelado) message(r.error || 'No se pudo abrir el archivo.', true);
        return;
      }
      applyRestore(PF.checkState(JSON.parse(r.contenido)));
    }));
  });

  /** Sustituye el conjunto completo por `next`, con copia previa. */
  function applyRestore(next) {
    if (!confirm('¿Restaurar este respaldo y sustituir los datos de la sesión? Se guardará antes una copia del estado actual.')) return;
    flush();
    guardChange('Antes de restaurar un respaldo');
    state = next;
    storageOK = true;
    selectedBook = state.books[0] ? state.books[0].id : null;
    selectedDoc = (state.docs.find(d => d.bookId === selectedBook) || {}).id || null;
    persist();
    renderEverything();
    message('Respaldo restaurado.');
  }

  $('restoreFile').onchange = async () => {
    const file = $('restoreFile').files[0];
    if (!file) return;
    try {
      if (file.size > 25000000) throw Error('Respaldo mayor de 25 MB.');
      applyRestore(PF.checkState(JSON.parse(await file.text())));
    } catch (e) {
      message(e.message, true);
    } finally {
      $('restoreFile').value = '';
    }
  };

  $('exportText').onclick = guard(() => {
    flush();
    const d = currentDoc();
    if (d) download('Escritura-' + d.number + '.txt', d.text, 'text/plain;charset=utf-8');
  });

  $('exportRTF').onclick = guard(() => {
    flush();
    const d = currentDoc();
    if (d) download('Escritura-' + d.number + '.rtf', PF.rtf(d.text), 'application/rtf');
  });

  $('importText').onclick = guard(() => {
    if (!nativo) { $('textFile').click(); return; }
    nativo.abrirArchivo([{ name: 'Texto sin formato', extensions: ['txt'] }]).then(guard(r => {
      if (!r.ok) {
        if (!r.cancelado) message(r.error || 'No se pudo abrir el archivo.', true);
        return;
      }
      applyImport(r.contenido);
    }));
  });

  /** Sustituye el texto de la escritura actual, con copia previa. */
  function applyImport(value) {
    if ($('text').value.trim() &&
        !confirm('¿Reemplazar el texto de esta escritura? Se guardará una instantánea.')) return;
    flush();
    guardChange('Antes de importar un TXT');
    $('text').value = PF.normalize(value);
    flush();
    message('Texto importado.');
  }

  $('textFile').onchange = async () => {
    const file = $('textFile').files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error('Texto mayor de 2 MB.');
      if (!file.name.toLowerCase().endsWith('.txt')) {
        throw Error('Para importar un RTF, abrilo en TextEdit y guardalo como texto sin formato (.txt).');
      }
      applyImport(await file.text());
    } catch (e) {
      message(e.message, true);
    } finally {
      $('textFile').value = '';
    }
  };

  /* ------------------------------------------------------------------ *
   * Barra de edición
   * ------------------------------------------------------------------ */

  function insertIntoText(value) {
    const el = $('text');
    if (!currentDoc()) throw Error('Seleccioná una escritura para editar el texto.');
    el.setRangeText(value, el.selectionStart, el.selectionEnd, 'select');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  $('upperText').onclick = guard(() => {
    const el = $('text');
    if (el.selectionStart === el.selectionEnd) throw Error('Seleccioná el fragmento que querés pasar a mayúsculas.');
    insertIntoText(el.value.slice(el.selectionStart, el.selectionEnd).toLocaleUpperCase('es'));
  });

  $('insertDate').onclick = guard(() => insertIntoText(PF.dateWords($('date').value)));
  $('insertHour').onclick = guard(() => {
    if (!$('hour').value) throw Error('Indicá la hora de la escritura.');
    insertIntoText(PF.hourWords($('hour').value));
  });

  $('insertAmount').onclick = guard(() => {
    askText('Monto en letras', 'Importe', '',
      'Por ejemplo 25 000 000,50. Se convierte con la moneda de las tarifas.')
      .then(guard(raw => {
        if (raw === null || !raw.trim()) return;
        insertIntoText(PF.amountWords(raw, state.tariff.moneda || 'CRC'));
      }));
  });

  $('insertRazon').onclick = guard(() => {
    const d = currentDoc();
    if (!d) throw Error('Seleccioná una escritura.');
    const razon = PFN.razonEntrelineados($('text').value);
    if (!razon) throw Error('No hay entrelineados «así» ni testaduras [[así]] en el texto.');
    openTextModal('Razón de entrelineados y testaduras', razon, true);
  });

  $('makeTestimonio').onclick = guard(() => {
    flush();
    const d = currentDoc();
    const book = currentBook();
    if (!d || !book) throw Error('Seleccioná una escritura.');
    askText('Razón de testimonio', '¿Qué testimonio es?', '1',
      'Uno es el primer testimonio; dos, el segundo, y así.')
      .then(guard(raw => {
        if (raw === null) return;
        const ordinal = Number(raw);
        if (!Number.isInteger(ordinal) || ordinal < 1) {
          throw Error('Indicá un número entero mayor que cero.');
        }
        const text = PFN.razonTestimonio(d, book, state.notary, { ordinal, date: today() });
        openTextModal('Razón de testimonio', text, true);
      }));
  });

  $('findText').onclick = () => {
    $('findPanel').hidden = !$('findPanel').hidden;
    if (!$('findPanel').hidden) $('findValue').focus();
  };
  $('closeFind').onclick = () => { $('findPanel').hidden = true; $('text').focus(); };
  $('findValue').oninput = () => { matchAt = -1; $('findFeedback').textContent = ''; };

  function findNext() {
    const term = $('findValue').value;
    if (!term) { $('findFeedback').textContent = 'Escribí una palabra o frase para buscar.'; return; }
    const text = $('text').value;
    const haystack = text.toLocaleLowerCase('es');
    const needle = term.toLocaleLowerCase('es');
    const from = matchAt >= 0 ? matchAt + term.length : 0;
    matchAt = haystack.indexOf(needle, from);
    if (matchAt < 0) matchAt = haystack.indexOf(needle);
    if (matchAt < 0) { $('findFeedback').textContent = 'No se encontraron coincidencias.'; return; }
    $('text').focus();
    $('text').setSelectionRange(matchAt, matchAt + term.length);
    $('findFeedback').textContent = 'Coincidencia encontrada. Podés reemplazar este fragmento.';
  }

  $('findNext').onclick = findNext;
  $('replaceOne').onclick = guard(() => {
    const term = $('findValue').value;
    const el = $('text');
    const selected = el.value.slice(el.selectionStart, el.selectionEnd);
    if (!term || selected.toLocaleLowerCase('es') !== term.toLocaleLowerCase('es')) { findNext(); return; }
    insertIntoText($('replaceValue').value);
    matchAt = el.selectionEnd - term.length;
    findNext();
  });

  /* ------------------------------------------------------------------ *
   * Vista de caras e impresión
   * ------------------------------------------------------------------ */

  function makePage(page, isCalibration) {
    const p = state.profile;
    const s = p[page.side];
    const el = document.createElement('div');
    el.className = 'page' + (isCalibration ? ' calibration' : '');
    el.style.width = p.width + 'mm';
    el.style.height = p.height + 'mm';
    const x = s.left + s.x;
    const w = p.width - s.left - s.right;

    for (let i = 0; i < p.rows; i++) {
      const y = s.top + s.y + i * p.pitch + p.fontSize * 25.4 / 72 * 1.1;
      const guide = document.createElement('div');
      guide.className = 'guide';
      guide.style.cssText = 'left:' + x + 'mm;top:' + y + 'mm;width:' + w + 'mm';
      el.append(guide);
    }

    page.lines.forEach((raw, i) => {
      const row = page.start + i;
      const y = s.top + s.y + (row - 1) * p.pitch;
      const line = document.createElement('div');
      line.className = 'protocolLine';
      line.style.left = x + 'mm';
      line.style.top = y + 'mm';
      line.style.width = w + 'mm';
      line.style.fontFamily = p.font;
      line.style.fontSize = p.fontSize + 'pt';
      let text = raw;

      if (!isCalibration && p.fill && page.isLast && i === page.lines.length - 1) {
        measureCtx.font = (p.fontSize * 96 / 72) + 'px "' + p.font + '"';
        while (measureCtx.measureText(text + '—').width <= w * 96 / 25.4) text += '—';
      }
      if (!isCalibration && p.justify && (!page.isLast || i < page.lines.length - 1) &&
          text.indexOf(' ') >= 0) {
        line.classList.add('justified');
        for (const word of text.split(' ')) {
          const span = document.createElement('span');
          span.textContent = word;
          line.append(span);
        }
      } else {
        line.textContent = text;
      }
      el.append(line);

      if (p.numberLines || isCalibration) {
        const n = document.createElement('div');
        n.className = 'lineNumber';
        n.textContent = row;
        n.style.left = Math.max(0, x - 7) + 'mm';
        n.style.top = y + 'mm';
        el.append(n);
      }
    });

    if (isCalibration) {
      const label = document.createElement('div');
      label.className = 'calLabel';
      label.textContent = 'PRUEBA ' + (page.side === 'front' ? 'FRENTE' : 'VUELTO') +
        ' · ' + p.width + ' × ' + p.height + ' mm · X ' + s.x + ' / Y ' + s.y + ' mm · Escala 100 %';
      label.style.top = '8mm';
      label.style.left = '10mm';
      el.append(label);
    }
    return el;
  }

  function documentWarnings(doc, pp) {
    const out = [];
    if (/\[[^\]]+\]/u.test(doc.text)) out.push('Hay campos entre corchetes pendientes de completar.');
    if (/\{[^{}]+\}/u.test(doc.text)) out.push('Quedan campos de plantilla sin reemplazar.');
    const marked = PFN.marks(doc.text);
    if (marked.entrelineados.length || marked.testados.length) {
      out.push('Hay entrelineados o testaduras marcados: revisá que la razón final esté incluida.');
    }
    const book = currentBook();
    if (pp.some(p => p.folio > ((book && book.totalFolios) || 100))) {
      out.push('El texto excede la cantidad de folios del libro.');
    }
    const own = new Set(PF.positions(pp));
    for (const other of bookDocs()) {
      if (other.id === doc.id || !other.text.trim()) continue;
      if (PF.positions(layout(other)).some(pos => own.has(pos))) {
        out.push('Hay renglones ocupados por otra escritura: corregí la posición inicial antes de imprimir.');
        break;
      }
    }
    return out;
  }

  function showPreview() {
    const doc = currentDoc();
    pages = doc ? layout(doc) : [];
    $('pages').replaceChildren();
    $('layoutReport').replaceChildren();
    $('pageFrom').value = 1;
    $('pageTo').value = pages.length || 1;
    $('print').disabled = !pages.length;
    previewSignature = JSON.stringify([doc, state.profile]);

    if (!doc || !pages.length) {
      $('layoutReport').textContent = 'La escritura no contiene texto.';
      return;
    }
    const last = pages[pages.length - 1];
    const summary = document.createElement('p');
    summary.className = 'ok';
    summary.textContent = pages.length + ' caras · desde folio ' + doc.folio + ' ' +
      sideWord(doc.side) + ', renglón ' + doc.line + ', hasta folio ' + last.folio + ' ' +
      sideWord(last.side) + ', renglón ' + (last.start + last.lines.length - 1) + '.';
    $('layoutReport').append(summary);

    for (const text of documentWarnings(doc, pages)) {
      const w = document.createElement('p');
      w.className = 'warning';
      w.textContent = text;
      $('layoutReport').append(w);
    }

    pages.forEach((pg, i) => {
      const container = document.createElement('div');
      const label = document.createElement('p');
      label.className = 'pageLabel';
      label.textContent = 'Cara ' + (i + 1) + ' · folio ' + pg.folio + ' · ' + sideWord(pg.side);
      const frame = document.createElement('div');
      frame.className = 'pageFrame';
      frame.append(makePage(pg));
      container.append(label, frame);
      $('pages').append(container);
    });
    adjustZoom();
  }

  function adjustZoom() {
    const p = state.profile;
    document.querySelectorAll('#pages .pageFrame').forEach(frame => {
      frame.style.width = p.width * 96 / 25.4 * zoom + 'px';
      frame.style.height = p.height * 96 / 25.4 * zoom + 'px';
      frame.firstElementChild.style.transform = 'scale(' + zoom + ')';
    });
    $('zoomValue').textContent = Math.round(zoom * 100) + ' %';
  }

  function fitZoom() {
    const width = $('pages').clientWidth - 40;
    if (width > 0) zoom = Math.max(.25, Math.min(1, width / (state.profile.width * 96 / 25.4)));
    adjustZoom();
  }

  $('refreshPreview').onclick = guard(showPreview);
  $('zoomOut').onclick = () => { zoom = Math.max(.25, zoom - .1); adjustZoom(); };
  $('zoomIn').onclick = () => { zoom = Math.min(1.5, zoom + .1); adjustZoom(); };
  $('zoomFit').onclick = fitZoom;
  window.addEventListener('resize', () => { if (activeTab === 'preview') fitZoom(); });

  function preparePrint(pp, isCalibration) {
    $('paperSize').textContent = '@page { size: ' + state.profile.width + 'mm ' +
      state.profile.height + 'mm; margin: 0; }';
    $('printArea').replaceChildren(...pp.map(p => makePage(p, isCalibration)));
    window.print();
  }

  $('print').onclick = guard(() => {
    flush();
    const doc = currentDoc();
    if (!doc || !doc.text.trim()) throw Error('No hay texto para imprimir.');
    if (previewSignature !== JSON.stringify([doc, state.profile])) {
      showPreview();
      throw Error('La vista cambió. Revisá la distribución y volvé a imprimir.');
    }
    const warn = documentWarnings(doc, pages);
    if (warn.some(w => w.indexOf('ocupados') >= 0 || w.indexOf('excede') >= 0)) {
      throw Error(warn.join('\n'));
    }
    if (warn.length && !confirm(warn.join('\n') + '\n¿Continuar después de revisar?')) return;

    const from = Number($('pageFrom').value);
    const to = Number($('pageTo').value);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > pages.length || to < from) {
      throw Error('Rango de caras inválido.');
    }
    const side = $('printSide').value;
    const filtered = pages.slice(from - 1, to).filter(p => side === 'all' || p.side === side);
    if (!filtered.length) throw Error('No hay caras de ese tipo en el rango.');
    preparePrint(filtered, false);
  });

  /* ------------------------------------------------------------------ *
   * Tomo, razones y mapa de folios
   * ------------------------------------------------------------------ */

  function renderTomo() {
    const book = currentBook();
    if (!book) return;
    $('tomoNumber').value = book.tomo || 1;
    $('tomoFolios').value = book.totalFolios || 100;
    $('aperturaText').value = book.apertura || '';
    $('cierreText').value = book.cierre || '';
    if (!$('aperturaDate').value) $('aperturaDate').value = today();
    if (!$('cierreDate').value) $('cierreDate').value = today();

    let map;
    try {
      map = PFN.folioMap(bookDocs(), layout);
    } catch (e) {
      $('folioMap').textContent = e.message;
      return;
    }
    $('tomoUsed').value = map.lastUsed
      ? 'Hasta el folio ' + map.lastUsed.folio + ' ' + sideWord(map.lastUsed.side) +
        ', renglón ' + map.lastUsed.line
      : 'Sin folios ocupados';

    const box = $('folioMap');
    box.replaceChildren();
    const conflictNumbers = new Set();
    for (const c of map.conflicts) { conflictNumbers.add(c.a); conflictNumbers.add(c.b); }

    if (!map.entries.length) {
      const p = document.createElement('p');
      p.className = 'muted small';
      p.textContent = 'El libro todavía no tiene escrituras.';
      box.append(p);
    }
    for (const entry of map.entries) {
      const row = document.createElement('div');
      row.className = 'folioRow' + (conflictNumbers.has(entry.doc.number) ? ' conflict' : '');
      const num = document.createElement('strong');
      num.textContent = 'N.º ' + entry.doc.number;
      const title = document.createElement('span');
      title.textContent = entry.doc.title;
      const range = document.createElement('span');
      range.className = 'muted small';
      range.textContent = entry.end
        ? 'Folio ' + entry.start.folio + ' ' + sideWord(entry.start.side) + ' r.' + entry.start.line +
          ' → folio ' + entry.end.folio + ' ' + sideWord(entry.end.side) + ' r.' + entry.end.line +
          ' · ' + entry.pages.length + ' caras'
        : 'Sin texto';
      row.append(num, title, range);
      box.append(row);
    }
    if (map.conflicts.length) {
      const p = document.createElement('p');
      p.className = 'warning';
      p.textContent = 'Hay ' + map.conflicts.length +
        ' renglones ocupados por más de una escritura. Corregí las posiciones iniciales.';
      box.append(p);
    }
  }

  $('saveTomo').onclick = guard(() => {
    const book = currentBook();
    if (!book) throw Error('Seleccioná un libro.');
    const tomo = Number($('tomoNumber').value);
    const folios = Number($('tomoFolios').value);
    if (!Number.isInteger(tomo) || tomo < 1 || !Number.isInteger(folios) || folios < 1 || folios > 10000) {
      throw Error('Revisá el número de tomo y la cantidad de folios.');
    }
    book.tomo = tomo;
    book.totalFolios = folios;
    persist();
    renderBooks();
    renderTomo();
    message('Datos del tomo guardados.');
  });

  $('genApertura').onclick = guard(() => {
    const book = currentBook();
    if (!book) throw Error('Seleccioná un libro.');
    $('aperturaText').value = PFN.razonApertura(book, state.notary, {
      date: $('aperturaDate').value || today(),
      time: $('aperturaTime').value || '08:00',
      tomo: Number($('tomoNumber').value) || book.tomo,
      folios: Number($('tomoFolios').value) || book.totalFolios
    });
  });

  $('genCierre').onclick = guard(() => {
    const book = currentBook();
    if (!book) throw Error('Seleccioná un libro.');
    const map = PFN.folioMap(bookDocs(), layout);
    const numbers = bookDocs().map(d => d.number);
    $('cierreText').value = PFN.razonCierre(book, state.notary, {
      date: $('cierreDate').value || today(),
      time: $('cierreTime').value || '16:00',
      motivo: $('cierreMotivo').value,
      tomo: Number($('tomoNumber').value) || book.tomo,
      ultimaEscritura: numbers.length ? Math.max(...numbers) : null,
      ultimoFolio: map.lastUsed ? map.lastUsed.folio : null
    });
  });

  $('saveApertura').onclick = guard(() => {
    const book = currentBook();
    if (!book) throw Error('Seleccioná un libro.');
    book.apertura = $('aperturaText').value;
    persist();
    message('Razón de apertura guardada en el libro.');
  });

  $('saveCierre').onclick = guard(() => {
    const book = currentBook();
    if (!book) throw Error('Seleccioná un libro.');
    book.cierre = $('cierreText').value;
    persist();
    message('Razón de cierre guardada en el libro.');
  });

  function copyToClipboard(text) {
    if (!text.trim()) throw Error('No hay texto para copiar.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => message('Texto copiado.'),
        () => message('El navegador no permitió copiar. Seleccioná el texto manualmente.', true)
      );
    } else {
      message('El navegador no permite copiar automáticamente. Seleccioná el texto manualmente.', true);
    }
  }

  $('copyApertura').onclick = guard(() => copyToClipboard($('aperturaText').value));
  $('copyCierre').onclick = guard(() => copyToClipboard($('cierreText').value));

  /* ------------------------------------------------------------------ *
   * Índice
   * ------------------------------------------------------------------ */

  function indexRows() {
    const book = currentBook();
    if (!book) return [PFN.INDEX_HEADERS];
    return PFN.indexRows(book, bookDocs(), layout);
  }

  function renderIndex() {
    const book = currentBook();
    $('indexBookName').textContent = book ? 'Índice de ' + book.name : 'Índice';
    $('indexCount').textContent = bookDocs().length + ' escrituras';
    let rows;
    try {
      rows = indexRows();
    } catch (e) {
      message(e.message, true);
      return;
    }
    const table = $('indexTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.replaceChildren();
    tbody.replaceChildren();
    const headRow = document.createElement('tr');
    for (const h of rows[0]) {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.append(th);
    }
    thead.append(headRow);
    for (const row of rows.slice(1)) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.append(td);
      }
      tbody.append(tr);
    }
  }

  $('exportIndex').onclick = guard(() => {
    flush();
    download('Indice-trabajo-' + today() + '.csv', PF.csv(indexRows()), 'text/csv;charset=utf-8');
    message('Índice CSV descargado. No constituye la presentación oficial del índice notarial.');
  });

  $('printIndex').onclick = guard(() => {
    flush();
    renderIndex();
    window.print();
  });

  /* ------------------------------------------------------------------ *
   * Plantillas
   * ------------------------------------------------------------------ */

  const SAMPLE_TEMPLATES = [
    {
      name: 'Estructura — compraventa de inmueble',
      text: 'NÚMERO {NumeroOrdinal}: Ante mí, {Notario}, Notario Público con oficina en {Lugar}, ' +
        'comparecen: {Otorgantes}. Y dicen: PRIMERO: Que [Insertar Nombre del Vendedor] es dueño de la ' +
        'finca inscrita en el Registro Inmobiliario, partido de [Insertar Partido], matrícula número ' +
        '[Insertar Matrícula], que se describe así: [Insertar Naturaleza, Situación, Linderos y Medida]. ' +
        'SEGUNDO: Que por este acto vende [Insertar Porcentaje] del citado inmueble a ' +
        '[Insertar Nombre del Comprador], en el precio de [Insertar Precio en Letras]. ' +
        'TERCERO: Que el precio es cancelado [Insertar Forma de Pago]. ' +
        'CUARTO: Que la finca se traspasa libre de anotaciones y gravámenes, salvo [Insertar Afecciones]. ' +
        'QUINTO: El comprador acepta. Es todo. Expido [Insertar Número de Testimonio]. ' +
        'Leído lo escrito a los comparecientes, lo aprueban y firmamos en {Lugar}, a {FechaHora}.'
    },
    {
      name: 'Estructura — poder especial',
      text: 'NÚMERO {NumeroOrdinal}: Ante mí, {Notario}, Notario Público, comparece {Otorgantes} y dice: ' +
        'ÚNICO: Que confiere PODER ESPECIAL a [Insertar Nombre del Apoderado], ' +
        '[Insertar Calidades y Cédula], para que en su nombre [Insertar Facultades Específicas]. ' +
        'El poder se otorga con las facultades del artículo mil doscientos cincuenta y seis del Código Civil. ' +
        'Es todo. Leído lo escrito al compareciente, lo aprueba y firmamos en {Lugar}, a {FechaHora}.'
    },
    {
      name: 'Estructura — constitución de sociedad anónima',
      text: 'NÚMERO {NumeroOrdinal}: Ante mí, {Notario}, Notario Público, comparecen {Otorgantes} y dicen: ' +
        'Que constituyen una sociedad anónima que se regirá por las siguientes cláusulas: ' +
        'PRIMERA: Denominación: [Insertar Denominación] Sociedad Anónima. ' +
        'SEGUNDA: Domicilio: [Insertar Domicilio Exacto]. TERCERA: Objeto: [Insertar Objeto Social]. ' +
        'CUARTA: Plazo: [Insertar Plazo en Letras] años contados desde hoy. ' +
        'QUINTA: Capital social: [Insertar Capital en Letras], representado por ' +
        '[Insertar Número de Acciones] acciones comunes y nominativas. ' +
        'SEXTA: Administración: [Insertar Junta Directiva y Representación]. ' +
        'SÉTIMA: Fiscal: [Insertar Nombre del Fiscal]. ' +
        'OCTAVA: Agente residente: [Insertar Agente Residente]. ' +
        'Es todo. Leído lo escrito a los comparecientes, lo aprueban y firmamos en {Lugar}, a {FechaHora}.'
    }
  ];

  function renderTemplates() {
    const sel = $('templateSelect');
    sel.replaceChildren(new Option('Elegí o creá una plantilla', ''));
    for (const t of state.templates) sel.add(new Option(t.name, t.id));
    if (!state.templates.some(t => t.id === templateId)) templateId = '';
    sel.value = templateId;
    const t = state.templates.find(x => x.id === templateId);
    $('templateName').value = t ? t.name : '';
    $('templateText').value = t ? t.text : '';
  }

  $('templateSelect').onchange = () => { templateId = $('templateSelect').value; renderTemplates(); };
  $('newTemplate').onclick = () => { templateId = ''; renderTemplates(); $('templateName').focus(); };

  $('saveTemplate').onclick = guard(() => {
    const name = $('templateName').value.trim();
    const text = $('templateText').value;
    if (!name || !text.trim()) throw Error('Ingresá nombre y contenido.');
    const existing = state.templates.find(t => t.id === templateId);
    if (existing) Object.assign(existing, { name, text });
    else {
      const t = { id: uid(), name, text };
      state.templates.push(t);
      templateId = t.id;
    }
    persist();
    renderTemplates();
    message('Plantilla guardada.');
  });

  $('deleteTemplate').onclick = guard(() => {
    if (!templateId) throw Error('Elegí una plantilla.');
    if (!confirm('¿Eliminar esta plantilla? Se guardará una instantánea.')) return;
    guardChange('Antes de eliminar una plantilla');
    state.templates = state.templates.filter(t => t.id !== templateId);
    templateId = '';
    persist();
    renderTemplates();
  });

  $('loadSamples').onclick = guard(() => {
    let added = 0;
    for (const sample of SAMPLE_TEMPLATES) {
      if (state.templates.some(t => t.name === sample.name)) continue;
      state.templates.push({ id: uid(), name: sample.name, text: sample.text });
      added++;
    }
    persist();
    renderTemplates();
    message(added ? added + ' modelos agregados. Son estructuras de trabajo: revisá y completá cada marcador.'
      : 'Los modelos de ejemplo ya estaban cargados.');
  });

  $('useTemplate').onclick = guard(() => {
    flush();
    const doc = currentDoc();
    const book = currentBook();
    if (!doc || !book) throw Error('Creá o seleccioná una escritura.');
    const source = $('templateText').value;
    if (!source.trim()) throw Error('La plantilla está vacía.');
    if (doc.text.trim() && !confirm('¿Reemplazar el texto por esta plantilla? Se guardará una instantánea.')) return;
    guardChange('Antes de aplicar una plantilla');
    doc.text = PFN.fillTemplate(source, { doc, book, notary: state.notary });
    doc.modified = new Date().toISOString();
    persist();
    renderDoc();
    showTab('editor');
    message('Plantilla aplicada. Los campos sin dato quedaron visibles para completarlos.');
  });

  /* ------------------------------------------------------------------ *
   * Herramientas
   * ------------------------------------------------------------------ */

  function renderTools() {
    $('notary').value = state.notary.name || '';
    $('notaryCedula').value = state.notary.cedula || '';
    $('notaryCarne').value = state.notary.carne || '';
    $('place').value = state.notary.place || '';
    $('notaryOffice').value = state.notary.office || '';
    if (!$('dateTool').value) $('dateTool').value = today();
    $('amountCurrency').value = state.tariff.moneda || 'CRC';
  }

  $('saveNotary').onclick = guard(() => {
    state.notary = {
      name: $('notary').value.trim(),
      cedula: $('notaryCedula').value.trim(),
      carne: $('notaryCarne').value.trim(),
      place: $('place').value.trim(),
      office: $('notaryOffice').value.trim()
    };
    persist();
    renderHome();
    message('Datos del notario guardados.');
  });

  $('convertNumber').onclick = guard(() => {
    const raw = $('numeric').value.trim();
    if (!/^-?\d+$/.test(raw)) throw Error('Ingresá un entero sin separadores ni decimales.');
    $('words').textContent = PF.numberWords(Number(raw));
  });

  $('convertAmount').onclick = guard(() => {
    $('amountResult').textContent = PF.amountWords($('amountValue').value, $('amountCurrency').value);
  });

  $('convertDate').onclick = guard(() => {
    const date = $('dateTool').value;
    const hour = $('hourTool').value;
    $('dateResult').textContent = hour ? PF.dateTimeWords(date, hour) : PF.dateWords(date);
  });

  $('calcFee').onclick = guard(() => {
    const raw = String($('feeAmount').value).replace(/[₡$€\s.]/g, '').replace(',', '.');
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) throw Error('Ingresá la cuantía del acto.');
    const result = PFN.liquidacion(amount, state.tariff);
    const money = n => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Concepto</th><th>Base</th><th>Monto</th><th>Nota</th></tr>';
    const tbody = document.createElement('tbody');
    const add = (concept, base, amountValue, note) => {
      const tr = document.createElement('tr');
      for (const value of [concept, base, money(amountValue), note || '']) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      tbody.append(tr);
    };
    add('Honorarios profesionales', 'Tramos del arancel', result.honorarios, 'Verificar arancel vigente');
    for (const row of result.timbres) {
      add(row.nombre, row.tipo === 'porcentaje' ? row.valor + ' %' : 'Monto fijo', row.monto, row.nota);
    }
    add('TOTAL ESTIMADO', '', result.total, result.moneda);
    table.append(thead, tbody);

    const note = document.createElement('p');
    note.className = 'muted small';
    note.textContent = 'Cálculo con las tarifas guardadas en esta aplicación. No sustituye la verificación ' +
      'del arancel ni de la normativa tributaria y registral vigente.';

    const letters = document.createElement('p');
    letters.className = 'result';
    letters.textContent = 'Total en letras: ' + PF.amountWords(result.total, result.moneda) + '.';

    $('feeResult').replaceChildren(table, letters, note);
  });

  $('editTariff').onclick = guard(() => {
    const box = $('tariffEditor');
    box.hidden = !box.hidden;
    if (box.hidden) return;
    box.replaceChildren();

    const h = document.createElement('h3');
    h.textContent = 'Tarifas editables';
    box.append(h);

    const minLabel = document.createElement('label');
    minLabel.textContent = 'Honorario mínimo';
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.step = '0.01';
    minInput.value = state.tariff.honorarios.minimo || 0;
    minLabel.append(minInput);
    box.append(minLabel);

    const tramoInputs = state.tariff.honorarios.tramos.map((tramo, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'grid two';
      const hasta = document.createElement('label');
      hasta.textContent = 'Tramo ' + (i + 1) + ' — hasta (vacío = en adelante)';
      const hastaInput = document.createElement('input');
      hastaInput.type = 'number';
      hastaInput.step = '0.01';
      hastaInput.value = tramo.hasta == null ? '' : tramo.hasta;
      hasta.append(hastaInput);
      const pct = document.createElement('label');
      pct.textContent = 'Porcentaje';
      const pctInput = document.createElement('input');
      pctInput.type = 'number';
      pctInput.step = '0.01';
      pctInput.value = tramo.porcentaje;
      pct.append(pctInput);
      wrap.append(hasta, pct);
      box.append(wrap);
      return { hastaInput, pctInput };
    });

    const stampInputs = state.tariff.timbres.map(item => {
      const wrap = document.createElement('div');
      wrap.className = 'grid three';
      const name = document.createElement('label');
      name.textContent = 'Concepto';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.nombre;
      name.append(nameInput);
      const type = document.createElement('label');
      type.textContent = 'Tipo';
      const typeSelect = document.createElement('select');
      typeSelect.add(new Option('Porcentaje', 'porcentaje'));
      typeSelect.add(new Option('Monto fijo', 'fijo'));
      typeSelect.value = item.tipo;
      type.append(typeSelect);
      const value = document.createElement('label');
      value.textContent = 'Valor';
      const valueInput = document.createElement('input');
      valueInput.type = 'number';
      valueInput.step = '0.0001';
      valueInput.value = item.valor;
      value.append(valueInput);
      wrap.append(name, type, value);
      box.append(wrap);
      return { nameInput, typeSelect, valueInput, item };
    });

    const save = document.createElement('button');
    save.textContent = 'Guardar tarifas';
    save.onclick = guard(() => {
      state.tariff.honorarios.minimo = Number(minInput.value) || 0;
      state.tariff.honorarios.tramos = tramoInputs.map(t => ({
        hasta: t.hastaInput.value === '' ? null : Number(t.hastaInput.value),
        porcentaje: Number(t.pctInput.value) || 0
      }));
      state.tariff.timbres = stampInputs.map(s => ({
        nombre: s.nameInput.value.trim() || 'Concepto',
        tipo: s.typeSelect.value,
        valor: Number(s.valueInput.value) || 0,
        nota: s.item.nota || ''
      }));
      persist();
      message('Tarifas guardadas. Recordá confrontarlas con la normativa vigente.');
    });
    box.append(save);
  });

  /* ------------------------------------------------------------------ *
   * Perfil de papel y calibración
   * ------------------------------------------------------------------ */

  function renderProfile() {
    const form = $('profileForm');
    for (const key of ['width', 'height', 'rows', 'pitch', 'font', 'fontSize']) {
      form.elements.namedItem(key).value = state.profile[key];
    }
    for (const key of ['numberLines', 'justify', 'fill']) {
      form.elements.namedItem(key).checked = Boolean(state.profile[key]);
    }
    const box = $('sideSettings');
    box.replaceChildren();
    for (const side of ['front', 'back']) {
      const card = document.createElement('div');
      card.className = 'card';
      const head = document.createElement('h3');
      head.textContent = side === 'front' ? 'Frente' : 'Vuelto';
      const grid = document.createElement('div');
      grid.className = 'grid three';
      const labels = [['left', 'Margen izquierdo'], ['right', 'Margen derecho'],
        ['top', 'Posición superior'], ['x', 'Mover izquierda / derecha (X)'],
        ['y', 'Mover arriba / abajo (Y)']];
      for (const [key, title] of labels) {
        const label = document.createElement('label');
        label.textContent = title + ' (mm)';
        const input = document.createElement('input');
        input.name = side + '_' + key;
        input.type = 'number';
        input.step = '0.1';
        input.value = state.profile[side][key];
        label.append(input);
        grid.append(label);
      }
      card.append(head, grid);
      box.append(card);
    }
  }

  $('profileForm').onsubmit = guard(e => {
    e.preventDefault();
    const form = e.currentTarget;
    const next = PF.clone(state.profile);
    for (const key of ['width', 'height', 'rows', 'pitch', 'fontSize']) {
      next[key] = Number(form.elements.namedItem(key).value);
    }
    next.font = form.elements.namedItem('font').value;
    for (const key of ['numberLines', 'justify', 'fill']) {
      next[key] = form.elements.namedItem(key).checked;
    }
    for (const side of ['front', 'back']) {
      for (const key of ['left', 'right', 'top', 'x', 'y']) {
        next[side][key] = Number(form.elements.namedItem(side + '_' + key).value);
      }
    }
    const errors = PF.validate(next);
    if (errors.length) throw Error(errors.join('\n'));
    if (state.docs.some(d => d.line > next.rows)) {
      throw Error('Hay escrituras con renglón inicial mayor que la nueva cantidad de renglones.');
    }
    guardChange('Antes de cambiar el perfil de papel');
    state.profile = next;
    persist();
    message('Perfil guardado. La distribución de todas las escrituras se recalcula con estas medidas.');
  });

  function calibrationSheet(side) {
    const errors = PF.validate(state.profile);
    if (errors.length) throw Error(errors.join('\n'));
    const lines = Array.from({ length: state.profile.rows },
      (_, i) => 'Renglón ' + (i + 1) + ' · ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz');
    preparePrint([{ folio: 1, side, start: 1, lines }], true);
  }

  $('calFront').onclick = guard(() => calibrationSheet('front'));
  $('calBack').onclick = guard(() => calibrationSheet('back'));

  /* ------------------------------------------------------------------ *
   * Modales
   * ------------------------------------------------------------------ */

  function openModal(id) {
    lastFocus = document.activeElement;
    $(id).hidden = false;
    const focusable = $(id).querySelector('input, textarea, button');
    if (focusable) focusable.focus();
  }

  function closeModal(id) {
    $(id).hidden = true;
    if (lastFocus) lastFocus.focus();
  }

  /**
   * Pide un dato al usuario. No se usa prompt() porque Electron no lo admite:
   * en la aplicación lanzaría un error en lugar de preguntar.
   * Devuelve una promesa con el texto, o null si se cancela.
   */
  function askText(title, label, defaultValue, hint) {
    $('askTitle').textContent = title;
    $('askLabel').childNodes[0].nodeValue = label;
    $('askValue').value = defaultValue == null ? '' : String(defaultValue);
    $('askHint').textContent = hint || '';
    openModal('askModal');
    $('askValue').select();

    return new Promise(resolve => {
      const cerrar = valor => {
        $('askForm').onsubmit = null;
        $('askCancel').onclick = null;
        closeModal('askModal');
        resolve(valor);
      };
      $('askForm').onsubmit = e => { e.preventDefault(); cerrar($('askValue').value); };
      $('askCancel').onclick = () => cerrar(null);
    });
  }

  function openTextModal(title, body, allowInsert) {
    $('textModalTitle').textContent = title;
    $('textModalBody').value = body;
    $('textModalInsert').hidden = !allowInsert;
    modalInsertTarget = allowInsert ? 'text' : null;
    openModal('textModal');
  }

  $('closeTextModal').onclick = () => closeModal('textModal');
  $('textModalCopy').onclick = guard(() => copyToClipboard($('textModalBody').value));
  $('textModalInsert').onclick = guard(() => {
    if (modalInsertTarget !== 'text') return;
    const el = $('text');
    const value = $('textModalBody').value;
    const separator = el.value.trim() && !el.value.endsWith(' ') ? ' ' : '';
    el.value = el.value + separator + value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    closeModal('textModal');
    message('Texto agregado al final de la escritura.');
  });

  const HELP_GENERAL = [
    ['Elegí un libro y redactá', 'En Escrituras creás el documento. Podés escribir, importar un TXT o aplicar una plantilla propia.'],
    ['Revisá la vista de folios', 'Usá el zoom para leer cada cara. Los avisos señalan campos pendientes y renglones superpuestos.'],
    ['Imprimí y guardá una copia', 'Calibrá con papel común y descargá el respaldo JSON al terminar la sesión.']
  ];
  const HELP_CALIBRATION = [
    ['Medí tu hoja de protocolo', 'Ingresá ancho, alto y cantidad de renglones. Medí del renglón uno al once y dividí entre diez para la separación.'],
    ['Probá las dos caras', 'Guardá el perfil e imprimí las pruebas de frente y vuelto en papel común, con escala 100 %.'],
    ['Corregí el desplazamiento', 'Si el texto sale 3 mm más abajo, usá Y = −3. Si sale a la derecha, corregí X con un valor negativo.']
  ];

  function showHelp(isCalibration) {
    $('helpTitle').textContent = isCalibration ? 'Alineá el papel, paso a paso' : 'Un paso a la vez';
    const content = isCalibration ? HELP_CALIBRATION : HELP_GENERAL;
    $('helpModal').querySelectorAll('.guideStep').forEach((el, i) => {
      el.querySelector('strong').textContent = content[i][0];
      el.querySelector('p').textContent = content[i][1];
    });
    openModal('helpModal');
  }

  $('openHelp').onclick = () => showHelp(false);
  $('settingsHelp').onclick = () => showHelp(true);
  $('closeHelp').onclick = () => closeModal('helpModal');
  $('helpDone').onclick = () => closeModal('helpModal');

  /* askModal entrega una promesa: cerrarlo por fuera debe resolverla como
     cancelación, o quien lo esperaba quedaría colgado. */
  function dismissModal(id) {
    if (id === 'askModal' && $('askCancel').onclick) { $('askCancel').onclick(); return; }
    closeModal(id);
  }

  for (const id of ['helpModal', 'bookModal', 'textModal', 'askModal']) {
    $(id).addEventListener('click', e => { if (e.target === $(id)) dismissModal(id); });
  }

  document.addEventListener('keydown', e => {
    const open = ['helpModal', 'bookModal', 'textModal', 'askModal'].find(id => !$(id).hidden);
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); dismissModal(open); }
    if (e.key === 'Tab') {
      const nodes = Array.from($(open).querySelectorAll('button, input, textarea, select'))
        .filter(n => !n.disabled && !n.hidden);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('keydown', guard(e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); flush(); }
  }));

  window.addEventListener('beforeunload', e => {
    try { collect(); persist(); } catch (err) { e.preventDefault(); e.returnValue = ''; }
    if (!storageOK) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */

  function renderEverything() {
    renderBooks();
    renderDoc();
    renderList();
    renderProfile();
    renderTools();
    renderTemplates();
    renderHome();
  }

  /* ------------------------------------------------------------------ *
   * Integración con la aplicación de escritorio
   * ------------------------------------------------------------------ */

  function savePDF() {
    if (!nativo) { message('Usá Imprimir y elegí «Guardar como PDF» en el diálogo del sistema.'); return; }
    flush();
    const doc = currentDoc();
    if (!doc || !doc.text.trim()) throw Error('No hay texto para guardar.');
    if (previewSignature !== JSON.stringify([doc, state.profile])) showPreview();
    const warn = documentWarnings(doc, pages);
    if (warn.some(w => w.indexOf('ocupados') >= 0 || w.indexOf('excede') >= 0)) {
      throw Error(warn.join('\n'));
    }
    $('paperSize').textContent = '@page { size: ' + state.profile.width + 'mm ' +
      state.profile.height + 'mm; margin: 0; }';
    $('printArea').replaceChildren(...pages.map(p => makePage(p, false)));
    document.body.classList.add('exportandoPDF');
    nativo.guardarPDF('Escritura-' + doc.number + '.pdf',
      { anchoMm: state.profile.width, altoMm: state.profile.height })
      .then(r => {
        document.body.classList.remove('exportandoPDF');
        if (r.ok) message('PDF guardado en ' + r.ruta + '.');
        else if (!r.cancelado) message(r.error || 'No se pudo guardar el PDF.', true);
      });
  }

  function setupNative() {
    if (!nativo) return;
    document.body.classList.add('esAplicacion');

    const ruta = nativo.rutaDatos();
    const pie = $('dataFolder');
    if (pie) {
      pie.textContent = ruta;
      pie.title = ruta;
    }
    const abrir = $('openDataFolder');
    if (abrir) abrir.onclick = () => nativo.abrirCarpetaDatos();

    const pdf = $('savePDF');
    if (pdf) pdf.onclick = guard(savePDF);

    const acciones = {
      'menu:nuevaEscritura': () => $('newDoc').click(),
      'menu:guardar': () => { flush(); renderList(); message('Escritura guardada.'); },
      'menu:respaldar': () => { flush(); backup(); },
      'menu:restaurar': () => $('restore').click(),
      'menu:imprimir': () => { showTab('preview'); $('print').click(); },
      'menu:pdf': () => savePDF(),
      'menu:ayuda': () => showHelp(true)
    };
    nativo.alMenu(guard(canal => {
      if (canal.indexOf('menu:ir:') === 0) { showTab(canal.slice('menu:ir:'.length)); return; }
      const accion = acciones[canal];
      if (accion) accion();
    }));
  }

  $('welcomeDate').textContent = new Date()
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toLocaleUpperCase('es');

  setupNative();
  renderEverything();
  showTab('home');

  if (!storageOK) {
    message(nativo
      ? 'No se pudieron leer o escribir los archivos de datos. El trabajo queda en memoria: ' +
        'guardá un respaldo antes de cerrar. ' + (loaded.reason || '')
      : 'No se pudieron leer o escribir los datos locales. El trabajo queda en memoria: ' +
        'descargá un respaldo JSON antes de cerrar. ' + (loaded.reason || ''), true);
  } else {
    persist();
  }
})();
