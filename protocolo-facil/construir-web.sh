#!/bin/bash
# Arma la versión sin instalar: la aplicación entera en un archivo .html que
# se abre con doble clic en cualquier navegador.
#
# Esta versión guarda en el almacenamiento del navegador, no en archivos del
# disco. Sirve para probar el programa o para una máquina prestada; para uso
# diario está la aplicación de escritorio (construir-aplicacion.sh).
#
#   bash construir-web.sh
set -euo pipefail

cd "$(dirname "$0")"
VERSION="$(node -p "require('./escritorio/package.json').version")"

echo "==> Comprobando sintaxis"
for f in app/engine.js app/notarial.js app/store.js app/ui.js; do
  node --check "$f"
done

echo "==> Pruebas"
node pruebas/engine.test.cjs
node pruebas/notarial.test.cjs
node pruebas/store.test.cjs
node pruebas/paginacion.test.cjs

echo "==> Generando el archivo único"
node herramientas/empaquetar-html.cjs "dist/ProtocoloFacil-$VERSION.html"

echo
echo "Listo. Abrí dist/ProtocoloFacil-$VERSION.html con doble clic."
