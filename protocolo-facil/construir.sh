#!/bin/bash
# Arma la entrega: pruebas, paquete .app para Mac, archivo único portable y ZIP.
#
#   bash construir.sh
#
# Resultado en dist/:
#   ProtocoloFacil-Mac-0.3.0.zip   paquete completo para Mac
#   ProtocoloFacil-0.3.0.html      un solo archivo, se abre con doble clic
set -euo pipefail

cd "$(dirname "$0")"
VERSION="0.3.0"
APP="app"
DIST="dist"
STAGE="$DIST/ProtocoloFacil-Mac"

echo "==> Comprobando sintaxis"
for f in "$APP"/engine.js "$APP"/notarial.js "$APP"/store.js "$APP"/ui.js; do
  node --check "$f"
done
bash -n mac/ProtocoloFacil.app/Contents/MacOS/ProtocoloFacil
bash -n mac/Abrir-ProtocoloFacil.command

echo "==> Ejecutando pruebas"
node pruebas/engine.test.cjs
node pruebas/notarial.test.cjs
node pruebas/store.test.cjs
node pruebas/paginacion.test.cjs

echo "==> Armando el paquete para Mac"
rm -rf "$DIST"
mkdir -p "$STAGE"
cp -R mac/ProtocoloFacil.app "$STAGE/ProtocoloFacil.app"
cp mac/Abrir-ProtocoloFacil.command "$STAGE/"
mkdir -p "$STAGE/ProtocoloFacil.app/Contents/Resources"
cp "$APP"/index.html "$APP"/style.css "$APP"/engine.js "$APP"/notarial.js "$APP"/store.js "$APP"/ui.js \
   "$STAGE/ProtocoloFacil.app/Contents/Resources/"
cp LEEME.md VALIDACION.md CAMBIOS.md "$STAGE/" 2>/dev/null || true
cp -R pruebas "$STAGE/pruebas"
chmod +x "$STAGE/ProtocoloFacil.app/Contents/MacOS/ProtocoloFacil" "$STAGE/Abrir-ProtocoloFacil.command"

echo "==> Generando el archivo único portable"
node herramientas/empaquetar-html.cjs "$DIST/ProtocoloFacil-$VERSION.html"

echo "==> Comprimiendo"
( cd "$DIST" && zip -q -r "ProtocoloFacil-Mac-$VERSION.zip" "ProtocoloFacil-Mac" )

echo
echo "Listo:"
ls -lh "$DIST" | sed 's/^/   /'
