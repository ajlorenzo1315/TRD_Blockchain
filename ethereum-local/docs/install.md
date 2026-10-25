
## 1. Instalar NVM

Primero comprueba si ya está instalado:

```
command -v nvm
```

Si no devuelve `nvm`, instálalo:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Recarga la terminal:

```
source ~/.bashrc
```

## 2. Instalar Node.js 24

```
nvm install 24
nvm use 24
nvm alias default 24
```

Comprueba las versiones:

```
node --version
npm --version
which node
```

Deberías obtener Node.js `v24.x.x` y una ruta que contenga `.nvm/versions/node/`.

## 3. Crear el proyecto Ethereum local

Dentro de tu repositorio de CryptoZombies:

```
mkdir -p ethereum-local
cd ethereum-local

npx hardhat --init
```

Cuando aparezca el asistente, selecciona un proyecto TypeScript con pruebas Node.js y Viem, si está disponible.

Después:

```
npx hardhat compile
```

## 4. Iniciar la blockchain

Abre una terminal y ejecuta:

```
npx hardhat node
```

Deberías ver el nodo funcionando en `http://127.0.0.1:8545`, con cuentas Ethereum de prueba.

Configuración que vamos a utilizar

| Parámetro        | Valor               |
| ---------------- | ------------------- |
| Node.js          | 24 LTS              |
| Hardhat          | 3.x                 |
| Solidity moderno | 0.8.20              |
| Red              | Ethereum local      |
| Chain ID         | 31337               |
| RPC              | `127.0.0.1:8545`    |
| ETH              | Ficticio, sin coste |

## 5. Una decisión importante para CryptoZombies

Los contratos originales de CryptoZombies utilizan versiones antiguas de Solidity. Para reproducir las seis lecciones correctamente, mantendremos dos variantes:

- Original: código histórico de CryptoZombies, con el compilador correspondiente a cada lección.
- Moderna: contratos adaptados a Solidity 0.8.x, ejecutados y probados en Hardhat.

Así podrás demostrar tanto el aprendizaje del curso original como su funcionamiento en un entorno Ethereum actual.

Haz primero los pasos 1 y 2 y pásame la salida de:

```
node --version
npm --version
npx hardhat --version
```

Con eso continuamos creando y probando el contrato `ZombieFactory` en tu propia blockchain local.