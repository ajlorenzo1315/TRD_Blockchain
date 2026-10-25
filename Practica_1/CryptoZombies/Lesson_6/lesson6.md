# CryptoZombies — Lección 6: frontend Ethereum paso a paso

## Alcance y origen

Esta guía se basa en los capítulos en español `00-overview.md`, `01.md`–`09.md` y `10-wrappingitup.md` del archivo `6.rar` aportado, y en sus contratos Solidity. **La lección enseña el frontend Web3.js**, no nuevas reglas de Solidity. La interfaz ejecutable incluida es una **adaptación para MetaMask y Hardhat locales**; se distingue del ejemplo histórico de CryptoZombies.

Hay dos entregas independientes: **comentada** (comentarios de capítulo en Solidity y JavaScript) y **sin comentarios** (mismo código ejecutable sin anotaciones pedagógicas). **Instala solo una variante.** Los contratos están renombrados a `Lesson6...` para que no choquen con `Lesson5...`.

## El recorrido completo de una interacción

```text
Usuario pulsa «Crear zombi»
          │
          ▼
JavaScript lee el nombre del formulario
          │
          ▼
Web3.js codifica createRandomZombie(nombre) usando el ABI
          │
          ▼
MetaMask solicita confirmación de la transacción
          │
          ▼
Nodo Hardhat ejecuta el contrato en Ethereum local
          │
          ▼
Solidity crea el zombi y emite NewZombie
          │
          ▼
La transacción obtiene un recibo y la interfaz consulta de nuevo
          │
          ▼
getZombiesByOwner().call() → zombies(id).call() → HTML
```

La diferencia fundamental es que **JavaScript presenta y solicita acciones**, mientras que **Solidity determina si esas acciones están permitidas y cambia el estado**.

## Capítulo 1 — Introducción a Web3.js

**Objetivo:** El frontend necesita un cliente que codifique llamadas según el ABI y envíe solicitudes al proveedor.

**Fragmento representativo:**

```javascript
new Web3(window.ethereum)
```

**Paso a paso:**

1. Abrir `index.html` mediante un servidor HTTP local.
2. Cargar Web3.js antes que `app.js`.
3. Crear el cliente `web3` cuando exista el proveedor `window.ethereum`.
4. El cliente prepara las llamadas codificadas al contrato; no despliega el contrato.

**Precaución:** Web3 es una biblioteca; MetaMask es el proveedor y la cartera.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 2 — Web3 Providers

**Objetivo:** El proveedor permite a la web comunicarse con un nodo Ethereum. En local, MetaMask se conecta a Hardhat.

**Fragmento representativo:**

```javascript
window.ethereum.request({ method: "eth_requestAccounts" })
```

**Paso a paso:**

1. Instalar MetaMask en el navegador.
2. Arrancar `npx hardhat node` para disponer de una blockchain local.
3. Añadir la red local en MetaMask (RPC `http://127.0.0.1:8545`; habitualmente chain ID `31337`).
4. Seleccionar una cuenta de desarrollo e iniciar la conexión desde la página.

**Precaución:** Conectar el proveedor no implica tener autorización para leer cuentas.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 3 — Hablando a los contratos

**Objetivo:** Para invocar un contrato necesitamos el ABI generado por el compilador y su dirección desplegada.

**Fragmento representativo:**

```javascript
new web3.eth.Contract(window.LESSON6_ABI, window.LESSON6_ADDRESS)
```

**Paso a paso:**

1. Compilar Solidity para producir el artefacto JSON de Hardhat.
2. Desplegar `Lesson6ZombieOwnership` y anotar la dirección real.
3. Exportar el ABI del artefacto con `export-lesson-06-abi.mjs`.
4. Crear `web3.eth.Contract(ABI, dirección)` y comprobar que la red seleccionada es la del despliegue.

**Precaución:** El ABI no es el bytecode; describe la interfaz. La dirección cambia al redesplegar.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 4 — Llamando a las funciones de nuestro contrato

**Objetivo:** Las consultas view no alteran el estado; Web3 usa call() para obtener sus resultados.

**Fragmento representativo:**

```javascript
contract.methods.zombies(0).call()
```

**Paso a paso:**

1. Obtener un ID de zombi válido.
2. Invocar `contract.methods.zombies(id).call()`.
3. Interpretar el resultado como seis campos: nombre, ADN, nivel, cooldown, victorias y derrotas.
4. No utilizar `send()` para consultar datos que no cambian el estado.

**Precaución:** call() no envía una transacción firmada ni crea un recibo minado.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 5 — MetaMask y cuentas

**Objetivo:** El frontend pide acceso a la cuenta y debe responder a los cambios de cuenta o red.

**Fragmento representativo:**

```javascript
window.ethereum.on("accountsChanged", callback)
```

**Paso a paso:**

1. Solicitar cuentas con `eth_requestAccounts` mediante un gesto del usuario.
2. Guardar la dirección seleccionada solo en memoria de la página.
3. Usar `from: account` al enviar una transacción.
4. Escuchar `accountsChanged` y `chainChanged` para evitar mostrar datos de otra cuenta o red.

**Precaución:** La dirección del usuario no es la dirección del contrato. Nunca compartir claves privadas.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 6 — Mostrando nuestro ejército zombi

**Objetivo:** Primero se recuperan los IDs con getZombiesByOwner y después los detalles de cada zombi.

**Fragmento representativo:**

```javascript
const ids = await contract.methods.getZombiesByOwner(account).call();
```

**Paso a paso:**

1. Consultar `getZombiesByOwner(account).call()` para obtener los identificadores.
2. Consultar `zombies(id).call()` para cada identificador.
3. Normalizar el resultado con `normalizeZombie()` para que los números sean cadenas legibles.
4. Escapar los nombres con `escapeHtml()` y construir las tarjetas HTML.

**Precaución:** Los datos de nombres se escapan antes de insertarlos en HTML.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 7 — Enviando transacciones

**Objetivo:** Una función que modifica estado requiere send(), firma del usuario, gas y confirmación en un bloque.

**Fragmento representativo:**

```javascript
contract.methods.createRandomZombie("Alice").send({ from: account })
```

**Paso a paso:**

1. Leer el formulario «Crear zombi».
2. Construir `contract.methods.createRandomZombie(nombre)`.
3. Llamar a `.send({ from: account })` para pedir una transacción firmada.
4. Esperar el recibo, informar al usuario y refrescar el ejército.

**Precaución:** Una transacción puede ser rechazada por MetaMask o revertida por Solidity.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 8 — Llamando funciones payable

**Objetivo:** levelUp recibe ETH y exige una tarifa exacta de 0.001 ether; el frontend debe convertir a wei.

**Fragmento representativo:**

```javascript
contract.methods.levelUp(0).send({ from: account, value: web3.utils.toWei("0.001", "ether") })
```

**Paso a paso:**

1. Leer el ID del zombi.
2. Convertir `"0.001"` ETH a wei con `web3.utils.toWei`.
3. Enviar `levelUp(id)` con `from` y `value`.
4. Comprobar que el nivel aumenta y que el contrato acumula el pago.

**Precaución:** value son wei; el gas es un coste adicional distinto del pago al contrato.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 9 — Suscribirse a los eventos

**Objetivo:** Los logs emitidos por Solidity permiten actualizar la interfaz cuando se crean o transfieren zombis.

**Fragmento representativo:**

```javascript
contract.events.Transfer({ filter: { _to: account } })
```

**Paso a paso:**

1. Identificar el evento `Transfer` en el ABI.
2. Intentar suscribirse filtrando por el campo indexado `_to`.
3. Actualizar el ejército cuando llega un evento.
4. Mantener el botón «Actualizar ejército» para proveedores que no soporten suscripciones.

**Precaución:** Las suscripciones en vivo pueden depender del proveedor; refrescar manualmente es alternativa.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Capítulo 10 — Envolviéndolo todo

**Objetivo:** Se integran proveedor, cuenta, contrato, lectura, escritura, pagos y eventos en una DApp sencilla.

**Fragmento representativo:**

```javascript
await refresh();
```

**Paso a paso:**

1. Conectar MetaMask y seleccionar la red correcta.
2. Crear un zombi y verificarlo en la pantalla.
3. Probar una subida de nivel y observar la confirmación y el pago.
4. Comprobar cambios de cuenta, errores y eventos; proponer mejoras sin confundirlas con funciones ya implementadas.

**Precaución:** La lección no añade un nuevo consenso ni un nuevo contrato ERC-721.

**Archivos relacionados:** `frontend/lesson-06/app.js`, `frontend/lesson-06/app-core.js` y, cuando corresponda, `L6zombieownership.sol`.

## Práctica completa en Ethereum local (comandos)

### Paso 1 — Instalar una variante

Descomprime `comentada/` **o** `sin_comentarios/` en la raíz de tu proyecto `ethereum-local`. No mezcles ambas carpetas. Debes conservar la ruta `contracts/CryptoZombies/lesson-06/L6zombieownership.sol`.

### Paso 2 — Compilar

```bash
npx hardhat compile
```

Si falla por un import, comprueba que `L6zombieownership.sol` importe `./L6erc721.sol` y no `./erc721.sol`. La versión de este paquete ya incorpora esa corrección de ruta.

### Paso 3 — Ejecutar pruebas automáticas

```bash
npx hardhat test nodejs test/lesson-06/ZombieFrontend.ts
node --test test/lesson-06/Frontend.test.cjs
```

O bien `bash scripts/test-lesson-06.sh`. Los 15 casos de Ethereum comprueban despliegue, lectura, creación, eventos, balances, pagos, permisos y transferencias. Los ocho casos del frontend comprueban dirección, representación, escape HTML, wei y cooldown. **Los resultados deben verificarse en tu entorno**.

### Paso 4 — Iniciar un nodo local

En una terminal:

```bash
npx hardhat node
```

Déjala abierta. En otra terminal, desde la raíz del proyecto:

```bash
npx hardhat run scripts/deploy-lesson-06.ts --network localhost
```

Anota la dirección impresa. Debe tener la forma `0x` seguida de 40 caracteres hexadecimales.

### Paso 5 — Exportar ABI y dirección

```bash
node scripts/export-lesson-06-abi.mjs 0xDIRECCION_IMPRESA
```

El script escribe `frontend/lesson-06/contract-config.js`. El ABI se obtiene del artefacto compilado y la dirección del despliegue real. No utilices una dirección de ejemplo como si fuera la real.

### Paso 6 — Conectar MetaMask

En MetaMask añade una red de desarrollo con RPC `http://127.0.0.1:8545` y chain ID `31337` **si coincide con la configuración de tu nodo**. Importa solo una cuenta de desarrollo del nodo Hardhat, nunca una clave privada real. Confirma que la cuenta tiene ETH de prueba.

### Paso 7 — Abrir la interfaz

```bash
python3 -m http.server 8080 --directory frontend/lesson-06
```

Abre `http://127.0.0.1:8080` y pulsa «Conectar MetaMask».

### Paso 8 — Ejercicios de comprobación visual

1. **Crear:** escribe `Alice`, pulsa «Crear zombi» y confirma la transacción. Debe aparecer una tarjeta de zombi.
2. **Consultar:** pulsa «Actualizar ejército». La consulta no debe abrir una confirmación de firma.
3. **Subir nivel:** introduce ID `0`, paga `0.001 ETH` y comprueba que el nivel pasa de 1 a 2.
4. **Error por duplicación:** intenta crear otro zombi inicial con la misma cuenta. El contrato debe rechazarlo.
5. **Cambiar cuenta:** cambia a otra cuenta en MetaMask, vuelve a conectar y observa que cambia el ejército.
6. **Alimentar:** esta opción **requiere un contrato CryptoKitties compatible configurado**. Sin él, es normal que falle; no es una demostración funcional completa por defecto.

## Qué hace cada función JavaScript

| Función | Archivo | Propósito | Capítulo |
|---|---|---|---|
| `connect()` | `app.js` | Solicita cuentas y crea la instancia del contrato | 2, 3, 5 |
| `refresh()` | `app.js` | Recupera IDs, consulta zombis y actualiza HTML | 4, 6 |
| `send()` | `app.js` | Firma y envía operaciones que cambian el estado | 7, 8 |
| `bind()` | `app.js` | Asocia botones y formularios con acciones | 7, 8 |
| `normalizeZombie()` | `app-core.js` | Convierte datos ABI a un formato uniforme | 6 |
| `escapeHtml()` | `app-core.js` | Evita interpretar nombres como HTML | 6 |
| `renderZombie()` | `app-core.js` | Genera la tarjeta de cada zombi | 6 |
| `feeToWei()` | `app-core.js` | Convierte la tarifa ETH a wei | 8 |
| `isReady()` | `app-core.js` | Compara el cooldown con la hora indicada | 6 |

## Limitaciones que debes poder explicar

- `call()` lee, `send()` escribe; el usuario firma las transacciones de escritura.
- El código del frontend está adaptado a MetaMask actual. No es una copia literal del `index.html` histórico de la lección.
- La dirección del contrato depende de la red y el despliegue. El ABI debe corresponder al contrato compilado.
- `feedOnKitty()` requiere una dependencia externa no incluida en este laboratorio.
- El contrato Solidity conserva peculiaridades históricas heredadas de Lección 5: `_transfer()` descuenta `ownerZombieCount[msg.sender]` en vez de `_from`, y `transferFrom()` no valida que `_from` sea el propietario efectivo. Las pruebas documentan estos casos, no los corrigen.
- `levelUp()` no comprueba la propiedad del zombi: permite pagar por subir el nivel de otro zombi.
- La aleatoriedad de `attack()` no es criptográficamente segura.
- Las suscripciones a eventos en tiempo real pueden no funcionar con todos los proveedores; existe actualización manual.
- Esta demostración no constituye una aplicación de producción ni un ERC-721 moderno y auditado.

## Preguntas para una defensa oral

1. ¿Qué diferencia hay entre el proveedor de MetaMask y Web3.js?
2. ¿Por qué necesitas ABI y dirección y qué ocurre si uno es incorrecto?
3. ¿Por qué `getZombiesByOwner()` usa `call()` y `createRandomZombie()` usa `send()`?
4. ¿Quién paga gas y quién recibe el `value` enviado a `levelUp()`?
5. ¿Por qué `0.001 ether` debe representarse en wei?
6. ¿Qué ocurre cuando el usuario rechaza una firma?
7. ¿Qué es un evento `Transfer` y qué significa `indexed`?
8. ¿Por qué se debe refrescar el ejército al cambiar de cuenta?
9. ¿Por qué una transferencia aprobada puede revertir en este contrato histórico?
10. ¿Qué diferencia hay entre probar una función de frontend y probar Solidity en un nodo local?

## Relación con las lecciones anteriores

- **Lecciones 1–3:** estructuras, ADN, propiedad, alimentación, herencia y modificadores.
- **Lección 4:** pagos, cooldown y ataques.
- **Lección 5:** ERC-721, autorizaciones, transferencias y SafeMath.
- **Lección 6:** el usuario accede a todas esas funcionalidades mediante HTML, JavaScript, Web3.js y MetaMask.

El núcleo de la Lección 6 es la **integración frontend ↔ blockchain**, no la introducción de nuevas reglas del contrato.
