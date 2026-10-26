(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.Lesson6Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    function requireAddress(address) {
        if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address))
            throw new Error("Dirección Ethereum inválida");
        return address;
    }
    function requireId(value) {
        const str = String(value).trim();
        if (!/^(0|[1-9][0-9]*)$/.test(str)) throw new Error("ID de zombi inválido");
        return str;
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
                ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
        );
    }
    function feeToWei(web3) {
        return web3.utils.toWei("0.001", "ether");
    }
    function isReady(zombie, nowSeconds) {
        return BigInt(normalizeZombie(zombie).readyTime) <= BigInt(nowSeconds);
    }
    function dnaTraits(dna) {
        const value = BigInt(dna);
        if (value < 0n) throw new Error("ADN inválido");
        const str = value.toString().padStart(16, "0").slice(-16);
        return {
            skin: Number(str.slice(0, 2)) % 5,
            eyes: Number(str.slice(2, 4)) % 4,
            mouth: Number(str.slice(4, 6)) % 4,
            shirt: Number(str.slice(6, 8)) % 5,
            hair: Number(str.slice(8, 10)) % 4,
            accessory: Number(str.slice(10, 12)) % 3,
        };
    }
    // Arte SVG propio. No utiliza imágenes del repositorio externo (licencia independiente).
    function zombieSvg(dna) {
        const t = dnaTraits(dna);
        const skins = ["#9ddd76", "#79cda4", "#a9d58a", "#a9a5ed", "#e5bd8e"];
        const shirts = ["#8059e8", "#ef6b91", "#54bfc5", "#f6b84b", "#7483b2"];
        const eyes = t.eyes === 0 ? 7 : t.eyes === 1 ? 10 : t.eyes === 2 ? 5 : 8;
        const mouth =
            t.mouth === 0
                ? '<path d="M74 104q16 13 32 0" fill="none" stroke="#3b364b" stroke-width="5" stroke-linecap="round"/>'
                : t.mouth === 1
                  ? '<rect x="76" y="102" width="29" height="12" rx="5" fill="#342c45"/><path d="M85 102v8m10-8v8" stroke="white" stroke-width="3"/>'
                  : t.mouth === 2
                    ? '<path d="M75 109h30" stroke="#3b364b" stroke-width="5" stroke-linecap="round"/>'
                    : '<path d="M77 102q14 21 27 0" fill="#402a47" stroke="#402a47" stroke-width="3"/>';
        const hair =
            t.hair === 0
                ? '<path d="M46 70Q49 23 90 30Q134 27 137 70L119 49 105 58 89 43 68 57Z" fill="#423347"/>'
                : t.hair === 1
                  ? '<path d="M49 62l9-29 13 16 14-27 13 26 18-18 16 32" fill="#3b344e"/>'
                  : t.hair === 2
                    ? '<path d="M52 52q38-30 75 0" fill="none" stroke="#473749" stroke-width="16"/>'
                    : "";
        const accessory =
            t.accessory === 1
                ? '<path d="M42 91h96" stroke="#e9e9ff" stroke-width="3"/><rect x="52" y="77" width="29" height="22" rx="8" fill="#24263d"/><rect x="99" y="77" width="29" height="22" rx="8" fill="#24263d"/>'
                : t.accessory === 2
                  ? '<circle cx="130" cy="105" r="7" fill="none" stroke="#ffe18d" stroke-width="4"/>'
                  : "";
        return `<svg class="zombie-art" viewBox="0 0 180 205" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zombi generado a partir de su ADN"><ellipse cx="90" cy="191" rx="68" ry="9" fill="#15152b" opacity=".25"/><path d="M35 201q-2-67 55-67t55 67" fill="${shirts[t.shirt]}"/><path d="M65 144l25 20 25-20" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="6"/><rect x="75" y="123" width="30" height="30" rx="9" fill="${skins[t.skin]}"/><path d="M47 74Q47 32 90 32t43 42v33q-2 38-43 38t-43-38Z" fill="${skins[t.skin]}" stroke="#303044" stroke-width="3"/><circle cx="47" cy="100" r="9" fill="${skins[t.skin]}"/><circle cx="133" cy="100" r="9" fill="${skins[t.skin]}"/>${hair}<ellipse cx="70" cy="86" rx="${eyes}" ry="9" fill="white"/><ellipse cx="110" cy="86" rx="${eyes}" ry="9" fill="white"/><circle cx="72" cy="87" r="4" fill="#26243b"/><circle cx="108" cy="87" r="4" fill="#26243b"/><path d="M89 91l-5 11h11" fill="none" stroke="#627765" stroke-width="3"/>${mouth}${accessory}</svg>`;
    }
    // Reproducción de la composición y orden de capas de ZombieChar.vue.
    // Las medidas originales en vh se normalizan a un lienzo responsivo de 50 × 42 unidades.
    const LOOM_BASE = "./external/zombie-char-component/zombieparts/";
    const LOOM_LAYOUT = [
        ["left-feet", "left-feet-1", 18.3, 30, 4, "clothes"],
        ["right-feet", "right-feet-1", 22.3, 30.3, 3.3, "clothes"],
        ["left-leg", "left-leg-1", 18.3, 27, 4, "clothes"],
        ["right-leg", "right-leg-1", 22.3, 27.6, 3.3, "clothes"],
        ["left-thigh", "left-thigh-1", 17.3, 22, 6, "clothes"],
        ["right-thigh", "right-thigh-1", 20.4, 22, 6, "clothes"],
        ["left-forearm", "left-forearm-1", 22.3, 20, 4, "skin"],
        ["right-forearm", "right-forearm-1", 26.4, 20, 4, "skin"],
        ["right-upper-arm", "right-upper-arm-1", 23.4, 16, 6, "skin"],
        ["torso", "torso-1", 15.6, 13, 13, "clothes"],
        ["shirt", "shirt", 15.6, 13, 13, "clothes"],
        ["left-upper-arm", "left-upper-arm-1", 19.3, 16, 6, "skin"],
        ["left-forearm", "left-forearm-1", 22.3, 20, 4, "skin"],
        ["right-forearm", "right-forearm-1", 26.4, 20, 4, "skin"],
        ["left-hand", "hand1-1", 24.3, 19, 4, "skin"],
        ["right-hand", "hand-2-1", 28.4, 19, 4, "skin"],
        ["head", "head", 13, -4, 28, "skin"],
        ["eyes", "eyes", 23, 8, 13, "eyes"],
        ["mouth", "mouth-1", 26.6, 15, 6, "none"],
    ];
    function loomGenes(dna) {
        const str = BigInt(dna).toString().padStart(16, "0").slice(-16);
        return {
            head: (Number(str.slice(0, 2)) % 7) + 1,
            eyes: (Number(str.slice(2, 4)) % 11) + 1,
            shirt: (Number(str.slice(4, 6)) % 6) + 1,
            skin: (Number(str.slice(6, 8)) / 100) * 360,
            eyeColor: (Number(str.slice(8, 10)) / 100) * 360,
            clothes: (Number(str.slice(10, 12)) / 100) * 360,
        };
    }
    function loomParts(dna, override) {
        const genes = { ...loomGenes(dna), ...(override || {}) };
        const hue = { skin: genes.skin, eyes: genes.eyeColor, clothes: genes.clothes };
        return LOOM_LAYOUT.map(([part, file, x, y, w, color]) => {
            const name =
                file === "head"
                    ? `head-${genes.head}`
                    : file === "eyes"
                      ? `eyes-${genes.eyes}`
                      : file === "shirt"
                        ? `shirt-${genes.shirt}`
                        : file;
            return {
                part,
                src: LOOM_BASE + name + "@2x.png",
                left: (x / 50) * 100,
                top: ((y + 4) / 42) * 100,
                width: (w / 50) * 100,
                hue: color === "none" ? 0 : hue[color],
            };
        });
    }
    function loomPortrait(dna, override) {
        const layers = loomParts(dna, override);
        const imgs = layers
            .map(
                (layer) =>
                    `<img class="loom-layer" src="${layer.src}" alt="" loading="lazy" style="left:${layer.left}%;top:${layer.top}%;width:${layer.width}%;filter:hue-rotate(${layer.hue}deg)" />`,
            )
            .join("");
        return `<div class="loom-portrait" role="img" aria-label="Zombi compuesto con las capas originales de Loom"><div class="loom-fallback">${zombieSvg(dna)}</div><div class="loom-layers" aria-hidden="true">${imgs}</div></div>`;
    }
    function renderZombie(raw, id, nowSeconds = Math.floor(Date.now() / 1000)) {
        const z = normalizeZombie(raw);
        const ready = isReady(z, nowSeconds);
        const idLabel = id === undefined ? "" : `<span class="zombie-id">#${escapeHtml(id)}</span>`;
        return `<article class="zombie-card">${idLabel}<div class="portrait">${loomPortrait(z.dna)}</div><div class="zombie-body"><h3>${escapeHtml(z.name)}</h3><div class="stat-grid"><span>Nivel <b>${escapeHtml(z.level)}</b></span><span>Victorias <b>${escapeHtml(z.winCount)}</b></span><span>Derrotas <b>${escapeHtml(z.lossCount)}</b></span></div><p class="dna">ADN ${escapeHtml(z.dna)}</p><p class="cooldown ${ready ? "ready" : "waiting"}">${ready ? "● Disponible para criar" : "◷ Cría disponible desde " + escapeHtml(z.readyTime)}</p></div></article>`;
    }
    function battleOutcome(beforeA, afterA, beforeD, afterD) {
        const a0 = normalizeZombie(beforeA),
            a1 = normalizeZombie(afterA);
        const d0 = normalizeZombie(beforeD),
            d1 = normalizeZombie(afterD);
        if (
            BigInt(a1.winCount) > BigInt(a0.winCount) &&
            BigInt(d1.lossCount) > BigInt(d0.lossCount)
        )
            return "victoria";
        if (BigInt(a1.lossCount) > BigInt(a0.lossCount)) return "derrota";
        return "indeterminado";
    }
    return {
        requireAddress,
        requireId,
        normalizeZombie,
        escapeHtml,
        renderZombie,
        feeToWei,
        isReady,
        dnaTraits,
        zombieSvg,
        loomParts,
        loomPortrait,
        loomGenes,
        battleOutcome,
    };
});
