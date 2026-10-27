# PharmaChain-Ethereum — Ejercicio 5

**Práctica 1 · Tecnologías de Registro Distribuido y Blockchain · Universidade de Vigo · 2026–2027**

Prototipo académico de trazabilidad farmacéutica en Ethereum: registra lotes, administra permisos, propone y acepta transferencias de custodia y permite comparar implementaciones por comportamiento y consumo de gas.

> **Alcance:** demostración en una red local Hardhat. No verifica la autenticidad física de medicamentos, no es una solución sanitaria certificada y no debe exponerse a Internet con las cuentas desbloqueadas del laboratorio.

## Índice y documentación

- **Este README**: motivación, actores, arquitectura, contratos, decisiones, comparativas lógicas y pruebas.
- **[Guía de instalación y demostraciones](docs/GUIA_USO.md)**: comandos exactos, cuentas, operaciones, auditoría, errores habituales.
- **[Benchmarks y optimización](docs/BENCHMARK.md)**: tabla comparativa de versiones, experimentos V7–V12, gas, metodología y resultados.

## 1. Problema y justificación

La distribución de medicamentos requiere conocer quién fabrica un lote, quién lo recibe, quién lo custodia y cómo cambia esa responsabilidad. En un registro centralizado, una sola organización administra las operaciones; con un contrato inteligente, varias entidades pueden verificar y ejecutar reglas compartidas. Ethereum aporta estado verificable, eventos de auditoría y autorización ejecutada por la EVM. **No garantiza la veracidad del dato introducido**: la identificación física del lote, las entregas y la temperatura requieren controles externos.

**Objetivos:** (1) modelar roles y lotes; (2) impedir cambios de custodia no autorizados; (3) probar transferencias laboratorio → distribuidor → farmacia; (4) comparar roles manuales con OpenZeppelin; (5) optimizar gas sin ocultar cambios funcionales; (6) construir una demo visual y reproducible.

## 2. Actores y reglas

| Actor                | Cuenta local de demostración | Responsabilidad                                      |
| -------------------- | ---------------------------- | ---------------------------------------------------- |
| Administrador        | 0                            | Configuración y administración de permisos           |
| Laboratorio          | 1                            | Registro y primera transferencia                     |
| Distribuidor         | 2                            | Recepción y entrega posterior                        |
| Farmacia             | 3                            | Recepción final                                      |
| Cuenta no autorizada | Según escenario              | Comprobar que el contrato rechaza acciones indebidas |

Las cuentas indicadas corresponden al escenario local documentado; **no son direcciones fijas de Ethereum**.

**Secuencia de custodia:**

```text
Laboratorio (registra lote)
       │ propone transferencia
       ▼
Distribuidor (acepta) ──> pasa a ser propietario/custodio
       │ propone transferencia
       ▼
Farmacia (acepta) ──────> pasa a ser propietario/custodio
```

**Regla clave:** una propuesta pendiente no modifica el propietario; el cambio sucede únicamente tras la aceptación por el destinatario. Las pruebas contemplan rechazos de saltos no permitidos, datos vacíos, lotes inexistentes, propuestas duplicadas y acciones de cuentas incorrectas.

## 3. Modelo de datos y lógica Solidity

En las implementaciones de referencia se emplean estructuras conceptualmente equivalentes a:

```solidity
struct Lote {
    string nombre;
    string fabricante;
    address propietario;
    uint256 fechaRegistro;
    bool activo;
}
struct Transferencia {
    address origen;
    address destino;
    bool pendiente;
}
mapping(uint256 => Lote) public lotes;
mapping(uint256 => Transferencia) public transferencias;
```

- **`mapping` por identificador:** consulta directa de un lote sin búsqueda lineal. No enumera claves; se complementa con el contador de lotes y/o eventos.
- **`address` como custodio:** permite aplicar autorización mediante `msg.sender`.
- **`block.timestamp`:** fecha de referencia de la cadena; no es una prueba de entrega física.
- **`bool activo`:** representa la posibilidad de operar sobre un lote según las validaciones del contrato.
- **Transferencia separada del lote:** permite conservar el custodio mientras existe una propuesta pendiente.
- **Eventos:** facilitan auditoría e indexación; **no** pueden ser leídos retroactivamente por otro contrato como si fueran almacenamiento.

### Operaciones y verificaciones

| Operación              | Quién actúa                   | Condición principal                     | Efecto                         |
| ---------------------- | ----------------------------- | --------------------------------------- | ------------------------------ |
| Registrar lote         | Laboratorio autorizado        | Datos válidos y rol                     | Nuevo ID y propietario inicial |
| Proponer transferencia | Custodio autorizado           | Lote válido y destino admitido          | Marca propuesta pendiente      |
| Aceptar                | Destinatario                  | Debe coincidir con el destino pendiente | Cambia el custodio             |
| Cancelar               | Según política de la variante | Transferencia pendiente y permisos      | Elimina/cancela propuesta      |
| Desactivar             | Cuenta autorizada             | Lote existente y reglas de estado       | Lote inactivo                  |
| Asignar/revocar rol    | Administrador autorizado      | Permiso de administración               | Cambia autorización            |

La firma exacta de cada función se consulta en `contracts/`; esta tabla describe el flujo probado y no pretende sustituir la ABI.

## 4. Dos estrategias de autorización: por qué se comparan

| Criterio          | `PharmaChainRolesManuales`                              | `PharmaChainRolesOpenZeppelin`            |
| ----------------- | ------------------------------------------------------- | ----------------------------------------- |
| Modelo de roles   | Un rol principal por cuenta en la versión de referencia | `AccessControl`, varios roles por cuenta  |
| Gestión           | Código propio                                           | Infraestructura OpenZeppelin              |
| Ventaja académica | Entender cada verificación y su coste                   | Evaluar un estándar reutilizable          |
| Extensión         | Requiere adaptar lógica propia                          | `grantRole`, `revokeRole`, jerarquías     |
| Dependencias      | Menores                                                 | `@openzeppelin/contracts`                 |
| Comparabilidad    | No tiene idéntica semántica que OZ                      | No atribuir diferencias solo a eficiencia |
| Gas               | Medir, no asumir                                        | Medir, no asumir                          |

**Decisión:** mantener ambas familias. La versión manual es una línea base sencilla; OpenZeppelin aporta flexibilidad y reutilización. La elección de un contrato para producción exige evaluar permisos, administración y seguridad, no únicamente gas.

## 5. Versiones principales y optimización

| Versión de la UI | Contrato                                | Rasgo                           | Comparación justa |
| ---------------- | --------------------------------------- | ------------------------------- | ----------------- |
| V0               | `PharmaChainRolesManuales`              | Manual original                 | V2                |
| V1               | `PharmaChainRolesOpenZeppelin`          | OpenZeppelin original           | V3                |
| V2               | `PharmaChainRolesManualesOptimized`     | Core optimizado, roles manuales | V0                |
| V3               | `PharmaChainRolesOpenZeppelinOptimized` | Core optimizado, AccessControl  | V1                |

El repositorio también incluye `Optimized1`, `OptimizednoID`, `contracts/core/`, `contracts/access/` y `contracts/gas-lab/`. No se deben considerar equivalentes por su nombre: las variantes pueden modificar almacenamiento, ABI o consultas disponibles. Véase [BENCHMARK.md](docs/BENCHMARK.md) para las versiones V7–V12 y sus efectos.

**Principio experimental:** comparar original frente a optimizado **dentro de la misma familia de permisos**. El coste de gas depende del bytecode, la operación, el estado, el compilador y el optimizador, no del nombre del framework.

## 6. Arquitectura y herramientas

```text
Navegador
  ├── Operations Studio (http://localhost:3100/operations.html)
  ├── Validation Studio (http://localhost:3100)
  ├── Benchmark (http://localhost:3100/benchmark.html)
  └── Frontend Vite (http://localhost:5173)
                    │
                    ▼
         Express / Web3.js (lab/server.cjs)
                    │ JSON-RPC
                    ▼
        Hardhat Network (127.0.0.1:8545)
                    │
      ┌─────────────┴──────────────┐
      │ contratos manuales y OZ    │
      │ originales y optimizados   │
      └─────────────┬──────────────┘
                    │ recibos / logs
                    ▼
        CSV y JSON de resultados
```

| Herramienta      | Uso y razón de elección                                          |
| ---------------- | ---------------------------------------------------------------- |
| Solidity         | Lógica ejecutada por la EVM                                      |
| Hardhat 3        | Nodo local, compilación, tests y benchmark reproducible          |
| Truffle 5        | Migraciones y pruebas de compatibilidad; herramienta legada      |
| OpenZeppelin     | Gestión estándar de roles; comparación con implementación propia |
| Web3.js 4        | Transacciones, recibos y gas en el laboratorio                   |
| Ethers.js / viem | Integraciones y pruebas según configuración del proyecto         |
| Express          | API local para interfaz y operaciones                            |
| Vite             | Frontend independiente                                           |
| Mocha            | Ejecución de suites de tests                                     |
| Git              | Control de versiones y reproducibilidad                          |
| Remix IDE        | Validación manual exigida por la práctica                        |
| CSV / JSON       | Resultados verificables y exportables                            |

**No es necesario instalar geth:** Hardhat proporciona un nodo local compatible con JSON-RPC.

## 7. Estructura relevante

```text
PharmaChain-Ethereum/
├── contracts/             # Contratos y experimentos de gas
│   ├── access/
│   ├── core/
│   └── gas-lab/
├── test/                  # Suites Hardhat
├── truffle-tests/         # Integración Truffle
├── migrations/            # Despliegue de cuatro variantes UI
├── lab/                   # API y paneles de demostración
│   ├── server.cjs
│   ├── variants.json
│   └── public/
├── frontend/              # Frontend Vite
├── scripts/               # Comparaciones y validación
├── gas-reports/           # Experimentos extendidos
├── reports/               # Comparación de gas y frameworks
├── hardhat.config.ts
├── truffle-config.cjs
└── docs/
    ├── GUIA_USO.md
    └── BENCHMARK.md
```

## 8. Pruebas y evidencia

Pruebas identificadas en el repositorio: `ComparacionPermisos`, `FuncionalidadCompartida`, `FourVariantsParity`, `OptimizedParity`, `HistorialCustodia`, `LoteSinId`, `GasComparison`, `GasExperiments`, `GasLabExtended`, `GasLabInvariants`, `PharmaGasLab` y `VariantCatalog`.

Se comprueban registro, validación, eventos, timestamps, permisos, custodia, propuestas, aceptaciones, cancelaciones, desactivación y paridad entre variantes. La cobertura exacta y el número de tests superados deben extraerse de la ejecución actual, no deducirse de los nombres de los archivos.

```bash
npm ci
npm test
npm run gas:csv
npm run benchmark:frameworks
```

Las pruebas negativas con `eth_call` comprueban condiciones de rechazo, pero **no producen `gasUsed` de una transacción minada**. Las pruebas positivas modifican el estado local. La auditoría visual no sustituye un análisis de seguridad completo.

## 9. Demostración de extremo a extremo

Consultar **[docs/GUIA_USO.md](docs/GUIA_USO.md)** para el procedimiento detallado. Resumen:

1. Arrancar `npm run chain`.
2. Compilar y migrar con Truffle.
3. Arrancar `npm run lab`.
4. Abrir `http://localhost:3100/operations.html`.
5. Seleccionar contrato y configurar roles de demostración.
6. Registrar un medicamento desde laboratorio.
7. Proponer y aceptar laboratorio → distribuidor.
8. Proponer y aceptar distribuidor → farmacia.
9. Consultar custodio, historial, hash, bloque y gas.
10. Ejecutar controles negativos, auditoría y exportar JSON/CSV.

**Importante:** reiniciar Hardhat Network elimina el estado de la cadena local; hay que repetir migraciones y configuración de roles.

## 10. Limitaciones y mejoras futuras

- **Seguridad:** análisis estático con Slither, fuzzing Foundry/Echidna, invariantes y control de cambios ABI.
- **Datos:** identificadores GS1, caducidad, retiradas y validación de entregas mediante sistemas externos.
- **Privacidad:** evitar almacenar información sensible en claro en una red pública.
- **Frontend:** wallet externa para redes públicas, seguimiento de confirmaciones, búsqueda y exportación.
- **Benchmarks:** comparar versiones de solc, `optimizer.runs`, `viaIR`, bytecode y escenarios con muchos lotes.
- **Operación:** CI con GitHub Actions, cobertura, versionado de contratos y registro de despliegues.

## 11. Referencias

- [Ethereum Developer Documentation](https://ethereum.org/en/developers/docs/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [Hardhat](https://hardhat.org/docs)
- [Truffle (archivo histórico)](https://archive.trufflesuite.com/docs/)
- [Web3.js](https://docs.web3js.org/)
- [Ethers.js](https://docs.ethers.org/)
- [OWASP Smart Contract Security](https://scs.owasp.org/)
- [Slither](https://github.com/crytic/slither)
- [GS1 Standards](https://www.gs1.org/standards)
- [Reglamento Delegado (UE) 2016/161](https://eur-lex.europa.eu/eli/reg_del/2016/161/oj)

## 12. Conclusión

El valor del ejercicio no es solo ejecutar una transferencia en Solidity, sino **justificar un modelo de permisos**, probar que la custodia cambia únicamente cuando corresponde y medir si una optimización conserva las garantías del contrato. La elección final debe equilibrar **seguridad, funcionalidad, mantenibilidad y gas**.
