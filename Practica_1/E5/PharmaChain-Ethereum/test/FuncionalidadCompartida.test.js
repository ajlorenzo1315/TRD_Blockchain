import { expect } from "chai";
import { network } from "hardhat";

// La misma batería se ejecuta sobre las dos implementaciones.
for (const nombre of ["PharmaChainRolesManuales", "PharmaChainRolesOpenZeppelin"]) {
    describe(`Comportamiento común: ${nombre}`, function () {
        let ethers, contrato, admin, lab, dist, farmacia, atacante;

        beforeEach(async function () {
            const conexion = await network.connect();
            ethers = conexion.ethers;
            [admin, lab, dist, farmacia, atacante] = await ethers.getSigners();
            const Fabrica = await ethers.getContractFactory(nombre);
            contrato = await Fabrica.deploy();
            await contrato.waitForDeployment();

            if (nombre === "PharmaChainRolesManuales") {
                await contrato.asignarRol(lab.address, 1);
                await contrato.asignarRol(dist.address, 2);
                await contrato.asignarRol(farmacia.address, 3);
            } else {
                await contrato.grantRole(await contrato.LABORATORIO_ROLE(), lab.address);
                await contrato.grantRole(await contrato.DISTRIBUIDOR_ROLE(), dist.address);
                await contrato.grantRole(await contrato.FARMACIA_ROLE(), farmacia.address);
            }
        });

        async function registrar(nombreLote = "Paracetamol", fabricante = "Laboratorio Galicia") {
            return contrato.connect(lab).registrarLote(nombreLote, fabricante);
        }

        it("empieza sin lotes", async function () {
            expect(await contrato.totalLotes()).to.equal(0n);
            expect(await contrato.administrador()).to.equal(admin.address);
        });

        it("registra y consulta lotes con todos sus datos", async function () {
            await registrar();
            const lote = await contrato.consultarLote(1);
            expect(lote.id).to.equal(1n);
            expect(lote.nombre).to.equal("Paracetamol");
            expect(lote.fabricante).to.equal("Laboratorio Galicia");
            expect(lote.propietario).to.equal(lab.address);
            expect(lote.fechaRegistro).to.be.greaterThan(0n);
            expect(lote.activo).to.equal(true);
        });

        it("crea IDs consecutivos", async function () {
            await registrar();
            await registrar("Ibuprofeno", "Lab B");
            expect(await contrato.totalLotes()).to.equal(2n);
            expect((await contrato.consultarLote(2)).nombre).to.equal("Ibuprofeno");
        });

        it("rechaza nombres y fabricantes vacíos", async function () {
            await expect(registrar("", "Lab")).to.revert(ethers);
            await expect(registrar("Med", "")).to.revert(ethers);
            expect(await contrato.totalLotes()).to.equal(0n);
        });

        it("impide registrar al atacante", async function () {
            await expect(contrato.connect(atacante).registrarLote("Falso", "Falso")).to.revert(
                ethers,
            );
        });

        it("rechaza lotes inexistentes", async function () {
            await expect(contrato.consultarLote(0)).to.revert(ethers);
            await expect(contrato.consultarLote(99)).to.revert(ethers);
        });

        it("emite evento de registro", async function () {
            await expect(registrar())
                .to.emit(contrato, "LoteRegistrado")
                .withArgs(1n, "Paracetamol", lab.address);
        });

        it("la fecha corresponde al bloque", async function () {
            const tx = await registrar();
            const receipt = await tx.wait();
            const bloque = await ethers.provider.getBlock(receipt.blockNumber);
            expect((await contrato.consultarLote(1)).fechaRegistro).to.equal(
                BigInt(bloque.timestamp),
            );
        });

        it("la propuesta no cambia al custodio", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            expect((await contrato.consultarLote(1)).propietario).to.equal(lab.address);
            expect((await contrato.transferencias(1)).pendiente).to.equal(true);
        });

        it("completa laboratorio -> distribuidor -> farmacia", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            await contrato.connect(dist).aceptarTransferencia(1);
            await contrato.connect(dist).proponerTransferencia(1, farmacia.address);
            await contrato.connect(farmacia).aceptarTransferencia(1);
            expect((await contrato.consultarLote(1)).propietario).to.equal(farmacia.address);
            expect((await contrato.transferencias(1)).pendiente).to.equal(false);
        });

        it("rechaza salto directo laboratorio -> farmacia", async function () {
            await registrar();
            await expect(
                contrato.connect(lab).proponerTransferencia(1, farmacia.address),
            ).to.revert(ethers);
        });

        it("rechaza aceptar por un tercero", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            await expect(contrato.connect(atacante).aceptarTransferencia(1)).to.revert(ethers);
        });

        it("cancela una transferencia sin cambiar al custodio", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            await contrato.connect(lab).cancelarTransferencia(1);
            expect((await contrato.transferencias(1)).pendiente).to.equal(false);
            expect((await contrato.consultarLote(1)).propietario).to.equal(lab.address);
        });

        it("impide cancelar a un atacante", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            await expect(contrato.connect(atacante).cancelarTransferencia(1)).to.revert(ethers);
        });

        it("la pausa bloquea el registro y se puede reanudar", async function () {
            await contrato.pausar();
            await expect(registrar()).to.revert(ethers);
            await contrato.reanudar();
            await registrar();
            expect(await contrato.totalLotes()).to.equal(1n);
        });

        it("desactiva lotes y cancela su transferencia pendiente", async function () {
            await registrar();
            await contrato.connect(lab).proponerTransferencia(1, dist.address);
            await contrato.desactivarLote(1);
            expect((await contrato.consultarLote(1)).activo).to.equal(false);
            expect((await contrato.transferencias(1)).pendiente).to.equal(false);
            await expect(contrato.connect(lab).proponerTransferencia(1, dist.address)).to.revert(
                ethers,
            );
        });

        it("solo el administrador puede desactivar", async function () {
            await registrar();
            await expect(contrato.connect(atacante).desactivarLote(1)).to.revert(ethers);
        });

        it("registra el gas utilizado", async function () {
            const receipt = await (await registrar()).wait();
            console.log(`${nombre}: registro = ${receipt.gasUsed} gas`);
            expect(receipt.gasUsed).to.be.greaterThan(0n);
        });
    });
}
