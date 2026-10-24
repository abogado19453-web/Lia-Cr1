#!/bin/bash
# Instalador de Protocolo Fácil para macOS.
#
# Copia la aplicación a /Applications y le quita la marca de cuarentena que
# macOS pone a todo lo descargado de internet. La aplicación lleva firma
# ad-hoc, no firma Developer ID de Apple: sin quitar esa marca, Gatekeeper
# la bloquea aunque el programa sea correcto.
#
# No instala nada más, no pide contraseña de administrador y no modifica
# ninguna configuración de seguridad del equipo.

set -euo pipefail

APP="Protocolo Facil.app"
ORIGEN="$(cd "$(dirname "$0")" && pwd)"
DESTINO="/Applications"

echo
echo "  Protocolo Fácil — instalación para macOS"
echo "  ----------------------------------------"
echo

if [ ! -d "$ORIGEN/$APP" ]; then
    echo "  No se encontró «$APP» junto a este instalador."
    echo "  Descomprimí el ZIP completo antes de ejecutarlo y volvé a intentarlo."
    echo
    read -r -p "  Presioná Intro para cerrar. " _
    exit 1
fi

if [ ! -w "$DESTINO" ]; then
    echo "  No se puede escribir en $DESTINO."
    echo "  Instalando en su carpeta personal."
    DESTINO="$HOME/Applications"
    mkdir -p "$DESTINO"
fi

if [ -d "$DESTINO/$APP" ]; then
    echo "  Ya hay una versión instalada en $DESTINO."
    read -r -p "  ¿Reemplazarla? Sus escrituras NO se borran. [s/N] " respuesta
    case "$respuesta" in
        s|S|y|Y) ;;
        *) echo; echo "  Instalación cancelada."; echo; exit 0 ;;
    esac
    rm -rf "$DESTINO/$APP"
fi

echo "  Copiando a $DESTINO…"
cp -R "$ORIGEN/$APP" "$DESTINO/$APP"

echo "  Quitando la marca de cuarentena…"
xattr -dr com.apple.quarantine "$DESTINO/$APP" 2>/dev/null || true

echo
echo "  Listo. La aplicación quedó en:"
echo "     $DESTINO/$APP"
echo
echo "  Tus datos se guardan en archivos dentro de:"
echo "     ~/Library/Application Support/Protocolo Facil/"
echo "  Esa carpeta no se toca al reinstalar ni al actualizar."
echo
echo "  Antes de usar papel de protocolo, imprimí las pruebas de"
echo "  calibración en papel común y comprobá la coincidencia."
echo

read -r -p "  ¿Abrir la aplicación ahora? [S/n] " abrir
case "$abrir" in
    n|N) ;;
    *) open "$DESTINO/$APP" ;;
esac

echo
