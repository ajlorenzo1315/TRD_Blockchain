# CryptoZombies: página única Hardhat local

El frontend no tiene pestañas ni ejecuta scrollTo. La previsualización está a la derecha de los seis controles de ADN en escritorio. El ABI de `contract-config.js` incluido contiene `createRandomZombie`.

## Instalación

1. Reemplaza `frontend/lesson-06-extended` por esta carpeta.
2. Inicia `npx hardhat node --hostname 127.0.0.1 --port 8545` desde la raíz del proyecto.
3. Despliega: `npx hardhat run scripts/lesson6-extended/deploy-lesson-06.ts --network localhost`.
4. Regenera el ABI y dirección con la dirección **actual** del despliegue:
   `node frontend/lesson-06-extended/ACTUALIZAR-CONTRATO.mjs 0xDIRECCION`
5. Inicia `python3 -m http.server 8080 --directory frontend/lesson-06-extended/` y visita `http://localhost:8080/`.
6. Recarga con Ctrl+Shift+R. En consola, verifica `window.LESSON6_ABI.some(x=>x.name==='createRandomZombie')` (debe ser `true`).
7. Pulsa «Usar cuenta de prueba Hardhat».

**Nota:** Las cuentas de prueba están desbloqueadas y el RPC no debe exponerse a Internet. Los genes del editor son previsualización: `createRandomZombie` crea ADN aleatorio en Solidity.
