#!/usr/bin/env bash
# Arranque local de LexCR para pruebas (macOS o Linux).
# Uso:  bash iniciar.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "== LexCR =="

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Instálelo desde https://nodejs.org (versión LTS) y vuelva a ejecutar este script."
  command -v open >/dev/null && open "https://nodejs.org/es/download"
  exit 1
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Se requiere Node.js 20 o superior (tiene $(node -v)). Actualícelo desde https://nodejs.org"
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creando configuración local (.env)…"
  cp .env.example .env
  secreto="$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
  node -e '
    const fs = require("fs");
    let s = fs.readFileSync(".env", "utf8");
    s = s.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${process.argv[1]}"`);
    fs.writeFileSync(".env", s);
  ' "$secreto"
  echo
  echo "Para usar el Asistente, el Redactor, el Análisis y la Jurisprudencia se necesita una clave de Anthropic"
  echo "(https://console.anthropic.com). Puede pegarla ahora o dejarla en blanco y agregarla luego en el archivo .env."
  read -r -s -p "Clave de Anthropic (Enter para omitir): " clave || true
  echo
  if [ -n "${clave:-}" ]; then
    node -e '
      const fs = require("fs");
      let s = fs.readFileSync(".env", "utf8");
      s = s.replace(/^ANTHROPIC_API_KEY=.*$/m, `ANTHROPIC_API_KEY="${process.argv[1]}"`);
      fs.writeFileSync(".env", s);
    ' "$clave"
    echo "Clave guardada en .env (solo en esta computadora)."
  fi
fi

if [ ! -d node_modules ]; then
  echo "Instalando dependencias (solo la primera vez, unos minutos)…"
  npm install --no-audit --no-fund
fi

echo "Preparando la base de datos…"
npx prisma db push --skip-generate >/dev/null 2>&1 || npx prisma db push --skip-generate
npx prisma generate >/dev/null 2>&1

if [ ! -f .next/BUILD_ID ] || [ -n "$(find src prisma -newer .next/BUILD_ID -type f 2>/dev/null | head -1)" ]; then
  echo "Compilando la aplicación…"
  npm run build > .compilacion.log 2>&1 || { cat .compilacion.log; echo "La compilación falló."; exit 1; }
fi

PUERTO="${PORT:-3000}"
echo
echo "LexCR está en http://localhost:${PUERTO}"
echo "La primera vez, entre a «Registre su despacho» para crear su cuenta."
echo "Para detenerla, presione Ctrl+C en esta ventana."
URL="http://localhost:${PUERTO}/registro"
abrir() {
  # Prefiere Firefox; si no está instalado, usa el navegador predeterminado.
  if [ -d "/Applications/Firefox.app" ]; then open -a Firefox "$URL"
  elif command -v firefox >/dev/null 2>&1; then firefox "$URL" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
  fi
}
( sleep 3; abrir ) &
exec npx next start -p "$PUERTO"
