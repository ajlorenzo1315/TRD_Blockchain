# Lab — servidor y frontend clásico

Consulta [la guía integral](../README-BENCHMARK.md).

`npm run lab` inicia `lab/server.cjs` en el puerto **3100**. Sirve `lab/public/index.html`, `operations.html` y `benchmark.html`, además de la API compartida con React. No necesita Vite.

**Inicio:** desde la raíz `npm run chain` (terminal 1), `npm run truffle:migrate && npm run lab` (terminal 2). Abre http://localhost:3100/operations.html para operaciones o http://localhost:3100/benchmark.html para benchmark.

**Benchmark integral:** en `benchmark.html`, el botón **Ejecutar benchmark funcional** recorre todas las variantes del catálogo. Resultados en `/api/benchmark/suite`, exportación en `/api/benchmark/suite.csv`. El botón **Ejecutar pruebas reales** sigue siendo una comparación separada de suites Hardhat/Truffle.

**Aviso:** las transacciones son reales en la red local y cambian su estado. La API no debe exponerse públicamente: utiliza cuentas desbloqueadas de Hardhat.
