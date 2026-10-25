# Lección 2 — CryptoZombies: Zombies Attack Their Victims

## Descripción

En esta segunda lección se amplía el contrato inteligente `ZombieFactory` para introducir propietarios, restricciones de acceso, herencia e interacción con contratos externos.

El objetivo principal consiste en permitir que un zombi se alimente de otra criatura para generar un nuevo zombi cuyo ADN sea una combinación de ambos.

## Desarrollo por capítulos

### Capítulo 1 — Introducción

Se presenta la mecánica de alimentación y reproducción de zombis.

### Capítulo 2 — Mappings y direcciones

Se introducen `address` y `mapping` para almacenar relaciones entre zombis y propietarios.

Se implementan `zombieToOwner` y `ownerZombieCount`.

### Capítulo 3 — msg.sender

Se utiliza `msg.sender` para identificar la dirección que ejecuta una función del contrato.

Cada nuevo zombi queda asociado a su creador.

### Capítulo 4 — Require

Se incorpora `require()` para validar condiciones antes de modificar el estado.

Se limita la creación de zombis iniciales a uno por dirección.

### Capítulo 5 — Herencia

Se introduce el contrato `ZombieFeeding`, que hereda de `ZombieFactory`.

Se modifica la visibilidad de `_createZombie` a `internal` para permitir su utilización desde contratos derivados.

### Capítulo 6 — Import

Se separa la implementación en diferentes archivos y se utiliza `import` para reutilizar contratos existentes.

### Capítulo 7 — Storage y Memory

Se estudian las diferencias entre las referencias a datos persistentes y las copias temporales.

Se utiliza `Zombie storage myZombie` para consultar el zombi almacenado.

### Capítulo 8 — ADN de los zombis

Se implementa el cálculo del ADN resultante a partir de dos valores genéticos.

Se utiliza el operador módulo para normalizar el ADN.

### Capítulo 9 — Más funciones

Se desarrolla la función `feedAndMultiply`, que comprueba la propiedad del zombi y permite generar descendencia.

### Capítulo 10 — Interacción con contratos externos

Se estudia cómo los contratos inteligentes pueden consultar funciones públicas de otros contratos desplegados en Ethereum.

Se introduce el ejemplo de CryptoKitties.

### Capítulo 11 — Interfaces

Se declara `KittyInterface` y se configura una referencia al contrato externo.

### Capítulo 12 — Múltiples valores de retorno

Se utiliza `getKitty()` para recuperar los datos de un CryptoKitty.

Se selecciona el campo `genes`, que contiene su información genética.

### Capítulo 13 — Condicionales

Se introduce `if` para aplicar un tratamiento específico al ADN cuando el objetivo pertenece a la especie `kitty`.

El ADN resultante termina en `99`, permitiendo distinguir los zombis generados a partir de CryptoKitties.

## Funcionalidades implementadas

- Registro de propietarios.
- Control de creación inicial.
- Herencia de contratos inteligentes.
- Alimentación y generación de nuevos zombis.
- Combinación de ADN.
- Interacción con contratos externos mediante interfaces.
- Identificación de zombis derivados de CryptoKitties.

## Validación

Se prevén pruebas de despliegue, propiedad, restricciones, alimentación, ADN, eventos e interacción con un contrato simulado de CryptoKitties.

**Estado:** pruebas pendientes de ejecución y verificación en Hardhat.

## Consideraciones de seguridad

El contrato es educativo y no debe utilizarse directamente en producción.

La generación del ADN no proporciona aleatoriedad criptográficamente segura. Además, la configuración de la dirección de CryptoKitties debería estar protegida mediante controles de acceso.

## Referencias

1. [CryptoZombies — Plataforma educativa](https://cryptozombies.io/)
2. [Código de la Lección 2 ](https://github.com/CryptozombiesHQ/cryptozombies-lesson-code/tree/master/lesson-2/)
3. [Contenido de la Lección 2 en español](https://github.com/CryptozombiesHQ/cryptozombie-lessons/tree/master/es/2)
4. [Documentación oficial de Solidity](https://docs.soliditylang.org/)
5. [Documentación de Hardhat](https://hardhat.org/docs)