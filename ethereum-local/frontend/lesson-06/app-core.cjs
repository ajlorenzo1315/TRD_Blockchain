(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.Lesson6Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    function requireAddress(address) {
        if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
            throw new Error("Dirección Ethereum inválida");
        }
        return address;
    }
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
    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (char) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[char],
        );
    }
    function renderZombie(raw) {
        const z = normalizeZombie(raw);
        return (
            `<article class="zombie"><h3>${escapeHtml(z.name)}</h3><ul>` +
            `<li>ADN: ${escapeHtml(z.dna)}</li>` +
            `<li>Nivel: ${escapeHtml(z.level)}</li>` +
            `<li>Victorias: ${escapeHtml(z.winCount)}</li>` +
            `<li>Derrotas: ${escapeHtml(z.lossCount)}</li>` +
            `<li>Disponible desde: ${escapeHtml(z.readyTime)}</li></ul></article>`
        );
    }
    function feeToWei(web3) {
        return web3.utils.toWei("0.001", "ether");
    }
    function isReady(zombie, nowSeconds) {
        return BigInt(normalizeZombie(zombie).readyTime) <= BigInt(nowSeconds);
    }
    return { requireAddress, normalizeZombie, escapeHtml, renderZombie, feeToWei, isReady };
});
