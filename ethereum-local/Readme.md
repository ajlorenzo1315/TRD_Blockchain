## Crear la red Ethereum paso a paso

### Opciones disponibles

| Herramienta     | Características                             | Recomendación                        |
| --------------- | ------------------------------------------- | ------------------------------------ |
| Hardhat         | Red local, pruebas, depuración y despliegue | Mejor para tu práctica               |
| Ganache         | Blockchain local orientada a desarrollo     | Útil para proyectos Truffle antiguos |
| Anvil (Foundry) | Nodo Ethereum local rápido y ligero         | Excelente alternativa                |
| Geth            | Cliente Ethereum completo                   | Excesivo para esta tarea             |

Para ejecutar el código histórico sin modificaciones, puede convenir usar versiones antiguas de Solidity y Truffle en un entorno separado. Para tu implementación con Solidity 0.8.20, Hardhat es una opción más práctica.

### Paso 1. Comprobar Node.js

En tu terminal WSL:

```bash
node --version
npm --version
```

```bash
me
node --version
v18.19.1
npm --version
9.2.0
```

Hardhat 3 requiere Node.js 22.13.0 o superior.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://hardhat.org&sz=32)

Hardhat 3

### Paso 2. Inicializar Hardhat

Desde la carpeta de tu proyecto CryptoZombies:

```
mkdir -p ethereum-local
cd ethereum-local

npx hardhat --init --template node-test-runner-viem
```

Este comando crea la configuración, dependencias y estructura de pruebas de Hardhat 3.&#x20; [![Hardhat](https://www.google.com/s2/favicons?domain=hardhat.org&sz=32)](https://hardhat.org)

### Paso 3. Añadir contracts

Copia el contrato Solidity que desarrollamos anteriormente a la carpeta `contracts` del nuevo proyecto:

```
cp ../contracts/lesson-01/ZombieFactory.sol \
   contracts/ZombieFactory.sol
```

Compila:

```
npx hardhat compile
```

### Paso 4. Arrancar la blockchain local

En la primera terminal:

```
npx hardhat node
```

La red quedará accesible en:

Nodo Ethereum local

Desarrollo

JSON-RPC

[http://127.0.0.1:8545](http://127.0.0.1:8545?utm_source=chatgpt.com)

Chain ID

31337

Moneda

ETH de prueba

Hardhat genera cuentas de desarrollo con fondos ficticios. No necesitas comprar Ethereum.&#x20;

[![Hardhat](https://www.google.com/s2/favicons?domain=https://v2.hardhat.org&sz=32)](https://hardhat.org)

v2.hardhat.org

En una segunda terminal, comprueba que el nodo responde:

```
curl -s http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_blockNumber",
    "params":[],
    "id":1
  }'
```

El resultado debería tener una estructura similar a:

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x0"
}
```

`0x0` significa bloque cero. El número aumentará cuando se produzcan nuevos bloques.

## 3. Desplegar ZombieFactory en la red

Crea el archivo `ignition/modules/ZombieFactory.ts`:

```

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ZombieFactoryModule", (m) => {
  const zombieFactory = m.contract("ZombieFactory");

  return { zombieFactory };
});

```

Con la primera terminal ejecutando el nodo, abre otra terminal y ejecuta:

```
npx hardhat ignition deploy \
  ignition/modules/ZombieFactory.ts \
  --network localhost
```

Hardhat Ignition desplegará el contrato y mostrará su dirección Ethereum.&#x20;
[![Hardhat](https://www.google.com/s2/favicons?domain=hardhat.org&sz=32)](https://hardhat.org)

Hardhat 3

## 4. Conectar Remix a tu blockchain

[Part 2: Reading Smart Contract Data with web3.py — Your First Contract Interaction (No Faucets Needed!) | by Divineigbinoba | Medium](https://images.openai.com/static-rsc-4/sI0k0MvwyFJ4crzoRn_ChP98Rez-HAMHKsPVRpBdplSRl9vjBpRJlWVFDkg9yeuZm9WUYPZ6n1M4kMF6RkiAJHhLhsxfGQoYReH0QnGw5dyEeGbXWOPg3lk2HgXAI5HOGOfa2pl4DGOcdgQS45VDYkIYVCZrzCD0ta8hPb9lDWg?purpose=inline)

[medium.com](https://medium.com/%40divineigbinoba23/part-2-reading-smart-contract-data-with-web3-py-5e24b00d2943?utm_source=chatgpt.com)

En Remix:

1. Abre [Remix IDE](https://remix.ethereum.org/?utm_source=chatgpt.com).
2. Entra en Deploy & Run Transactions.
3. Selecciona el entorno `External HTTP Provider` (o su equivalente en la versión actual).
4. Introduce `http://127.0.0.1:8545`.
5. Comprueba que estás conectado a la red local.
6. Compila el mismo contrato y utiliza At Address con la dirección desplegada para interactuar con él.

Si Remix no permite conectar directamente al nodo por restricciones del navegador, podemos utilizar un script local con Viem.

## 5. Qué vamos a demostrar en la práctica

Con esta red podrás realizar pruebas que no dependen de la página original de CryptoZombies:

- Desplegar contratos inteligentes reales.
- Crear zombis mediante transacciones.
- Consultar el almacenamiento de la blockchain.
- Observar los eventos `NewZombie`.
- Comprobar el gas consumido.
- Ejecutar pruebas automáticas y documentar sus resultados.
- En lecciones posteriores, simular transferencias de zombis entre distintas cuentas.

Una precisión importante: esta red no reproduce el mecanismo de consenso de Ethereum mainnet ni HotStuff. Hardhat simula la ejecución EVM y el procesamiento de bloques, que es precisamente lo que necesitamos para verificar los contratos de CryptoZombies.

Además, el código antiguo de las lecciones puede requerir compiladores Solidity históricos. No debemos mezclar contratos `^0.4.x` con contratos `^0.8.x` sin adaptar las versiones.

Mi recomendación es que ahora ejecutes:

```
node --version
npm --version
npx hardhat --version
```

Y me pases la salida. A partir de ahí configuraremos el entorno para que puedas ejecutar tanto las soluciones originales de CryptoZombies como tu implementación propia, con pruebas y evidencias para entregar al profesor.
