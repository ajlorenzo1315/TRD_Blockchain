# CryptoZombies — Lección 4: Batallas entre zombis

## 1. Introducción

La Lección 4 continúa el desarrollo del juego CryptoZombies utilizando Solidity `^0.4.25`.

Su objetivo es incorporar un sistema de combate entre zombis y mecanismos de pago mediante ETH, reutilizando las funcionalidades desarrolladas en las tres primeras lecciones.

El trabajo permite comprender cómo se gestionan pagos, permisos, estados persistentes y decisiones pseudoaleatorias en contratos inteligentes.

**Contrato principal:** `Lesson4ZombieAttack`.

**Versión:** Solidity `^0.4.25`.

**Metodología:** implementación separada por lecciones, con nombres propios para evitar conflictos en Hardhat y comentarios explicativos.

## 2. Conocimientos acumulados

| Lección | Conceptos principales | Resultado |
|---|---|---|
| 1 | Variables, funciones, estructuras, arrays, eventos, hash | Crear zombis |
| 2 | Herencia, mappings, `msg.sender`, `require`, interfaces | Propiedad y reproducción |
| 3 | `Ownable`, modificadores, niveles, cooldown, consultas | Control administrativo y niveles |
| 4 | `payable`, ETH, retiradas, aleatoriedad, combate | Batallas y monetización |

La Lección 4 no sustituye a las anteriores: utiliza sus conceptos para construir una aplicación con mayor complejidad.

## 3. Arquitectura

Los contratos están separados por responsabilidades:

```text
Ownable
   |
ZombieFactory
   |
ZombieFeeding
   |
ZombieHelper
   |
ZombieAttack
```

### Archivos

| Archivo | Responsabilidad |
|---|---|
| `L4ownable.sol` | Administración del contrato |
| `L4zombiefactory.sol` | Creación y almacenamiento de zombis |
| `L4zombiefeeding.sol` | Reproducción y cooldown |
| `L4zombiehelper.sol` | Pagos, niveles y consultas |
| `L4zombieattack.sol` | Sistema de combate |

El contrato final hereda las funciones públicas y externas de los anteriores.

## 4. Administración: Ownable

`Lesson4Ownable` establece una dirección administradora durante el despliegue.

El administrador puede transferir la propiedad, renunciar a ella y ejecutar funciones protegidas mediante `onlyOwner`.

En esta lección, `onlyOwner` se utiliza especialmente para controlar la configuración de CryptoKitties, el precio de subida de nivel y la retirada de ETH.

El administrador del contrato no tiene por qué ser propietario de todos los zombis.

## 5. Almacenamiento: ZombieFactory

La estructura `Zombie` contiene:

| Campo | Tipo | Significado |
|---|---|---|
| `name` | `string` | Nombre |
| `dna` | `uint` | ADN |
| `level` | `uint32` | Nivel |
| `readyTime` | `uint32` | Tiempo de disponibilidad |
| `winCount` | `uint16` | Victorias |
| `lossCount` | `uint16` | Derrotas |

Los nuevos campos son `winCount` y `lossCount`.

Cuando se crea un zombi, ambos se inicializan a cero.

La función `createRandomZombie()` mantiene la restricción de un único zombi inicial por cuenta.

El ADN inicial tiene como máximo 16 dígitos y termina en `00`.

## 6. Reproducción y cooldown: ZombieFeeding

### 6.1. `onlyOwnerOf`

Comprueba que el remitente sea propietario del zombi.

Se utiliza para proteger las operaciones sobre zombis individuales.

### 6.2. `_isReady`

Comprueba si el tiempo actual es igual o posterior a `readyTime`.

```solidity
return (_zombie.readyTime <= now);
```

### 6.3. `_triggerCooldown`

Actualiza el momento de disponibilidad:

```solidity
_zombie.readyTime = uint32(now + cooldownTime);
```

### 6.4. `feedAndMultiply`

Combina el ADN del zombi con otro ADN y crea un descendiente.

Antes de reproducirse, comprueba que el usuario sea propietario del zombi y que el cooldown haya terminado.

Después de crear el descendiente, reinicia el cooldown del progenitor.

La función pasa a ser `internal`, por lo que no puede invocarse directamente como función externa del contrato desplegado.

### 6.5. `feedOnKitty`

Consulta un contrato externo compatible con CryptoKitties para obtener los genes de un gato y reproducir el zombi.

Para probarlo localmente es necesario configurar un contrato externo compatible. La prueba no debe alterar la implementación original.

## 7. Pagos con ETH: ZombieHelper

### 7.1. `payable`

Una función `payable` puede recibir ETH.

En esta lección se utiliza para cobrar una tarifa por subir de nivel.

### 7.2. `msg.value`

Contiene la cantidad de wei enviada con la transacción.

El contrato comprueba:

```solidity
require(msg.value == levelUpFee);
```

El pago debe coincidir exactamente con la tarifa configurada.

### 7.3. Tarifa inicial

```solidity
uint levelUpFee = 0.001 ether;
```

Equivale a:

```text
0.001 ETH = 1 000 000 000 000 000 wei
```

### 7.4. `levelUp`

Cuando recibe el pago correcto, incrementa el nivel del zombi.

Esto permite alcanzar los requisitos necesarios para modificar su nombre o ADN.

### 7.5. `setLevelUpFee`

Permite al administrador modificar el precio.

La cantidad se expresa en wei.

### 7.6. `withdraw`

Permite al administrador retirar el saldo ETH acumulado en el contrato.

Se utiliza `address(this).balance` para consultar el saldo y `transfer` para enviarlo.

### 7.7. Cambio de nombre y ADN

`changeName` exige nivel 2 o superior.

`changeDna` exige nivel 20 o superior.

Ambas funciones comprueban también que el remitente sea propietario del zombi.

## 8. Sistema de combate: ZombieAttack

### 8.1. Estadísticas

Cada zombi registra victorias y derrotas mediante `winCount` y `lossCount`.

### 8.2. Aleatoriedad

`randMod()` combina el tiempo del bloque, `msg.sender` y un contador `randNonce` mediante `keccak256`.

El resultado se reduce con el operador módulo.

```solidity
return uint(
    keccak256(
        abi.encodePacked(now, msg.sender, randNonce)
    )
) % _modulus;
```

Esta técnica genera resultados pseudoaleatorios, pero no proporciona aleatoriedad criptográficamente segura.

### 8.3. Probabilidad de victoria

El contrato utiliza:

```solidity
uint attackVictoryProbability = 70;
```

Y compara:

```solidity
if (rand <= attackVictoryProbability)
```

Dado que `randMod(100)` devuelve valores de 0 a 99, la condición incluye 71 valores posibles. La probabilidad nominal implementada es, por tanto, del 71 % si se supone una distribución uniforme.

### 8.4. Victoria

Cuando el atacante gana:

1. Aumenta su contador de victorias.
2. Sube un nivel.
3. Aumenta el contador de derrotas del rival.
4. Intenta generar descendencia utilizando el ADN del rival.
5. Si la reproducción se completa, se reinicia el cooldown del atacante.

La reproducción puede revertir si el atacante todavía está en cooldown. En ese caso, toda la transacción revierte y no se conservan los incrementos anteriores.

### 8.5. Derrota

Cuando el atacante pierde:

1. Aumenta su contador de derrotas.
2. Aumenta el contador de victorias del rival.
3. Se reinicia el cooldown del atacante.

### 8.6. Propiedad

Solo el propietario del zombi atacante puede ejecutar `attack()` sobre él.

El zombi objetivo puede pertenecer a otra cuenta.

## 9. Ejemplo completo de funcionamiento

Supongamos que existen dos zombis:

| Campo | Zombi A | Zombi B |
|---|---|---|
| Nivel | 1 | 1 |
| Victorias | 0 | 0 |
| Derrotas | 0 | 0 |
| Propietario | Usuario A | Usuario B |

El usuario A inicia un ataque con el zombi A contra el zombi B.

Si gana y se completa la reproducción:

- A pasa a nivel 2.
- A registra una victoria.
- B registra una derrota.
- Se crea un descendiente para el usuario A.
- A entra en cooldown.

Si pierde:

- A registra una derrota.
- B registra una victoria.
- A entra en cooldown.

## 10. Seguridad y limitaciones

Esta implementación es educativa y no debe utilizarse directamente para gestionar fondos reales.

### Aleatoriedad manipulable

El uso de tiempo del bloque, remitente y nonce no garantiza resultados impredecibles.

Para aplicaciones reales deben considerarse mecanismos de aleatoriedad verificable.

### Subida de nivel de zombis ajenos

`levelUp()` no utiliza `onlyOwnerOf`.

Esto permite que una cuenta pague para aumentar el nivel de un zombi que no le pertenece.

### Ataques durante cooldown

La comprobación de cooldown se realiza dentro de `feedAndMultiply()`, no al comienzo de `attack()`.

Por ello, una victoria durante cooldown puede revertir completamente, mientras que una derrota puede ejecutarse.

### Pago exacto

`levelUp()` rechaza pagos superiores o inferiores a la tarifa.

### Versiones antiguas

Solidity 0.4.25 no dispone de las comprobaciones aritméticas automáticas incorporadas en versiones modernas.

Los incrementos de estadísticas y niveles no utilizan SafeMath en esta lección.

### Consultas de almacenamiento

`getZombiesByOwner()` recorre el array completo de zombis. Su coste de ejecución crece con el número total de elementos.

## 11. Pruebas recomendadas

Para validar el estado real del contrato deben comprobarse:

- Creación y propiedad de zombis.
- Inicialización de niveles, victorias y derrotas.
- ADN inicial y eventos.
- Restricción de creación inicial.
- Permisos del administrador.
- Configuración de tarifas.
- Pago correcto, insuficiente y excesivo.
- Subida de nivel.
- Cambio de nombre al alcanzar nivel 2.
- Cambio de ADN al alcanzar nivel 20.
- Rechazo de modificaciones por usuarios ajenos.
- Retirada de ETH.
- Activación y finalización del cooldown.
- Reproducción después del cooldown.
- Integración con CryptoKitties mediante un mock externo.
- Combates ganados y perdidos.
- Actualización de estadísticas.
- Rechazo de ataques sobre zombis ajenos.
- Limitaciones de la generación pseudoaleatoria.

Las pruebas deben reflejar el comportamiento real, incluidas las limitaciones de seguridad, sin añadir funciones de prueba a los contratos originales.

## 12. Compilación y ejecución

Desde la raíz del proyecto Hardhat:

```bash
npx hardhat compile
```

El contrato principal se despliega mediante su nombre plenamente cualificado:

```typescript
const contract = await viem.deployContract(
  "contracts/CryptoZombies/lesson-04/L4zombieattack.sol:Lesson4ZombieAttack"
);
```

La configuración de Hardhat debe incluir el compilador Solidity `0.4.25`.

## 13. Comparación con la Lección 3

| Característica | Lección 3 | Lección 4 |
|---|---|---|
| Crear zombis | Sí | Sí |
| Administración | Sí | Sí |
| Nivel inicial | Sí | Sí |
| Cooldown almacenado | Sí | Sí |
| Cooldown aplicado en reproducción | No | Sí |
| Subir de nivel pagando | No | Sí |
| Retirar ETH | No | Sí |
| Cambiar nombre y ADN | Restringido por nivel | Accesible al alcanzar el nivel |
| Victorias y derrotas | No | Sí |
| Combates | No | Sí |
| Generación pseudoaleatoria para combates | No | Sí |

## 14. Referencias

1. [CryptoZombies — Plataforma educativa](https://cryptozombies.io/)
2. [Código de la Lección 4, capítulo 11](https://github.com/CryptozombiesHQ/cryptozombies-lesson-code/tree/master/lesson-4/)
3. [CryptoZombies — Lección 4 en español](https://github.com/CryptozombiesHQ/cryptozombie-lessons/tree/master/es/4)
4. [Documentación oficial de Solidity](https://docs.soliditylang.org/)
5. [Documentación de Hardhat](https://hardhat.org/docs)

