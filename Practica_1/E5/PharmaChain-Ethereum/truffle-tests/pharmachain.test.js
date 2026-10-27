const Manual = artifacts.require("PharmaChainRolesManuales");
contract("PharmaChain / integración Truffle", (accounts) => {
    const [admin, lab, dist, farm, attacker] = accounts;
    let c;
    beforeEach(async () => {
        c = await Manual.new({ from: admin });
        await c.asignarRol(lab, 1, { from: admin });
        await c.asignarRol(dist, 2, { from: admin });
        await c.asignarRol(farm, 3, { from: admin });
    });
    it("registra y transfiere custodia con recibos y gas", async () => {
        const a = await c.registrarLote("Paracetamol", "Lab Galicia", { from: lab });
        const b = await c.proponerTransferencia(1, dist, { from: lab });
        const d = await c.aceptarTransferencia(1, { from: dist });
        const lote = await c.consultarLote(1);
        assert.equal(lote.propietario.toLowerCase(), dist.toLowerCase());
        for (const tx of [a, b, d]) assert.isAbove(Number(tx.receipt.gasUsed), 0);
        console.log(
            "Gas registro/propuesta/aceptación:",
            a.receipt.gasUsed,
            b.receipt.gasUsed,
            d.receipt.gasUsed,
        );
    });
    it("rechaza registrar sin rol", async () => {
        try {
            await c.registrarLote("Falso", "Atacante", { from: attacker });
            assert.fail("Debería revertir");
        } catch (e) {
            assert.include(e.message, "revert");
        }
    });
    it("rechaza salto laboratorio a farmacia", async () => {
        await c.registrarLote("Lote", "Lab", { from: lab });
        try {
            await c.proponerTransferencia(1, farm, { from: lab });
            assert.fail("Debería revertir");
        } catch (e) {
            assert.include(e.message, "revert");
        }
    });
    it("completa laboratorio → distribuidor → farmacia", async () => {
        await c.registrarLote("Vacuna", "Lab", { from: lab });
        await c.proponerTransferencia(1, dist, { from: lab });
        await c.aceptarTransferencia(1, { from: dist });
        await c.proponerTransferencia(1, farm, { from: dist });
        const tx = await c.aceptarTransferencia(1, { from: farm });
        assert.equal((await c.consultarLote(1)).propietario.toLowerCase(), farm.toLowerCase());
        assert.equal(Number(await c.totalMovimientos(1)), 5);
        assert.isAbove(Number(tx.receipt.gasUsed), 0);
    });
    it("impide aceptar por destinatario equivocado", async () => {
        await c.registrarLote("Vacuna", "Lab", { from: lab });
        await c.proponerTransferencia(1, dist, { from: lab });
        try {
            await c.aceptarTransferencia(1, { from: attacker });
            assert.fail("Falta revert");
        } catch (e) {
            assert.include(e.message, "revert");
        }
    });
    it("cancelar propuesta conserva el custodio", async () => {
        await c.registrarLote("Vacuna", "Lab", { from: lab });
        await c.proponerTransferencia(1, dist, { from: lab });
        await c.cancelarTransferencia(1, { from: lab });
        assert.equal((await c.consultarLote(1)).propietario.toLowerCase(), lab.toLowerCase());
        assert.equal((await c.transferencias(1)).pendiente, false);
        assert.equal(Number(await c.totalMovimientos(1)), 3);
    });
    it("pausa bloquea el registro y reanudar lo permite", async () => {
        await c.pausar({ from: admin });
        try {
            await c.registrarLote("Vacuna", "Lab", { from: lab });
            assert.fail("Falta revert");
        } catch (e) {
            assert.include(e.message, "revert");
        }
        await c.reanudar({ from: admin });
        await c.registrarLote("Vacuna", "Lab", { from: lab });
        assert.equal(Number(await c.totalLotes()), 1);
    });
    it("desactivación impide futuras transferencias", async () => {
        await c.registrarLote("Vacuna", "Lab", { from: lab });
        await c.desactivarLote(1, { from: admin });
        assert.equal((await c.consultarLote(1)).activo, false);
        try {
            await c.proponerTransferencia(1, dist, { from: lab });
            assert.fail("Falta revert");
        } catch (e) {
            assert.include(e.message, "revert");
        }
    });
});
