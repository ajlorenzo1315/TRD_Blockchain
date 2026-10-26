# CryptoZombies · Lección 6 — Laboratorio y Arena por pestañas

## Qué incluye

- **Inicio:** portada con zombi Loom y accesos al juego.
- **Crear zombi:** editor de seis genes con renderizado en tiempo real a partir de 19 capas de imágenes Loom, botón de ADN aleatorio y creación **real** mediante MetaMask.
- **Mi ejército:** colección real de los tokens del usuario.
- **Arena demo:** combate simulado, barras de vida, animación de golpes y personajes Loom.
- **Batalla real:** inspección de rival, representación de ambos zombis, transacción `attack()` y resultado real leído de los contadores del contrato.
- **Mejoras:** subir nivel y alimentar con CryptoKitty, sujetos a las restricciones del contrato.

## Instalación

1. Haz una copia de tu carpeta `frontend/lesson-06-extended` y de tu `contract-config.js` actual.
2. Descomprime este ZIP dentro de `frontend/` del proyecto, de forma que `frontend/lesson-06-extended/index.html` exista.
3. Si has desplegado el contrato en otra dirección, sustituye `contract-config.js` por el que exportaste desde el artefacto compilado **Lesson6ZombieOwnership**.
4. Desde la raíz `ethereum-local` ejecuta:

   ```bash
   python3 -m http.server 8080 --directory frontend/lesson-06-extended/
   ```

5. Abre `http://localhost:8080/` y recarga con `Ctrl+Shift+R`.
6. Para operaciones on-chain, mantén ejecutándose `npx hardhat node` en otra terminal y conecta MetaMask a `http://127.0.0.1:8545`, cadena **31337**. Despliega de nuevo si reinicias el nodo.

## Diferencia importante entre editor y blockchain

El editor permite **previsualizar** cualquier combinación genética. El contrato `createRandomZombie(name)` **genera el ADN en blockchain**, de modo que el botón de creación no almacena el ADN de los deslizadores. Para permitir ADN personalizado on-chain habría que modificar explícitamente la lógica Solidity, cosa que **no se ha hecho**.

La arena demo no envía transacciones. La batalla real **sí** llama a `attack(attackerId, defenderId)` y solo muestra victoria o derrota tras leer los contadores actualizados en el contrato. El progreso visual es animación, no un cálculo de puntos de vida on-chain.

## Imágenes y licencias

Los archivos de `external/zombie-char-component/zombieparts/` proceden del material original de Loom que adjuntaste. `ZombieChar.vue` se incluye como referencia; el frontend utiliza una adaptación a JavaScript y CSS sin requerir Vue. Revisa los derechos de distribución de las imágenes antes de publicar el ZIP o desplegarlo públicamente.

## Diagnóstico

Si falla el editor: revisa la consola para comprobar que `window.Lesson6Core.loomPortrait` es una función y que los PNG responden `200` o `304`. Si MetaMask no reconoce el contrato, revisa la red 31337, la dirección del despliegue y que el nodo siga activo.
