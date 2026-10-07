// Espera a que LexCR responda y la abre en Firefox (o en el navegador predeterminado).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const url = process.argv[2] || 'http://localhost:3000/registro';
const lanzar = (cmd, args) => {
  const p = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: false });
  p.on('error', () => console.log(`Abra en su navegador: ${url}`));
  p.unref();
};

for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    if (r.status < 500) break;
  } catch {}
  await new Promise((ok) => setTimeout(ok, 1000));
}

if (process.platform === 'win32') {
  const rutas = [
    `${process.env.ProgramFiles}\\Mozilla Firefox\\firefox.exe`,
    `${process.env['ProgramFiles(x86)']}\\Mozilla Firefox\\firefox.exe`,
  ];
  const ff = rutas.find((r) => r && fs.existsSync(r));
  if (ff) lanzar(ff, [url]);
  else lanzar('cmd', ['/c', 'start', '', url]);
} else if (process.platform === 'darwin') {
  if (fs.existsSync('/Applications/Firefox.app')) lanzar('open', ['-a', 'Firefox', url]);
  else lanzar('open', [url]);
} else {
  lanzar('xdg-open', [url]);
}
