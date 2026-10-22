/*
 * Funde index.html, style.css y los cuatro módulos JavaScript en un solo
 * archivo .html que se abre con doble clic, sin instalar nada.
 *
 *   node herramientas/empaquetar-html.cjs salida.html
 */
'use strict';
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const output = process.argv[2] || path.join(__dirname, '..', 'dist', 'ProtocoloFacil.html');

const read = name => fs.readFileSync(path.join(appDir, name), 'utf8');

let html = read('index.html');
const css = read('style.css');
const scripts = ['engine.js', 'notarial.js', 'store.js', 'ui.js'];

// Hoja de estilo
html = html.replace('<link rel="stylesheet" href="style.css">',
  '<style>\n' + css + '\n</style>');

// Módulos, en el mismo orden de carga
for (const name of scripts) {
  const tag = '<script src="' + name + '"></script>';
  if (html.indexOf(tag) < 0) throw Error('No se encontró la etiqueta de ' + name);
  // Se corta cualquier cierre de etiqueta dentro del código fuente.
  const body = read(name).replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(tag, '<script>\n' + body + '\n</script>');
}

if (/<script src=|<link rel="stylesheet"/.test(html)) {
  throw Error('Quedaron referencias externas sin incrustar.');
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html, 'utf8');
console.log('   ' + output + ' (' + Math.round(fs.statSync(output).size / 1024) + ' KB)');
