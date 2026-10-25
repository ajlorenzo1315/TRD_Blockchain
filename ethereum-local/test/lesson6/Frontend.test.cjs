const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const core = require("../../frontend/lesson-06/app-core.cjs");

describe("CryptoZombies - Lección 6 - frontend", () => {
  it("01. valida una dirección Ethereum", () => {
    assert.equal(core.requireAddress("0x" + "a".repeat(40)), "0x" + "a".repeat(40));
    assert.throws(() => core.requireAddress("0x123"), /inválida/);
  });
  it("02. normaliza una tupla ABI de Zombie", () => {
    const z = core.normalizeZombie(["Alice", 123n, 2n, 100n, 3n, 1n]);
    assert.deepEqual(z, { name: "Alice", dna: "123", level: "2", readyTime: "100", winCount: "3", lossCount: "1" });
  });
  it("03. normaliza un objeto de Web3.js", () => {
    const z = core.normalizeZombie({name:"Bob",dna:"99",level:"1",readyTime:"500",winCount:"0",lossCount:"0"});
    assert.equal(z.name, "Bob");
    assert.equal(z.readyTime, "500");
  });
  it("04. evita inyección HTML en nombres", () => {
    const html = core.renderZombie(["<img src=x onerror=alert(1)>", 1, 1, 0, 0, 0]);
    assert.ok(html.includes("&lt;img"));
    assert.ok(!html.includes("<img"));
  });
  it("05. representa todos los campos del zombi", () => {
    const html = core.renderZombie(["Alice", 123, 4, 200, 5, 6]);
    for (const value of ["Alice", "123", "4", "200", "5", "6"]) assert.ok(html.includes(value));
  });
  it("06. convierte 0.001 ETH a wei mediante Web3.js", () => {
    const web3 = {utils:{toWei:(amount,unit) => { assert.equal(amount,"0.001");assert.equal(unit,"ether");return "1000000000000000"; }}};
    assert.equal(core.feeToWei(web3), "1000000000000000");
  });
  it("07. detecta un cooldown todavía activo", () => {
    assert.equal(core.isReady(["A", 1, 1, 200, 0, 0], 199), false);
  });
  it("08. detecta cooldown terminado", () => {
    assert.equal(core.isReady(["A", 1, 1, 200, 0, 0], 200), true);
  });
});
