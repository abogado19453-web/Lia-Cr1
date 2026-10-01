/* Lia-CR · Panel del despacho (frontend estático, sin dependencias). */
(function () {
  'use strict';

  // ---------- Almacenamiento local ----------
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('liacr:' + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('liacr:' + key, JSON.stringify(value));
      } catch (e) {
        /* almacenamiento no disponible: se trabaja en memoria */
      }
    },
  };

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const $ = (sel, root = document) => root.querySelector(sel);

  const MATERIAS = ['Notarial', 'Registral', 'Civil', 'Comercial', 'Laboral', 'Familia', 'Administrativo', 'Constitucional'];

  // Las plantillas reflejan src/templates/; solo demanda-penal.md existe hoy en el repositorio.
  const PLANTILLAS = [
    { id: 'escritura-compraventa', materia: 'Notarial', titulo: 'Escritura de compraventa de inmueble', origen: 'Redactor' },
    { id: 'poder-especial', materia: 'Notarial', titulo: 'Escritura de poder especial', origen: 'Redactor' },
    { id: 'contrato-arrendamiento', materia: 'Civil', titulo: 'Contrato privado de arrendamiento', origen: 'Redactor' },
    { id: 'recurso-revocatoria', materia: 'Administrativo', titulo: 'Recurso de revocatoria con apelación en subsidio', origen: 'Redactor' },
    { id: 'demanda-penal', materia: 'Penal', titulo: 'Demanda / querella penal', origen: 'src/templates/penal/demanda-penal.md' },
  ];

  // ---------- Estado ----------
  let expedientes = store.get('expedientes', []);
  let protocolo = store.get('protocolo', []);
  let chat = store.get('chat', []);
  let perfil = store.get('perfil', { nombre: '', rol: 'Abogado y Notario', carne: '', apiUrl: '' });

  // ---------- Utilidades de fechas ----------
  function diasHasta(fechaISO) {
    if (!fechaISO) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const f = new Date(fechaISO + 'T00:00:00');
    return Math.round((f - hoy) / 86400000);
  }
  function tagPlazo(d) {
    if (d === null) return '<span class="tag">Sin plazo</span>';
    if (d < 0) return `<span class="tag danger">Vencido hace ${-d} d</span>`;
    if (d === 0) return '<span class="tag danger">Vence hoy</span>';
    if (d <= 3) return `<span class="tag danger">${d} d</span>`;
    if (d <= 10) return `<span class="tag warn">${d} d</span>`;
    return `<span class="tag ok">${d} d</span>`;
  }
  function fmtFecha(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // ---------- Vistas ----------
  const views = {
    inicio: {
      title: 'Inicio',
      render() {
        return `
          <section class="hero">
            <span class="pill">Punto de partida</span>
            <h1>¿En qué trabajamos hoy?</h1>
            <p>Elija una tarea y Lia-CR la ordena por pasos.</p>
          </section>
          <div class="cards">
            <a class="card-action tone-1" href="#legislacion">
              <span class="icon">§</span><h3>Consultar legislación</h3>
              <p>Ubique el cuerpo normativo y el articulado aplicable al caso.</p>
              <span class="go">Abrir índice →</span>
            </a>
            <a class="card-action tone-3" href="#redactor">
              <span class="icon">✎</span><h3>Redactar un instrumento</h3>
              <p>Escrituras en formato de protocolo, contratos y escritos con marcadores.</p>
              <span class="go">Ir al redactor →</span>
            </a>
            <a class="card-action tone-2" href="#analisis">
              <span class="icon">◎</span><h3>Revisar un documento</h3>
              <p>Cargue un texto y obtenga una lista de control de requisitos.</p>
              <span class="go">Cargar documento →</span>
            </a>
            <a class="card-action tone-4" href="#asistente">
              <span class="icon">✦</span><h3>Plantear una consulta</h3>
              <p>Pregunte al asistente sobre derecho costarricense.</p>
              <span class="go">Abrir asistente →</span>
            </a>
          </div>
          <section class="panel">
            <h2>Consulta directa</h2>
            <form id="quickForm">
              <textarea id="quickText" placeholder="Ej.: Requisitos para inscribir un traspaso de finca con hipoteca vigente…"></textarea>
              <div class="row" style="justify-content:flex-end;margin-top:10px">
                <button class="btn" id="quickSend" type="submit" disabled>Enviar al asistente</button>
              </div>
            </form>
            <div class="chips">
              ${['Redactar poder especial para traspaso de vehículo', 'Requisitos de afectación a patrimonio familiar', 'Plazo para apelar en proceso civil', 'Revisar contrato de arrendamiento comercial']
                .map((c) => `<button class="chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`)
                .join('')}
            </div>
          </section>
          ${resumenPlazos()}`;
      },
      mount() {
        const txt = $('#quickText');
        const send = $('#quickSend');
        txt.addEventListener('input', () => (send.disabled = !txt.value.trim()));
        document.querySelectorAll('[data-chip]').forEach((b) =>
          b.addEventListener('click', () => {
            txt.value = b.dataset.chip;
            send.disabled = false;
            txt.focus();
          })
        );
        $('#quickForm').addEventListener('submit', (e) => {
          e.preventDefault();
          enviarConsulta(txt.value.trim());
          location.hash = '#asistente';
        });
      },
    },

    asistente: {
      title: 'Asistente',
      render() {
        return `
          <div class="page-head"><h1>Asistente</h1><p>Consultas sobre derecho costarricense.</p></div>
          <section class="panel">
            <div class="chat" id="chatBox">
              ${chat.length ? chat.map((m) => `<div class="msg ${m.rol}">${esc(m.texto)}</div>`).join('') : '<div class="empty">Sin mensajes todavía.</div>'}
            </div>
            <form id="chatForm" style="margin-top:14px">
              <textarea id="chatText" placeholder="Escriba su consulta…" style="min-height:80px"></textarea>
              <div class="row" style="justify-content:space-between;margin-top:10px">
                <button class="ghost sm" type="button" id="chatClear">Limpiar conversación</button>
                <button class="btn" type="submit">Enviar</button>
              </div>
            </form>
            ${perfil.apiUrl ? '' : '<div class="note">El servidor de agentes (API REST, PASO 6) aún no está configurado. Defina su URL en Ajustes para obtener respuestas.</div>'}
          </section>`;
      },
      mount() {
        const box = $('#chatBox');
        box.scrollTop = box.scrollHeight;
        $('#chatForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const t = $('#chatText').value.trim();
          if (!t) return;
          await enviarConsulta(t);
          render();
        });
        $('#chatClear').addEventListener('click', () => {
          chat = [];
          store.set('chat', chat);
          render();
        });
      },
    },

    redactor: {
      title: 'Redactor',
      render() {
        return `
          <div class="page-head"><h1>Redactor</h1><p>Genera un borrador base con marcadores entre corchetes para completar.</p></div>
          <section class="panel">
            <div class="grid-form">
              <label>Tipo de documento
                <select id="redTipo">${PLANTILLAS.filter((p) => p.origen === 'Redactor').map((p) => `<option value="${p.id}">${esc(p.titulo)}</option>`).join('')}</select>
              </label>
              <label>Lugar
                <input id="redLugar" placeholder="San José">
              </label>
            </div>
            <div class="row" style="margin-top:14px">
              <button class="btn" id="redGen" type="button">Generar borrador</button>
              <button class="ghost" id="redCopy" type="button" hidden>Copiar</button>
            </div>
            <pre class="draft" id="redOut" hidden></pre>
          </section>`;
      },
      mount() {
        $('#redGen').addEventListener('click', () => {
          const out = $('#redOut');
          out.textContent = generarBorrador($('#redTipo').value, $('#redLugar').value.trim());
          out.hidden = false;
          $('#redCopy').hidden = false;
        });
        $('#redCopy').addEventListener('click', () => copiar($('#redOut').textContent, $('#redCopy')));
      },
    },

    analisis: {
      title: 'Análisis de documentos',
      render() {
        return `
          <div class="page-head"><h1>Análisis de documentos</h1><p>Revisión preliminar de elementos formales. El análisis de fondo corresponde al asistente.</p></div>
          <section class="panel">
            <label>Archivo de texto (.txt, .md)
              <input type="file" id="anFile" accept=".txt,.md,text/plain">
            </label>
            <label style="margin-top:12px">O pegue el texto
              <textarea id="anText" style="min-height:180px"></textarea>
            </label>
            <div class="row" style="margin-top:12px"><button class="btn" id="anRun" type="button">Revisar</button></div>
            <div id="anOut"></div>
          </section>`;
      },
      mount() {
        $('#anFile').addEventListener('change', (e) => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => ($('#anText').value = r.result);
          r.readAsText(f);
        });
        $('#anRun').addEventListener('click', () => {
          $('#anOut').innerHTML = revisarDocumento($('#anText').value);
        });
      },
    },

    legislacion: {
      title: 'Legislación',
      render() {
        return `
          <div class="page-head"><h1>Legislación</h1><p>Índice de cuerpos normativos de <code>src/data/legislation-index.json</code>.</p></div>
          <section class="panel">
            <input id="legQ" placeholder="Filtrar por código, capítulo o tema…">
            <div id="legOut" style="margin-top:8px"><div class="empty">Cargando índice…</div></div>
          </section>`;
      },
      async mount() {
        const out = $('#legOut');
        let data;
        try {
          const res = await fetch('../src/data/legislation-index.json');
          if (!res.ok) throw new Error(res.status);
          data = (await res.json()).legislation || [];
        } catch (e) {
          out.innerHTML = '<div class="note">No se pudo cargar el índice. Sirva el panel desde la raíz del repositorio (ver web/README.md).</div>';
          return;
        }
        const draw = (q) => {
          q = q.toLowerCase();
          const items = data.filter((l) => !q || JSON.stringify(l).toLowerCase().includes(q));
          out.innerHTML = items.length
            ? items
                .map((l) => {
                  const partes = l.capitulos || l.libros || l.titulos || [];
                  return `<div class="law">
                    <h3>${esc(l.titulo)}</h3>
                    <div class="muted">${esc(l.descripcion || '')}${l.vigenciaDesde ? ' · Desde ' + esc(l.vigenciaDesde) : ''}</div>
                    ${partes.length ? `<ul>${partes.map((p) => `<li>${esc(p.titulo)}${p.articulos ? ' — arts. ' + esc(p.articulos) : ''}</li>`).join('')}</ul>` : ''}
                    ${l.fuente ? `<div style="margin-top:6px"><a href="${esc(l.fuente)}" target="_blank" rel="noopener">Texto oficial en SCIJ ↗</a></div>` : ''}
                  </div>`;
                })
                .join('')
            : '<div class="empty">Sin coincidencias.</div>';
        };
        draw('');
        $('#legQ').addEventListener('input', (e) => draw(e.target.value));
      },
    },

    plantillas: {
      title: 'Plantillas',
      render() {
        return `
          <div class="page-head"><h1>Plantillas</h1><p>Modelos disponibles por materia.</p></div>
          <section class="panel table-wrap">
            <table>
              <thead><tr><th>Documento</th><th>Materia</th><th>Origen</th></tr></thead>
              <tbody>${PLANTILLAS.map((p) => `<tr><td>${esc(p.titulo)}</td><td>${esc(p.materia)}</td><td class="muted">${p.origen === 'Redactor' ? '<a href="#redactor">Redactor</a>' : `<code>${esc(p.origen)}</code>`}</td></tr>`).join('')}</tbody>
            </table>
          </section>`;
      },
    },

    expedientes: {
      title: 'Expedientes',
      render() {
        return `
          <div class="page-head"><h1>Expedientes</h1><p>Registro de asuntos del despacho. Los datos se guardan solo en este navegador.</p></div>
          <section class="panel">
            <h2>Nuevo expediente</h2>
            <form id="expForm" class="grid-form">
              <label>Número / referencia<input name="numero" required placeholder="[Número de expediente]"></label>
              <label>Cliente<input name="cliente" required placeholder="[Nombre del cliente]"></label>
              <label>Materia<select name="materia">${MATERIAS.map((m) => `<option>${m}</option>`).join('')}</select></label>
              <label>Despacho / oficina<input name="despacho" placeholder="Juzgado, Registro, notaría…"></label>
              <label>Próximo plazo<input name="plazo" type="date"></label>
              <label>Actuación pendiente<input name="pendiente" placeholder="Contestar, inscribir, apelar…"></label>
              <div class="row" style="align-self:end"><button class="btn" type="submit">Agregar</button></div>
            </form>
          </section>
          <section class="panel table-wrap">
            ${tablaExpedientes(expedientes)}
          </section>`;
      },
      mount() {
        $('#expForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.target));
          expedientes.push({ id: uid(), estado: 'Activo', ...d });
          store.set('expedientes', expedientes);
          render();
        });
        bindExpedienteAcciones();
      },
    },

    plazos: {
      title: 'Plazos y alertas',
      render() {
        const conPlazo = expedientes
          .filter((x) => x.plazo && x.estado !== 'Archivado')
          .sort((a, b) => a.plazo.localeCompare(b.plazo));
        return `
          <div class="page-head"><h1>Plazos y alertas</h1><p>Vencimientos de los expedientes activos, del más próximo al más lejano.</p></div>
          <section class="panel table-wrap">
            ${conPlazo.length ? tablaExpedientes(conPlazo) : '<div class="empty">No hay plazos registrados. Agréguelos en Expedientes.</div>'}
          </section>
          <div class="note">Los días se cuentan en naturales. Verifique el cómputo procesal (días hábiles, feriados y vacaciones colectivas del Poder Judicial) según la norma aplicable.</div>`;
      },
      mount() {
        bindExpedienteAcciones();
      },
    },

    protocolo: {
      title: 'Protocolo notarial',
      render() {
        const sorted = [...protocolo].sort((a, b) => Number(b.numero) - Number(a.numero));
        return `
          <div class="page-head"><h1>Protocolo notarial</h1><p>Control interno de instrumentos otorgados.</p></div>
          <section class="panel">
            <h2>Registrar instrumento</h2>
            <form id="protForm" class="grid-form">
              <label>Escritura N.º<input name="numero" type="number" min="1" required value="${protocolo.length ? Math.max(...protocolo.map((p) => Number(p.numero) || 0)) + 1 : ''}"></label>
              <label>Tomo<input name="tomo" required></label>
              <label>Folio<input name="folio" required placeholder="12 frente"></label>
              <label>Fecha<input name="fecha" type="date" required></label>
              <label>Acto o contrato<input name="acto" required placeholder="Compraventa, poder, constitución…"></label>
              <label>Otorgantes<input name="otorgantes" placeholder="[Nombres]"></label>
              <label>Presentación al Registro<select name="registro"><option>No aplica</option><option>Pendiente</option><option>Presentado</option><option>Inscrito</option><option>Defectuoso</option></select></label>
              <div class="row" style="align-self:end"><button class="btn" type="submit">Registrar</button></div>
            </form>
          </section>
          <section class="panel table-wrap">
            ${
              sorted.length
                ? `<table><thead><tr><th>N.º</th><th>Tomo / folio</th><th>Fecha</th><th>Acto</th><th>Otorgantes</th><th>Registro</th><th></th></tr></thead><tbody>
                  ${sorted
                    .map(
                      (p) => `<tr><td>${esc(p.numero)}</td><td>${esc(p.tomo)} / ${esc(p.folio)}</td><td>${fmtFecha(p.fecha)}</td><td>${esc(p.acto)}</td><td>${esc(p.otorgantes)}</td>
                      <td><span class="tag ${p.registro === 'Defectuoso' ? 'danger' : p.registro === 'Pendiente' ? 'warn' : p.registro === 'Inscrito' ? 'ok' : ''}">${esc(p.registro)}</span></td>
                      <td><button class="ghost sm" data-del-prot="${p.id}">Eliminar</button></td></tr>`
                    )
                    .join('')}
                  </tbody></table>`
                : '<div class="empty">Sin instrumentos registrados.</div>'
            }
          </section>`;
      },
      mount() {
        $('#protForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.target));
          if (protocolo.some((p) => String(p.numero) === String(d.numero) && p.tomo === d.tomo)) {
            alert('Ya existe una escritura con ese número en el mismo tomo.');
            return;
          }
          protocolo.push({ id: uid(), ...d });
          store.set('protocolo', protocolo);
          render();
        });
        document.querySelectorAll('[data-del-prot]').forEach((b) =>
          b.addEventListener('click', () => {
            if (!confirm('¿Eliminar este registro del control interno?')) return;
            protocolo = protocolo.filter((p) => p.id !== b.dataset.delProt);
            store.set('protocolo', protocolo);
            render();
          })
        );
      },
    },

    ajustes: {
      title: 'Ajustes',
      render() {
        return `
          <div class="page-head"><h1>Ajustes</h1><p>Datos del profesional y conexión con el servidor de agentes.</p></div>
          <section class="panel">
            <form id="ajForm" class="grid-form">
              <label>Nombre completo<input name="nombre" value="${esc(perfil.nombre)}" placeholder="[Nombre del Profesional]"></label>
              <label>Rol<input name="rol" value="${esc(perfil.rol)}"></label>
              <label>Carné profesional<input name="carne" value="${esc(perfil.carne)}" placeholder="[Carné]"></label>
              <label>URL de la API de agentes<input name="apiUrl" value="${esc(perfil.apiUrl)}" placeholder="http://localhost:3000"></label>
              <div class="row" style="align-self:end"><button class="btn" type="submit">Guardar</button></div>
            </form>
          </section>
          <section class="panel">
            <h2>Respaldo</h2>
            <p class="muted">Exporte o importe expedientes, protocolo y conversación en un archivo JSON.</p>
            <div class="row">
              <button class="ghost" id="bkExport" type="button">Exportar respaldo</button>
              <label class="ghost" style="flex-direction:row;cursor:pointer">Importar respaldo<input type="file" id="bkImport" accept="application/json" hidden></label>
            </div>
          </section>`;
      },
      mount() {
        $('#ajForm').addEventListener('submit', (e) => {
          e.preventDefault();
          perfil = { ...perfil, ...Object.fromEntries(new FormData(e.target)) };
          perfil.apiUrl = perfil.apiUrl.trim().replace(/\/+$/, '');
          store.set('perfil', perfil);
          pintarPerfil();
          render();
        });
        $('#bkExport').addEventListener('click', () => {
          const blob = new Blob([JSON.stringify({ expedientes, protocolo, chat, perfil }, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `liacr-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
        $('#bkImport').addEventListener('change', (e) => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const d = JSON.parse(r.result);
              if (Array.isArray(d.expedientes)) store.set('expedientes', (expedientes = d.expedientes));
              if (Array.isArray(d.protocolo)) store.set('protocolo', (protocolo = d.protocolo));
              if (Array.isArray(d.chat)) store.set('chat', (chat = d.chat));
              if (d.perfil && typeof d.perfil === 'object') store.set('perfil', (perfil = { ...perfil, ...d.perfil }));
              pintarPerfil();
              render();
              alert('Respaldo importado.');
            } catch (err) {
              alert('El archivo no es un respaldo válido.');
            }
          };
          r.readAsText(f);
        });
      },
    },
  };

  // ---------- Componentes ----------
  function resumenPlazos() {
    const prox = expedientes
      .filter((x) => x.plazo && x.estado !== 'Archivado')
      .map((x) => ({ ...x, d: diasHasta(x.plazo) }))
      .filter((x) => x.d <= 10)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    if (!prox.length) return '';
    return `<section class="panel"><h2>Plazos próximos</h2>
      <table><tbody>${prox.map((x) => `<tr><td>${esc(x.numero)}</td><td>${esc(x.cliente)}</td><td>${esc(x.pendiente || '')}</td><td>${fmtFecha(x.plazo)}</td><td>${tagPlazo(x.d)}</td></tr>`).join('')}</tbody></table>
      <div style="margin-top:10px"><a href="#plazos">Ver todos →</a></div></section>`;
  }

  function tablaExpedientes(lista) {
    if (!lista.length) return '<div class="empty">Sin expedientes registrados.</div>';
    return `<table><thead><tr><th>Número</th><th>Cliente</th><th>Materia</th><th>Despacho</th><th>Pendiente</th><th>Plazo</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lista
        .map(
          (x) => `<tr>
            <td>${esc(x.numero)}</td><td>${esc(x.cliente)}</td><td>${esc(x.materia)}</td><td>${esc(x.despacho)}</td><td>${esc(x.pendiente)}</td>
            <td>${fmtFecha(x.plazo)}<br>${x.estado === 'Archivado' ? '' : tagPlazo(diasHasta(x.plazo))}</td>
            <td><span class="tag">${esc(x.estado)}</span></td>
            <td class="row"><button class="ghost sm" data-arch="${x.id}">${x.estado === 'Archivado' ? 'Reactivar' : 'Archivar'}</button>
              <button class="ghost sm" data-del="${x.id}">Eliminar</button></td>
          </tr>`
        )
        .join('')}
      </tbody></table>`;
  }

  function bindExpedienteAcciones() {
    document.querySelectorAll('[data-arch]').forEach((b) =>
      b.addEventListener('click', () => {
        const x = expedientes.find((e) => e.id === b.dataset.arch);
        if (x) x.estado = x.estado === 'Archivado' ? 'Activo' : 'Archivado';
        store.set('expedientes', expedientes);
        render();
      })
    );
    document.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        if (!confirm('¿Eliminar este expediente?')) return;
        expedientes = expedientes.filter((e) => e.id !== b.dataset.del);
        store.set('expedientes', expedientes);
        render();
      })
    );
  }

  // ---------- Lógica ----------
  async function enviarConsulta(texto) {
    chat.push({ rol: 'user', texto });
    let respuesta;
    if (!perfil.apiUrl) {
      respuesta = 'Consulta registrada. Para obtener respuesta, configure la URL del servidor de agentes en Ajustes.';
    } else {
      try {
        const res = await fetch(perfil.apiUrl + '/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consulta: texto }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        respuesta = data.respuesta || data.contenido || JSON.stringify(data);
      } catch (e) {
        respuesta = 'No fue posible contactar el servidor de agentes (' + e.message + ').';
      }
    }
    chat.push({ rol: 'bot', texto: respuesta });
    store.set('chat', chat);
  }

  function generarBorrador(tipo, lugar) {
    const L = lugar || '[Insertar Lugar]';
    switch (tipo) {
      case 'escritura-compraventa':
        return [
          'ESCRITURA NÚMERO [Insertar Número en Letras]: ANTE MÍ, [Insertar Nombre del Notario], Notario Público con oficina abierta en ' + L + ', COMPARECEN: [Insertar Nombre Completo del Vendedor], mayor, [Estado Civil], [Profesión u Oficio], vecino de [Insertar Domicilio Exacto], portador de la cédula de identidad número [Insertar Cédula en Letras], en adelante denominado "EL VENDEDOR"; y [Insertar Nombre Completo del Comprador], mayor, [Estado Civil], [Profesión u Oficio], vecino de [Insertar Domicilio Exacto], portador de la cédula de identidad número [Insertar Cédula en Letras], en adelante denominado "EL COMPRADOR"; Y DICEN: PRIMERO: Que EL VENDEDOR es propietario de la finca inscrita en el Registro Inmobiliario, Partido de [Insertar Provincia], matrícula de folio real número [Insertar Matrícula en Letras], derecho [Insertar Derecho], que es terreno [Insertar Naturaleza], situada en el distrito [Insertar], cantón [Insertar], provincia [Insertar], con los linderos y medida que indica el Registro, plano catastrado número [Insertar Plano en Letras]. SEGUNDO: Que por este acto VENDE dicha finca a EL COMPRADOR, quien la acepta, libre de afecciones y gravámenes [o indicar los que soporta], por el precio de [Insertar Precio en Letras], que EL VENDEDOR declara recibido a su entera satisfacción. TERCERO: [Insertar Estipulaciones Adicionales]. ES TODO. Expido un primer testimonio. Leído lo escrito a los comparecientes, lo aprueban y firmamos en ' + L + ', a las [Insertar Hora en Letras] horas del [Insertar Fecha en Letras].',
          '',
          'Nota: trasladar al protocolo con numeración de líneas, cantidades en letras y razón de timbres de ley.',
        ].join('\n');
      case 'poder-especial':
        return 'ESCRITURA NÚMERO [Insertar Número en Letras]: ANTE MÍ, [Insertar Nombre del Notario], Notario Público con oficina abierta en ' + L + ', COMPARECE: [Insertar Nombre Completo del Poderdante], mayor, [Estado Civil], [Profesión u Oficio], vecino de [Insertar Domicilio], portador de la cédula de identidad número [Insertar Cédula en Letras], Y DICE: Que confiere PODER ESPECIAL, de conformidad con el artículo mil doscientos cincuenta y seis del Código Civil, a favor de [Insertar Nombre Completo del Apoderado], [Calidades], para que en su nombre y representación [Insertar Acto o Gestión Específica]. ES TODO. Leído lo escrito al compareciente, lo aprueba y firmamos en ' + L + ', a las [Insertar Hora en Letras] horas del [Insertar Fecha en Letras].';
      case 'contrato-arrendamiento':
        return [
          'CONTRATO DE ARRENDAMIENTO',
          '',
          'Entre nosotros, [Insertar Nombre del Arrendante], cédula [Insertar Cédula Identidad/Jurídica], en adelante "EL ARRENDANTE", y [Insertar Nombre del Arrendatario], cédula [Insertar Cédula Identidad/Jurídica], en adelante "EL ARRENDATARIO", convenimos el presente contrato, regido por la Ley General de Arrendamientos Urbanos y Suburbanos (Ley N.° 7527):',
          '',
          '1. OBJETO. Se arrienda el inmueble ubicado en [Insertar Dirección], finca [Insertar Citas de Inscripción: Tomo/Folio/Asiento o Matrícula].',
          '2. DESTINO. El inmueble se destinará exclusivamente a [Vivienda / Actividad comercial].',
          '3. PLAZO. [Insertar Plazo] a partir del [Insertar Fecha].',
          '4. PRECIO. Renta mensual de [Insertar Monto en Números y Letras], pagadera por adelantado los días [Insertar Día] de cada mes.',
          '5. DEPÓSITO DE GARANTÍA. [Insertar Monto].',
          '6. SERVICIOS Y MANTENIMIENTO. [Insertar Estipulación].',
          '7. NOTIFICACIONES. [Insertar Medios].',
          '',
          'Firmamos en ' + L + ', el [Insertar Fecha].',
        ].join('\n');
      case 'recurso-revocatoria':
        return [
          'SEÑORES [Insertar Órgano que Dictó el Acto]',
          '',
          'Quien suscribe, [Insertar Nombre], cédula [Insertar Cédula], en mi condición de [Insertar Condición], respetuosamente interpongo RECURSO DE REVOCATORIA CON APELACIÓN EN SUBSIDIO contra la resolución [Insertar Número y Fecha], con fundamento en los artículos 342 a 352 de la Ley General de la Administración Pública, en los siguientes términos:',
          '',
          '1. HECHOS. [Insertar Relación de Hechos].',
          '2. AGRAVIOS. [Insertar Agravios].',
          '3. FUNDAMENTO DE DERECHO. [Insertar Normas y Jurisprudencia].',
          '4. PETITORIA. Se revoque la resolución impugnada y, en su defecto, se eleve en alzada.',
          '5. NOTIFICACIONES. [Insertar Medio].',
          '',
          L + ', [Insertar Fecha].',
        ].join('\n');
      default:
        return '';
    }
  }

  function revisarDocumento(texto) {
    if (!texto.trim()) return '<div class="note">Ingrese el texto a revisar.</div>';
    const t = texto.toLowerCase();
    const esEscritura = /ante m[ií]/.test(t) || /escritura n[uú]mero/.test(t);
    const checks = esEscritura
      ? [
          ['Apertura notarial ("ANTE MÍ")', /ante m[ií]/.test(t)],
          ['Comparecencia', /comparec/.test(t)],
          ['Cédulas de los comparecientes', /c[ée]dula/.test(t)],
          ['Citas registrales (finca, matrícula o folio real)', /(matr[ií]cula|folio real|finca)/.test(t)],
          ['Fecha y hora de otorgamiento', /horas del/.test(t)],
          ['Cierre ("ES TODO" / lectura y aprobación)', /(es todo|le[ií]do lo escrito)/.test(t)],
          ['Cantidades sin dígitos en el cuerpo', !/\d/.test(texto)],
        ]
      : [
          ['Identificación de las partes', /(entre nosotros|comparec|suscrib)/.test(t)],
          ['Cédula de identidad o jurídica', /c[ée]dula/.test(t)],
          ['Objeto definido', /objeto/.test(t)],
          ['Precio o contraprestación', /(precio|monto|renta|colones|d[oó]lares)/.test(t)],
          ['Plazo', /plazo/.test(t)],
          ['Medio para notificaciones', /notifica/.test(t)],
          ['Lugar y fecha de firma', /(firmamos|suscribimos)/.test(t)],
        ];
    const pendientes = (texto.match(/\[[^\]]+\]/g) || []).length;
    return `<h2 style="margin-top:18px">${esEscritura ? 'Escritura pública' : 'Documento privado o escrito'}</h2>
      <table><tbody>${checks.map(([k, ok]) => `<tr><td>${esc(k)}</td><td>${ok ? '<span class="tag ok">Presente</span>' : '<span class="tag danger">Revisar</span>'}</td></tr>`).join('')}
      <tr><td>Marcadores sin completar [ … ]</td><td>${pendientes ? `<span class="tag warn">${pendientes}</span>` : '<span class="tag ok">0</span>'}</td></tr></tbody></table>
      <div class="note">Esta es una verificación formal automática. No sustituye el análisis de fondo ni la calificación registral.</div>`;
  }

  function copiar(texto, btn) {
    const done = () => {
      const old = btn.textContent;
      btn.textContent = 'Copiado';
      setTimeout(() => (btn.textContent = old), 1500);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(done, () => {});
  }

  // ---------- Shell ----------
  function pintarPerfil() {
    $('#profileName').textContent = perfil.nombre || '[Nombre del Profesional]';
    $('#profileRole').textContent = [perfil.rol, perfil.carne && 'Carné ' + perfil.carne].filter(Boolean).join(' · ');
    const urg = expedientes.filter((x) => x.plazo && x.estado !== 'Archivado' && diasHasta(x.plazo) <= 3).length;
    const badge = $('#plazosBadge');
    badge.hidden = !urg;
    badge.textContent = urg;
  }

  function render() {
    const route = (location.hash || '#inicio').slice(1);
    const view = views[route] || views.inicio;
    $('#view').innerHTML = view.render();
    $('#topbarTitle').textContent = view.title;
    document.title = 'Lia-CR · ' + view.title;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (views[route] ? route : 'inicio')));
    pintarPerfil();
    if (view.mount) view.mount();
  }

  function initTheme() {
    const saved = store.get('theme', null);
    if (saved) document.documentElement.dataset.theme = saved;
    $('#themeToggle').addEventListener('click', () => {
      const current =
        document.documentElement.dataset.theme ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
    });
  }

  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#nav').addEventListener('click', (e) => {
    if (e.target.closest('a')) $('#sidebar').classList.remove('open');
  });
  window.addEventListener('hashchange', () => {
    render();
    $('#view').focus();
  });
  initTheme();
  render();
})();
