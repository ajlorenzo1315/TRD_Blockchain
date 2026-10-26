# CryptoZombies — Lección 6 · Solo Hardhat local

## Instalación

1. Copia la carpeta `lesson-06-extended` dentro de `ethereum-local/frontend/`.
2. Inicia el nodo desde la raíz del repositorio: `npx hardhat node --hostname 127.0.0.1 --port 8545`. Mantén esa terminal abierta.
3. Si el contrato no existe en la dirección configurada, despliega: `npx hardhat run scripts/lesson6-extended/deploy-lesson-06.ts --network localhost`.
4. Genera el ABI y la dirección de **este frontend**: `node frontend/lesson-06-extended/ACTUALIZAR-CONTRATO.mjs DIRECCION_RECIEN_DESPLEGADA`.
5. Ejecuta: `python3 -m http.server 8080 --directory frontend/lesson-06-extended/`. Abre `http://localhost:8080/`.
6. Opcional: para firmar desde MetaMask instala MetaMask, selecciona RPC `http://127.0.0.1:8545`, cadena `31337` e importa **solo una cuenta de prueba** que muestra Hardhat.

## Pestañas

- Inicio: estado de Hardhat y acceso a las actividades.
- Crear zombi: controles a la izquierda y personaje Loom a la derecha; crear NFT on-chain con `createRandomZombie` requiere MetaMask. El ADN de los sliders **no** se envía a `createRandomZombie`.
- Mi ejército: NFTs de la cuenta conectada y consulta pública sin MetaMask.
- Arena demo: animación local sin transacciones.
- Batalla real: dos zombis de cuentas distintas, `attack` on-chain, comparación de estadísticas y animación.
- Mejoras: subir nivel, cambiar nombre, cambiar ADN, aprobar y transferir NFTs (respetan permisos y niveles del contrato).

## Limitaciones importantes

- Sin MetaMask puedes usar **Usar cuenta de prueba Hardhat**: el nodo local desbloqueado firma y ejecuta las transacciones con ETH ficticio. No expongas el RPC a Internet ni uses claves reales. Para firmar con tu propia cartera, conecta MetaMask.
- `changeName` requiere nivel 2; `changeDna` requiere nivel 20 según el contrato clásico.
- `levelUp` puede tener una tarifa diferente: el frontend usa 0.001 ETH como valor del ejercicio; verifica `levelUpFee` en tu contrato si la modificaste.
- Si reinicias Hardhat sin persistencia, los zombis y el contrato desaparecen. Despliega de nuevo y actualiza la dirección.
- El componente gráfico utiliza las capas PNG de Loom incluidas. Los fondos decorativos exactos de la web original no forman parte de estos recursos.
- Los mensajes 304 de PNG son normales.

## Verificaciones

`grep -n 'createRandomZombie' frontend/lesson-06-extended/contract-config.js`

`curl -s http://127.0.0.1:8545 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`

**No usar cuentas con fondos reales ni conectar el frontend a una red pública.**
