
import { expect } from "chai";
import { network } from "hardhat";

// Nombres totalmente cualificados.
// El nombre después de ":" debe coincidir con el contrato Solidity,
// aunque sea distinto del nombre del archivo.
const VARIANTS = [
  {
    id: "V0",
    kind: "manual",
    fqn: "contracts/PharmaChainRolesManuales.sol:PharmaChainRolesManuales",
  },
  {
    id: "V1",
    kind: "oz",
    fqn: "contracts/PharmaChainRolesOpenZeppelin.sol:PharmaChainRolesOpenZeppelin",
  },
  {
    id: "V2",
    kind: "manual",
    fqn: "contracts/PharmaChainRolesManualesOptimized.sol:PharmaChainRolesManualesOptimized",
  },
  {
    id: "V3",
    kind: "oz",
    fqn: "contracts/PharmaChainRolesOpenZeppelinOptimized.sol:PharmaChainRolesOpenZeppelinOptimized",
  },
  {
    id: "V4",
    kind: "manual",
    fqn: "contracts/PharmaChainRolesManualesOptimized1.sol:PharmaChainRolesManualesOptimized1",
  },
  {
    id: "V5",
    kind: "oz",
    fqn: "contracts/PharmaChainRolesOpenZeppelinOptimized1.sol:PharmaChainRolesOpenZeppelinOptimized1",
  },
  {
    id: "V6",
    kind: "manual",
    fqn: "contracts/PharmaChainRolesManualesOptimizednoID.sol:PharmaChainRolesManualesOptimizednoID",
  },
  {
    id: "V7",
    kind: "oz",
    fqn: "contracts/PharmaChainRolesOpenZeppelinOptimizednoID.sol:PharmaChainRolesOpenZeppelinOptimizednoID",
  },
];

function normalize(address) {
  return address.toLowerCase();
}

async function mustFail(operation, label) {
  let failed = false;

  try {
    const result = await operation();

    if (result?.wait) {
      await result.wait();
    }
  } catch {
    failed = true;
  }

  expect(failed, `Expected rejection: ${label}`).to.equal(true);
}

async function setup(ethers, variant, actors) {
  const [admin, lab, distributor, pharmacy] = actors;

  const factory = await ethers.getContractFactory(variant.fqn);
  const contract = await factory.connect(admin).deploy();

  await contract.waitForDeployment();

  if (variant.kind === "manual") {
    const assignments = [
      [lab, 1],
      [distributor, 2],
      [pharmacy, 3],
    ];

    for (const [account, role] of assignments) {
      const tx = await contract
        .connect(admin)
        .asignarRol(account.address, role);

      await tx.wait();
    }
  } else {
    const assignments = [
      [lab, "LABORATORIO_ROLE"],
      [distributor, "DISTRIBUIDOR_ROLE"],
      [pharmacy, "FARMACIA_ROLE"],
    ];

    for (const [account, roleName] of assignments) {
      const role = await contract[roleName]();

      const tx = await contract
        .connect(admin)
        .grantRole(role, account.address);

      await tx.wait();
    }
  }

  return contract;
}

// Normaliza las estructuras para poder comparar variantes.
// No compara timestamps, porque cada transacción se mina en
// un bloque diferente.
async function snapshot(contract, ids) {
  const state = {
    totalLotes: Number(await contract.totalLotes()),
    lots: [],
  };

  for (const id of ids) {
    const lot = await contract.consultarLote(id);
    const transfer = await contract.transferencias(id);

    const count = Number(await contract.totalMovimientos(id));
    const history = [];

    for (let i = 0; i < count; i++) {
      const movement = await contract.consultarMovimiento(id, i);

      history.push({
        type: Number(movement.tipoMovimiento),
        from: normalize(movement.origen),
        to: normalize(movement.destino),
      });
    }

    state.lots.push({
      id,
      name: lot.nombre,
      manufacturer: lot.fabricante,
      owner: normalize(lot.propietario),
      active: lot.activo,
      pending: transfer.pendiente,
      origin: normalize(transfer.origen),
      destination: normalize(transfer.destino),
      history,
    });
  }

  return state;
}

async function perform(contract, signer, method, ...args) {
  const tx = await contract.connect(signer)[method](...args);
  const receipt = await tx.wait();

  const events = [];

  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);

      if (parsed) {
        events.push(parsed.name);
      }
    } catch {
      // Ignora logs ajenos al ABI del contrato.
    }
  }

  return {
    gas: Number(receipt.gasUsed),
    events,
  };
}

async function scenario(ethers, variant, actors) {
  const [admin, lab, dist, pharmacy, outsider] = actors;

  const contract = await setup(ethers, variant, actors);

  const stages = {};
  const gas = {};
  const events = {};

  async function capture(label, ids) {
    stages[label] = await snapshot(contract, ids);
  }

  async function execute(label, signer, method, ...args) {
    const result = await perform(
      contract,
      signer,
      method,
      ...args
    );

    gas[label] = result.gas;
    events[label] = result.events;

    return result;
  }

  // 1. Estado inicial y validaciones.
  expect(await contract.totalLotes()).to.equal(0n);

  await mustFail(
    () => contract.connect(outsider).registrarLote(
      "Falso",
      "Atacante"
    ),
    "unauthorized register"
  );

  await mustFail(
    () => contract.connect(lab).registrarLote(
      "",
      "Fabricante"
    ),
    "empty name"
  );

  await mustFail(
    () => contract.consultarLote(1),
    "missing lot"
  );

  await capture("initial", []);

  // 2. Registro de medicamentos.
  await execute(
    "register1",
    lab,
    "registrarLote",
    "Paracetamol 500 mg",
    "Laboratorios Galicia"
  );

  await capture("registered1", [1]);

  await execute(
    "register2",
    lab,
    "registrarLote",
    "Ibuprofeno 600 mg",
    "Laboratorios Galicia"
  );

  await capture("registered2", [1, 2]);

  expect(await contract.totalLotes()).to.equal(2n);

  // 3. Rechazo de transferencias no autorizadas.
  await mustFail(
    () => contract.connect(lab).proponerTransferencia(
      1,
      pharmacy.address
    ),
    "skip distributor"
  );

  await mustFail(
    () => contract.connect(outsider).proponerTransferencia(
      1,
      dist.address
    ),
    "outsider proposes"
  );

  // 4. Propuesta y cancelación.
  await execute(
    "propose1",
    lab,
    "proponerTransferencia",
    1,
    dist.address
  );

  await capture("proposed", [1, 2]);

  await mustFail(
    () => contract.connect(outsider).aceptarTransferencia(1),
    "outsider accepts"
  );

  await mustFail(
    () => contract.connect(lab).proponerTransferencia(
      1,
      dist.address
    ),
    "double proposal"
  );

  await execute(
    "cancel1",
    lab,
    "cancelarTransferencia",
    1
  );

  await capture("cancelled", [1, 2]);

  // 5. Laboratorio -> distribuidor.
  await execute(
    "propose2",
    lab,
    "proponerTransferencia",
    1,
    dist.address
  );

  await execute(
    "accept1",
    dist,
    "aceptarTransferencia",
    1
  );

  await capture("atDistributor", [1, 2]);

  expect(
    normalize((await contract.consultarLote(1)).propietario)
  ).to.equal(normalize(dist.address));

  // 6. Distribuidor -> farmacia.
  await execute(
    "propose3",
    dist,
    "proponerTransferencia",
    1,
    pharmacy.address
  );

  await execute(
    "accept2",
    pharmacy,
    "aceptarTransferencia",
    1
  );

  await capture("atPharmacy", [1, 2]);

  expect(
    normalize((await contract.consultarLote(1)).propietario)
  ).to.equal(normalize(pharmacy.address));

  // 7. Pausa y reanudación.
  await mustFail(
    () => contract.connect(outsider).pausar(),
    "outsider pause"
  );

  await execute("pause", admin, "pausar");

  await mustFail(
    () => contract.connect(lab).registrarLote(
      "Bloqueado",
      "Lab"
    ),
    "register while paused"
  );

  await execute("resume", admin, "reanudar");

  await capture("resumed", [1, 2]);

  // 8. Desactivación con transferencia pendiente.
  await execute(
    "propose4",
    lab,
    "proponerTransferencia",
    2,
    dist.address
  );

  await capture("lot2Pending", [1, 2]);

  await mustFail(
    () => contract.connect(outsider).desactivarLote(2),
    "outsider deactivate"
  );

  await execute(
    "deactivate",
    admin,
    "desactivarLote",
    2
  );

  await capture("lot2Deactivated", [1, 2]);

  await mustFail(
    () => contract.connect(dist).aceptarTransferencia(2),
    "accept deactivated"
  );

  await mustFail(
    () => contract.connect(lab).proponerTransferencia(
      2,
      dist.address
    ),
    "transfer deactivated"
  );

  await mustFail(
    () => contract.connect(admin).desactivarLote(2),
    "deactivate twice"
  );

  // 9. Estado final.
  const finalState = await snapshot(contract, [1, 2]);

  expect(finalState.totalLotes).to.equal(2);
  expect(finalState.lots[0].owner).to.equal(
    normalize(pharmacy.address)
  );
  expect(finalState.lots[0].active).to.equal(true);
  expect(finalState.lots[1].active).to.equal(false);
  expect(finalState.lots[1].pending).to.equal(false);

  return {
    stages,
    gas,
    events,
  };
}

describe("PharmaChain: paridad funcional V0-V7", function () {
  this.timeout(240000);

  it("ejecuta el mismo escenario en las ocho variantes", async function () {
    const { ethers } = await network.connect();
    const actors = await ethers.getSigners();

    const results = [];

    for (const variant of VARIANTS) {
      console.log(`\nEjecutando ${variant.id}: ${variant.fqn}`);

      const result = await scenario(
        ethers,
        variant,
        actors
      );

      results.push({
        variant: variant.id,
        ...result,
      });

      console.log(`${variant.id}: escenario completado`);
    }

    const baseline = results[0];

    // Comparación de estados.
    for (const candidate of results.slice(1)) {
      expect(
        candidate.stages,
        `${candidate.variant}: estados diferentes de V0`
      ).to.deep.equal(baseline.stages);
    }

    // Los eventos se comparan por nombre y orden.
    // Si una optimización cambia deliberadamente la ABI
    // de eventos, esta comprobación deberá adaptarse.
    for (const candidate of results.slice(1)) {
      expect(
        candidate.events,
        `${candidate.variant}: eventos diferentes de V0`
      ).to.deep.equal(baseline.events);
    }

    console.log("\n=== PARIDAD FUNCIONAL ===");
    console.table(
      results.map(result => ({
        version: result.variant,
        stages: Object.keys(result.stages).length,
        operations: Object.keys(result.gas).length,
        status: "PASS",
      }))
    );

    console.log("\n=== CONSUMO DE GAS ===");
    console.table(
      results.map(({ variant, gas }) => ({
        variant,
        ...gas,
      }))
    );

    console.log("\n=== AHORRO RESPECTO A V0 ===");

    const operations = Object.keys(baseline.gas);

    for (const operation of operations) {
      const baseGas = baseline.gas[operation];

      console.table(
        results.map(({ variant, gas }) => ({
          variant,
          operation,
          gas: gas[operation],
          saving:
            `${(
              (1 - gas[operation] / baseGas) * 100
            ).toFixed(2)}%`,
        }))
      );
    }
  });
});
