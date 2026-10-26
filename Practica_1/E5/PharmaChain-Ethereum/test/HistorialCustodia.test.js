import { expect } from "chai";
import { network } from "hardhat";

const versiones = ["PharmaChainRolesManuales", "PharmaChainRolesOpenZeppelin"];

for (const version of versiones) {
    describe(`Historial de custodia - ${version}`, function () {
        let ethers;
        let contrato;
        let admin;
        let laboratorio;
        let distribuidor;
        let farmacia;

        beforeEach(async function () {
            const conexion = await network.connect();
            ethers = conexion.ethers;

            [admin, laboratorio, distribuidor, farmacia] = await ethers.getSigners();

            const Fabrica = await ethers.getContractFactory(version);

            contrato = await Fabrica.deploy();
            await contrato.waitForDeployment();

            if (version === "PharmaChainRolesManuales") {
                await contrato.asignarRol(laboratorio.address, 1);
                await contrato.asignarRol(distribuidor.address, 2);
                await contrato.asignarRol(farmacia.address, 3);
            } else {
                await contrato.grantRole(await contrato.LABORATORIO_ROLE(), laboratorio.address);

                await contrato.grantRole(await contrato.DISTRIBUIDOR_ROLE(), distribuidor.address);

                await contrato.grantRole(await contrato.FARMACIA_ROLE(), farmacia.address);
            }
        });

        it("Registra el primer movimiento al crear un lote", async function () {
            await contrato.connect(laboratorio).registrarLote("Paracetamol", "Laboratorio Galicia");

            expect(await contrato.totalMovimientos(1)).to.equal(1n);

            const movimiento = await contrato.consultarMovimiento(1, 0);

            expect(movimiento.tipoMovimiento).to.equal(0n);
            expect(movimiento.destino).to.equal(laboratorio.address);
        });

        it("Guarda la propuesta sin cambiar el custodio", async function () {
            await contrato.connect(laboratorio).registrarLote("Paracetamol", "Laboratorio Galicia");

            await contrato.connect(laboratorio).proponerTransferencia(1, distribuidor.address);

            expect(await contrato.totalMovimientos(1)).to.equal(2n);

            const propuesta = await contrato.consultarMovimiento(1, 1);

            expect(propuesta.tipoMovimiento).to.equal(1n);
            expect(propuesta.origen).to.equal(laboratorio.address);
            expect(propuesta.destino).to.equal(distribuidor.address);

            const lote = await contrato.consultarLote(1);
            expect(lote.propietario).to.equal(laboratorio.address);
        });

        it("Conserva el historial completo hasta la farmacia", async function () {
            await contrato.connect(laboratorio).registrarLote("Paracetamol", "Laboratorio Galicia");

            await contrato.connect(laboratorio).proponerTransferencia(1, distribuidor.address);

            await contrato.connect(distribuidor).aceptarTransferencia(1);

            await contrato.connect(distribuidor).proponerTransferencia(1, farmacia.address);

            await contrato.connect(farmacia).aceptarTransferencia(1);

            expect(await contrato.totalMovimientos(1)).to.equal(5n);

            const tiposEsperados = [0n, 1n, 2n, 1n, 2n];

            for (let i = 0; i < tiposEsperados.length; i++) {
                const movimiento = await contrato.consultarMovimiento(1, i);
                expect(movimiento.tipoMovimiento).to.equal(tiposEsperados[i]);
                expect(movimiento.fecha).to.be.greaterThan(0n);
            }

            const lote = await contrato.consultarLote(1);
            expect(lote.propietario).to.equal(farmacia.address);
        });

        it("Registra una cancelacion sin cambiar el custodio", async function () {
            await contrato.connect(laboratorio).registrarLote("Paracetamol", "Laboratorio Galicia");

            await contrato.connect(laboratorio).proponerTransferencia(1, distribuidor.address);

            await contrato.connect(laboratorio).cancelarTransferencia(1);

            expect(await contrato.totalMovimientos(1)).to.equal(3n);

            const cancelacion = await contrato.consultarMovimiento(1, 2);

            expect(cancelacion.tipoMovimiento).to.equal(3n);

            const lote = await contrato.consultarLote(1);
            expect(lote.propietario).to.equal(laboratorio.address);
        });

        it("Rechaza consultar movimientos inexistentes", async function () {
            await contrato.connect(laboratorio).registrarLote("Paracetamol", "Laboratorio Galicia");

            await expect(contrato.consultarMovimiento(1, 10)).to.revert(ethers);
        });
    });
}
