# CryptoZombies — Lección 5: ERC-721, propiedad y SafeMath

> **Objetivo:** comprender paso a paso cómo los zombis de las lecciones anteriores pasan a ser tokens no fungibles que se pueden transferir y cómo se protegen operaciones aritméticas en Solidity `^0.4.25`.
>
> **Criterio de fidelidad:** se conserva la lógica del capítulo 13 oficial, incluso sus limitaciones; solo se renombran identificadores de contratos, bibliotecas e imports para evitar conflictos con otras lecciones, y se añaden comentarios explicativos. El archivo `5.rar` aportado contiene los capítulos en español y versiones parciales del código, no la implementación final completa.

## 1. Qué cambia con respecto a la Lección 4

Hasta la Lección 4, un zombi era un elemento de un array asociado a una dirección mediante `zombieToOwner`. El contrato permitía crearlo, alimentarlo, subirlo de nivel y combatir, pero no ofrecía una interfaz normalizada para intercambiarlo con otras aplicaciones.

La Lección 5 introduce **ERC-721**, un estándar de **tokens no fungibles (NFT)**. Cada zombi es único porque posee un identificador entero (`tokenId`), que coincide con su índice en el array `zombies`. Dos tokens distintos no son intercambiables como si fueran una misma unidad de moneda: pueden tener diferente ADN, nivel y estadísticas.

| Lección | Conceptos principales                                        | Qué reutilizamos                            |
| ------- | ------------------------------------------------------------ | ------------------------------------------- |
| 1       | `struct`, array, mappings, ADN, eventos                      | `Zombie`, `zombies`, `NewZombie`            |
| 2       | Herencia, interfaces, `msg.sender`, CryptoKitties            | `ZombieFeeding`, `KittyInterface`           |
| 3       | Visibilidad, modificadores, permisos, consultas              | `Ownable`, `getZombiesByOwner`              |
| 4       | `payable`, cooldown, ataques, pseudoaleatoriedad             | `ZombieAttack`, `levelUp`                   |
| **5**   | **ERC-721, transferencias, aprobaciones, SafeMath, NatSpec** | **`ZombieOwnership`, `ERC721`, `SafeMath`** |

## 2. Organización de los archivos

### Árbol de herencia

```text
Lesson5Ownable
    └── Lesson5ZombieFactory
         └── Lesson5ZombieFeeding
              └── Lesson5ZombieHelper
                   └── Lesson5ZombieAttack
                        └── Lesson5ZombieOwnership
                             + Lesson5ERC721

Lesson5SafeMath / Lesson5SafeMath32 / Lesson5SafeMath16
    └── bibliotecas utilizadas en los contratos anteriores
```

**Distinción esencial:** `Lesson5Ownable` controla **quién administra el contrato**; `zombieToOwner[tokenId]` determina **quién posee cada zombi**. Son propiedades diferentes.

## 3. Capítulo 1 — ¿Qué es ERC-721?

ERC-721 define una interfaz para que otros contratos, wallets y mercados puedan reconocer y transferir activos únicos. El concepto de NFT no implica que el zombi se guarde fuera de la blockchain: en esta implementación el estado del zombi está dentro del propio contrato, y su identificador es el índice del array.

Ejemplo: el zombi `tokenId = 0` puede pertenecer a Alice y el zombi `tokenId = 1` a Bob. Aunque ambos sean zombis, no son el mismo activo.

**Qué aprendemos:** estandarizar las funciones permite interoperabilidad. El tutorial utiliza una **interfaz educativa reducida**, no una implementación ERC-721 moderna completa.

## 4. Capítulo 2 — Interfaz ERC-721

Archivo: `L5erc721.sol`.

La interfaz declara dos eventos y cuatro funciones:

| Miembro                                 | Para qué sirve                    |
| --------------------------------------- | --------------------------------- |
| `Transfer(_from, _to, _tokenId)`        | Publica un cambio de propietario  |
| `Approval(_owner, _approved, _tokenId)` | Publica una autorización          |
| `balanceOf(_owner)`                     | Cuenta tokens del propietario     |
| `ownerOf(_tokenId)`                     | Consulta el propietario del token |
| `transferFrom(_from, _to, _tokenId)`    | Transfiere un token               |
| `approve(_approved, _tokenId)`          | Autoriza a otra cuenta            |

Los eventos tienen parámetros `indexed`, que permiten a los exploradores y frontends filtrar los logs por direcciones e identificadores. Una declaración de interfaz indica **qué** debe ofrecer el contrato, pero no **cómo** debe implementarlo.

## 5. Capítulo 3 — `balanceOf()` y `ownerOf()`

Archivo: `L5zombieownership.sol`.

```solidity
function balanceOf(address _owner) external view returns (uint256) {
  return ownerZombieCount[_owner];
}

function ownerOf(uint256 _tokenId) external view returns (address) {
  return zombieToOwner[_tokenId];
}
```

**Paso a paso:**

1. `balanceOf(Alice)` consulta cuántos zombis figuran a nombre de Alice.
2. `ownerOf(0)` busca qué dirección está registrada como propietaria del zombi 0.
3. Las dos funciones son `view`: no modifican el almacenamiento.
4. El contador y el mapping deben mantenerse coherentes después de cada transferencia.

Ejemplo: si Alice tiene dos zombis y transfiere uno a Bob, sus balances deben pasar de `2/0` a `1/1`.

## 6. Capítulo 4 — Transferencias

Archivo: `L5zombieownership.sol`.

La función privada `_transfer(_from, _to, _tokenId)` realiza tres tareas: modifica los contadores, actualiza `zombieToOwner` y emite `Transfer`. Es una función interna de implementación; el usuario invoca `transferFrom`.

```solidity
ownerZombieCount[_to] = ownerZombieCount[_to].add(1);
ownerZombieCount[msg.sender] = ownerZombieCount[msg.sender].sub(1);
zombieToOwner[_tokenId] = _to;
emit Transfer(_from, _to, _tokenId);
```

**Importante:** se muestra la expresión **original** del capítulo 13. La resta se hace sobre `msg.sender` y no sobre `_from`. En una transferencia iniciada por el propietario suelen coincidir, pero no necesariamente en una transferencia autorizada por un tercero. Este problema se analiza en la sección de limitaciones, sin alterar el código del tutorial.

## 7. Capítulo 5 — `transferFrom()` y comprobación de permisos

`transferFrom` comprueba si quien llama es el propietario registrado o está autorizado en `zombieApprovals`:

```solidity
require(
  zombieToOwner[_tokenId] == msg.sender ||
  zombieApprovals[_tokenId] == msg.sender
);
_transfer(_from, _to, _tokenId);
```

**Ejemplo:** Alice posee el token 0 y llama a `transferFrom(Alice, Bob, 0)`. Si tiene permiso, el contrato actualiza el propietario y los balances y emite el evento.

**Advertencia:** el código del tutorial no valida que `_from` coincida con `zombieToOwner[_tokenId]`. Tampoco impide explícitamente `_to = address(0)`. No debemos confundir «aprender una interfaz» con «tener una implementación segura de producción».

## 8. Capítulo 6 — Delegar una transferencia

A veces el propietario no ejecuta directamente la transferencia. Por ejemplo, puede autorizar a un mercado para transferir el zombi en su nombre.

La estructura `mapping (uint => address) zombieApprovals` guarda **una dirección autorizada por token**:

```text
zombieApprovals[0] = dirección_del_mercado
```

La autorización no convierte al mercado en propietario: solo habilita a esa dirección para ejecutar la transferencia permitida por el contrato.

## 9. Capítulo 7 — `approve()`

```solidity
function approve(address _approved, uint256 _tokenId) external payable onlyOwnerOf(_tokenId) {
  zombieApprovals[_tokenId] = _approved;
  emit Approval(msg.sender, _approved, _tokenId);
}
```

**Paso a paso:**

1. `onlyOwnerOf(_tokenId)` exige que la llamada proceda del propietario del zombi.
2. Se guarda la cuenta aprobada en `zombieApprovals`.
3. Se emite `Approval` para que el frontend detecte el cambio.
4. Posteriormente esa cuenta podrá llamar a `transferFrom`.

El código original declara `approve` como `payable` pero **no exige ningún pago**. `payable` solo significa que la función puede recibir ETH; no obliga a enviarlo.

## 10. Capítulo 8 — Resultado de ERC-721

La implementación reúne los conceptos anteriores: balances, consulta de propiedad, transferencias, autorizaciones y eventos. El contrato final es `Lesson5ZombieOwnership`.

Ejemplo de flujo:

```text
Alice crea token 0
    ↓
ownerOf(0) = Alice
balanceOf(Alice) = 1
    ↓
Alice aprueba a un tercero
    ↓
Approval(Alice, tercero, 0)
    ↓
El tercero intenta transferir
    ↓
Se comprueban los permisos
    ↓
Se ejecuta _transfer o revierte
```

**Observación:** en el código oficial la transferencia delegada puede fallar o provocar incoherencias, por los defectos descritos más abajo. El diagrama muestra el flujo previsto, no una garantía de éxito.

## 11. Capítulo 9 — Overflow y underflow

Solidity `0.4.25` no incorpora automáticamente las comprobaciones aritméticas de las versiones modernas.

- **Overflow:** incrementar un entero más allá de su máximo provoca un retorno circular.
- **Underflow:** restar a un entero sin signo un valor superior al que contiene puede producir un valor enorme.

Ejemplo conceptual con `uint16`:

```text
Máximo uint16 = 65 535
65 535 + 1 -> 0 (sin comprobaciones)
0 - 1      -> 65 535 (sin comprobaciones)
```

Esto es especialmente importante para `winCount` y `lossCount`, definidos como `uint16`.

## 12. Capítulo 10 — `SafeMath` para `uint256`

Archivo: `L5safemath.sol`.

La biblioteca introduce métodos como `.add()`, `.sub()`, `.mul()` y `.div()` con comprobaciones. La declaración:

```solidity
using Lesson5SafeMath for uint256;
```

permite escribir:

```solidity
ownerZombieCount[_to] = ownerZombieCount[_to].add(1);
```

En una suma, la biblioteca calcula `c = a + b` y verifica `assert(c >= a)`. Si la suma se ha desbordado, falla la aserción y se revierte la operación.

## 13. Capítulo 11 — `SafeMath32` y `SafeMath16`

El contrato no utiliza únicamente enteros de 256 bits:

| Campo                   | Tipo               | Biblioteca          |
| ----------------------- | ------------------ | ------------------- |
| `ownerZombieCount`      | `uint256` (`uint`) | `Lesson5SafeMath`   |
| `level`                 | `uint32`           | `Lesson5SafeMath32` |
| `winCount`, `lossCount` | `uint16`           | `Lesson5SafeMath16` |

Por eso `L5zombiefactory.sol` declara las tres variantes de SafeMath. Los tipos más pequeños también ayudan a compactar almacenamiento, pero tienen límites máximos inferiores.

**Detalle de alcance:** SafeMath protege las operaciones donde se utiliza; no convierte automáticamente en seguras todas las expresiones del contrato. Por ejemplo, el cálculo de `readyTime` sigue realizando una conversión a `uint32`.

## 14. Capítulo 12 — Sustituir incrementos inseguros

Archivos: `L5zombiehelper.sol` y `L5zombieattack.sol`.

En lugar de `level++`, la lección utiliza:

```solidity
zombies[_zombieId].level = zombies[_zombieId].level.add(1);
```

Y en combate:

```solidity
myZombie.winCount = myZombie.winCount.add(1);
myZombie.level = myZombie.level.add(1);
enemyZombie.lossCount = enemyZombie.lossCount.add(1);
```

La rama de derrota también utiliza `.add(1)` para actualizar los contadores. `randNonce` se incrementa de la misma manera.

La mecánica del juego **no cambia**: ganar aumenta el nivel y las victorias; perder actualiza derrotas y cooldown. Lo que cambia es la protección frente a desbordamientos.

## 15. Capítulo 13 — Comentarios y documentación NatSpec

La lección introduce los comentarios en Solidity:

- `// comentario`: explicación de una línea.
- `/* ... */`: comentario de varias líneas.
- `///` o `/** ... */`: comentarios de documentación NatSpec.
- `@title`, `@dev`, `@notice`, `@param` y `@return`: etiquetas habituales de NatSpec.

En esta entrega se añaden **comentarios por lección y capítulo directamente en los ocho archivos Solidity**, sin alterar sus instrucciones ejecutables. Las etiquetas sirven para relacionar cada función con el material que has estudiado.

## 16. Capítulo 14 — Recapitulación y cierre

Al terminar la Lección 5 puedes explicar:

1. Por qué un zombi es un NFT y cómo se identifica mediante `tokenId`.
2. Cómo se consulta quién posee un zombi y cuántos tiene una cuenta.
3. La diferencia entre propietario y dirección aprobada.
4. Qué hace `transferFrom`, qué hace `approve` y por qué se emiten eventos.
5. Qué es un overflow/underflow y por qué se usan bibliotecas SafeMath.
6. Cómo la herencia combina la lógica del juego con la interfaz ERC-721.
7. Qué problemas del código original deberían corregirse antes de usarlo en producción.

## 17. Limitaciones y riesgos del código original

Esta sección es **análisis técnico**, no una modificación del ejercicio.

### 17.1. Resta al emisor y no al propietario real

En `_transfer`, el tutorial ejecuta:

```solidity
ownerZombieCount[msg.sender] = ownerZombieCount[msg.sender].sub(1);
```

En una transferencia delegada, `msg.sender` es la cuenta aprobada y `_from` puede ser Alice. Si la cuenta aprobada no tiene zombis, SafeMath provoca un revert por underflow. Si sí tiene zombis, el contador decrementado puede ser incorrecto.

### 17.2. `_from` no se valida

El código comprueba quién puede llamar, pero no verifica que el argumento `_from` sea el propietario real. Eso permite emitir eventos con una dirección de origen incorrecta y afecta a la coherencia de los registros.

### 17.3. Autorizaciones persistentes

El tutorial no elimina explícitamente `zombieApprovals[_tokenId]` después de transferir. Una autorización antigua puede continuar vigente sobre el token.

### 17.4. Transferencia a la dirección cero

No se comprueba que `_to` sea distinto de `address(0)`.

### 17.5. ERC-721 educativo, no estándar moderno completo

La interfaz del tutorial no incluye todas las funciones y mecanismos de seguridad habituales en implementaciones ERC-721 modernas, como `safeTransferFrom`, `setApprovalForAll`, `getApproved` y ERC-165. Por eso no debe considerarse un NFT de producción listo para integrar con cualquier wallet o marketplace.

### 17.6. Otros riesgos heredados

La pseudoaleatoriedad basada en `now` y `msg.sender` no es segura para aplicaciones económicas. Además, `levelUp` permite pagar por subir el nivel de un zombi ajeno, porque el original no aplica `onlyOwnerOf` a esa función.

## 18. Instalación y compilación con Hardhat 3

Copia el directorio `contracts/CryptoZombies/lesson-05/` dentro de tu proyecto `ethereum-local/`, conservando los nombres `L5...sol`. Después copia este README en `docs/CryptoZombies/lesson-05/README.md`.

Desde la raíz del proyecto:

```bash
npx hardhat compile
```

Para desplegar desde una prueba Viem:

```typescript
const CONTRACT = "contracts/CryptoZombies/lesson-05/L5zombieownership.sol:Lesson5ZombieOwnership";

const contract = await viem.deployContract(CONTRACT);
```

**Requisito:** tu configuración Hardhat debe tener disponible el compilador Solidity `0.4.25` y el plugin Viem, como en las lecciones anteriores. No hace falta desplegar por separado todos los contratos heredados.

## 19. Pruebas recomendadas para Ethereum local

| Caso | Operación                     | Resultado que comprobar                              |
| ---- | ----------------------------- | ---------------------------------------------------- |
| 01   | Crear un zombi                | `ownerOf(0)` coincide con el creador                 |
| 02   | Consultar balance             | `balanceOf(creador) == 1`                            |
| 03   | Transferir desde el dueño     | Cambian `ownerOf` y ambos balances                   |
| 04   | Transferir sin permiso        | Revierte                                             |
| 05   | Aprobar un tercero            | Emite `Approval`                                     |
| 06   | Aprobar un token ajeno        | Revierte                                             |
| 07   | Transferencia delegada        | Demuestra el problema de `msg.sender` en `_transfer` |
| 08   | Transferir con `_from` falso  | Documenta que el contrato no valida ese argumento    |
| 09   | Transferir a `address(0)`     | Documenta el comportamiento original                 |
| 10   | Consultar `getZombiesByOwner` | Lista coherente después de una transferencia normal  |
| 11   | Subir de nivel                | `uint32` incrementado mediante SafeMath              |
| 12   | Combate                       | Contadores `uint16` incrementados mediante SafeMath  |

Estas son **propuestas de pruebas**, no resultados ejecutados. Las pruebas que evidencian fallos del código original deben comprobar y documentar ese comportamiento, no ocultarlo.

## 20. Preguntas para una defensa oral

**¿Qué representa el `tokenId`?** El índice del zombi dentro del array `zombies`, utilizado para consultar su estado y propietario.

**¿Qué diferencia hay entre `owner()` y `ownerOf(tokenId)`?** `owner()` devuelve el administrador del contrato; `ownerOf` devuelve el dueño de un zombi concreto.

**¿Para qué sirve `approve`?** Para autorizar a una dirección a transferir un token sin entregarle previamente la propiedad.

**¿Qué cambia al llamar a `_transfer`?** Se actualizan balances, el mapping de propietario y se emite `Transfer`.

**¿Por qué usamos SafeMath?** Porque Solidity `0.4.25` no comprueba automáticamente desbordamientos aritméticos.

**¿Qué diferencia hay entre `uint16`, `uint32` y `uint256`?** El número de bits y su rango de valores; por eso la lección utiliza bibliotecas SafeMath adaptadas.

**¿El código es seguro para producción?** No. Es una implementación educativa con varias limitaciones de autorización, transferencia y compatibilidad ERC-721.

## 21. Referencias

1. [CryptoZombies — Plataforma educativa](https://cryptozombies.io/)
2. [Código de la Lección 5, capítulo 13](https://github.com/CryptozombiesHQ/cryptozombies-lesson-code/tree/master/lesson-5/)
3. [CryptoZombies — Lección 5 en español](https://github.com/CryptozombiesHQ/cryptozombie-lessons/tree/master/es/5)
4. [Documentación oficial de Solidity](https://docs.soliditylang.org/)
5. [Documentación de Hardhat](https://hardhat.org/docs)
6. [Estándar ERC-72](https://eips.ethereum.org/EIPS/eip-721)

**Nota:** se han conservado deliberadamente las características y defectos de la versión histórica del tutorial. Los nombres `Lesson5...` son una adaptación local para evitar colisiones de contratos entre lecciones.
