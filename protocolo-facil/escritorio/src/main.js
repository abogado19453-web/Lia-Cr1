/*
 * Protocolo Fácil — proceso principal de la aplicación de escritorio.
 *
 * Diferencia central frente a la edición web: los datos viven en archivos
 * reales del disco del usuario, no en el almacenamiento del navegador. Borrar
 * los datos de Safari o de Edge ya no puede dejar inaccesible el trabajo.
 *
 * Ubicación de los datos (carpeta de usuario de la aplicación):
 *   datos.json            conjunto de libros, escrituras, plantillas y perfil
 *   instantaneas.json     anillo de copias previas a operaciones destructivas
 *   respaldos/            copias automáticas con fecha, nunca sobrescritas
 */
'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const ARCHIVO_DATOS = 'datos.json';
const ARCHIVO_INSTANTANEAS = 'instantaneas.json';
const CARPETA_RESPALDOS = 'respaldos';
const LIMITE_BYTES = 64 * 1024 * 1024;

let ventana = null;

/* ------------------------------------------------------------------ *
 * Acceso a disco
 * ------------------------------------------------------------------ */

function carpetaDatos() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rutaDe(nombre) {
  return path.join(carpetaDatos(), nombre);
}

function leerArchivo(nombre) {
  try {
    return fs.readFileSync(rutaDe(nombre), 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Escritura atómica: se escribe a un temporal y se renombra. Un corte de
 * energía a mitad de camino deja el archivo anterior intacto, nunca uno
 * truncado.
 */
function escribirArchivo(nombre, contenido) {
  if (typeof contenido !== 'string') throw Error('Contenido inválido.');
  if (Buffer.byteLength(contenido, 'utf8') > LIMITE_BYTES) {
    throw Error('El conjunto de datos supera los 64 MB.');
  }
  const destino = rutaDe(nombre);
  const temporal = destino + '.tmp';
  fs.writeFileSync(temporal, contenido, 'utf8');
  fs.renameSync(temporal, destino);
  return true;
}

function marcaDeTiempo() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Copia con fecha dentro de respaldos/. Nunca sobrescribe una anterior. */
function respaldoAutomatico(contenido, etiqueta) {
  const dir = path.join(carpetaDatos(), CARPETA_RESPALDOS);
  fs.mkdirSync(dir, { recursive: true });
  const limpia = String(etiqueta || 'respaldo').replace(/[^\wáéíóúñÁÉÍÓÚÑ -]/g, '').slice(0, 60).trim();
  const destino = path.join(dir, `${marcaDeTiempo()}_${limpia || 'respaldo'}.json`);
  fs.writeFileSync(destino, contenido, 'utf8');
  podarRespaldos(dir);
  return destino;
}

/** Conserva los 200 respaldos automáticos más recientes. */
function podarRespaldos(dir) {
  try {
    const archivos = fs.readdirSync(dir)
      .filter(n => n.endsWith('.json'))
      .map(n => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const sobrante of archivos.slice(200)) {
      fs.unlinkSync(path.join(dir, sobrante.n));
    }
  } catch (e) {
    // Podar es una cortesía: si falla, el respaldo ya quedó escrito.
  }
}

/* ------------------------------------------------------------------ *
 * Canales con la interfaz
 * ------------------------------------------------------------------ */

/* Lecturas y escrituras síncronas: el archivo es pequeño y la interfaz
   existente trabaja de forma síncrona, como lo hacía con el navegador. */
ipcMain.on('pf:leer', (evento, nombre) => {
  try {
    evento.returnValue = { ok: true, valor: leerArchivo(nombreValido(nombre)) };
  } catch (e) {
    evento.returnValue = { ok: false, error: e.message };
  }
});

ipcMain.on('pf:escribir', (evento, nombre, contenido) => {
  try {
    evento.returnValue = { ok: escribirArchivo(nombreValido(nombre), contenido) };
  } catch (e) {
    evento.returnValue = { ok: false, error: e.message };
  }
});

ipcMain.on('pf:borrar', (evento, nombre) => {
  try {
    fs.rmSync(rutaDe(nombreValido(nombre)), { force: true });
    evento.returnValue = { ok: true };
  } catch (e) {
    evento.returnValue = { ok: false, error: e.message };
  }
});

ipcMain.on('pf:rutaDatos', evento => { evento.returnValue = carpetaDatos(); });

/** Sólo se admiten los dos nombres de la aplicación: nada de rutas libres. */
function nombreValido(nombre) {
  if (nombre !== ARCHIVO_DATOS && nombre !== ARCHIVO_INSTANTANEAS) {
    throw Error('Archivo no permitido.');
  }
  return nombre;
}

ipcMain.handle('pf:respaldoAutomatico', (evento, contenido, etiqueta) => {
  try {
    return { ok: true, ruta: respaldoAutomatico(String(contenido), etiqueta) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pf:guardarComo', async (evento, nombreSugerido, contenido, filtros) => {
  const resultado = await dialog.showSaveDialog(ventana, {
    title: 'Guardar',
    defaultPath: path.join(app.getPath('documents'), String(nombreSugerido || 'archivo')),
    filters: Array.isArray(filtros) && filtros.length ? filtros : undefined
  });
  if (resultado.canceled || !resultado.filePath) return { ok: false, cancelado: true };
  try {
    fs.writeFileSync(resultado.filePath, String(contenido), 'utf8');
    return { ok: true, ruta: resultado.filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pf:abrirArchivo', async (evento, filtros) => {
  const resultado = await dialog.showOpenDialog(ventana, {
    title: 'Abrir',
    properties: ['openFile'],
    filters: Array.isArray(filtros) && filtros.length ? filtros : undefined
  });
  if (resultado.canceled || !resultado.filePaths.length) return { ok: false, cancelado: true };
  const ruta = resultado.filePaths[0];
  try {
    if (fs.statSync(ruta).size > LIMITE_BYTES) throw Error('El archivo supera los 64 MB.');
    return { ok: true, ruta, contenido: fs.readFileSync(ruta, 'utf8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pf:abrirCarpetaDatos', async () => {
  await shell.openPath(carpetaDatos());
  return { ok: true };
});

ipcMain.handle('pf:confirmar', async (evento, mensaje, detalle) => {
  const { response } = await dialog.showMessageBox(ventana, {
    type: 'question',
    buttons: ['Continuar', 'Cancelar'],
    defaultId: 1,
    cancelId: 1,
    message: String(mensaje),
    detail: detalle ? String(detalle) : undefined
  });
  return response === 0;
});

ipcMain.handle('pf:pedirTexto', async (evento, mensaje) => {
  // Electron no trae un cuadro de entrada: lo resuelve la propia interfaz.
  return { ok: false, mensaje: String(mensaje) };
});

ipcMain.handle('pf:guardarPDF', async (evento, nombreSugerido, opciones) => {
  const resultado = await dialog.showSaveDialog(ventana, {
    title: 'Guardar como PDF',
    defaultPath: path.join(app.getPath('documents'), String(nombreSugerido || 'escritura.pdf')),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (resultado.canceled || !resultado.filePath) return { ok: false, cancelado: true };
  try {
    const ancho = Number((opciones && opciones.anchoMm) || 216);
    const alto = Number((opciones && opciones.altoMm) || 330);
    const datos = await ventana.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: { width: mmAMicras(ancho), height: mmAMicras(alto) }
    });
    fs.writeFileSync(resultado.filePath, datos);
    return { ok: true, ruta: resultado.filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

const mmAMicras = mm => Math.round(mm * 1000);

ipcMain.handle('pf:version', () => app.getVersion());

/* ------------------------------------------------------------------ *
 * Ventana y menú
 * ------------------------------------------------------------------ */

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 820,
    minHeight: 600,
    show: false,
    backgroundColor: '#f4f1ea',
    title: 'Protocolo Fácil',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  ventana.once('ready-to-show', () => ventana.show());
  ventana.loadFile(path.join(__dirname, '..', 'interfaz', 'index.html'));

  // La aplicación es local: ningún enlace externo se abre dentro de ella.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (evento, url) => {
    if (!url.startsWith('file://')) {
      evento.preventDefault();
      if (/^https:\/\//.test(url)) shell.openExternal(url);
    }
  });

  ventana.on('closed', () => { ventana = null; });
}

function enviar(canal) {
  if (ventana) ventana.webContents.send(canal);
}

function construirMenu() {
  const esMac = process.platform === 'darwin';
  const plantilla = [];

  if (esMac) {
    plantilla.push({
      label: app.name,
      submenu: [
        { role: 'about', label: 'Acerca de Protocolo Fácil' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar' },
        { role: 'hideOthers', label: 'Ocultar otras' },
        { role: 'unhide', label: 'Mostrar todas' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    });
  }

  plantilla.push({
    label: 'Archivo',
    submenu: [
      { label: 'Nueva escritura', accelerator: 'CmdOrCtrl+N', click: () => enviar('menu:nuevaEscritura') },
      { label: 'Guardar', accelerator: 'CmdOrCtrl+S', click: () => enviar('menu:guardar') },
      { type: 'separator' },
      { label: 'Respaldar en un archivo…', accelerator: 'CmdOrCtrl+B', click: () => enviar('menu:respaldar') },
      { label: 'Restaurar desde un respaldo…', click: () => enviar('menu:restaurar') },
      { label: 'Abrir la carpeta de datos', click: () => shell.openPath(carpetaDatos()) },
      { type: 'separator' },
      { label: 'Imprimir…', accelerator: 'CmdOrCtrl+P', click: () => enviar('menu:imprimir') },
      { label: 'Guardar como PDF…', accelerator: 'CmdOrCtrl+Shift+P', click: () => enviar('menu:pdf') },
      { type: 'separator' },
      esMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }
    ]
  });

  plantilla.push({
    label: 'Edición',
    submenu: [
      { role: 'undo', label: 'Deshacer' },
      { role: 'redo', label: 'Rehacer' },
      { type: 'separator' },
      { role: 'cut', label: 'Cortar' },
      { role: 'copy', label: 'Copiar' },
      { role: 'paste', label: 'Pegar' },
      { role: 'selectAll', label: 'Seleccionar todo' }
    ]
  });

  plantilla.push({
    label: 'Ir a',
    submenu: [
      { label: 'Inicio', click: () => enviar('menu:ir:home') },
      { label: 'Escrituras', click: () => enviar('menu:ir:editor') },
      { label: 'Revisar e imprimir', click: () => enviar('menu:ir:preview') },
      { label: 'Tomo y razones', click: () => enviar('menu:ir:tomo') },
      { label: 'Índice', click: () => enviar('menu:ir:index') },
      { label: 'Plantillas', click: () => enviar('menu:ir:templates') },
      { label: 'Herramientas', click: () => enviar('menu:ir:tools') },
      { label: 'Configurar impresión', click: () => enviar('menu:ir:settings') }
    ]
  });

  plantilla.push({
    label: 'Ver',
    submenu: [
      { role: 'resetZoom', label: 'Tamaño normal' },
      { role: 'zoomIn', label: 'Agrandar' },
      { role: 'zoomOut', label: 'Achicar' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Pantalla completa' },
      { role: 'toggleDevTools', label: 'Herramientas de desarrollo' }
    ]
  });

  plantilla.push({
    label: 'Ayuda',
    submenu: [
      { label: 'Cómo calibrar la impresión', click: () => enviar('menu:ayuda') },
      { label: 'Abrir la carpeta de datos', click: () => shell.openPath(carpetaDatos()) },
      {
        label: 'Acerca de',
        click: () => dialog.showMessageBox(ventana, {
          type: 'info',
          message: 'Protocolo Fácil ' + app.getVersion(),
          detail: 'Reconstrucción independiente para uso notarial en Costa Rica.\n\n' +
            'Los datos se guardan en:\n' + carpetaDatos() + '\n\n' +
            'Las fórmulas son estructuras de trabajo parametrizables y las tarifas ' +
            'son editables: la vigencia del arancel y de los timbres corresponde ' +
            'verificarla al notario responsable.'
        })
      }
    ]
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

/* ------------------------------------------------------------------ *
 * Ciclo de vida
 * ------------------------------------------------------------------ */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });

  app.whenReady().then(() => {
    construirMenu();
    crearVentana();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = { escribirArchivo, leerArchivo, respaldoAutomatico, mmAMicras };
