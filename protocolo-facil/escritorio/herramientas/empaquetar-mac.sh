#!/bin/bash
# Firma ad-hoc los paquetes de macOS y arma los ZIP de instalación.
#
# En Apple Silicon macOS no ejecuta binarios que no tengan ninguna firma, de
# modo que la firma ad-hoc no es un adorno: sin ella la aplicación ni siquiera
# arranca. No sustituye a una firma Developer ID ni a la certificación de
# Apple, que requieren una cuenta de desarrollador y un Mac.
#
# Requiere rcodesign (apple-codesign) y zip.
#
#   bash herramientas/empaquetar-mac.sh ../dist 0.4.0

set -euo pipefail

DIST="${1:-../dist-app}"
VERSION="${2:-0.4.0}"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
APP="Protocolo Facil.app"

if ! command -v rcodesign >/dev/null 2>&1; then
    echo "Falta rcodesign. Instalalo desde los binarios de apple-codesign." >&2
    exit 1
fi

firmar_y_empaquetar() {
    local carpeta="$1" arquitectura="$2"
    local ruta="$DIST/$carpeta"

    if [ ! -d "$ruta/$APP" ]; then
        echo "   omitido $arquitectura: no se construyó"
        return 0
    fi

    echo "==> Firma ad-hoc de $arquitectura"
    rcodesign sign "$ruta/$APP" >/dev/null 2>&1

    # Comprobación: el ejecutable principal debe quedar marcado como ADHOC.
    if ! rcodesign print-signature-info "$ruta/$APP/Contents/MacOS/Protocolo Facil" 2>/dev/null \
         | grep -q "ADHOC"; then
        echo "   la firma ad-hoc no quedó aplicada en $arquitectura" >&2
        return 1
    fi

    echo "==> Armando el instalador de $arquitectura"
    local etapa="$DIST/stage-mac-$arquitectura"
    rm -rf "$etapa"
    mkdir -p "$etapa"
    cp -R "$ruta/$APP" "$etapa/$APP"
    cp "$AQUI/mac/Instalar en Mac.command" "$etapa/"
    chmod +x "$etapa/Instalar en Mac.command"
    cp "$AQUI/mac/LEEME-PRIMERO.txt" "$etapa/" 2>/dev/null || true

    local destino="ProtocoloFacil-$VERSION-mac-$arquitectura-instalador.zip"
    rm -f "$DIST/$destino"
    # -y conserva los enlaces simbólicos de los frameworks de Electron.
    ( cd "$etapa" && zip -q -r -y "../$destino" . )
    rm -rf "$etapa"
    echo "   $DIST/$destino"
}

firmar_y_empaquetar "mac-arm64" "arm64"
firmar_y_empaquetar "mac" "x64"

echo
echo "Instaladores de macOS listos."
