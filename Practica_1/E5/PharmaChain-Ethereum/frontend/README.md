# Frontend React — PharmaChain Enterprise Console

Consulta [la guía integral](../README-BENCHMARK.md).

## Lanzar

Desde la raíz, con `npm run chain`, `npm run truffle:migrate` y `npm run lab` activos:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Abre **http://localhost:5173/**. Vite hace proxy de `/api` al backend `http://127.0.0.1:3100`.

## Secciones

- **Vista general:** resumen de lotes y actividad.
- **Inventario / Registrar fármaco:** alta y selección de lotes.
- **Cadena de custodia:** proponer, aceptar, cancelar y ver historial.
- **Cuentas y roles:** emular cuentas Hardhat, asignar permisos.
- **Laboratorio de pruebas:** ejecutar flujo completo y simular llamadas sin transacción.
- **Actividad blockchain:** ver recibos.
- **Comparar versiones:** elegir variantes desplegadas, rondas, ejecutar benchmark funcional, comprobar paridad, exportar JSON/CSV, consultar histórico y abrir comparativa Hardhat/Truffle.

## Validación

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

El benchmark modifica la red local. No utilizar con fondos ni contratos reales.
