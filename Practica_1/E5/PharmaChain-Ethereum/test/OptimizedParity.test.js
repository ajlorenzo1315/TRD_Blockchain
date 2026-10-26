import { expect } from "chai";
import { network } from "hardhat";

const variants = [
    ["PharmaChainRolesManuales", "PharmaChainRolesManualesOptimized", "manual"],
    ["PharmaChainRolesOpenZeppelin", "PharmaChainRolesOpenZeppelinOptimized", "oz"],
];

async function fixture(ethers, name, kind, signers) {
    const [admin, lab, dist, pharmacy] = signers;
    const factory = await ethers.getContractFactory(name);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    if (kind === "manual") {
        await (await contract.asignarRol(lab.address, 1)).wait();
        await (await contract.asignarRol(dist.address, 2)).wait();
        await (await contract.asignarRol(pharmacy.address, 3)).wait();
    } else {
        await (await contract.grantRole(await contract.LABORATORIO_ROLE(), lab.address)).wait();
        await (await contract.grantRole(await contract.DISTRIBUIDOR_ROLE(), dist.address)).wait();
        await (await contract.grantRole(await contract.FARMACIA_ROLE(), pharmacy.address)).wait();
    }
    return contract;
}

for (const [original, optimized, kind] of variants) {
    for (const name of [original, optimized]) {
        describe(`Seguridad, custodia e historial — ${name}`, function () {
            let ethers, c, admin, lab, dist, pharmacy, outsider;
            beforeEach(async () => {
                ({ ethers } = await network.connect());
                [admin, lab, dist, pharmacy, outsider] = await ethers.getSigners();
                c = await fixture(ethers, name, kind, [admin, lab, dist, pharmacy]);
            });
            async function create() {
                await (
                    await c.connect(lab).registrarLote("Paracetamol 500 mg", "Laboratorios Galicia")
                ).wait();
            }
            it("mantiene el administrador y el contador inicial", async () => {
                expect(await c.administrador()).to.equal(admin.address);
                expect(await c.totalLotes()).to.equal(0n);
            });
            it("registra y consulta datos e IDs consecutivos", async () => {
                await create();
                await create();
                expect(await c.totalLotes()).to.equal(2n);
                const l = await c.consultarLote(1);
                expect(l.nombre).to.equal("Paracetamol 500 mg");
                expect(l.fabricante).to.equal("Laboratorios Galicia");
                expect(l.propietario).to.equal(lab.address);
                expect(l.activo).to.equal(true);
            });
            it("rechaza registros sin rol, nombre vacío o fabricante vacío", async () => {
                await expect(c.connect(outsider).registrarLote("X", "Y")).to.revert(ethers);
                await expect(c.connect(lab).registrarLote("", "Y")).to.revert(ethers);
                await expect(c.connect(lab).registrarLote("X", "")).to.revert(ethers);
                expect(await c.totalLotes()).to.equal(0n);
            });
            it("rechaza consultas inexistentes", async () => {
                await expect(c.consultarLote(0)).to.revert(ethers);
                await expect(c.consultarLote(1)).to.revert(ethers);
            });
            it("mantiene historial completo tras transferencias", async () => {
                await create();
                await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
                await (await c.connect(dist).aceptarTransferencia(1)).wait();
                await (await c.connect(dist).proponerTransferencia(1, pharmacy.address)).wait();
                await (await c.connect(pharmacy).aceptarTransferencia(1)).wait();
                expect((await c.consultarLote(1)).propietario).to.equal(pharmacy.address);
                expect(await c.totalMovimientos(1)).to.equal(5n);
                expect((await c.consultarMovimiento(1, 0)).tipoMovimiento).to.equal(0n);
                expect((await c.consultarMovimiento(1, 4)).tipoMovimiento).to.equal(2n);
                expect((await c.transferencias(1)).pendiente).to.equal(false);
            });
            it("rechaza transición directa laboratorio a farmacia y terceros", async () => {
                await create();
                await expect(c.connect(lab).proponerTransferencia(1, pharmacy.address)).to.revert(ethers, "Transicion de roles invalida");
                await expect(c.connect(outsider).proponerTransferencia(1, dist.address)).to.revert(ethers, "Transicion de roles invalida");
                await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
                await expect(c.connect(outsider).aceptarTransferencia(1)).to.revert(ethers);
                await expect(c.connect(lab).proponerTransferencia(1, dist.address)).to.revert(ethers);
            });
            it("permite cancelar por origen y por administrador, sin alterar propietario", async () => {
                await create();
                await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
                await expect(c.connect(outsider).cancelarTransferencia(1)).to.revert(ethers);
                await (await c.connect(lab).cancelarTransferencia(1)).wait();
                expect((await c.consultarLote(1)).propietario).to.equal(lab.address);
                expect((await c.consultarMovimiento(1, 2)).tipoMovimiento).to.equal(3n);
                await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
                await (await c.connect(admin).cancelarTransferencia(1)).wait();
                expect((await c.transferencias(1)).pendiente).to.equal(false);
            });
            it("desactiva lote y elimina propuesta pendiente", async () => {
                await create();
                await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
                await expect(c.connect(outsider).desactivarLote(1)).to.revert(ethers);
                await (await c.connect(admin).desactivarLote(1)).wait();
                expect((await c.consultarLote(1)).activo).to.equal(false);
                expect((await c.transferencias(1)).pendiente).to.equal(false);
                await expect(c.connect(dist).aceptarTransferencia(1)).to.revert(ethers);
                await expect(c.connect(admin).desactivarLote(1)).to.revert(ethers);
            });
            it("bloquea operaciones protegidas cuando está pausado y permite reanudar", async () => {
                await (await c.connect(admin).pausar()).wait();
                await expect(c.connect(lab).registrarLote("X", "Y")).to.revert(ethers);
                await (await c.connect(admin).reanudar()).wait();
                await create();
                expect(await c.totalLotes()).to.equal(1n);
            });
        });
    }
}
