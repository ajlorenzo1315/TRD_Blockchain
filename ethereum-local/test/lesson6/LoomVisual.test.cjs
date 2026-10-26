const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = path.resolve(__dirname, "../../frontend/lesson-06");
const core = require(path.join(base, "app-core.cjs"));
const dna = "0306030019226000";
test("capas de Loom usan rutas /external válidas", () => {
    const layers = core.loomParts(dna);
    assert.equal(layers.length, 5);
    for (const layer of layers)
        assert.match(layer.src, /^\/external\/zombie-char-component\/zombieparts\/[^"<>]+\.png$/);
});
test("el ADN determina las capas de forma estable", () => {
    assert.deepEqual(core.loomParts(dna), core.loomParts(dna));
});
test("las tarjetas incluyen PNG y SVG de respaldo", () => {
    const card = core.renderZombie(["Mortimer", dna, 1, 0, 0, 0], 0);
    assert.match(card, /loom-portrait/);
    assert.match(card, /loom-layer/);
    assert.match(card, /loom-fallback/);
    assert.match(card, /<svg/);
});
test("el nombre malicioso se escapa", () => {
    const card = core.renderZombie(["<script>alert(1)</script>", dna, 1, 0, 0, 0]);
    assert.doesNotMatch(card, /<script>/);
});
test("el inventario de imágenes no contiene /../external", () => {
    const js = fs.readFileSync(path.join(base, "zombie-assets.js"), "utf8");
    assert.doesNotMatch(js, /\/\.\.\/external/);
});
test("la página incluye el cargador de capas", () => {
    const html = fs.readFileSync(path.join(base, "index.html"), "utf8");
    assert.match(html, /loom-loader\.js/);
});
