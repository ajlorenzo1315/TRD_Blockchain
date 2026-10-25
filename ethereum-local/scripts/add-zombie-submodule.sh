#!/usr/bin/env bash
set -euo pipefail
# Ejecutar desde la raíz del repositorio git que contiene ethereum-local.
# Este script registra el código externo como submódulo, no copia ni relicencia imágenes.
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then echo 'Ejecuta el script dentro de un repositorio Git'; exit 1; fi
TARGET='external/zombie-char-component'
if [[ -e "$TARGET" ]]; then
  echo "Ya existe $TARGET; no se modifica. Comprueba git submodule status."
else
  git submodule add https://github.com/loomnetwork/zombie-char-component.git "$TARGET"
fi
git submodule update --init --recursive
printf '\nSubmódulo registrado. Revisa las licencias de imágenes antes de integrarlas.\n'
