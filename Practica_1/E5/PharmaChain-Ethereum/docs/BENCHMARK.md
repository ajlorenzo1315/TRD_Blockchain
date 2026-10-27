# PharmaChain-Ethereum — Memoria técnica, benchmark y laboratorio de gas

> **Ejercicio E5 · Ethereum local · Solidity 0.8.34 · Hardhat/Truffle · frontend Vite.** Documento de resultados basado en los CSV disponibles y la documentación aportada. Los números son mediciones registradas, no una nueva ejecución de tests.

## 1. Objetivo y arquitectura

PharmaChain implementa trazabilidad de lotes farmacéuticos mediante registro, propuesta, aceptación y cancelación de transferencias, desactivación, historial y autorización por actores (administrador, laboratorio, distribuidor, farmacia). Se comparan dos políticas: **roles manuales** (rol exclusivo por cuenta) y **OpenZeppelin AccessControl** (roles múltiples y administración más flexible). Una red Hardhat local (chain ID 31337) permite operar sin costes reales; Truffle se utiliza para migraciones y comparación de herramientas; Web3.js y ethers interactúan con los contratos, mientras que Vite sirve la interfaz y el laboratorio Express presenta escenarios y recibos.

### 1.1 Flujo funcional

1. Administrador configura roles. 2. Laboratorio registra lote. 3. Custodio propone transferencia a distribuidor. 4. Destinatario acepta. 5. Distribuidor propone a farmacia y esta acepta. 6. Se registra la custodia y pueden estudiarse cancelación, pausa y desactivación. El contrato rechaza actores no autorizados y saltos de etapa.

### 1.2 Catálogo del frontend: V0–V7

| Selector | Contrato Solidity                               | Propósito                 |
| -------- | ----------------------------------------------- | ------------------------- |
| V0       | `PharmaChainRolesManuales.sol`                  | Referencia manual         |
| V1       | `PharmaChainRolesOpenZeppelin.sol`              | Referencia AccessControl  |
| V2       | `PharmaChainRolesManualesOptimized.sol`         | Optimización manual       |
| V3       | `PharmaChainRolesOpenZeppelinOptimized.sol`     | Optimización OpenZeppelin |
| V4       | `PharmaChainRolesManualesOptimized1.sol`        | Segunda iteración manual  |
| V5       | `PharmaChainRolesOpenZeppelinOptimized1.sol`    | Segunda iteración OZ      |
| V6       | `PharmaChainRolesManualesOptimizednoID.sol`     | Manual sin ID redundante  |
| V7       | `PharmaChainRolesOpenZeppelinOptimizednoID.sol` | OZ sin ID redundante      |

**Aviso:** esta numeración de ocho contratos no equivale a V0–V12 del laboratorio de gas. Comparar versiones dentro de la misma familia para atribuir ahorros; la semántica de permisos es distinta entre familias.

## 2. GasLab: trece técnicas V0–V12 en dos familias

| Variante GasLab         | Técnica investigada                                           | Motivo                                     | Limitaciones y riesgos                         |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| V0Base                  | Referencia sin optimizar                                      | Establecer control experimental            | Conservar ABI y reglas originales              |
| V1Roles                 | Optimización de comprobaciones de rol                         | Estudiar coste del control de acceso       | No confundir roles manuales con AccessControl  |
| V2Errores               | Errores personalizados en vez de revert strings               | Reducir bytecode y codificación de revert  | Cambian los selectores de error                |
| V3Storage               | Referencias storage frente a copias memory                    | Evitar copias o accesos redundantes        | No garantiza mejoras por operación             |
| V4Unchecked             | Aritmética unchecked donde el overflow se considera imposible | Eliminar comprobaciones aritméticas        | Requiere prueba del límite del contador        |
| V5Combinada             | Combinación de técnicas previas                               | Estudiar interacción y efectos no aditivos | No sumar porcentajes aislados                  |
| V6SinId                 | Eliminar identificador redundante dentro del lote             | Evitar almacenamiento SSTORE innecesario   | Adaptar getter y estructura                    |
| V7LotePacked            | uint64 timestamp + address propietario + bool activo          | Packing de slots de lote                   | Cambia ABI/layout                              |
| V8HistorialPacked       | Packing de Movimiento: address, uint64, enum, address         | Reducir slots del historial                | Cambia ABI/layout                              |
| V9TransferenciaCompacta | Almacenar solo destino y deducir origen del propietario       | Eliminar estado duplicado                  | Requiere invariante de propietario             |
| V10PackingCombinado     | V7+V8+V9                                                      | Medir combinación de almacenamiento        | ABI/layout modificados                         |
| V11SoloEventos          | Historial en eventos en vez de array persistente              | Eliminar escrituras del historial          | No permite consulta on-chain del histórico     |
| V12EventosCompacta      | V10+historial solo eventos                                    | Estudiar ahorro extremo                    | Cambia interfaz y disponibilidad del historial |

Los contratos se replican en las familias `Manual` y `OZ`: **2 × 13 = 26**. El documento GasLab EXT describe 156 escenarios previstos de suite principal y 36 de invariantes, pero ese diseño no debe interpretarse automáticamente como 192 tests superados.

## 3. Tabla de gas real: comparación de las 26 variantes

**Fuente:** `gas-reports/pharmachain-extended.csv`. Unidades: gas de transacción o despliegue; cada fila corresponde a una familia y una variante. `register_len_1` y `register_len_32` son casos distintos; las longitudes de cadenas cambian el coste.

### 3.1 Familia Manual

| Variante                | Despliegue | Registro 1 | Registro 32 | Propuesta | Aceptación | Cancelación admin |
| ----------------------- | ---------: | ---------: | ----------: | --------: | ---------: | ----------------: |
| V0Base                  |  1.705.592 |    255.574 |     261.086 |   154.062 |    113.202 |            98.899 |
| V1Roles                 |  1.692.614 |    255.574 |     261.086 |   154.055 |    113.195 |            98.899 |
| V2Errores               |  1.485.444 |    255.574 |     261.086 |   154.062 |    113.202 |            98.899 |
| V3Storage               |  1.686.979 |    255.574 |     261.086 |   153.832 |    113.085 |            98.899 |
| V4Unchecked             |  1.694.536 |    255.414 |     260.926 |   154.062 |    113.202 |            98.899 |
| V5Combinada             |  1.442.863 |    255.414 |     260.926 |   153.825 |    113.078 |            98.899 |
| V6SinId                 |  1.429.226 |    233.260 |     238.772 |   153.825 |    113.063 |            98.899 |
| V7LotePacked            |  1.448.469 |    189.106 |     194.618 |   151.842 |    111.080 |            98.899 |
| V8HistorialPacked       |  1.441.596 |    230.987 |     236.499 |   131.652 |     90.890 |            76.726 |
| V9TransferenciaCompacta |  1.411.501 |    233.260 |     238.772 |   131.648 |    112.457 |           100.789 |
| V10PackingCombinado     |  1.440.096 |    186.953 |     192.465 |   107.516 |     88.325 |            78.640 |
| V11SoloEventos          |  1.282.803 |    166.580 |     172.092 |    84.317 |     43.577 |            31.193 |
| V12EventosCompacta      |  1.284.334 |    122.426 |     127.938 |    60.157 |     40.988 |            31.281 |

### 3.2 Familia OZ

| Variante                | Despliegue | Registro 1 | Registro 32 | Propuesta | Aceptación | Cancelación admin |
| ----------------------- | ---------: | ---------: | ----------: | --------: | ---------: | ----------------: |
| V0Base                  |  1.736.264 |    255.740 |     261.252 |   154.260 |    113.443 |           101.301 |
| V1Roles                 |  1.737.344 |    255.740 |     261.252 |   154.253 |    113.436 |           101.301 |
| V2Errores               |  1.570.343 |    255.740 |     261.252 |   154.253 |    113.436 |           101.301 |
| V3Storage               |  1.718.743 |    255.740 |     261.252 |   154.023 |    113.319 |           101.301 |
| V4Unchecked             |  1.726.324 |    255.580 |     261.092 |   154.253 |    113.436 |           101.301 |
| V5Combinada             |  1.540.696 |    255.580 |     261.092 |   154.023 |    113.319 |           101.301 |
| V6SinId                 |  1.527.071 |    233.426 |     238.938 |   154.023 |    113.304 |           101.301 |
| V7LotePacked            |  1.546.309 |    189.272 |     194.784 |   152.040 |    111.321 |           101.301 |
| V8HistorialPacked       |  1.539.448 |    231.153 |     236.665 |   131.850 |     91.131 |            79.128 |
| V9TransferenciaCompacta |  1.509.351 |    233.426 |     238.938 |   131.846 |    112.698 |           103.191 |
| V10PackingCombinado     |  1.537.922 |    187.119 |     192.631 |   107.714 |     88.566 |            81.042 |
| V11SoloEventos          |  1.373.158 |    166.717 |     172.229 |    84.463 |     43.657 |            33.003 |
| V12EventosCompacta      |  1.374.670 |    122.563 |     128.075 |    60.303 |     41.068 |            33.543 |

### 3.3 Comparación porcentual con V0 de la misma familia

Fórmula: **ahorro (%) = (gas V0 − gas variante) / gas V0 × 100**. Un valor negativo significa empeoramiento. Las cifras siguientes se calculan de los datos anteriores; no implican equivalencia funcional cuando cambia el historial.

| Familia | Variante                | Despliegue % | Registro 1 % | Aceptación % |
| ------- | ----------------------- | -----------: | -----------: | -----------: |
| Manual  | V1Roles                 |      +0.76 % |      +0.00 % |      +0.01 % |
| Manual  | V2Errores               |     +12.91 % |      +0.00 % |      +0.00 % |
| Manual  | V3Storage               |      +1.09 % |      +0.00 % |      +0.10 % |
| Manual  | V4Unchecked             |      +0.65 % |      +0.06 % |      +0.00 % |
| Manual  | V5Combinada             |     +15.40 % |      +0.06 % |      +0.11 % |
| Manual  | V6SinId                 |     +16.20 % |      +8.73 % |      +0.12 % |
| Manual  | V7LotePacked            |     +15.08 % |     +26.01 % |      +1.87 % |
| Manual  | V8HistorialPacked       |     +15.48 % |      +9.62 % |     +19.71 % |
| Manual  | V9TransferenciaCompacta |     +17.24 % |      +8.73 % |      +0.66 % |
| Manual  | V10PackingCombinado     |     +15.57 % |     +26.85 % |     +21.98 % |
| Manual  | V11SoloEventos          |     +24.79 % |     +34.82 % |     +61.51 % |
| Manual  | V12EventosCompacta      |     +24.70 % |     +52.10 % |     +63.79 % |
| OZ      | V1Roles                 |      -0.06 % |      +0.00 % |      +0.01 % |
| OZ      | V2Errores               |      +9.56 % |      +0.00 % |      +0.01 % |
| OZ      | V3Storage               |      +1.01 % |      +0.00 % |      +0.11 % |
| OZ      | V4Unchecked             |      +0.57 % |      +0.06 % |      +0.01 % |
| OZ      | V5Combinada             |     +11.26 % |      +0.06 % |      +0.11 % |
| OZ      | V6SinId                 |     +12.05 % |      +8.73 % |      +0.12 % |
| OZ      | V7LotePacked            |     +10.94 % |     +25.99 % |      +1.87 % |
| OZ      | V8HistorialPacked       |     +11.34 % |      +9.61 % |     +19.67 % |
| OZ      | V9TransferenciaCompacta |     +13.07 % |      +8.73 % |      +0.66 % |
| OZ      | V10PackingCombinado     |     +11.42 % |     +26.83 % |     +21.93 % |
| OZ      | V11SoloEventos          |     +20.91 % |     +34.81 % |     +61.52 % |
| OZ      | V12EventosCompacta      |     +20.83 % |     +52.08 % |     +63.80 % |

## 4. Pruebas de carga y operaciones medidas

| Operación del CSV                    | Qué prueba                                         | Por qué importa                                     |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| `deploy`                             | Desplegar el contrato                              | Coste inicial de publicación                        |
| `runtime_bytes`                      | Longitud de bytecode desplegado, **bytes, no gas** | Límites de tamaño y complejidad                     |
| `role_1, role_2, role_3`             | Configurar tres actores                            | Coste de administración de permisos                 |
| `register_first`                     | Primer registro                                    | Efecto de inicialización de slots                   |
| `register_len_1/31/32/33/64/128/256` | Registrar textos de varias longitudes              | Umbral de 31/32 bytes y expansión de almacenamiento |
| `propose_lab_dist`                   | Laboratorio propone a distribuidor                 | Coste de crear transferencia                        |
| `accept_lab_dist`                    | Distribuidor acepta                                | Coste de actualizar custodio/historial              |
| `propose_dist_pharm`                 | Distribuidor propone a farmacia                    | Segunda etapa de custodia                           |
| `accept_dist_pharm`                  | Farmacia acepta                                    | Segundo cambio de titular                           |
| `cancel_admin`                       | Cancelación administrativa                         | Permisos y borrado de pendiente                     |
| `cancel_dist_pharm`                  | Cancelación del custodio                           | Ruta de cancelación ordinaria                       |
| `repropose_dist_pharm`               | Nueva propuesta tras cancelar                      | Reutilización de slots                              |
| `deactivate_pending`                 | Desactivación con propuesta pendiente              | Coherencia y coste de invalidación                  |
| `pause, resume`                      | Pausar y reanudar                                  | Seguridad operacional y escritura de estado         |
| `cancel_while_paused`                | Cancelar durante pausa                             | Regla de emergencia y costes                        |

**Precaución de datos:** `pharmachain-extended.csv` contiene 49 registros por combinación, pero solo 24 nombres de operación distintos: algunas operaciones se repiten en diferentes escenarios. Para tablas comparativas se usa la primera observación por operación. Si se pretende calcular medias o dispersión, separar escenario y repetición antes de agregar; no promediar estados distintos indiscriminadamente.

## 5. Explicación de cada suite de tests

| Archivo                             | Qué comprueba / objetivo                                                                        | Técnica o evidencia                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `ComparacionPermisos.test.js`       | Roles manuales frente a AccessControl; autorización de atacante, exclusividad y roles múltiples | Pruebas negativas y positivas de control de acceso |
| `FuncionalidadCompartida.test.js`   | Registro, IDs, fechas, eventos, transferencias y reglas de custodia                             | Tests funcionales comunes                          |
| `FourVariantsParity.test.js`        | Paridad de las cuatro variantes principales originales/optimizadas                              | Mismo escenario y comparación de estado            |
| `OptimizedParity.test.js`           | Equivalencia funcional tras optimizaciones                                                      | Regresión y paridad                                |
| `LoteSinId.test.js`                 | Comportamiento de variante que elimina ID almacenado                                            | Pruebas de estructura y consulta                   |
| `HistorialCustodia.test.js`         | Trazabilidad y orden de movimientos                                                             | Invariantes de historial                           |
| `GasComparison.test.js`             | Costes de original frente a optimizado                                                          | Recibos gasUsed                                    |
| `GasExperiments.test.js`            | Microexperimentos cache, custom errors y combinados                                             | Aislamiento de cambios                             |
| `PharmaGasLab.test.js`              | Serie V0–V6: registro, transferencias, roles y despliegue                                       | Benchmark controlado                               |
| `GasLabExtended.test.js`            | 26 contratos; tamaños, registros de 1–256, transferencias, pausa y cancelación                  | Benchmark ampliado y CSV/JSON                      |
| `GasLabInvariants.test.js`          | Invariantes de estado/custodia y seguridad de variantes extendidas                              | Comparación con referencia y casos adversarios     |
| `VariantCatalog.test.cjs`           | Catálogo y metadatos de variantes                                                               | Integridad de configuración de laboratorio         |
| `truffle-tests/pharmachain.test.js` | Roles, transferencia y atacante en Truffle                                                      | Integración por RPC                                |

Las descripciones anteriores identifican la finalidad documentada de las suites y lo inferible de sus nombres; para afirmar el número exacto de `it()` o `describe()` por archivo hay que inspeccionar su código fuente. Las pruebas de revert que fallan en `estimateGas` no proporcionan por ello un recibo `gasUsed` real.

### 5.1 Invariantes que deben mantenerse

- Solo un actor autorizado registra lotes y realiza acciones de su rol.
- El propietario no cambia con una propuesta: cambia tras aceptación válida.
- Solo el destinatario correcto acepta la transferencia pendiente.
- No hay salto directo laboratorio→farmacia.
- No se acepta dos veces una propuesta ni se crean propuestas duplicadas activas.
- La cancelación deja un estado coherente y permite reproponer cuando corresponde.
- La desactivación impide movimientos incompatibles.
- La pausa impide las operaciones sujetas a ella y solo la autoridad puede reanudar.
- La custodia y el historial reflejan el mismo orden de transiciones; en V11/V12 el historial se valida a través de eventos y no de un getter on-chain.

## 6. Inventario de informes del repositorio

| Ruta                                    | Formato / contenido                          | Interpretación                                                         |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `gas-reports/pharmachain-default.csv`   | 287 filas; V0–V6                             | GasLab inicial, familia de referencia                                  |
| `gas-reports/pharmachain-default.json`  | Registros de operaciones                     | Exportación estructurada del benchmark inicial                         |
| `gas-reports/pharmachain-extended.csv`  | 1274 filas; 26 combinaciones                 | GasLab extendido V0–V12 × Manual/OZ                                    |
| `gas-reports/pharmachain-extended.json` | Registros de operaciones                     | Exportación estructurada extendida                                     |
| `gas-reports/comparison-extended.csv`   | 576 filas; baseline/optimized/saved/savedPct | Diferencias por familia, variante y operación                          |
| `gas-reports/gas-experiments.csv`       | 8 filas; Base/Cache/Errors/CacheErrors       | Microbenchmark de despliegue y bytes                                   |
| `gas-reports/pharmachain-gas.csv`       | 32 filas                                     | Comparativa simplificada                                               |
| `reports/gas-comparison.csv`            | Comparación original/optimizado              | Exportación de script gas:csv; no se adjuntó contenido aquí            |
| `reports/framework-benchmark.json`      | Tiempos Hardhat/Truffle                      | No confundir tiempos de suite con gas                                  |
| `reports/test-results_PharmaChain.txt`  | Logs de tests                                | Verificación de tests aprobados/fallidos; no se adjuntó contenido aquí |

### 6.1 Microbenchmark independiente

Fuente: `gas-reports/gas-experiments.csv`. Los bytes no son unidades de gas.

| Variante    | Gas despliegue | Bytecode runtime (bytes) | Ahorro despliegue vs Base |
| ----------- | -------------: | -----------------------: | ------------------------: |
| Base        |      1.730.665 |                    7.766 |                   +0.00 % |
| Cache       |      1.719.194 |                    7.713 |                   +0.66 % |
| Errors      |      1.678.412 |                    7.524 |                   +3.02 % |
| CacheErrors |      1.666.876 |                    7.471 |                   +3.69 % |

**Interpretación:** Cache reduce accesos repetidos en la implementación estudiada; Errors emplea errores personalizados; CacheErrors combina ambas. La combinación requiere medirse: no se suman porcentajes individuales.

## 7. Reproducibilidad y comandos

```bash
npm ci
npx hardhat compile
npx hardhat test mocha test/GasLabExtended.test.js
npx hardhat test mocha test/GasLabInvariants.test.js
npx hardhat test mocha test/PharmaGasLab.test.js
node scripts/analyze-extended.mjs gas-reports/pharmachain-extended.csv
npm run gas:csv
```

Para el laboratorio visual, ejecutar en terminales distintas `npm run chain`, `npm run truffle:compile && npm run truffle:migrate`, y `npm run lab`; abrir `http://localhost:3100`. Si se reinicia Hardhat, los despliegues anteriores dejan de existir. Revisar `package.json` antes de ejecutar scripts no disponibles en la instalación concreta.

### 7.1 Configuración experimental

Registrar versión `solc`, EVM target, `optimizer.enabled`, `optimizer.runs`, `viaIR`, versiones de dependencias, estado inicial y número de repeticiones. Para cambiar el optimizador hay que modificar `hardhat.config.ts` y recompilar; `GAS_RUN_LABEL` únicamente etiqueta el informe. Comparar recibos `gasUsed` de transacciones ejecutadas en condiciones equivalentes. `runtime_bytes` mide tamaño, no gas. El coste monetario se calcula como `gasUsed × effectiveGasPrice`, con conversión de wei a ETH.

### 7.2 Límites de la interpretación

Un contrato con historial solo eventos puede ahorrar mucho gas, pero pierde la consulta del historial desde otros contratos. No es equivalente a uno que almacena un array on-chain. La reducción del tamaño de un tipo no ahorra necesariamente slots si no existe empaquetamiento real. Los roles OZ y manuales difieren funcionalmente. Los CSV son evidencia de medición, no de auditoría de seguridad completa.

## 8. Decisiones de optimización y procedencia

| Decisión               | Procedencia documentable                                                       | Evidencia requerida                            |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Errores personalizados | Técnicas de optimización EVM; documentación Solidity y referencias compartidas | Comparar V0→V2                                 |
| Acceso storage/memory  | Propuesta de implementación del trabajo conjunto                               | Comparar V2→V3                                 |
| unchecked              | Propuesta de microoptimización EVM                                             | Comparar V3→V4 e invariante overflow           |
| Sin ID redundante      | Decisión propia del modelo de datos PharmaChain                                | Comparar V5→V6                                 |
| Storage packing        | Documentación de layout Solidity y experimento propuesto                       | Comparar V6→V7/V8                              |
| Transferencia compacta | Decisión propia del diseño del contrato                                        | Comparar V6→V9 y probar invariante de origen   |
| Historial solo eventos | Experimento propuesto para estudiar SSTORE                                     | Comparar V6→V11 y documentar ruptura funcional |
| optimizer.runs/viaIR   | Documentación oficial del compilador Solidity                                  | Recompilar y repetir suite                     |

No se debe atribuir una técnica a un artículo específico sin una URL comprobada. Las fuentes mencionadas por el usuario incluyen **RareSkills**, la **documentación del optimizador de Solidity**, y referencias abreviadas a **tutoriales.com** y **cryptochainblog**, cuyos artículos concretos siguen sin identificarse. Las decisiones adicionales se documentan como propuestas de ingeniería del proyecto, no como citas textuales.

## 9. Mejoras futuras y herramientas

1. **Foundry**: fuzzing y pruebas invariantes con secuencias aleatorias de custodia.
2. **Echidna**: propiedades como que no existan propietarios inconsistentes.
3. **Slither**: análisis estático de permisos, reentradas, shadowing y patrones peligrosos.
4. **Hardhat Coverage**: cobertura de líneas y ramas; documentar rutas de revert.
5. **Solidity storage layout**: revisar slots exactos antes y después de packing.
6. **Indexador de eventos**: necesario para historial completo en V11/V12.
7. **Snapshots por versión**: restablecer estado antes de cada caso para evitar contaminación.
8. **Benchmarks de cadenas largas**: 1, 10, 100 transferencias y escenarios con nombres de longitud variable.
9. **Seguridad de operaciones**: roles revocables, multisig, pausas de emergencia y control de procedencia de lotes.
10. **Frontend empresarial**: selector de cuentas, validación previa, explicación de revert, historial, trazas de recibos y exportación reproducible.

## 10. Bibliografía y documentación

- [RareSkills](https://www.rareskills.io/) — material técnico sobre EVM y optimización.
- [Solidity Optimizer](https://docs.soliditylang.org/en/latest/internals/optimizer.html) — `optimizer.runs`, Yul y pipeline del compilador.
- [Solidity Storage Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html) — packing y distribución de variables.
- [Ethereum Gas](https://ethereum.org/en/developers/docs/gas/) — gas, tarifas y ejecución.
- [EIP-2200](https://eips.ethereum.org/EIPS/eip-2200) y [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929) — coste de almacenamiento y acceso.
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control) — modelo de roles.
- [Hardhat](https://hardhat.org/docs) — desarrollo, compilación y tests.
- [Foundry](https://getfoundry.sh/) y [Slither](https://github.com/crytic/slither) — pruebas y análisis.
- **tutoriales.com / cryptochainblog** — referencias aportadas pendientes de URL concreta y validación bibliográfica.

## 11. Estado de verificación y trazabilidad

Se han leído los CSV de `gas-reports/` disponibles como archivos aportados. No se ha ejecutado en esta elaboración el código Solidity ni las suites Hardhat/Truffle. Los archivos `reports/` aparecen en el árbol del repositorio, pero sus contenidos no están entre los CSV materializados; por eso no se inventan tablas de tiempos ni totales de tests aprobados. Antes de la entrega, adjuntar el log real de `npx hardhat test mocha`, versión de compilador y hash del commit.
