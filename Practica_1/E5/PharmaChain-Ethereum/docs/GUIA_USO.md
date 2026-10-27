# PharmaChain — Guía de instalación, operación y demostraciones

[Volver al README](../README.md) · [Benchmarks](BENCHMARK.md)

## 1. Requisitos

- Node.js y npm compatibles con las dependencias instaladas.
- Proyecto `PharmaChain-Ethereum/` con `package.json`, `hardhat.config.ts`, `truffle-config.cjs` y contratos.
- Navegador web moderno.
- Puertos locales disponibles: `8545` (RPC), `3100` (laboratorio), `5173` (Vite).
- **No hace falta geth**: el nodo Hardhat proporciona JSON-RPC.

**Compatibilidad:** Truffle 5 es legado y puede fallar con versiones recientes de Node. La documentación original recomienda probar Node 20 LTS para Truffle si hay incompatibilidades, manteniendo una versión de Node compatible con Hardhat 3 para el resto. No presupongas que una sola versión de Node funciona para ambos sin comprobar las dependencias.

## 2. Instalación inicial

En la raíz de `PharmaChain-Ethereum`:

```bash
npm ci
npm --prefix frontend ci
```

Si no existe un `package-lock.json` válido, utilizar `npm install` en la carpeta correspondiente.

Comprobar scripts disponibles:

```bash
npm run
```

## 3. Arranque completo en cuatro terminales

### Terminal 1 — Blockchain local

```bash
npm run chain
```

Mantener el proceso activo. La red RPC del laboratorio debe responder en `http://127.0.0.1:8545`.

### Terminal 2 — Compilación, migración y pruebas

```bash
npm run truffle:compile
npm run truffle:migrate
npm run truffle:test
```

La migración documentada despliega cuatro variantes para la UI (V0–V3). Si reinicias el nodo local, **vuelve a migrar**: los despliegues anteriores dejan de existir en esa cadena reiniciada.

### Terminal 3 — Laboratorio web

```bash
npm run lab
```

Páginas documentadas:

| URL                                   | Uso                             |
| ------------------------------------- | ------------------------------- |
| http://localhost:3100                 | Panel de validación y auditoría |
| http://localhost:3100/operations.html | Operaciones guiadas de farmacia |
| http://localhost:3100/benchmark.html  | Comparación de frameworks y gas |

### Terminal 4 — Frontend Vite (opcional)

```bash
npm run frontend
```

Abrir `http://localhost:5173`. Si el script no está disponible, desde `frontend/` ejecutar `npm run dev`.

**Diferencia importante:** el panel `operations.html` pertenece al laboratorio Express; el frontend Vite es otra interfaz. No confundir puertos ni funcionalidades.

## 4. Demo A — Registrar un medicamento

**Objetivo:** demostrar permisos, registro y creación de ID por Solidity.

1. Abrir `http://localhost:3100/operations.html`.
2. Seleccionar `PharmaChainRolesManuales` (V0).
3. Pulsar **Configurar roles de demostración**. En el escenario documentado: cuenta 0 administrador, 1 laboratorio, 2 distribuidor y 3 farmacia.
4. Pulsar **Registrar nuevo lote**; la UI puede seleccionar automáticamente la cuenta de laboratorio.
5. Introducir un nombre de medicamento y un fabricante de prueba.
6. Pulsar **Simular sin enviar**: la interfaz usa comprobaciones previas, sin transacción minada.
7. Pulsar **Confirmar transacción**.
8. Comprobar ID generado por el contrato, hash, bloque, `gasUsed`, propietario y estado.

**¿Por qué no se introduce ID?** `registrarLote` asigna el identificador internamente a partir de `totalLotes`. La UI actualiza el catálogo tras la confirmación.

**Fallo típico:** `No eres laboratorio`. La cuenta 0 puede ser administradora, pero no laboratorio; configurar roles y seleccionar cuenta 1.

## 5. Demo B — Transferencia laboratorio → distribuidor → farmacia

**Objetivo:** demostrar que proponer no cambia el propietario y que aceptar sí lo hace.

1. Seleccionar el lote registrado por su ID o desde el catálogo.
2. Elegir **Proponer transferencia** desde la cuenta laboratorio.
3. Seleccionar distribuidor (cuenta 2) como destinatario y confirmar.
4. Consultar el lote: el custodio sigue siendo el laboratorio mientras la transferencia esté pendiente.
5. Elegir **Aceptar recepción** desde la cuenta distribuidor.
6. Confirmar y comprobar que el custodio cambia a distribuidor.
7. Proponer otra transferencia desde distribuidor hacia farmacia (cuenta 3).
8. Aceptar desde farmacia.
9. Verificar propietario final, historial de movimientos y exportar evidencia JSON.

### Tabla de estados esperados

| Momento                      | Propietario esperado | Transferencia pendiente |
| ---------------------------- | -------------------- | ----------------------- |
| Tras registrar               | Laboratorio          | No                      |
| Tras proponer a distribuidor | Laboratorio          | Sí                      |
| Tras aceptar distribuidor    | Distribuidor         | No                      |
| Tras proponer a farmacia     | Distribuidor         | Sí                      |
| Tras aceptar farmacia        | Farmacia             | No                      |

Los nombres y el formato del historial dependen de la variante, pero las transiciones anteriores son las propiedades del escenario de referencia.

## 6. Demo C — Seguridad: controles negativos

En el panel principal `http://localhost:3100` abrir **Auditoría avanzada**.

| Prueba                               | Resultado esperado |
| ------------------------------------ | ------------------ |
| Usuario sin rol registra lote        | Rechazo            |
| Nombre/fabricante vacío              | Rechazo            |
| ID inexistente                       | Rechazo            |
| Destinatario no autorizado acepta    | Rechazo            |
| Salto directo laboratorio → farmacia | Rechazo            |
| Cuenta distinta del custodio propone | Rechazo            |

La sección **Controles negativos** utiliza `eth_call` para comprobar reversiones sin enviar transacciones: **no muestra gas real consumido**. El panel puede presentar el motivo del fallo.

Las pruebas automatizadas de seguridad no garantizan ausencia total de vulnerabilidades.

## 7. Demo D — Auditoría positiva y cuatro contratos

En el panel principal:

1. Seleccionar contrato y pulsar **Configurar roles**.
2. Ejecutar **Flujo e invariantes**.
3. Revisar el registro, los custodios, las propuestas y aceptaciones.
4. Consultar las barras de `gasUsed` basadas en recibos reales.
5. Exportar JSON de evidencia.
6. Repetir **Cuatro contratos**, después de configurar roles **en las cuatro variantes**.

**Importante:** el grafo representa la secuencia de operaciones y la custodia; **no es un grafo de nodos de consenso**. La auditoría positiva crea transacciones reales y modifica el estado del nodo.

## 8. Demo E — Comparar versiones y gas

### Interfaz Vite

1. Abrir `http://localhost:5173`.
2. Ir a **Cuentas y roles**.
3. Configurar roles para cada versión.
4. Abrir **Comparar versiones**.
5. Ejecutar el mismo flujo en V0, V1, V2 y V3.
6. Revisar diferencias de gas y exportar CSV.

**Los cuatro contratos tienen estados independientes**. Cambiar la versión no transfiere el lote al otro contrato.

### Benchmark reproducible

```bash
npm test
npm run gas:csv
npm run benchmark:frameworks
```

Archivos de resultados documentados:

- `reports/gas-comparison.csv`
- `reports/framework-benchmark.json`
- `gas-reports/pharmachain-default.csv`
- `gas-reports/pharmachain-extended.csv`

En el laboratorio abrir `http://localhost:3100/benchmark.html`. La UI documentada admite comparar tiempos con 1, 3 o 5 rondas.

**No confundir:** tiempo de suite Hardhat vs Truffle no es gas de la transacción. Ver [BENCHMARK.md](BENCHMARK.md).

## 9. API de laboratorio (referencia)

Endpoints mencionados en los documentos originales:

| Método y ruta                           | Función                    |
| --------------------------------------- | -------------------------- |
| `GET /api/variants`                     | Catálogo de versiones      |
| `GET /api/benchmark/summary`            | Resumen de recibos y gas   |
| `POST /api/compare`                     | Flujo real comparativo     |
| `GET /api/export.csv`                   | Exportación de datos       |
| `POST /api/workbench/preview`           | Simulación / estimación    |
| `POST /api/action`                      | Envío de transacción       |
| `GET /api/workbench/evidence/:name/:id` | Evidencia de lote          |
| `POST /api/scenario`                    | Flujo de cinco operaciones |
| `POST /api/run-tests`                   | Controles negativos        |
| `POST /api/audit/run`                   | Auditoría avanzada         |

Son rutas documentadas para el proyecto; antes de integrarlas en otro cliente comprobar su disponibilidad y esquema en `lab/server.cjs`.

## 10. Pruebas desde consola

```bash
# Tests Hardhat
npm test

# Tests de integración Truffle
npm run truffle:test

# Benchmark de gas original/optimizado
npm run gas:csv

# Benchmark operativo Hardhat/Truffle
npm run benchmark:frameworks

# Laboratorio de gas extendido (si está configurado)
npx hardhat test mocha test/GasLabExtended.test.js
npx hardhat test mocha test/GasLabInvariants.test.js
```

Para una demo académica, conservar salida de consola, CSV/JSON, hash de transacciones y capturas de las pantallas.

## 11. Errores frecuentes y solución

| Problema                                 | Causa probable                             | Acción                                           |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `Contrato no disponible`                 | Nodo reiniciado sin desplegar              | Ejecutar `npm run truffle:migrate`               |
| No registra medicamento                  | Cuenta sin rol laboratorio                 | Configurar roles; usar cuenta 1                  |
| `Hardhat · —` / sin conexión             | RPC inactivo o URL incorrecta              | Verificar `npm run chain` y puerto 8545          |
| Un lote desaparece al cambiar de versión | Contratos con estados separados            | Volver a seleccionar contrato original           |
| No aparece gas en control negativo       | Simulación sin minado                      | Usar flujo positivo para medir recibos           |
| Auditoría falla por permisos             | Roles sin asignar                          | Configurar roles en cada variante                |
| No hay resultados de benchmark           | CSV/JSON aún no generados                  | Ejecutar scripts y recargar                      |
| Truffle falla con Node reciente          | Incompatibilidad de herramienta legada     | Revisar versión y probar entorno Node compatible |
| UI muestra datos antiguos                | Dirección/ABI de despliegue desactualizada | Migrar de nuevo y actualizar la interfaz         |

## 12. Evidencias recomendadas para entregar

| Evidencia            | Captura o archivo                          |
| -------------------- | ------------------------------------------ |
| Contratos compilados | Salida `hardhat compile`                   |
| Tests superados      | Salida `npm test` y `npm run truffle:test` |
| Registro del lote    | Pantalla con ID, hash y custodio           |
| Transferencia        | Estado antes/después de aceptación         |
| Seguridad            | Panel de controles negativos               |
| Auditoría            | Flujo e invariantes y exportación JSON     |
| Comparación          | CSV de gas y tabla de ahorro               |
| Frameworks           | JSON de tiempos y condiciones              |
| Remix                | Captura de compilación y operación manual  |

## 13. Seguridad del entorno de demostración

- **No exponer `lab/server.cjs` a Internet**: utiliza cuentas desbloqueadas del nodo local.
- No conectar este backend a redes públicas con fondos reales.
- Las simulaciones no sustituyen pruebas sobre transacciones minadas.
- Los recibos registrados por el servidor están **en memoria** y se pierden al reiniciarlo.
- Los lotes y movimientos on-chain permanecen **solo mientras persista la misma cadena local**.
- Antes de reiniciar, exportar evidencia CSV/JSON.

## 14. Referencias

- [Hardhat](https://hardhat.org/docs)
- [Truffle](https://archive.trufflesuite.com/docs/)
- [Web3.js](https://docs.web3js.org/)
- [Solidity](https://docs.soliditylang.org/)
- [OpenZeppelin](https://docs.openzeppelin.com/contracts/)
