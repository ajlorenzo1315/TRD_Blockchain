// LECCION 6 - CAPITULOS 4, 6 y 8: funciones puras de presentación y conversiones.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lesson6Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // CAPITULO 3: comprobación básica de formato de dirección Ethereum.
  // No garantiza que exista un contrato desplegado en esa dirección.
  function requireAddress(address) {
    if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error("Dirección Ethereum inválida");
    }
    return address;
  }
  // CAPITULO 6: Web3 puede devolver tanto arrays como objetos con claves.
  // Normalizamos ambos formatos para que la vista tenga una estructura estable.
  function normalizeZombie(raw) {
    return {
      name: String(raw.name ?? raw[0]),
      dna: String(raw.dna ?? raw[1]),
      level: String(raw.level ?? raw[2]),
      readyTime: String(raw.readyTime ?? raw[3]),
      winCount: String(raw.winCount ?? raw[4]),
      lossCount: String(raw.lossCount ?? raw[5]),
    };
  }
  // CAPITULO 6: un nombre creado por un usuario es dato no confiable.
  // Escapar caracteres evita que se interpreten como etiquetas HTML.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function renderZombie(raw) {
    const z = normalizeZombie(raw);
    return `<article class="zombie"><h3>${escapeHtml(z.name)}</h3><ul>` +
      `<li>ADN: ${escapeHtml(z.dna)}</li>` +
      `<li>Nivel: ${escapeHtml(z.level)}</li>` +
      `<li>Victorias: ${escapeHtml(z.winCount)}</li>` +
      `<li>Derrotas: ${escapeHtml(z.lossCount)}</li>` +
      `<li>Disponible desde: ${escapeHtml(z.readyTime)}</li></ul></article>`;
  }
  // CAPITULO 8: Ethereum mide los pagos en wei, no en ETH decimales.
  // 0.001 ETH equivale a 10^15 wei.
  function feeToWei(web3) { return web3.utils.toWei("0.001", "ether"); }
  // CAPITULO 6: el cooldown se almacena como timestamp UNIX en segundos.
  // Es una comprobación visual; el contrato valida el cooldown de verdad.
  function isReady(zombie, nowSeconds) {
    return BigInt(normalizeZombie(zombie).readyTime) <= BigInt(nowSeconds);
  }
  return { requireAddress, normalizeZombie, escapeHtml, renderZombie, feeToWei, isReady };
});
