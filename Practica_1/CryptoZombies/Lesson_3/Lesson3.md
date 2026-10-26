# CryptoZombies — Lección 3: Zombis que luchan

## 1. Objetivo

La Lección 3 amplía los contratos desarrollados en las dos primeras lecciones de CryptoZombies, introduciendo mecanismos de administración, control de acceso, niveles, tiempos de espera y consultas sobre los zombis de un usuario.

El objetivo es comprender cómo construir contratos inteligentes mediante herencia, modificadores y estructuras de almacenamiento.

**Versión de Solidity:** `^0.4.25`.

**Contrato principal:** `Lesson3ZombieHelper`.

**Criterio de implementación:** se conserva la lógica del código de la lección, utilizando prefijos `L3` y `Lesson3` para evitar conflictos con otras lecciones del proyecto.

## 2. Organización de los contratos

| Archivo               | Contrato               | Responsabilidad             |
| --------------------- | ---------------------- | --------------------------- |
| `L3ownable.sol`       | `Lesson3Ownable`       | Administración y permisos   |
| `L3zombiefactory.sol` | `Lesson3ZombieFactory` | Creación y almacenamiento   |
| `L3zombiefeeding.sol` | `Lesson3ZombieFeeding` | Alimentación y reproducción |
| `L3zombiehelper.sol`  | `Lesson3ZombieHelper`  | Niveles y consultas         |

La herencia sigue esta secuencia:

```text
Ownable
    |
    v
ZombieFactory
    |
    v
ZombieFeeding
    |
    v
ZombieHelper
```

Al desplegar `Lesson3ZombieHelper`, también se obtiene la funcionalidad pública heredada de los contratos anteriores.

## 3. Administración: Ownable

`Ownable` establece una dirección administradora cuando se despliega el contrato.

### Funciones principales

- `owner()`: devuelve el administrador.
- `isOwner()`: comprueba si el remitente es el administrador.
- `onlyOwner`: restringe la ejecución de funciones.
- `transferOwnership()`: transfiere la administración.
- `renounceOwnership()`: renuncia a la administración.

El evento `OwnershipTransferred` permite registrar los cambios de administrador.

**Concepto importante:** ser administrador del contrato no implica ser propietario de todos los zombis. Cada zombi tiene su propietario, almacenado en `zombieToOwner`.

## 4. Creación de zombis: ZombieFactory

La estructura `Zombie` contiene cuatro campos:

| Campo       | Tipo     | Descripción               |
| ----------- | -------- | ------------------------- |
| `name`      | `string` | Nombre                    |
| `dna`       | `uint`   | ADN                       |
| `level`     | `uint32` | Nivel                     |
| `readyTime` | `uint32` | Momento de disponibilidad |

### Creación

`createRandomZombie()` comprueba que el usuario todavía no tenga zombis y genera su ADN inicial.

El ADN se obtiene mediante `keccak256`, se reduce a 16 dígitos y se ajusta para que termine en `00`.

Después, `_createZombie()` almacena el zombi con nivel inicial 1, calcula `readyTime`, registra al propietario y emite `NewZombie`.

### Tiempo de espera

El valor inicial es:

```solidity
uint cooldownTime = 1 days;
```

Al crear el zombi se almacena:

```solidity
uint32(now + cooldownTime)
```

Esto establece un momento futuro de disponibilidad.

**Limitación:** el código de esta lección almacena el cooldown, pero todavía no lo aplica para bloquear `feedAndMultiply()`. Por tanto, no debe afirmarse que impide alimentarse durante 24 horas.

## 5. Alimentación: ZombieFeeding

Este contrato permite crear descendientes combinando ADN.

### `feedAndMultiply()`

Primero comprueba que el remitente sea propietario del zombi.

Después reduce el ADN objetivo mediante el módulo y calcula:

```text
nuevoADN = (ADN_original + ADN_objetivo) / 2
```

Si la especie es `kitty`, modifica los dos últimos dígitos del ADN para que sean `99`.

Finalmente crea un descendiente llamado `NoName`.

### `feedOnKitty()`

Consulta los genes de un CryptoKitty a través de una interfaz externa y utiliza `feedAndMultiply()` para generar descendencia.

### `setKittyContractAddress()`

Permite configurar la dirección del contrato externo.

A diferencia de la Lección 2, esta función utiliza `onlyOwner`, por lo que únicamente puede ejecutarla el administrador.

La dirección debe configurarse antes de utilizar `feedOnKitty()`.

## 6. Niveles: ZombieHelper

### Modificador `aboveLevel`

Permite exigir un nivel mínimo antes de ejecutar una función.

### `changeName()`

Permite cambiar el nombre cuando el zombi tiene nivel 2 o superior y el remitente es su propietario.

### `changeDna()`

Permite cambiar el ADN cuando el zombi tiene nivel 20 o superior y el remitente es su propietario.

**Limitación:** esta implementación todavía no incluye una función pública para subir de nivel. Los zombis nuevos comienzan en nivel 1, por lo que las operaciones anteriores quedan bloqueadas en el estado inicial.

### `getZombiesByOwner()`

Devuelve un array con los identificadores de todos los zombis pertenecientes a una dirección.

El contrato recorre el array `zombies` y selecciona aquellos cuyo propietario coincide con la dirección consultada.

El coste de esta operación aumenta con el número total de zombis almacenados.

## 7. Diferencias con la Lección 2

| Característica                             | Lección 2 | Lección 3 |
| ------------------------------------------ | --------- | --------- |
| Creación de zombis                         | Sí        | Sí        |
| Propietarios                               | Sí        | Sí        |
| Alimentación                               | Sí        | Sí        |
| Nivel                                      | No        | Sí        |
| ReadyTime                                  | No        | Sí        |
| Administración Ownable                     | No        | Sí        |
| Configuración de CryptoKitties restringida | No        | Sí        |
| Modificación de nombre y ADN por nivel     | No        | Sí        |
| Consulta de zombis por propietario         | No        | Sí        |

## 8. Compilación

Desde la raíz del proyecto Hardhat:

```bash
npx hardhat compile
```

Es necesario disponer del compilador Solidity `0.4.25` en la configuración de Hardhat.

## 9. Pruebas recomendadas

Las pruebas deben comprobar:

1. Despliegue del contrato.
2. Registro del administrador.
3. Creación del primer zombi.
4. Nivel inicial igual a 1.
5. ADN inicial terminado en `00`.
6. ReadyTime inicial equivalente al tiempo del bloque más 24 horas.
7. Restricción de un zombi inicial por usuario.
8. Registro de propietarios.
9. Creación de descendencia mediante `feedAndMultiply()`.
10. ADN de especie `kitty` terminado en `99`.
11. Rechazo de alimentación por usuarios no propietarios.
12. Restricción administrativa de `setKittyContractAddress()`.
13. Rechazo de cambios de nombre y ADN con nivel insuficiente.
14. Consulta mediante `getZombiesByOwner()`.
15. Emisión de los eventos correspondientes.

Las pruebas deben utilizar el contrato original sin introducir métodos adicionales.

## 10. Limitaciones y seguridad

Esta lección es una implementación educativa, no un contrato preparado para producción.

Entre sus limitaciones destacan:

- La generación de ADN inicial mediante hash del nombre es determinista y no proporciona aleatoriedad segura.
- El cooldown se almacena, pero no se comprueba al alimentar.
- No existe todavía una mecánica pública para aumentar niveles.
- `getZombiesByOwner()` recorre todos los zombis.
- `feedOnKitty()` depende de un contrato externo.
- La dirección externa puede ser cambiada por el administrador.
- La implementación utiliza Solidity 0.4.25, una versión histórica.

## 11. Referencias

1. [CryptoZombies — Plataforma educativa](https://cryptozombies.io/)
2. [Código de CryptoZombies — Lección 3](https://github.com/CryptozombiesHQ/cryptozombies-lesson-code/tree/master/lesson-3)
3. [CryptoZombies — Lección 3 en español](https://github.com/CryptozombiesHQ/cryptozombie-lessons/tree/master/es/3)
4. [Documentación oficial de Solidity](https://docs.soliditylang.org/)
5. [Documentación de Hardhat](https://hardhat.org/docs)
