#!/usr/bin/env bash
set -euo pipefail
npx hardhat compile
npx hardhat test nodejs test/lesson-06/ZombieFrontend.ts
node --test test/lesson-06/Frontend.test.cjs
