#!/usr/bin/env bash
set -e

echo "=== COMPILACIÓN SOLIDITY ==="
npm run compile

echo "=== TESTS HARDHAT ==="
npm test

echo "=== CATÁLOGO V0-V3 ==="
npm run test:catalog

echo "=== BENCHMARK GAS ==="
npm run gas:csv

echo "=== COMPILACIÓN TRUFFLE ==="
npm run truffle:compile

echo "=== BUILD FRONTEND ==="
npm run frontend:build

echo "=== LINT FRONTEND ==="
npm --prefix frontend run lint

echo "=== TODAS LAS COMPROBACIONES SUPERADAS ==="