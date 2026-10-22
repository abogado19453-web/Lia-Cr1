#!/bin/bash
set -euo pipefail
pf_root="$(cd "$(dirname "$0")" && pwd)"
exec "$pf_root/ProtocoloFacil.app/Contents/MacOS/ProtocoloFacil"
