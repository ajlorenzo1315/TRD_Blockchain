# CryptoZombies — Solidity: Beginner to Intermediate Smart Contracts

## Ejercicio 1 — Prácticas de Blockchain

**Curso:** Máster Universitario en Ciberseguridad (MUNICS)  
**Asignatura:** Blockchain  
**Actividad:** Ejercicio 1 — CryptoZombies  
**Lenguaje:** Solidity  
**Entorno:** Ethereum, Hardhat y Node.js

---

## 1. Introducción

CryptoZombies es una plataforma educativa creada originalmente por Loom Network para aprender a programar contratos inteligentes en Solidity mediante el desarrollo de un juego de zombis coleccionables.

El objetivo de esta práctica es completar los contenidos de *Solidity: Beginner to Intermediate Smart Contracts*, comprender el funcionamiento de los contratos inteligentes y comprobar su ejecución en una blockchain Ethereum local.

Debido a los problemas de acceso a la plataforma interactiva, se utilizan los repositorios públicos que conservan el contenido y las soluciones de las lecciones originales.

### Objetivos

- Aprender la sintaxis y los fundamentos de Solidity.
- Comprender cómo se almacenan los datos en Ethereum.
- Desarrollar contratos inteligentes progresivamente.
- Utilizar estructuras, arrays, funciones y eventos.
- Generar atributos de zombis mediante funciones hash.
- Compilar y probar contratos en un entorno Ethereum local.
- Documentar los ejercicios y conservar su código en GitHub.

## 2. Entorno de desarrollo

Se utiliza Hardhat como entorno de desarrollo para compilar contratos, ejecutar pruebas y desplegarlos en una blockchain Ethereum local.

| Herramienta | Función |
|---|---|
| Solidity 0.4.25 | Código histórico del curso |
| Solidity 0.8.x | Adaptación moderna de los contratos |
| Hardhat | Compilación, despliegue y pruebas |
| Node.js | Ejecución de herramientas JavaScript |
| Viem | Interacción programática con Ethereum |
| Git y GitHub | Control de versiones y entrega |

Las implementaciones originales y modernas deben compilarse con versiones compatibles de Solidity.

---

# 3. Lección 1 — Making the Zombie Factory

## Capítulo 1 — Introducción a los zombis

### Objetivo

Comprender el funcionamiento del juego CryptoZombies y el papel de los contratos inteligentes.

Cada zombi dispone de un nombre y un ADN numérico que permite representar sus características.

### Conceptos aprendidos

- Blockchain Ethereum.
- Contratos inteligentes.
- Lenguaje Solidity.
- Representación de datos mediante números.
- Generación de atributos a partir de un ADN.

**Resultado:** comprensión de la arquitectura básica del juego y del contrato que se desarrollará.

## Capítulo 2 — Contratos

### Objetivo

Aprender a declarar un contrato inteligente utilizando Solidity.

```solidity
pragma solidity ^0.4.25;

contract ZombieFactory {

}
```

### Explicación

`pragma solidity` establece la versión compatible del compilador.

`contract ZombieFactory` declara el contrato inteligente que contendrá las variables, estructuras y funciones de la fábrica de zombis.

**Resultado:** creación de la estructura inicial del contrato.

## Capítulo 3 — Variables de estado y números enteros

### Objetivo

Aprender a declarar variables de estado y utilizar números enteros sin signo.

```solidity
uint dnaDigits = 16;
```

### Explicación

`uint` representa un entero sin signo de 256 bits.

`dnaDigits` determina que el ADN tendrá como máximo 16 dígitos decimales.

Las variables de estado se almacenan persistentemente en el estado del contrato.

**Resultado:** incorporación de la variable que establece la longitud del ADN.

## Capítulo 4 — Operaciones matemáticas

### Objetivo

Utilizar operadores matemáticos para calcular el límite numérico del ADN.

```solidity
uint dnaModulus = 10 ** dnaDigits;
```

### Explicación

El operador `**` representa la exponenciación.

Por tanto:

10¹⁶ = 10000000000000000

Posteriormente, este valor se utilizará con el operador módulo `%` para limitar el ADN generado.

**Resultado:** incorporación del módulo que determina el rango permitido para el ADN.

## Capítulo 5 — Estructuras

### Objetivo

Aprender a definir tipos de datos personalizados mediante `struct`.

```solidity
struct Zombie {
    string name;
    uint dna;
}
```

### Explicación

La estructura `Zombie` agrupa dos atributos:

- `name`: nombre del zombi.
- `dna`: código genético numérico.

Las estructuras permiten representar entidades con diferentes propiedades dentro de un contrato inteligente.

**Resultado:** definición del modelo de datos de los zombis.

## Capítulo 6 — Arrays

### Objetivo

Almacenar múltiples zombis mediante un array dinámico.

```solidity
Zombie[] public zombies;
```

### Explicación

`Zombie[]` representa un array dinámico de estructuras `Zombie`.

La palabra `public` genera automáticamente una función de lectura que permite consultar cada elemento mediante su índice.

Los índices comienzan en cero.

**Resultado:** creación del almacenamiento persistente para los zombis.

## Capítulo 7 — Declaración de funciones

### Objetivo

Aprender a declarar funciones con parámetros.

Se introduce una función que recibe el nombre y el ADN de un zombi.

```solidity
function createZombie(
    string _name,
    uint _dna
) public {

}
```

### Explicación

Las funciones permiten organizar las operaciones del contrato.

Los parámetros `_name` y `_dna` contienen los valores necesarios para construir un nuevo zombi.

**Resultado:** definición de la operación de creación de zombis.

## Capítulo 8 — Estructuras y arrays

### Objetivo

Crear estructuras y añadirlas al array de almacenamiento.

```solidity
zombies.push(Zombie(_name, _dna));
```

### Explicación

`Zombie(_name, _dna)` construye una nueva estructura.

`push()` incorpora el elemento al final del array `zombies`.

La modificación queda registrada en el estado del contrato cuando la transacción se ejecuta correctamente.

**Resultado:** implementación del almacenamiento de nuevos zombis.

## Capítulo 9 — Funciones privadas y públicas

### Objetivo

Comprender los modificadores de visibilidad.

```solidity
function _createZombie(
    string _name,
    uint _dna
) private {
    zombies.push(Zombie(_name, _dna));
}
```

### Explicación

La función pasa a ser privada para impedir que los usuarios externos la invoquen directamente.

El prefijo `_` es una convención de nomenclatura para funciones internas o privadas.

La visibilidad permite definir qué operaciones pueden ejecutarse desde fuera del contrato.

**Resultado:** encapsulación de la creación de zombis.

## Capítulo 10 — Funciones y valores de retorno

### Objetivo

Aprender a devolver valores desde funciones y a utilizar funciones de lectura.

```solidity
function _generateRandomDna(
    string _str
) private view returns (uint) {

}
```

### Explicación

`private` limita el acceso a la función.

`view` indica que no modifica el estado del contrato.

`returns (uint)` establece que devuelve un número entero sin signo.

**Resultado:** preparación de la función encargada de calcular el ADN.

## Capítulo 11 — Keccak256 y conversión de tipos

### Objetivo

Generar un ADN numérico a partir de un nombre utilizando una función hash.

```solidity
uint rand = uint(
    keccak256(abi.encodePacked(_str))
);

return rand % dnaModulus;
```

### Explicación

`abi.encodePacked()` convierte el contenido de la cadena en una representación de bytes.

`keccak256()` calcula un hash de 256 bits.

`uint()` convierte el resultado a un entero sin signo.

Finalmente, `% dnaModulus` limita el resultado al intervalo comprendido entre cero y 10¹⁶ − 1.

Aunque el curso denomina a esta operación generación aleatoria, el resultado es determinista para una misma entrada.

**Resultado:** implementación del cálculo del ADN.

## Capítulo 12 — Integración de los conceptos

### Objetivo

Integrar la generación del ADN con la creación de zombis.

```solidity
function createRandomZombie(
    string _name
) public {
    uint randDna = _generateRandomDna(_name);
    _createZombie(_name, randDna);
}
```

### Explicación

La función recibe el nombre del zombi, genera su ADN y llama a la función privada que lo almacena.

Se combinan funciones públicas y privadas, hashes, estructuras y arrays.

**Resultado:** implementación de una función pública que permite crear zombis proporcionando únicamente su nombre.

## Capítulo 13 — Eventos

### Objetivo

Aprender a emitir eventos para comunicar cambios producidos durante la ejecución de contratos inteligentes.

```solidity
event NewZombie(
    uint zombieId,
    string name,
    uint dna
);
```

La función de creación se modifica para emitir el evento:

```solidity
function _createZombie(
    string _name,
    uint _dna
) private {
    uint id = zombies.push(
        Zombie(_name, _dna)
    ) - 1;

    emit NewZombie(id, _name, _dna);
}
```

### Explicación

`push()` devuelve la nueva longitud del array en Solidity 0.4.25.

Al restar uno se obtiene el índice del zombi recién creado.

`emit NewZombie()` registra un evento en los logs de la transacción.

Las aplicaciones externas pueden consultar estos eventos para detectar cuándo se crean zombis.

**Resultado:** incorporación de eventos y generación de identificadores.

## Capítulo 14 — Web3.js

### Objetivo

Comprender cómo una aplicación JavaScript puede comunicarse con contratos inteligentes de Ethereum.

### Conceptos aprendidos

- Conexión a un proveedor Ethereum.
- Consulta de funciones públicas.
- Envío de transacciones.
- Lectura de eventos.
- Interacción entre una interfaz web y la blockchain.

El contrato desarrollado puede utilizarse desde una aplicación basada en Web3.js.

**Resultado:** comprensión de la interacción entre el contrato Solidity y una aplicación externa.

## Capítulo 15 — Finalización de la lección

### Objetivo

Consolidar los conceptos aprendidos y revisar el funcionamiento completo de la fábrica de zombis.

### Funcionalidades obtenidas

- Definición de un contrato inteligente.
- Almacenamiento de zombis mediante estructuras y arrays.
- Creación de zombis a partir de un nombre.
- Generación determinista de ADN.
- Emisión de eventos.
- Consulta de información almacenada.

**Resultado:** contrato `ZombieFactory` con las funcionalidades básicas de la primera lección.

---

# 4. Código final de la lección 1

```solidity
pragma solidity ^0.4.25;

contract ZombieFactory {

    event NewZombie(
        uint zombieId,
        string name,
        uint dna
    );

    uint dnaDigits = 16;
    uint dnaModulus = 10 ** dnaDigits;

    struct Zombie {
        string name;
        uint dna;
    }

    Zombie[] public zombies;

    function _createZombie(
        string _name,
        uint _dna
    ) private {
        uint id = zombies.push(
            Zombie(_name, _dna)
        ) - 1;

        emit NewZombie(id, _name, _dna);
    }

    function _generateRandomDna(
        string _str
    ) private view returns (uint) {
        uint rand = uint(
            keccak256(abi.encodePacked(_str))
        );

        return rand % dnaModulus;
    }

    function createRandomZombie(
        string _name
    ) public {
        uint randDna = _generateRandomDna(_name);
        _createZombie(_name, randDna);
    }
}
```

---

# 5. Pruebas y validación

Para validar la implementación se propone utilizar una blockchain Ethereum local mediante Hardhat.

Las pruebas deben comprobar:

| Prueba | Comportamiento esperado |
|---|---|
| Despliegue | El contrato se despliega correctamente |
| Estado inicial | El array de zombis está vacío |
| Creación | Se crea un zombi proporcionando su nombre |
| Almacenamiento | El zombi queda registrado en el array |
| ADN | El ADN está dentro del rango establecido |
| Eventos | Se emite `NewZombie` al crear un zombi |
| Identificadores | Cada nuevo zombi recibe un índice consecutivo |

**Estado de validación:** pendiente de incorporar los resultados reales de ejecución.

La versión histórica debe compilarse con Solidity 0.4.x. Para utilizar compiladores actuales es necesario adaptar las diferencias de sintaxis y comportamiento.

# 6. Ejecución en Hardhat

Para el entorno moderno:

```bash
npm install
npx hardhat compile
npx hardhat test nodejs
```

Para iniciar una blockchain local:

```bash
npx hardhat node
```

Para desplegar mediante un módulo de Hardhat Ignition previamente configurado:

```bash
npx hardhat ignition deploy \
  ignition/modules/ZombieFactory.ts \
  --network localhost
```

Estos comandos corresponden a la versión moderna del proyecto y requieren sus archivos de configuración, pruebas y despliegue.

---

# 7. Conclusiones

La primera lección de CryptoZombies permite comprender los fundamentos del desarrollo de contratos inteligentes en Ethereum.

A través de la construcción progresiva de `ZombieFactory`, se estudian variables de estado, estructuras, arrays, funciones, visibilidad, operaciones matemáticas, hashing y eventos.

La práctica también permite diferenciar entre las operaciones que modifican el estado de la blockchain y aquellas que únicamente consultan información.

La ejecución mediante Hardhat complementa el aprendizaje al permitir compilar y probar los contratos en un entorno Ethereum local.

# 8. Referencias

1. [CryptoZombies — Plataforma educativa](https://cryptozombies.io/)
2. [CryptoZombies — Lecciones en español](https://github.com/CryptozombiesHQ/cryptozombie-lessons/tree/master/es/1)
3. [CryptoZombies — Código original por capítulos](https://github.com/CryptozombiesHQ/cryptozombies-lesson-code/tree/master/lesson-1)
4. [CryptoZombies — Proyecto consolidado](https://github.com/pmuens/cryptozombies)
5. [Solidity — Documentación oficial](https://docs.soliditylang.org/)
6. [Hardhat — Documentación oficial](https://hardhat.org/docs)