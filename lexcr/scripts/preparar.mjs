// Verifica la versión de Node y crea .env con un secreto aleatorio si no existe.
// Código de salida 1 si Node es demasiado antiguo.
import fs from 'node:fs';
import crypto from 'node:crypto';

const mayor = Number(process.versions.node.split('.')[0]);
if (mayor < 20) {
  console.error(`Se requiere Node.js 20 o superior (tiene ${process.versions.node}). Actualícelo desde https://nodejs.org`);
  process.exit(1);
}
if (!fs.existsSync('.env')) {
  let s = fs.readFileSync('.env.example', 'utf8');
  s = s.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${crypto.randomBytes(32).toString('base64')}"`);
  fs.writeFileSync('.env', s);
  console.log('Configuración local creada (.env).');
  console.log('Para activar la inteligencia artificial, abra el archivo .env y pegue su clave de Anthropic en ANTHROPIC_API_KEY.');
}
