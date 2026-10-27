import { expect } from "chai";
import hre from "hardhat";

describe("PharmaChain - Lote sin ID redundante", function () {
  let ethers;
  let contrato;
  let admin, laboratorio, distribuidor, farmacia;

  beforeEach(async function () {
    ({ ethers } = await hre.network.connect());

    [admin, laboratorio, distribuidor, farmacia] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory(
      "PharmaChainRolesManualesOptimized"
    );

    contrato = await Factory.connect(admin).deploy();
    await contrato.waitForDeployment();

    await (
      await contrato.asignarRol(laboratorio.address, 1)
    ).wait();

    await (
      await contrato.asignarRol(distribuidor.address, 2)
    ).wait();

    await (
      await contrato.asignarRol(farmacia.address, 3)
    ).wait();
  });

  async function registrar(nombre = "Paracetamol") {
    const tx = await contrato
      .connect(laboratorio)
      .registrarLote(nombre, "Laboratorio A");

    return (await tx.wait()).gasUsed;
  }

  it("registra un lote con identificador consecutivo", async function () {
    await registrar();

    expect(await contrato.totalLotes()).to.equal(1n);

    const lote = await contrato.consultarLote(1);

    expect(lote.nombre).to.equal("Paracetamol");
    expect(lote.fabricante).to.equal("Laboratorio A");
    expect(lote.propietario).to.equal(laboratorio.address);
    expect(lote.activo).to.equal(true);
  });

  it("no devuelve un campo ID redundante", async function () {
    await registrar();

    const lote = await contrato.consultarLote(1);

    expect(lote.id).to.equal(undefined);
  });

  it("mantiene IDs consecutivos", async function () {
    await registrar("Lote A");
    await registrar("Lote B");
    await registrar("Lote C");

    expect(await contrato.totalLotes()).to.equal(3n);

    const tercero = await contrato.consultarLote(3);
    expect(tercero.nombre).to.equal("Lote C");
  });

  it("mantiene la transferencia de custodia", async function () {
    await registrar();

    await (
      await contrato.connect(laboratorio)
        .proponerTransferencia(1, distribuidor.address)
    ).wait();

    await (
      await contrato.connect(distribuidor)
        .aceptarTransferencia(1)
    ).wait();

    const lote = await contrato.consultarLote(1);

    expect(lote.propietario).to.equal(
      distribuidor.address
    );

    expect(await contrato.totalMovimientos(1)).to.equal(3n);
  });

  it("mantiene el historial de movimientos", async function () {
    await registrar();

    const movimiento = await contrato.consultarMovimiento(1, 0);

    expect(movimiento.tipoMovimiento).to.equal(0n);
    expect(movimiento.destino).to.equal(
      laboratorio.address
    );
  });

  it("rechaza registros sin rol de laboratorio", async function () {
    await expect(
      contrato.connect(distribuidor)
        .registrarLote("Medicamento", "Fabricante")
    ).to.be.reverted;
  });

  it("mide el gas de varios registros", async function () {
    const mediciones = [];

    for (let i = 1; i <= 10; i++) {
      const gas = await registrar(`Medicamento ${i}`);

      mediciones.push({
        lote: i,
        gas: Number(gas)
      });
    }

    console.table(mediciones);

    expect(await contrato.totalLotes()).to.equal(10n);
  });
});
