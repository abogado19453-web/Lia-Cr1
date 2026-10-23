/*
 * Prueba de la aplicación de escritorio real: la arranca, trabaja en ella,
 * la cierra y la vuelve a abrir para comprobar que los datos quedaron en
 * archivos del disco.
 *
 *   xvfb-run -a node pruebas/aplicacion.cjs
 *
 * Requiere que escritorio/ tenga sus dependencias instaladas y la interfaz
 * preparada (npm install && npm run preparar).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright');

const RAIZ = path.join(__dirname, '..', 'escritorio');
const DATOS = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-datos-'));

let pasadas = 0;
let fallas = 0;
function check(nombre, condicion) {
  if (condicion) { pasadas++; console.log('  ok   ' + nombre); }
  else { fallas++; console.error('  FALLA ' + nombre); }
}

/* Playwright busca Electron en su propio árbol de módulos; acá vive en
   escritorio/node_modules, así que se le indica el ejecutable. */
function ejecutableElectron() {
  const descriptor = path.join(RAIZ, 'node_modules', 'electron', 'path.txt');
  const binario = path.join(RAIZ, 'node_modules', 'electron', 'dist',
    fs.readFileSync(descriptor, 'utf8').trim());
  if (!fs.existsSync(binario)) throw Error('No se encontró Electron en ' + binario);
  return binario;
}

async function abrir() {
  const app = await electron.launch({
    executablePath: ejecutableElectron(),
    args: ['.', '--user-data-dir=' + DATOS, '--no-sandbox'],
    cwd: RAIZ
  });
  const ventana = await app.firstWindow();
  await ventana.waitForLoadState('domcontentloaded');
  await ventana.waitForTimeout(700);
  return { app, ventana };
}

(async () => {
  console.log('aplicacion.cjs — Electron con datos en ' + DATOS);

  /* ---------------- Primera sesión ---------------- */
  let { app, ventana } = await abrir();
  const errores = [];
  ventana.on('pageerror', e => errores.push('pageerror: ' + e.message));
  ventana.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

  check('la ventana abre', await ventana.locator('#home').isVisible());
  check('se reconoce como aplicación',
    await ventana.evaluate(() => document.body.classList.contains('esAplicacion')));
  check('el puente nativo está expuesto',
    await ventana.evaluate(() => typeof pfNativo === 'object' && typeof pfNativo.almacen === 'object'));

  const rutaMostrada = (await ventana.locator('#dataFolder').textContent()).trim();
  check('la interfaz muestra la carpeta de datos', rutaMostrada.length > 0);

  // No debe haber acceso a Node desde la interfaz.
  check('la interfaz está aislada de Node',
    await ventana.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined'));

  // Datos del notario y una escritura con texto.
  await ventana.click('[data-tab="tools"]');
  await ventana.fill('#notary', 'Juana Pérez Rojas');
  await ventana.fill('#place', 'San José');
  await ventana.click('#saveNotary');
  await ventana.waitForTimeout(200);

  await ventana.click('[data-tab="editor"]');
  await ventana.click('#newDoc');
  await ventana.fill('#title', 'Compraventa de prueba');
  await ventana.fill('#parties', 'Pedro Mora y Ana Solís');
  const cuerpo = 'Ante mí comparecen los otorgantes y dicen. '.repeat(40) + 'MARCA-DE-PRUEBA-42.';
  await ventana.fill('#text', cuerpo);
  await ventana.click('#save');
  await ventana.waitForTimeout(600);

  const archivoDatos = path.join(DATOS, 'datos.json');
  check('datos.json existe en el disco', fs.existsSync(archivoDatos));
  const guardado = fs.existsSync(archivoDatos) ? fs.readFileSync(archivoDatos, 'utf8') : '';
  check('el texto llegó al archivo', guardado.indexOf('MARCA-DE-PRUEBA-42') >= 0);
  check('el archivo es JSON válido del formato esperado',
    (() => { try { const s = JSON.parse(guardado); return s.format === 'protocolo-facil' && s.version === 2; }
             catch (e) { return false; } })());

  /* Cuadros de entrada propios: Electron no admite prompt(), de modo que la
     interfaz no debe usarlo en ningún camino. */
  await ventana.click('#makeTestimonio');
  await ventana.waitForTimeout(300);
  check('el cuadro de entrada propio aparece', await ventana.locator('#askModal').isVisible());
  await ventana.fill('#askValue', '1');
  await ventana.click('#askAccept');
  await ventana.waitForTimeout(300);
  const testimonio = await ventana.locator('#textModalBody').inputValue();
  check('la razón de testimonio se genera en la aplicación',
    /^ES PRIMER TESTIMONIO/.test(testimonio));
  await ventana.click('#closeTextModal');
  await ventana.waitForTimeout(200);

  await ventana.click('#insertAmount');
  await ventana.waitForTimeout(300);
  await ventana.keyboard.press('Escape');
  await ventana.waitForTimeout(300);
  check('cancelar el cuadro de entrada no bloquea la interfaz',
    !(await ventana.locator('#askModal').isVisible()) &&
    await ventana.locator('#text').isEnabled());

  // La vista de caras funciona dentro de la aplicación.
  await ventana.click('[data-tab="preview"]');
  await ventana.waitForTimeout(600);
  check('la vista reparte el texto en caras',
    (await ventana.locator('#pages .pageFrame').count()) >= 1);

  // Una operación irreversible deja instantánea y respaldo fechado.
  await ventana.click('[data-tab="settings"]');
  await ventana.fill('[name="pitch"]', '8.4');
  await ventana.click('#profileForm button[type="submit"]');
  await ventana.waitForTimeout(900);
  check('instantaneas.json existe', fs.existsSync(path.join(DATOS, 'instantaneas.json')));
  const respaldos = fs.existsSync(path.join(DATOS, 'respaldos'))
    ? fs.readdirSync(path.join(DATOS, 'respaldos')).filter(n => n.endsWith('.json'))
    : [];
  check('quedó un respaldo fechado en respaldos/', respaldos.length >= 1);

  check('ningún error de JavaScript en la primera sesión', errores.length === 0);
  if (errores.length) for (const e of errores) console.error('       ' + e);

  await app.close();

  /* ---------------- Segunda sesión: persistencia real ---------------- */
  ({ app, ventana } = await abrir());
  const errores2 = [];
  ventana.on('pageerror', e => errores2.push('pageerror: ' + e.message));

  await ventana.click('[data-tab="editor"]');
  await ventana.waitForTimeout(400);
  check('la escritura sobrevive al cierre de la aplicación',
    (await ventana.locator('#docList .docItem').count()) === 1);
  check('el texto se recuperó íntegro',
    (await ventana.locator('#text').inputValue()).indexOf('MARCA-DE-PRUEBA-42') >= 0);
  await ventana.click('[data-tab="settings"]');
  await ventana.waitForTimeout(250);
  check('el perfil de papel se recuperó',
    (await ventana.locator('[name="pitch"]').inputValue()) === '8.4');
  await ventana.click('[data-tab="home"]');
  await ventana.waitForTimeout(300);
  check('las instantáneas se recuperaron',
    (await ventana.locator('#snapshotList .snapshotRow').count()) >= 1);
  check('ningún error de JavaScript en la segunda sesión', errores2.length === 0);

  /* ---------------- El proceso principal rechaza rutas ajenas ------- */
  const rechazo = await ventana.evaluate(() => {
    try { pfNativo.almacen.getItem('../../../etc/passwd'); return 'no rechazó'; }
    catch (e) { return 'rechazó'; }
  });
  check('el proceso principal rechaza archivos fuera de los suyos', rechazo === 'rechazó');

  await app.close();

  fs.rmSync(DATOS, { recursive: true, force: true });
  console.log('\n' + pasadas + ' comprobaciones superadas, ' + fallas + ' fallas');
  if (fallas) process.exitCode = 1;
})().catch(e => {
  console.error('error en la prueba: ' + (e && e.stack || e));
  process.exitCode = 1;
});
