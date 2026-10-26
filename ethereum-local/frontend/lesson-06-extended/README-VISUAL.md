# CryptoZombies — Editor visual original Loom

## Arranque

Desde `ethereum-local`:

```bash
python3 -m http.server 8080 --directory frontend/lesson-06-extended/
```

Abre `http://localhost:8080/` y ve a **Editor visual de CryptoZombies**.

Los PNG están incluidos en `external/zombie-char-component/zombieparts/`.
No se necesita servidor de compilación Vue: `app-core.js` reproduce las posiciones, el orden de capas y los filtros de color de `ZombieChar.vue`.

El editor es una previsualización local: cambiar un gen no cambia un zombi on-chain. Las funcionalidades anteriores de MetaMask, ejército y combate permanecen.

## Comprobar rutas

```bash
curl -I 'http://localhost:8080/external/zombie-char-component/zombieparts/head-3%402x.png'
```

La composición usa los recursos originales proporcionados en el archivo adjunto; su licencia gráfica puede diferir de la licencia MIT del código.
