# CryptoZombies en Hardhat Local

La dApp funciona sin MetaMask en **Editor visual** y **Arena demo**. La consulta pública de zombis también funciona sin cartera, usando Web3.js y el RPC de Hardhat. **Crear, alimentar, subir nivel y atacar** requieren una cartera para firmar. Nunca introduzcas claves privadas en el frontend.

1. Desde `ethereum-local`: `npx hardhat node --hostname 127.0.0.1 --port 8545` (dejar abierta).
2. En otra terminal: `npx hardhat compile` y `npx hardhat run scripts/lesson6-extended/deploy-lesson-06.ts --network localhost`.
3. Con la dirección del despliegue: `node frontend/lesson-06-extended/ACTUALIZAR-CONTRATO.mjs 0xDIRECCION_REAL`.
4. `python3 -m http.server 8080 --directory frontend/lesson-06-extended/`. Abre `http://localhost:8080/`.
5. Para operaciones reales instala MetaMask en el navegador, activa la extensión, importa **solo** una cuenta de prueba de Hardhat, y pulsa **Conectar MetaMask**. El frontend ofrece agregar/cambiar a la red Hardhat 31337.
6. Si reinicias el nodo, despliega de nuevo y repite el paso 3.

El archivo `contract-config.js` incluido apunta a `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512` (despliegue proporcionado por el usuario); esta dirección solo es válida mientras el nodo actual conserve ese despliegue.

Si el navegador bloquea la carga de Web3.js desde jsDelivr, la consulta pública no estará disponible hasta que Web3 se cargue; las vistas visuales y demo siguen funcionando.
