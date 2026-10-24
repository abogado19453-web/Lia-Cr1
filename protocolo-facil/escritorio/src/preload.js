/*
 * Puente entre la interfaz y el proceso principal.
 *
 * La interfaz corre aislada y sin Node: sólo ve las funciones que se exponen
 * acá. No hay acceso a rutas arbitrarias — el proceso principal admite
 * únicamente sus dos archivos de datos.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function sincrono(canal, ...args) {
  const r = ipcRenderer.sendSync(canal, ...args);
  if (!r || !r.ok) throw Error((r && r.error) || 'Error de acceso a disco.');
  return r;
}

contextBridge.exposeInMainWorld('pfNativo', {
  plataforma: process.platform,

  /* Almacenamiento con la misma forma que localStorage, para que la capa de
     persistencia de la interfaz funcione sin cambios de arquitectura. */
  almacen: {
    getItem: nombre => sincrono('pf:leer', nombre).valor,
    setItem: (nombre, valor) => { sincrono('pf:escribir', nombre, String(valor)); },
    removeItem: nombre => { sincrono('pf:borrar', nombre); }
  },

  rutaDatos: () => ipcRenderer.sendSync('pf:rutaDatos'),
  version: () => ipcRenderer.invoke('pf:version'),

  respaldoAutomatico: (contenido, etiqueta) =>
    ipcRenderer.invoke('pf:respaldoAutomatico', contenido, etiqueta),
  guardarComo: (nombre, contenido, filtros) =>
    ipcRenderer.invoke('pf:guardarComo', nombre, contenido, filtros),
  abrirArchivo: filtros => ipcRenderer.invoke('pf:abrirArchivo', filtros),
  abrirCarpetaDatos: () => ipcRenderer.invoke('pf:abrirCarpetaDatos'),
  guardarPDF: (nombre, opciones) => ipcRenderer.invoke('pf:guardarPDF', nombre, opciones),

  /* Órdenes del menú nativo hacia la interfaz. */
  alMenu: manejador => {
    const canales = ['menu:nuevaEscritura', 'menu:guardar', 'menu:respaldar', 'menu:restaurar',
      'menu:imprimir', 'menu:pdf', 'menu:ayuda', 'menu:ir:home', 'menu:ir:editor',
      'menu:ir:preview', 'menu:ir:tomo', 'menu:ir:index', 'menu:ir:templates',
      'menu:ir:tools', 'menu:ir:settings'];
    for (const canal of canales) {
      ipcRenderer.on(canal, () => manejador(canal));
    }
  }
});
