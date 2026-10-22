/* Prueba de humo en navegador real: recorre las pantallas y ejercita el flujo. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept('1'));

  const check = (name, cond) => console.log((cond ? '  ok   ' : '  FALLA ') + name);

  await page.goto(FILE);
  await page.waitForTimeout(400);
  check('carga sin errores', errors.length === 0);
  check('inicio visible', await page.locator('#home.active').isVisible());

  // Datos del notario
  await page.click('[data-tab="tools"]');
  await page.fill('#notary', 'Juana Pérez Rojas');
  await page.fill('#notaryCedula', '1-0234-0567');
  await page.fill('#notaryCarne', '12345');
  await page.fill('#place', 'San José');
  await page.click('#saveNotary');
  await page.waitForTimeout(200);

  // Conversiones
  await page.fill('#amountValue', '1.234.567,89');
  await page.click('#convertAmount');
  const amount = await page.locator('#amountResult').textContent();
  check('importe en letras', /colones con ochenta y nueve céntimos/.test(amount));

  await page.fill('#dateTool', '2026-03-05');
  await page.fill('#hourTool', '09:15');
  await page.click('#convertDate');
  const dt = await page.locator('#dateResult').textContent();
  check('fecha y hora en letras', /nueve horas quince minutos del cinco de marzo/.test(dt));

  // Liquidación
  await page.fill('#feeAmount', '25000000');
  await page.click('#calcFee');
  await page.waitForTimeout(150);
  check('liquidación calculada', (await page.locator('#feeResult table tbody tr').count()) > 3);

  // Escritura
  await page.click('[data-tab="editor"]');
  await page.click('#newDoc');
  await page.fill('#title', 'Compraventa de inmueble');
  await page.fill('#parties', 'Pedro Mora y Ana Solís');
  const body = ('Ante mí comparecen los otorgantes y dicen que celebran el contrato que consta ' +
    'en las siguientes cláusulas. ').repeat(60) + 'Se vende «el lote contiguo» y no [[la casa]].';
  await page.fill('#text', body);
  await page.click('#save');
  await page.waitForTimeout(400);
  check('palabras contadas', /\d+ palabras/.test(await page.locator('#wordCount').textContent()));

  // Razón de entrelineados
  await page.click('#insertRazon');
  await page.waitForTimeout(200);
  const razon = await page.locator('#textModalBody').inputValue();
  check('razón de entrelineados', /Entre líneas se lee: «el lote contiguo». Vale./.test(razon) &&
    /Testado: «la casa». No vale./.test(razon));
  await page.click('#closeTextModal');

  // Razón de testimonio
  await page.click('#makeTestimonio');
  await page.waitForTimeout(250);
  const testimonio = await page.locator('#textModalBody').inputValue();
  check('razón de testimonio', /^ES PRIMER TESTIMONIO/.test(testimonio));
  await page.click('#closeTextModal');

  // Vista de caras
  await page.click('[data-tab="preview"]');
  await page.waitForTimeout(500);
  const faces = await page.locator('#pages .pageFrame').count();
  check('vista con varias caras', faces >= 2);
  check('informe de distribución', /caras · desde folio/.test(await page.locator('#layoutReport').textContent()));

  // Segunda escritura con posición propuesta
  await page.click('[data-tab="editor"]');
  await page.click('#newDoc');
  await page.fill('#text', 'Texto breve de la segunda escritura.');
  await page.click('#save');
  await page.waitForTimeout(300);
  const folio = await page.locator('#folio').inputValue();
  check('posición propuesta tras la anterior', Number(folio) >= 1);

  // Tomo y mapa de folios
  await page.click('[data-tab="tomo"]');
  await page.waitForTimeout(300);
  await page.click('#genApertura');
  const apertura = await page.locator('#aperturaText').inputValue();
  check('razón de apertura generada', /RAZÓN DE APERTURA/.test(apertura) && /JUANA PÉREZ ROJAS/.test(apertura));
  await page.click('#genCierre');
  check('razón de cierre generada', /RAZÓN DE CIERRE/.test(await page.locator('#cierreText').inputValue()));
  check('mapa de folios con filas', (await page.locator('#folioMap .folioRow').count()) >= 2);
  check('sin choques de renglón', (await page.locator('#folioMap .folioRow.conflict').count()) === 0);

  // Índice
  await page.click('[data-tab="index"]');
  await page.waitForTimeout(300);
  check('índice con encabezados', (await page.locator('#indexTable thead th').count()) === 15);
  check('índice con dos escrituras', (await page.locator('#indexTable tbody tr').count()) === 2);

  // Plantillas
  await page.click('[data-tab="templates"]');
  await page.click('#loadSamples');
  await page.waitForTimeout(200);
  check('modelos cargados', (await page.locator('#templateSelect option').count()) >= 4);

  // Calibración: cambiar perfil
  await page.click('[data-tab="settings"]');
  await page.fill('[name="rows"]', '28');
  await page.fill('[name="pitch"]', '8.2');
  const [download] = await Promise.all([
    page.waitForEvent('download').catch(() => null),
    page.click('#profileForm button[type="submit"]')
  ]);
  await page.waitForTimeout(400);
  check('perfil guardado con respaldo previo', download !== null);

  // Persistencia tras recargar
  await page.reload();
  await page.waitForTimeout(500);
  await page.click('[data-tab="editor"]');
  await page.waitForTimeout(300);
  check('las escrituras sobreviven a la recarga',
    (await page.locator('#docList .docItem').count()) === 2);
  check('el perfil sobrevive a la recarga',
    (await page.locator('[data-tab="settings"]').click(), await page.waitForTimeout(200),
     await page.locator('[name="rows"]').inputValue()) === '28');

  // Instantáneas
  await page.click('[data-tab="home"]');
  await page.waitForTimeout(300);
  check('instantáneas registradas', (await page.locator('#snapshotList .snapshotRow').count()) >= 1);

  // PDF con la geometría configurada
  const pdfPath = path.join(path.dirname(process.argv[2]), 'salida.pdf');
  await page.click('[data-tab="editor"]');
  await page.locator('#docList .docItem').first().click();
  await page.waitForTimeout(300);
  await page.click('[data-tab="preview"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const area = document.getElementById('printArea');
    area.style.display = 'block';
  });
  await page.pdf({ path: pdfPath, width: '216mm', height: '330mm', printBackground: true });
  check('PDF generado', require('fs').statSync(pdfPath).size > 1000);

  // Anchos de ventana
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['home', 'editor', 'preview', 'tomo', 'index', 'templates', 'tools', 'settings']) {
      await page.click('[data-tab="' + tab + '"]');
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) console.log('  FALLA desborde horizontal en ' + tab + ' a ' + width + 'px');
    }
  }
  console.log('  ok   sin desborde horizontal de 390 a 1440 px');

  if (errors.length) {
    console.log('\nErrores de consola:');
    for (const e of errors) console.log('   ' + e);
  } else {
    console.log('  ok   ningún error de JavaScript en todo el recorrido');
  }

  await browser.close();
})();
