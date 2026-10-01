// Diagnóstico de LexCR. No muestra la clave: solo su formato.
// Uso: doble clic en «Diagnostico LexCR» o `node diagnostico.mjs`. El resultado se guarda en diagnostico.txt.
import fs from 'node:fs';
import path from 'node:path';

const lineas = [];
const ok = (t) => lineas.push('  [OK]    ' + t);
const mal = (t) => lineas.push('  [FALLA] ' + t);
const info = (t) => lineas.push('          ' + t);
const titulo = (t) => lineas.push('', t);

lineas.push('DIAGNÓSTICO DE LEXCR', `Fecha: ${new Date().toLocaleString('es-CR')}`, `Carpeta: ${process.cwd()}`, `Sistema: ${process.platform} · Node ${process.versions.node}`);

titulo('1. Archivos');
const existe = (f) => fs.existsSync(path.join(process.cwd(), f));
for (const [f, d] of [['package.json', 'proyecto'], ['.env', 'configuración'], ['node_modules', 'dependencias instaladas'], ['.next/BUILD_ID', 'aplicación compilada'], ['prisma/dev.db', 'base de datos']]) {
  existe(f) ? ok(`${d} (${f})`) : mal(`falta ${d} (${f})${f === '.env' || f === 'node_modules' || f === '.next/BUILD_ID' || f === 'prisma/dev.db' ? ' — ejecute «Iniciar LexCR» primero' : ' — esta no es la carpeta LexCR'}`);
}

titulo('2. Configuración (.env)');
const env = {};
if (existe('.env')) {
  for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  const crudo = env.ANTHROPIC_API_KEY ?? '';
  const limpio = crudo.replace(/^["']|["']$/g, '');
  if (!crudo) mal('ANTHROPIC_API_KEY no está en el archivo');
  else if (!limpio) mal('ANTHROPIC_API_KEY está vacía');
  else {
    if (!/^".*"$/.test(crudo) && !/^'.*'$/.test(crudo)) info('Aviso: la clave no está entre comillas (normalmente funciona igual).');
    if (/\s/.test(limpio)) mal('la clave contiene espacios o saltos de línea');
    else if (!limpio.startsWith('sk-ant-')) mal(`la clave no empieza con "sk-ant-" (empieza con "${limpio.slice(0, 3)}…")`);
    else ok(`ANTHROPIC_API_KEY con formato correcto (${limpio.length} caracteres, termina en …${limpio.slice(-4)})`);
  }
  (env.AUTH_SECRET ?? '').replace(/"/g, '').length >= 16 ? ok('AUTH_SECRET definido') : mal('AUTH_SECRET vacío o muy corto');
  info(`Modelo: ${(env.CLAUDE_MODEL || '').replace(/"/g, '') || 'claude-opus-5-5 (predeterminado)'}`);
}

titulo('3. Conexión con Anthropic');
const clave = (env.ANTHROPIC_API_KEY ?? '').replace(/^["']|["']$/g, '').trim();
const modelo = (env.CLAUDE_MODEL || '').replace(/"/g, '') || 'claude-opus-5-5';
if (!clave) info('Omitida: no hay clave.');
else if (!existe('node_modules/@anthropic-ai/sdk')) info('Omitida: faltan dependencias (ejecute «Iniciar LexCR»).');
else {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: clave, maxRetries: 0, timeout: 60_000 });
  const probar = async (nombre, params) => {
    try {
      const r = await client.beta.messages.create({ model: modelo, max_tokens: 64, messages: [{ role: 'user', content: 'Responda solo: listo' }], ...params });
      const t = r.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
      ok(`${nombre}: respondió "${t.slice(0, 40)}" (modelo ${r.model})`);
      return true;
    } catch (e) {
      const estado = e?.status ? `HTTP ${e.status}` : (e?.name ?? 'error');
      mal(`${nombre}: ${estado} — ${String(e?.error?.error?.message ?? e?.message ?? e).slice(0, 300)}`);
      if (e?.status === 401) info('La clave no es válida o fue revocada. Genere otra en console.anthropic.com → API Keys.');
      if (e?.status === 400 && /credit|billing|balance/i.test(String(e?.message))) info('La cuenta no tiene saldo. Recárguela en console.anthropic.com → Billing.');
      if (e?.status === 404) info('El modelo no está disponible para esta cuenta. Pruebe CLAUDE_MODEL="claude-sonnet-5-5" en .env.');
      if (e?.status === 429) info('Límite de uso alcanzado; espere unos minutos.');
      if (!e?.status) info('Sin conexión con api.anthropic.com: revise internet, antivirus o firewall.');
      return false;
    }
  };
  await probar('Consulta básica', {});
  await probar('Consulta con respaldo ante rechazos', { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
}

titulo('4. Servidor local');
try {
  const r = await fetch('http://localhost:3000/ingresar', { signal: AbortSignal.timeout(3000) });
  ok(`LexCR responde en http://localhost:3000 (HTTP ${r.status})`);
} catch {
  info('LexCR no está corriendo en este momento (normal si la ventana de «Iniciar LexCR» está cerrada).');
}

const texto = lineas.join('\n');
console.log(texto);
fs.writeFileSync('diagnostico.txt', texto + '\n');
console.log('\nResultado guardado en diagnostico.txt (no contiene la clave). Envíe una captura de esta ventana o ese archivo.');
