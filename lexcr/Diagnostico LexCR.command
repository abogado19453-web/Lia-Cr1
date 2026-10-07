#!/usr/bin/env bash
cd "$(dirname "$0")" && node diagnostico.mjs
echo
read -r -p "Presione Enter para cerrar..." _
