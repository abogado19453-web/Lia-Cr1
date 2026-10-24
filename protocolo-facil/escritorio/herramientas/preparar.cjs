/*
 * Copia la interfaz compartida (../app) dentro de la aplicación de escritorio
 * y le inyecta una política de seguridad de contenido.
 *
 * La política no vive en ../app/index.html porque allí rompería la versión
 * de un solo archivo, que necesita guiones incrustados.
 *
 *   node herramientas/preparar.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, '..', 'app');
const destino = path.join(raiz, 'interfaz');

const ARCHIVOS = ['index.html', 'style.css', 'engine.js', 'notarial.js', 'store.js', 'ui.js'];

const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; " +
  "base-uri 'none'";

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });

for (const nombre of ARCHIVOS) {
  let contenido = fs.readFileSync(path.join(origen, nombre), 'utf8');

  if (nombre === 'index.html') {
    const meta = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">';
    const ancla = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    if (contenido.indexOf(ancla) < 0) throw Error('No se encontró el ancla del viewport.');
    contenido = contenido.replace(ancla, ancla + '\n' + meta);
    if (/<script(?![^>]*\bsrc=)/i.test(contenido)) {
      throw Error('La interfaz tiene guiones incrustados: la política los bloquearía.');
    }
    // Un atributo como onsubmit="…" tampoco corre bajo la política, y su
    // ausencia silenciosa deja que el formulario navegue.
    const incrustado = /\s(on[a-z]+)\s*=\s*"/i.exec(contenido);
    if (incrustado) {
      throw Error('La interfaz usa el atributo ' + incrustado[1] +
        ': la política lo bloquearía. Registrá el manejador desde ui.js.');
    }
  }

  fs.writeFileSync(path.join(destino, nombre), contenido, 'utf8');
}

console.log('   interfaz preparada con ' + ARCHIVOS.length + ' archivos');
