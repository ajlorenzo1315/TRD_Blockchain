# Ejercicio 4 — Integración de OpenZeppelin en TokenContract

## 1. Objetivo

El objetivo de este ejercicio es **escoger y probar un contrato de la biblioteca OpenZeppelin Solidity** y guardar el resultado en un archivo `.sol` dentro del repositorio. En lugar de crear un ejemplo independiente, se ha adaptado el contrato `TokenContract` del ejercicio anterior para utilizar los contratos **ERC20** y **Ownable** de OpenZeppelin.

El contrato resultante, `TokenContractOpenZeppelin.sol`, mantiene el registro de usuarios, el regalo de tokens y la compra con ETH, pero delega en OpenZeppelin la contabilidad y transferencia de los tokens y el control de acceso del propietario.

## 2. Bibliotecas utilizadas

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenContractOpenZeppelin is ERC20, Ownable {
  // ...
}
```

- **ERC20:** implementa el estándar de tokens fungibles. Proporciona `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom`, `totalSupply` y los eventos estándar.
- **Ownable:** gestiona el propietario mediante `owner()` y restringe operaciones con `onlyOwner`.

La implementación usa la interfaz de **OpenZeppelin Contracts 5.x**, cuyo constructor de `Ownable` recibe la dirección inicial del propietario.

## 3. Modificaciones respecto al ejercicio anterior

| Elemento                | Antes: `TokenContract`                      | Ahora: `TokenContractOpenZeppelin`                               | Motivo                                                                              |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Propietario             | Variable `address public owner`             | `Ownable(msg.sender)` y `owner()`                                | Reutilizar control de propiedad de OpenZeppelin.                                    |
| Restricción de permisos | Modificador `onlyOwner` escrito manualmente | `onlyOwner` heredado                                             | Evitar repetir la comprobación de permisos.                                         |
| Saldos                  | `users[direccion].tokens`                   | `balanceOf(direccion)`                                           | Una sola fuente de verdad para los tokens.                                          |
| Tokens iniciales        | `users[owner].tokens = 100`                 | `_mint(msg.sender, 100 * 10 ** decimals())`                      | Crear 100 tokens ERC-20 reales.                                                     |
| Transferencia interna   | Restar y sumar valores del `mapping`        | `_transfer(owner(), receptor, unidades)`                         | Utilizar la contabilidad y el evento `Transfer` de ERC-20.                          |
| Registro de nombres     | `users[direccion].name`                     | Se conserva                                                      | Mantener la funcionalidad del ejercicio anterior.                                   |
| Regalos                 | `giveToken`                                 | Se conserva, utilizando `_transferTokens` y `onlyOwner` heredado | Preservar la lógica de negocio.                                                     |
| Compra                  | `buyTokens`                                 | Se conserva, pagando 5 ETH por token                             | Mantener el caso de uso.                                                            |
| Precio                  | `TOKEN_PRICE = 5 ether`                     | Se conserva                                                      | Mantener el precio original.                                                        |
| Consulta de saldo       | `users[direccion].tokens`                   | `getUser`, `getMyTokens`, `getUserTokens` y `balanceOf`          | Facilitar consultas sin duplicar saldos.                                            |
| Saldo ETH               | `getContractBalance()` en wei               | Consulta en ETH enteros y consulta exacta en wei                 | Hacer la salida más legible sin perder la posibilidad de comprobar el valor exacto. |

### 3.1. Propiedad: de `owner` manual a `Ownable`

**Antes:**

```solidity
address public owner;

modifier onlyOwner() {
    require(msg.sender == owner);
    _;
}

constructor() {
    owner = msg.sender;
}
```

**Ahora:**

```solidity
constructor()
    ERC20("Token Practica", "TPR")
    Ownable(msg.sender)
{
    _mint(msg.sender, 100 * 10 ** decimals());
}
```

`Ownable` asigna el propietario al desplegar el contrato y proporciona el modificador `onlyOwner` utilizado en `giveToken`. El propietario se consulta con `owner()`.

### 3.2. Saldos: del `mapping` propio a ERC-20

**Antes:**

```solidity
struct Receivers {
    string name;
    uint256 tokens;
}

mapping(address => Receivers) public users;
```

**Ahora:**

```solidity
struct Receivers {
    string name;
}

mapping(address => Receivers) public users;
```

Se conserva el nombre, pero **se elimina `tokens` de la estructura** porque ERC-20 ya almacena los saldos. Mantener ambas contabilidades podría producir inconsistencias si un usuario utiliza `transfer()` o `transferFrom()` directamente.

Para consultar nombre y tokens completos se añadió:

```solidity
function getUser(address _user)
    public view
    returns (string memory name, uint256 tokens)
{
    return (
        users[_user].name,
        balanceOf(_user) / 1 ether;
    );
}
```

`balanceOf()` devuelve las **unidades mínimas** del token. Por defecto, ERC-20 utiliza 18 decimales: 5 TPR equivalen a `5000000000000000000` unidades. Dividir por `10 ** decimals()` permite mostrar `5`, pero **trunca las fracciones**: para conocer el saldo exacto debe utilizarse `balanceOf()`.

### 3.3. Emisión inicial con `_mint`

**Antes:**

```solidity
users[owner].tokens = 100;
```

**Ahora:**

```solidity
_mint(msg.sender, 100 * 10 ** decimals());
```

`_mint` crea 100 TPR para quien despliega el contrato y actualiza el suministro total (`totalSupply`). El nombre y símbolo se establecen con `ERC20("Token Practica", "TPR")`.

### 3.4. Transferencias con `_transfer`

**Antes:**

```solidity
users[owner].tokens -= _amount;
users[_receiver].tokens += _amount;
```

**Ahora:**

```solidity
uint256 units = _amount * 10 ** decimals();
require(balanceOf(owner()) >= units, "No quedan suficientes tokens");
_transfer(owner(), _receiver, units);
```

La función interna `_transferTokens` también verifica que la cantidad sea mayor que cero y que el receptor no sea la dirección cero. `_transfer` actualiza los saldos ERC-20 y emite el evento estándar `Transfer`.

### 3.5. Funciones conservadas

- **`double(uint256)`**: devuelve el doble del valor recibido; es `pure`.
- **`register(string)`**: asocia un nombre a `msg.sender`.
- **`giveToken(address,uint256)`**: solo el propietario puede regalar tokens; utiliza `_transferTokens` y emite `TokensGifted`.
- **`buyTokens(uint256)`**: cualquier usuario puede comprar tokens pagando ETH; utiliza `_transferTokens` y emite `TokensPurchased`.
- **`TOKEN_PRICE`**: se mantiene en `5 ether` por token.

En `buyTokens` se exige **pago exacto**:

```solidity
require(msg.value == _amount * TOKEN_PRICE, "Ether incorrecto");
```

Esto cambia ligeramente el ejercicio anterior, que aceptaba pagos superiores al precio. Ahora un pago incorrecto revierte toda la operación.

### 3.6. Nuevas consultas legibles

- **`getUser(address)`**: devuelve nombre y tokens completos de una dirección.
- **`getMyTokens()`**: devuelve los tokens completos de `msg.sender`.
- **`getUserTokens(address)`**: devuelve los tokens completos de la dirección indicada; es una comodidad adicional a `balanceOf`.
- **`getContractBalance()`**: devuelve ETH completos (`address(this).balance / 1 ether`).
- **`getContractBalanceWei()`**: devuelve el saldo exacto del contrato en wei.

**Ejemplo:** tras recibir 5 ETH, `getContractBalance()` devuelve `5`, mientras que `getContractBalanceWei()` devuelve `5000000000000000000`. La primera consulta trunca cualquier parte fraccionaria.

## 4. Cómo probar el contrato en Remix

1. Abrir [Remix IDE](https://remix.ethereum.org/).
2. Crear `TokenContractOpenZeppelin.sol` y pegar el código fuente.
3. Seleccionar el compilador compatible con el `pragma` del archivo (por ejemplo, **0.8.34** si se utiliza `pragma solidity 0.8.34;`). **La versión debe coincidir** cuando el `pragma` es exacto.
4. Compilar el contrato. Remix resolverá los imports de OpenZeppelin cuando disponga de acceso a la dependencia.
5. En **Deploy & Run Transactions**, elegir **Remix VM** para usar cuentas y ETH simulados.
6. Seleccionar la primera cuenta, establecer **VALUE = 0** y desplegar el contrato.
7. Ejecutar las pruebas de la siguiente tabla.

### Pruebas propuestas

| Nº  | Cuenta     | Operación                                  | Resultado esperado                               |
| --- | ---------- | ------------------------------------------ | ------------------------------------------------ |
| 1   | Account 1  | `owner()`                                  | Dirección de Account 1.                          |
| 2   | Cualquiera | `name()` y `symbol()`                      | `Token Practica` y `TPR`.                        |
| 3   | Cualquiera | `totalSupply()`                            | `100000000000000000000` unidades mínimas.        |
| 4   | Account 1  | `getMyTokens()`                            | `100` TPR.                                       |
| 5   | Cualquiera | `double(5)`                                | `10`.                                            |
| 6   | Account 2  | `register("Ana")`                          | `getUser(Account 2)` devuelve `Ana` y `0`.       |
| 7   | Account 1  | `giveToken(Account 2, 10)`                 | Account 1: 90 TPR; Account 2: 10 TPR.            |
| 8   | Account 2  | `giveToken(Account 1, 1)`                  | Revierte: no es el propietario.                  |
| 9   | Account 2  | `buyTokens(1)` con **VALUE = 5 Ether**     | Account 1: 89 TPR; Account 2: 11 TPR.            |
| 10  | Cualquiera | `getContractBalance()`                     | `5`.                                             |
| 11  | Cualquiera | `getContractBalanceWei()`                  | `5000000000000000000`.                           |
| 12  | Account 1  | `transfer(Account 2, 5000000000000000000)` | Transfiere 5 TPR; Account 1: 84 y Account 2: 16. |
| 13  | Cualquiera | `getUser(Account 2)`                       | `Ana`, `16`.                                     |

> **Importante:** en `giveToken` y `buyTokens` se introducen cantidades de **tokens completos** (por ejemplo, `10` o `1`). En la función estándar `transfer` de ERC-20 se introducen **unidades mínimas** (por ejemplo, `5000000000000000000` para 5 TPR). Para la compra, establecer `VALUE` en **5 Ether**, no en 5 wei.

### Capturas recomendadas

Guardar, si se solicitan evidencias, capturas de la compilación, despliegue, suministro inicial, regalo, compra, consulta de saldo y transferencia estándar ERC-20. Se pueden organizar en una carpeta `images/` y enlazarlas desde este README.

## 5. Limitaciones y decisiones de diseño

1. **Inventario en la cuenta del propietario.** Las ventas y regalos transfieren tokens desde `owner()`. Si cambia el propietario con `transferOwnership`, los tokens no se mueven automáticamente a la nueva dirección.
2. **ETH acumulado sin retirada.** El contrato permite recibir ETH mediante `buyTokens`, pero esta versión no incorpora una función para retirar el saldo.
3. **Consultas de tokens enteros.** `getUser`, `getMyTokens` y `getUserTokens` truncan fracciones; `balanceOf` mantiene la precisión completa.
4. **Precio fijo.** `TOKEN_PRICE` vale 5 ETH por token y no puede modificarse.
5. **Pruebas en entorno local.** Se utiliza Remix VM para evitar necesitar ETH real o una gran cantidad de ETH de Sepolia.

Estas limitaciones no impiden probar el objetivo del ejercicio: integrar y ejecutar contratos de OpenZeppelin.

## 6. Conclusión

La adaptación de `TokenContract` a OpenZeppelin permite **reutilizar implementaciones estándar** y reducir la lógica manual del contrato. `ERC20` se ocupa de los saldos, el suministro y las transferencias, mientras que `Ownable` proporciona el control de propiedad. La lógica específica del ejercicio —registro, regalos y compra de tokens por ETH— se mantiene, con mejoras en la validación y las consultas.

## 7. Referencias

- [OpenZeppelin Contracts — ERC-20](https://docs.openzeppelin.com/contracts/5.x/erc20)
- [OpenZeppelin Contracts — Access Control / Ownable](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [Solidity — Documentación oficial](https://docs.soliditylang.org/)
- [Remix IDE](https://remix.ethereum.org/)
