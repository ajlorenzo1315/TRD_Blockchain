const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const core = require("../../frontend/lesson-06/app-core.cjs");
const fs = require("node:fs");
const path = require("node:path");
const frontend = path.resolve(__dirname, "../../frontend/lesson-06");
describe("CryptoZombies - Lección 6 Extendida - frontend exclusivamente", () => {
    it("01. exporta todas las funciones del frontend", () => {
        for (const fn of [
            "requireAddress",
            "normalizeZombie",
            "renderZombie",
            "feeToWei",
            "isReady",
            "dnaTraits",
            "zombieSvg",
            "battleOutcome",
            "requireId",
        ])
            assert.equal(typeof core[fn], "function");
    });
    it("02. valida IDs enteros no negativos", () => {
        assert.equal(core.requireId(0), "0");
        assert.equal(core.requireId("123"), "123");
        for (const value of ["-1", "1.5", "1e3", "", "1;alert(1)"])
            assert.throws(() => core.requireId(value), /inválido/);
    });
    it("03. ADN idéntico produce exactamente la misma ilustración", () =>
        assert.equal(core.zombieSvg("1234567890123456"), core.zombieSvg(1234567890123456n)));
    it("04. ADN distinto puede modificar los rasgos visuales", () =>
        assert.notDeepEqual(
            core.dnaTraits("0100000000000000"),
            core.dnaTraits("0200000000000000"),
        ));
    it("05. el SVG contiene estructura válida sin scripts ni eventos inline", () => {
        const svg = core.zombieSvg("1234567890123456");
        assert.match(svg, /^<svg /);
        assert.match(svg, /<\/svg>$/);
        assert.doesNotMatch(svg, /<script|onerror=|onload=/);
    });
    it("06. nombre HTML malicioso se escapa en tarjeta", () => {
        const html = core.renderZombie(["<img src=x onerror=alert(1)>", "1", 1, 0, 0, 0], "7");
        assert.match(html, /&lt;img/);
        assert.doesNotMatch(html, /<img/);
    });
    it("07. resultado de batalla detecta victoria a partir de estadísticas reales", () => {
        const beforeA = ["A", 1, 1, 0, 0, 0],
            afterA = ["A", 1, 2, 0, 1, 0];
        const beforeD = ["B", 2, 1, 0, 0, 0],
            afterD = ["B", 2, 1, 0, 0, 1];
        assert.equal(core.battleOutcome(beforeA, afterA, beforeD, afterD), "victoria");
    });
    it("08. resultado de batalla detecta derrota", () =>
        assert.equal(
            core.battleOutcome(
                ["A", 1, 1, 0, 0, 0],
                ["A", 1, 1, 0, 0, 1],
                ["B", 2, 1, 0, 0, 0],
                ["B", 2, 1, 0, 1, 0],
            ),
            "derrota",
        ));
    it("09. batalla sin cambios se marca indeterminada", () => {
        const a = ["A", 1, 1, 0, 0, 0],
            b = ["B", 2, 1, 0, 0, 0];
        assert.equal(core.battleOutcome(a, a, b, b), "indeterminado");
    });
    it("10. el cooldown se interpreta en segundos", () => {
        assert.equal(core.isReady(["A", 1, 1, 1000, 0, 0], 999), false);
        assert.equal(core.isReady(["A", 1, 1, 1000, 0, 0], 1000), true);
    });
    it("11. interfaz contiene arena y controles de ataque", () => {
        const html = fs.readFileSync(path.join(frontend, "index.html"), "utf8");
        for (const id of [
            "battle",
            "myZombie",
            "enemyId",
            "attackBtn",
            "battleResult",
            "enemyPreview",
            "txStatus",
        ])
            assert.ok(html.includes(`id="${id}"`), id);
    });
    it("12. el frontend invoca la función real attack del contrato", () => {
        const js = fs.readFileSync(path.join(frontend, "app.js"), "utf8");
        assert.match(js, /needMethod\('attack'\)/);
        assert.match(js, /\.send\(/);
    });
    it("13. el frontend no utiliza Math.random para simular batallas", () => {
        const js = fs.readFileSync(path.join(frontend, "app.js"), "utf8");
        assert.doesNotMatch(js, /Math\.random/);
    });
    it("14. CSS y estructura responsive están incluidos", () => {
        assert.ok(fs.existsSync(path.join(frontend, "styles.css")));
        assert.match(fs.readFileSync(path.join(frontend, "styles.css"), "utf8"), /@media/);
    });
    it("15. el frontend conserva los métodos de creación y subida de nivel", () => {
        const js = fs.readFileSync(path.join(frontend, "app.js"), "utf8");
        assert.match(js, /createRandomZombie/);
        assert.match(js, /levelUp/);
    });
});
