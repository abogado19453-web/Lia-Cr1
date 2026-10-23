#!/bin/bash
# Construye la aplicación de escritorio y sus instaladores.
#
#   bash construir-aplicacion.sh            todo lo que el equipo permita
#   bash construir-aplicacion.sh win        sólo Windows
#   bash construir-aplicacion.sh mac        sólo macOS
#
# Resultado en dist-app/:
#   Instalar-ProtocoloFacil-<version>.exe              instalador de Windows
#   ProtocoloFacil-<version>-mac-arm64-instalador.zip  Mac con Apple Silicon
#   ProtocoloFacil-<version>-mac-x64-instalador.zip    Mac con procesador Intel
#
# Requisitos para construir (no para usar la aplicación):
#   Node y npm                      siempre
#   wine                            sólo para el instalador de Windows desde Linux
#   rcodesign (apple-codesign)      sólo para firmar ad-hoc los paquetes de Mac
#   python3 con Pillow              sólo para regenerar los iconos
set -euo pipefail

cd "$(dirname "$0")"
OBJETIVO="${1:-todo}"
APP="escritorio"
VERSION="$(node -p "require('./$APP/package.json').version")"

echo "==> Protocolo Fácil $VERSION"

if [ ! -d "$APP/node_modules" ]; then
  echo "==> Instalando dependencias de construcción"
  ( cd "$APP" && npm install --no-audit --no-fund )
fi

echo "==> Comprobando sintaxis"
for f in app/engine.js app/notarial.js app/store.js app/ui.js \
         "$APP"/src/main.js "$APP"/src/preload.js; do
  node --check "$f"
done
bash -n "$APP/mac/Instalar en Mac.command"
bash -n "$APP/herramientas/empaquetar-mac.sh"

echo "==> Pruebas del núcleo"
node pruebas/engine.test.cjs
node pruebas/notarial.test.cjs
node pruebas/store.test.cjs
node pruebas/paginacion.test.cjs

echo "==> Preparando la interfaz"
( cd "$APP" && node herramientas/preparar.cjs )

if [ ! -f "$APP/build/icon.ico" ] || [ ! -f "$APP/build/icon.icns" ]; then
  echo "==> Generando los iconos"
  ( cd "$APP" && python3 -I herramientas/icono.py build )
fi

construir_windows() {
  if ! command -v wine >/dev/null 2>&1 && [ "$(uname)" != "MINGW64_NT" ]; then
    echo "   omitido Windows: falta wine (en Windows o macOS con wine no hace falta)"
    return 0
  fi
  echo "==> Instalador de Windows"
  ( cd "$APP" && npx electron-builder --win --x64 --publish never )
}

construir_mac() {
  echo "==> Paquetes de macOS"
  ( cd "$APP" && npx electron-builder --mac --x64 --arm64 --publish never )
  if command -v rcodesign >/dev/null 2>&1 || command -v codesign >/dev/null 2>&1; then
    bash "$APP/herramientas/empaquetar-mac.sh" dist-app "$VERSION"
  else
    echo "   sin rcodesign: los ZIP quedan SIN FIRMA y no abrirán en Apple Silicon"
  fi
}

case "$OBJETIVO" in
  win) construir_windows ;;
  mac) construir_mac ;;
  todo) construir_windows; construir_mac ;;
  *) echo "Objetivo desconocido: $OBJETIVO (usá win, mac o todo)" >&2; exit 1 ;;
esac

echo
echo "Entregables en dist-app/:"
ls -lh dist-app/*.exe dist-app/*instalador.zip 2>/dev/null | sed 's/^/   /' || true
echo
echo "Ninguno lleva firma Developer ID de Apple ni certificado de Windows:"
echo "SmartScreen y Gatekeeper van a advertir en la primera apertura."
