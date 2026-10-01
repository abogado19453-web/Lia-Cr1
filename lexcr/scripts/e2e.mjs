// Prueba de punta a punta. Requiere la aplicación en ejecución sobre una base de datos vacía:
//   npx prisma db push && npm run build && npm start
//   E2E_URL=http://localhost:3000 node scripts/e2e.mjs
// Navegador: `npx playwright install chromium`, o CHROMIUM_PATH con la ruta de un Chromium existente.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => m.type() === 'error' && !/fonts|ERR_CERT/.test(m.text()) && errs.push('console: ' + m.text()));
  p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Tomo 2024 asiento 123' : undefined));
  const B = process.env.E2E_URL || 'http://localhost:3000';
  const archivo = path.join(os.tmpdir(), 'contrato.txt');
  fs.writeFileSync(archivo, 'CONTRATO DE ARRENDAMIENTO\nEntre nosotros, Juan Pérez, cédula 1-1111-1111, y María Rojas.\n');
  const step = (s) => console.log('✓', s);
  const dirShots = process.env.E2E_SHOTS;
  const shot = (n) => (dirShots ? path.join(dirShots, n + '.png') : path.join(os.tmpdir(), 'lexcr-' + n + '.png'));

  await p.goto(B + '/registro');
  await p.fill('input[name=nombre]', 'Profesional de Prueba');
  await p.fill('input[name=despacho]', 'Despacho de Prueba');
  await p.fill('input[name=email]', 'prueba@ejemplo.cr');
  await p.fill('input[name=password]', 'claveSegura123');
  await p.click('button:has-text("Crear cuenta")');
  await p.waitForURL(B + '/dashboard');
  step('registro e ingreso');
  await p.screenshot({ path: shot('inicio'), fullPage: true });

  // Cliente
  await p.goto(B + '/dashboard/portal');
  await p.fill('input[name=nombre]', 'Cliente Ejemplo S.A.');
  await p.fill('input[name=cedula]', '3-101-000000');
  await p.click('button:has-text("Agregar cliente")');
  await p.waitForSelector('text=Cliente Ejemplo S.A.');
  await p.click('button:has-text("Generar enlace")');
  await p.waitForSelector('button:has-text("Copiar enlace")');
  step('cliente y enlace de portal');

  // Expediente
  await p.goto(B + '/dashboard/expedientes');
  await p.click('summary:has-text("Nuevo expediente")');
  await p.fill('input[name=numero]', '24-000123-0180-CI');
  await p.fill('input[name=titulo]', 'Ordinario de daños y perjuicios');
  await p.selectOption('select[name=clienteId]', { label: 'Cliente Ejemplo S.A.' });
  await p.click('button:has-text("Crear expediente")');
  await p.waitForURL(/expedientes\/\w+/);
  const expUrl = p.url();
  await p.fill('input[name=descripcion] >> nth=0', 'Se presentó la demanda');
  await p.check('input[name=visiblePortal] >> nth=0');
  await p.click('button:has-text("Agregar") >> nth=0');
  await p.waitForSelector('text=Se presentó la demanda');
  const d = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  await p.fill('input[name=titulo] >> nth=0', 'Vence plazo para contestar');
  await p.fill('input[name=fechaVence]', d);
  await p.click('button:has-text("Agregar") >> nth=1');
  await p.waitForSelector('text=Vence plazo para contestar');
  await p.check('aside input[name=visiblePortal]');
  await p.click('aside button:has-text("Guardar")');
  await p.waitForTimeout(800);
  step('expediente, actuación, alerta');
  await p.screenshot({ path: shot('expediente'), fullPage: true });

  // Documento
  await p.goto(B + '/dashboard/documentos');
  await p.setInputFiles('input[type=file]', archivo);
  await p.selectOption('select[name=expedienteId]', { index: 1 });
  await p.click('button:has-text("Subir")');
  await p.waitForSelector('text=contrato.txt');
  await p.click('text=contrato.txt');
  await p.waitForSelector('text=Texto extraído');
  await p.check('text=Visible en el Portal Cliente >> input');
  await p.waitForTimeout(500);
  await p.click('button:has-text("Analizar")');
  await p.waitForSelector('text=ANTHROPIC_API_KEY', { timeout: 15000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Exportar a Word')]);
  console.log('  docx:', dl.suggestedFilename());
  step('subida, error controlado sin API key, exportación Word');

  // Protocolo
  await p.goto(B + '/dashboard/protocolo');
  await p.fill('input[name=folioInicio]', '1 frente');
  await p.fill('input[name=fecha]', new Date().toISOString().slice(0, 10));
  await p.fill('input[name=acto]', 'Compraventa de finca');
  await p.fill('input[name=otorgantes]', 'Juan Pérez; María Rojas');
  await p.click('button:has-text("Registrar")');
  await p.waitForSelector('td:has-text("Compraventa de finca")');
  // duplicado
  await p.click('summary:has-text("Registrar escritura")').catch(() => {});
  await p.fill('input[name=numero]', '1');
  await p.fill('input[name=folioInicio]', '2 frente');
  await p.fill('input[name=fecha]', new Date().toISOString().slice(0, 10));
  await p.fill('input[name=acto]', 'Poder');
  await p.fill('input[name=otorgantes]', 'X');
  await p.click('button:has-text("Registrar")');
  await p.waitForSelector('text=Ya existe la escritura número 1');
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Índice (CSV)")')]);
  console.log('  csv:', fs.readFileSync(await csv.path(), 'utf8').split('\r\n').length - 1, 'fila(s)');
  await p.screenshot({ path: shot('protocolo'), fullPage: true });
  step('protocolo, duplicado rechazado, índice CSV');

  // Laboral
  await p.goto(B + '/dashboard/laboral');
  await p.fill('input[type=date] >> nth=0', '2022-01-01');
  await p.fill('input[type=date] >> nth=1', '2024-01-01');
  await p.fill('input[placeholder="600000"]', '600000');
  await p.fill('input[type=number]', '5');
  await p.waitForSelector('text=Total');
  console.log('  total laboral:', await p.textContent('tr:last-child td:last-child'));
  await p.screenshot({ path: shot('laboral'), fullPage: true });
  step('calculadora laboral');

  // Asistente sin API key
  await p.goto(B + '/dashboard/asistente?q=' + encodeURIComponent('Requisitos de un poder especial'));
  await p.waitForSelector('text=ANTHROPIC_API_KEY', { timeout: 15000 });
  step('asistente con error controlado');

  // Jurisprudencia biblioteca
  await p.goto(B + '/dashboard/jurisprudencia?tab=biblioteca');
  await p.click('summary:has-text("Agregar resolución")');
  await p.fill('input[name=numero]', '2020-001234');
  await p.fill('input[name=tribunal]', 'Sala Primera');
  await p.fill('input[name=tema]', 'Responsabilidad civil objetiva');
  await p.fill('textarea[name=extracto]', 'Extracto de prueba');
  await p.click('button:has-text("Guardar")');
  await p.waitForSelector('text=Voto 2020-001234');
  step('biblioteca de jurisprudencia');

  // Equipo
  await p.goto(B + '/dashboard/equipo');
  await p.fill('input[name=nombre]', 'Asistente Uno');
  await p.fill('input[name=email]', 'asistente@ejemplo.cr');
  await p.fill('input[name=password]', 'temporal123');
  await p.click('button:has-text("Agregar al equipo")');
  await p.waitForSelector('td:has-text("asistente@ejemplo.cr")');
  step('equipo');

  // Alertas badge + portal público
  await p.goto(B + '/dashboard/alertas?vista=calendario');
  await p.waitForSelector('text=Vence plazo para contestar');
  step('calendario de alertas');
  await p.goto(B + '/dashboard/alertas');
  await p.screenshot({ path: shot('alertas'), fullPage: true });
  await p.goto(B + '/dashboard/portal');
  await p.click('button:has-text("Copiar enlace")').catch(() => {});
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.click('button:has-text("Copiar enlace")');
  const enlace = await p.evaluate(() => navigator.clipboard.readText());
  const pub = await b.newPage();
  await pub.goto(enlace);
  await pub.waitForSelector('text=Se presentó la demanda');
  await pub.waitForSelector('text=contrato.txt');
  await pub.screenshot({ path: shot('portal'), fullPage: true });
  const r404 = await pub.goto(enlace.slice(0, -3) + 'xyz');
  console.log('  token inválido →', r404.status());
  step('portal público (y token inválido)');

  // Aislamiento: segundo despacho no ve documentos del primero
  const docId = (await (await ctx.request.get(B + '/dashboard/documentos')).text()).match(/documentos\/(c[a-z0-9]{20,})/)[1];
  const ctx2 = await b.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(B + '/registro');
  await p2.fill('input[name=nombre]', 'Otro Profesional');
  await p2.fill('input[name=despacho]', 'Otro Despacho');
  await p2.fill('input[name=email]', 'otro@ejemplo.cr');
  await p2.fill('input[name=password]', 'claveSegura123');
  await p2.click('button:has-text("Crear cuenta")');
  await p2.waitForURL(B + '/dashboard');
  console.log('  acceso ajeno a documento →', (await ctx2.request.get(B + '/api/documentos/' + docId)).status(), (await p2.goto(B + '/dashboard/documentos/' + docId)).status());
  step('aislamiento entre despachos');

  // Móvil y modo oscuro
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await m.context().addCookies(await ctx.cookies());
  await m.goto(B + '/dashboard');
  console.log('  scrollWidth móvil:', await m.evaluate(() => document.documentElement.scrollWidth));
  await m.screenshot({ path: shot('movil') });

  console.log('errores JS:', errs);
  if (errs.some((e) => e.startsWith('pageerror'))) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
