# Combate real y cooldown

El contrato original crea zombis con `readyTime = now + 1 days`. La victoria en `attack()` llama a `feedAndMultiply()`, que exige `_isReady(myZombie)`. Por ello un combate durante cooldown puede revertir sin motivo legible. Esta versión valida el cooldown antes de enviar la transacción y permite avanzar 1 día el tiempo de Hardhat mediante `evm_increaseTime` y `evm_mine`. Solo funciona con el nodo local y no cambia Solidity. No expongas el RPC local a Internet.
