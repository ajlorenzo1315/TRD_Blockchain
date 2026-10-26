# Demo Hardhat local: múltiples cuentas sin modificar Solidity

Este paquete **no incluye modificaciones de contratos Solidity**. El contrato original permite `createRandomZombie` una vez por cuenta (`ownerZombieCount[msg.sender] == 0`).

1. Ejecuta `npx hardhat node --hostname 127.0.0.1 --port 8545`.
2. Despliega el contrato original con `npx hardhat run scripts/lesson6-extended/deploy-lesson-06.ts --network localhost`.
3. Actualiza ABI y dirección con `node frontend/lesson-06-extended/ACTUALIZAR-CONTRATO.mjs DIRECCION_DESPLEGADA`.
4. Sirve la carpeta con `python3 -m http.server 8080 --directory frontend/lesson-06-extended/`.
5. Pulsa «Usar cuenta de prueba Hardhat» y selecciona Cuenta #0 para crear el primer zombi.
6. Cambia el selector a Cuenta #1; el frontend cambiará automáticamente la cuenta activa y refrescará «Mi ejército». Crea otro zombi. Repite con otras cuentas.
7. Para combatir, selecciona Cuenta #0 y ataca el ID del zombi de Cuenta #1.

Las cuentas de Hardhat están desbloqueadas y solo deben usarse en el nodo local, nunca en un RPC expuesto a Internet. El contrato original puede permitir crear más zombis mediante otras funciones de juego, pero no mediante sucesivas llamadas a `createRandomZombie` de la misma cuenta.
