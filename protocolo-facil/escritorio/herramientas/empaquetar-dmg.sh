#!/bin/bash
# Arma un .dmg por arquitectura con la presentación habitual de macOS:
# la aplicación y un acceso a Aplicaciones, para arrastrar una sobre el otro.
#
# La imagen se construye en formato ISO 9660 con extensiones Rock Ridge, que
# conservan permisos de ejecución y enlaces simbólicos. macOS monta este
# formato igual que un .dmg propio (es el mismo que hdiutil llama UDTO).
# No se usa HFS+ porque escribir una imagen HFS+ exige montarla, y este
# equipo de construcción no tiene ese sistema de archivos.
#
# La aplicación debe venir YA FIRMADA ad-hoc: este guion no firma.
#
#   bash herramientas/empaquetar-dmg.sh ../dist-app 0.4.0

set -euo pipefail

DIST="${1:-../dist-app}"
VERSION="${2:-0.4.0}"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
APP="Protocolo Facil.app"

if ! command -v xorriso >/dev/null 2>&1; then
    echo "Falta xorriso." >&2
    exit 1
fi

armar() {
    local carpeta="$1" arquitectura="$2"
    local origen="$DIST/$carpeta"

    if [ ! -d "$origen/$APP" ]; then
        echo "   omitido $arquitectura: no se construyó"
        return 0
    fi

    # La firma ad-hoc es obligatoria: sin ella macOS no ejecuta en Apple Silicon.
    if command -v rcodesign >/dev/null 2>&1; then
        if ! rcodesign print-signature-info "$origen/$APP/Contents/MacOS/Protocolo Facil" 2>/dev/null \
             | grep -q "ADHOC"; then
            echo "   $arquitectura no está firmado ad-hoc: firmalo antes de armar el .dmg" >&2
            return 1
        fi
    fi

    echo "==> Imagen de disco para $arquitectura"
    local etapa="$DIST/stage-dmg-$arquitectura"
    rm -rf "$etapa"
    mkdir -p "$etapa"
    cp -R "$origen/$APP" "$etapa/$APP"
    ln -s /Applications "$etapa/Aplicaciones"
    cp "$AQUI/mac/LEEME-PRIMERO.txt" "$etapa/" 2>/dev/null || true

    local destino="$DIST/ProtocoloFacil-$VERSION-mac-$arquitectura.dmg"
    rm -f "$destino"
    xorriso -as mkisofs \
        -V "Protocolo Facil" \
        -r -J -joliet-long \
        -o "$destino" \
        "$etapa" >/dev/null 2>&1

    rm -rf "$etapa"
    echo "   $destino ($(du -h "$destino" | cut -f1))"
}

armar "mac-arm64" "arm64"
armar "mac" "x64"

echo
echo "Imágenes de disco listas."
