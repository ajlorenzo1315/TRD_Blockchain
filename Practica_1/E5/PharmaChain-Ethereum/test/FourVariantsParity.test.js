import { expect } from "chai";
import { network } from "hardhat";

// Use fully qualified names: this repository contains duplicate Solidity contract names.
const VARIANTS = [
  { id: "V0", kind: "manual", fqn: "contracts/PharmaChainRolesManuales.sol:PharmaChainRolesManuales" },
  { id: "V1", kind: "oz", fqn: "contracts/PharmaChainRolesOpenZeppelin.sol:PharmaChainRolesOpenZeppelin" },
  { id: "V2", kind: "manual", fqn: "contracts/PharmaChainRolesManualesOptimized.sol:PharmaChainRolesManualesOptimized" },
  { id: "V3", kind: "oz", fqn: "contracts/PharmaChainRolesOpenZeppelinOptimized.sol:PharmaChainRolesOpenZeppelinOptimized" },
  { id: "V4", kind: "manual", fqn: "contracts/PharmaChainRolesManualesOptimized1.sol:PharmaChainRolesManualesOptimized1" },
  { id: "V5", kind: "oz", fqn: "contracts/PharmaChainRolesOpenZeppelinOptimized1.sol:PharmaChainRolesOpenZeppelinOptimized1" },
  { id: "V6", kind: "manual", fqn: "contracts/PharmaChainRolesManualesOptimizednoID.sol:PharmaChainRolesManualesOptimizednoID" },
  { id: "V7", kind: "oz", fqn: "contracts/PharmaChainRolesOpenZeppelinOptimizednoID.sol:PharmaChainRolesOpenZeppelinOptimizednoID" },
];

async function mustFail(operation, label) {
  let failed = false;
  try {
    const tx = await operation();
    if (tx?.wait) await tx.wait();
  } catch (_) {
    failed = true;
  }
  expect(failed, `Expected rejection: ${label}`).to.equal(true);
}

async function setup(ethers, variant, actors) {
  const [admin, lab, distributor, pharmacy] = actors;
  const factory = await ethers.getContractFactory(variant.fqn);
  const c = await factory.connect(admin).deploy();
  await c.waitForDeployment();
  if (variant.kind === "manual") {
    for (const [who, role] of [[lab, 1], [distributor, 2], [pharmacy, 3]]) {
      await (await c.connect(admin).asignarRol(who.address, role)).wait();
    }
  } else {
    for (const [who, roleName] of [[lab, "LABORATORIO_ROLE"], [distributor, "DISTRIBUIDOR_ROLE"], [pharmacy, "FARMACIA_ROLE"]]) {
      await (await c.connect(admin).grantRole(await c[roleName](), who.address)).wait();
    }
  }
  return c;
}

// Compare logical state, not block timestamps, gas or implementation-specific role storage.
async function snapshot(c, ids) {
  const result = { totalLotes: String(await c.totalLotes()), lots: [] };
  for (const id of ids) {
    const l = await c.consultarLote(id);
    const t = await c.transferencias(id);
    const n = Number(await c.totalMovimientos(id));
    const history = [];
    for (let i = 0; i < n; i++) {
      const m = await c.consultarMovimiento(id, i);
      history.push({ type: Number(m.tipoMovimiento), from: m.origen.toLowerCase(), to: m.destino.toLowerCase() });
    }
    result.lots.push({
      id: Number(id), name: l.nombre, manufacturer: l.fabricante,
      owner: l.propietario.toLowerCase(), active: l.activo,
      pending: t.pendiente, origin: t.origen.toLowerCase(), destination: t.destino.toLowerCase(), history,
    });
  }
  return result;
}

async function perform(c, sender, method, ...args) {
  const tx = await c.connect(sender)[method](...args);
  const receipt = await tx.wait();
  const events = receipt.logs.flatMap(log => {
    try {
      const parsed = c.interface.parseLog(log);
      return parsed ? [parsed.name] : [];
    } catch (_) { return []; }
  });
  return { gas: receipt.gasUsed.toString(), events };
}

async function scenario(ethers, variant, actors) {
  const [admin, lab, dist, pharmacy, outsider] = actors;
  const c = await setup(ethers, variant, actors);
  const stages = {};
  const gas = {};
  async function step(label, signer, method, ...args) {
    const result = await perform(c, signer, method, ...args);
    gas[label] = result.gas;
    stages[label] = { state: await snapshot(c, [1, 2].filter(i => i <= Number(stages.currentCount ?? 0))), events: result.events };
    return result;
  }
  const capture = async (label, ids) => { stages[label] = { state: await snapshot(c, ids) }; };

  expect(await c.totalLotes()).to.equal(0n);
  await mustFail(() => c.connect(outsider).registrarLote("Falso", "Atacante"), "unauthorized register");
  await mustFail(() => c.connect(lab).registrarLote("", "Fabricante"), "empty name");
  await mustFail(() => c.consultarLote(1), "missing lot");
  await capture("initial", []);

  gas.register1 = (await perform(c, lab, "registrarLote", "Paracetamol 500 mg", "Laboratorios Galicia")).gas;
  await capture("registered1", [1]);
  gas.register2 = (await perform(c, lab, "registrarLote", "Ibuprofeno 600 mg", "Laboratorios Galicia")).gas;
  await capture("registered2", [1, 2]);
  expect(await c.totalLotes()).to.equal(2n);

  await mustFail(() => c.connect(lab).proponerTransferencia(1, pharmacy.address), "skip distributor");
  await mustFail(() => c.connect(outsider).proponerTransferencia(1, dist.address), "outsider proposes");
  gas.propose1 = (await perform(c, lab, "proponerTransferencia", 1, dist.address)).gas;
  await capture("proposed", [1, 2]);
  await mustFail(() => c.connect(outsider).aceptarTransferencia(1), "outsider accepts");
  await mustFail(() => c.connect(lab).proponerTransferencia(1, dist.address), "double proposal");
  gas.cancel1 = (await perform(c, lab, "cancelarTransferencia", 1)).gas;
  await capture("cancelled", [1, 2]);
  gas.propose2 = (await perform(c, lab, "proponerTransferencia", 1, dist.address)).gas;
  gas.accept1 = (await perform(c, dist, "aceptarTransferencia", 1)).gas;
  await capture("atDistributor", [1, 2]);
  gas.propose3 = (await perform(c, dist, "proponerTransferencia", 1, pharmacy.address)).gas;
  gas.accept2 = (await perform(c, pharmacy, "aceptarTransferencia", 1)).gas;
  await capture("atPharmacy", [1, 2]);
  expect((await c.consultarLote(1)).propietario).to.equal(pharmacy.address);

  await mustFail(() => c.connect(outsider).pausar(), "outsider pause");
  await perform(c, admin, "pausar");
  await mustFail(() => c.connect(lab).registrarLote("Bloqueado", "Lab"), "register while paused");
  await perform(c, admin, "reanudar");
  await capture("resumed", [1, 2]);

  gas.propose4 = (await perform(c, lab, "proponerTransferencia", 2, dist.address)).gas;
  await capture("lot2Pending", [1, 2]);
  await mustFail(() => c.connect(outsider).desactivarLote(2), "outsider deactivate");
  gas.deactivate = (await perform(c, admin, "desactivarLote", 2)).gas;
  await capture("lot2Deactivated", [1, 2]);
  await mustFail(() => c.connect(dist).aceptarTransferencia(2), "accept deactivated");
  await mustFail(() => c.connect(lab).proponerTransferencia(2, dist.address), "transfer deactivated");
  await mustFail(() => c.connect(admin).desactivarLote(2), "deactivate twice");
  return { stages, gas };
}

describe("Integracion completa: paridad de comportamiento V0–V7", function () {
  this.timeout(120000);
  it("ejecuta el mismo escenario y compara estados e historiales en las ocho variantes", async function () {
    const { ethers } = await network.connect();
    const actors = await ethers.getSigners();
    const results = [];
    for (const variant of VARIANTS) {
      const result = await scenario(ethers, variant, actors);
      results.push({ variant: variant.id, ...result });
    }
    for (const candidate of results.slice(1)) {
      expect(candidate.stages, `${candidate.variant} differs from V0`).to.deep.equal(results[0].stages);
    }
    console.log("\nGas por variante (no se exige igualdad de gas):");
    console.table(results.map(({ variant, gas }) => ({ variant, ...gas })));
  });
});
