#!/usr/bin/env bash
# Respaldo de LexCR en un disco de red (AirPort Time Capsule) o externo.
# Copia: código, base de datos (copia consistente), documentos subidos y configuración (.env).
# No copia node_modules ni .next (se regeneran al iniciar).
# Uso: bash respaldar.sh [carpeta_destino]
set -euo pipefail
cd "$(dirname "$0")"
ORIGEN="$(pwd)"
CONSERVAR="${LEXCR_RESPALDOS_A_CONSERVAR:-10}"

echo "== Respaldo de LexCR =="
[ -f package.json ] && [ -d prisma ] || { echo "Ejecute este archivo desde la carpeta LexCR."; exit 1; }

# 1. Destino: argumento o selección entre los discos montados (/Volumes)
DESTINO_BASE="${1:-}"
if [ -z "$DESTINO_BASE" ]; then
  VOLS=()
  if [ -d /Volumes ]; then
    while IFS= read -r v; do
      [ "$v" = "Macintosh HD" ] && continue
      [ -w "/Volumes/$v" ] && VOLS+=("/Volumes/$v")
    done < <(ls /Volumes)
  fi
  if [ ${#VOLS[@]} -eq 0 ]; then
    echo
    echo "No hay ningún disco de red o externo conectado."
    echo "Para conectar la Time Capsule: en el Finder, menú Ir → Conectarse al servidor (Cmd+K),"
    echo "escriba  smb://NOMBRE-DE-SU-TIME-CAPSULE.local  (o búsquela en Red, en la barra lateral),"
    echo "ingrese la contraseña del disco y vuelva a ejecutar este respaldo."
    exit 1
  fi
  echo
  echo "Discos disponibles:"
  for i in "${!VOLS[@]}"; do echo "  $((i+1)). ${VOLS[$i]}"; done
  read -r -p "Número del disco donde respaldar [1]: " n
  n="${n:-1}"
  [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge 1 ] && [ "$n" -le ${#VOLS[@]} ] || { echo "Opción inválida."; exit 1; }
  DESTINO_BASE="${VOLS[$((n-1))]}"
fi

RAIZ="$DESTINO_BASE/Respaldos LexCR"
SELLO="$(date +%Y-%m-%d_%H%M%S)"
DEST="$RAIZ/LexCR_$SELLO"
mkdir -p "$DEST"
echo
echo "Destino: $DEST"

# 2. Base de datos: copia consistente aunque LexCR esté en uso
mkdir -p "$DEST/prisma"
if [ -f prisma/dev.db ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 prisma/dev.db ".backup '$DEST/prisma/dev.db'"
    INTEG="$(sqlite3 "$DEST/prisma/dev.db" 'PRAGMA integrity_check;')"
    [ "$INTEG" = "ok" ] || { echo "La copia de la base de datos no superó la verificación: $INTEG"; exit 1; }
    echo "  Base de datos copiada y verificada."
  else
    cp -p prisma/dev.db "$DEST/prisma/dev.db"
    echo "  Base de datos copiada (sin sqlite3 para verificarla; cierre LexCR antes de respaldar)."
  fi
else
  echo "  Aviso: no hay base de datos todavía (prisma/dev.db)."
fi

# 3. Proyecto, documentos y configuración
rsync -a \
  --exclude node_modules --exclude .next --exclude 'prisma/dev.db' --exclude 'prisma/dev.db-journal' --exclude 'prisma/dev.db-wal' --exclude 'prisma/dev.db-shm' \
  --exclude '*.tsbuildinfo' --exclude '.compilacion.log' --exclude diagnostico.txt --exclude '.DS_Store' \
  "$ORIGEN/" "$DEST/"
echo "  Proyecto, documentos subidos y configuración copiados."

# 4. Resumen y verificación de documentos
N_DOCS=0
[ -d uploads ] && N_DOCS="$(find uploads -type f | wc -l | tr -d ' ')"
N_DOCS_DEST=0
[ -d "$DEST/uploads" ] && N_DOCS_DEST="$(find "$DEST/uploads" -type f | wc -l | tr -d ' ')"
[ "$N_DOCS" = "$N_DOCS_DEST" ] || { echo "Faltan documentos en la copia ($N_DOCS_DEST de $N_DOCS)."; exit 1; }
TAM="$(du -sh "$DEST" | cut -f1)"
cat > "$DEST/RESPALDO.txt" <<INFO
Respaldo de LexCR
Fecha: $(date '+%d/%m/%Y %H:%M')
Equipo: $(hostname)
Origen: $ORIGEN
Documentos subidos: $N_DOCS
Tamaño: $TAM

Contiene la configuración (.env) con la clave de IA y el secreto que descifra las claves
guardadas en la plataforma. Guarde este disco en un lugar seguro.

Para restaurar: copie esta carpeta a la Mac (por ejemplo, a Descargas), cámbiele el nombre a
LexCR y haga doble clic en «Iniciar LexCR.command». Instalará lo necesario y abrirá la plataforma
con todos los datos.
INFO

# 5. Conservar solo los últimos N respaldos
ANTIGUOS="$(ls -1d "$RAIZ"/LexCR_* 2>/dev/null | sort | awk -v k="$CONSERVAR" '{a[NR]=$0} END {for (i = 1; i <= NR - k; i++) print a[i]}')"
if [ -n "$ANTIGUOS" ]; then
  while IFS= read -r a; do [ -n "$a" ] && rm -rf "$a" && echo "  Respaldo antiguo eliminado: $(basename "$a")"; done <<< "$ANTIGUOS"
fi

echo
echo "Respaldo completo: $DEST ($TAM, $N_DOCS documento(s))."
echo "Se conservan los últimos $CONSERVAR respaldos en «Respaldos LexCR»."
