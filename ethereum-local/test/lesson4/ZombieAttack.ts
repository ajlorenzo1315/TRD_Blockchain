import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  encodePacked,
  hexToBigInt,
  keccak256,
  parseEther,
  type Address,
} from "viem";

// LECCION 4:
// Contrato final. Hereda Lesson4Ownable, Lesson4ZombieFactory,
// Lesson4ZombieFeeding y Lesson4ZombieHelper.
const CONTRACT =
  "contracts/CryptoZombies/lesson-04/L4zombieattack.sol:Lesson4ZombieAttack";

// LECCION 4 - CAPITULO 1:
// Tarifa inicial definida en ZombieHelper.
const LEVEL_FEE = parseEther("0.001");

// LECCION 3 Y 4:
// Cooldown de 24 horas.
const ONE_DAY = 86400n;

// Conexion a la red Ethereum local de Hardhat.
const connection = await network.connect();
const { viem } = connection;

const publicClient = await viem.getPublicClient();

const [owner, alice, bob] =
  await viem.getWalletClients();

// --------------------------------------------------
// FUNCIONES AUXILIARES DE PRUEBA
// --------------------------------------------------

// Despliega una instancia nueva de Lesson4ZombieAttack.
async function deploy() {
  return viem.deployContract(CONTRACT);
}

// Espera a que una transaccion sea confirmada.
async function confirmed(hash: `0x${string}`) {
  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash,
    });

  assert.equal(receipt.status, "success");

  return receipt;
}

// Crea un zombi inicial desde una cuenta.
async function createZombie(
  contract: Awaited<ReturnType<typeof deploy>>,
  name: string,
  wallet = owner,
) {
  const hash = await wallet.writeContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "createRandomZombie",
    args: [name],
  });

  await confirmed(hash);
}

// Avanza el tiempo de la blockchain local.
// No espera 24 horas reales.
async function advanceTime(seconds = ONE_DAY) {
  await connection.provider.request({
    method: "evm_increaseTime",
    params: [Number(seconds)],
  });

  await connection.provider.request({
    method: "evm_mine",
    params: [],
  });
}

// Comprueba que una operacion revierte.
async function expectRevert(
  action: () => Promise<unknown>,
) {
  await assert.rejects(action);
}

// Ejecuta una funcion desde una cuenta concreta.
async function writeAs(
  contract: Awaited<ReturnType<typeof deploy>>,
  wallet: typeof owner,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
) {
  const hash = await wallet.writeContract({
    address: contract.address,
    abi: contract.abi,
    functionName,
    args,
    ...(value === undefined ? {} : { value }),
    // Evita que la estimacion de gas ejecute attack()
    // antes del timestamp preparado para la batalla.
    ...(functionName === "attack" ? { gas: 3_000_000n } : {}),
  } as Parameters<typeof wallet.writeContract>[0]);

  return confirmed(hash);
}

// Simula una transaccion para verificar que falla.
// No altera el estado de la blockchain.
async function simulateAs(
  contract: Awaited<ReturnType<typeof deploy>>,
  wallet: typeof owner,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
) {
  return publicClient.simulateContract({
    address: contract.address,
    abi: contract.abi,
    functionName,
    args,
    account: wallet.account,
    ...(value === undefined ? {} : { value }),
  } as Parameters<typeof publicClient.simulateContract>[0]);
}

// LECCION 4 - CAPITULO 3:
// Reproduce exactamente la formula randMod(100).
//
// Solidity:
// keccak256(abi.encodePacked(now, msg.sender, randNonce))
//
// En el primer ataque, randNonce pasa de 0 a 1.
function calculateRand(
  timestamp: bigint,
  sender: Address,
  nonce: bigint,
) {
  const encoded = encodePacked(
    ["uint256", "address", "uint256"],
    [timestamp, sender, nonce],
  );

  return hexToBigInt(keccak256(encoded)) % 100n;
}

// Encuentra un timestamp que fuerce una victoria
// o una derrota en el siguiente bloque.
//
// Esto NO modifica el contrato.
// Controla un dato del entorno de pruebas.
async function prepareBattle(
  sender: Address,
  nonce: bigint,
  outcome: "win" | "loss",
) {
  const block = await publicClient.getBlock();

  // Esperamos a que hayan transcurrido 24 horas.
  let timestamp = block.timestamp + ONE_DAY + 2n;

  for (let i = 0; i < 1000; i++) {
    const result = calculateRand(
      timestamp,
      sender,
      nonce,
    );

    // Codigo original:
    // if (rand <= attackVictoryProbability)
    const isWin = result <= 70n;

    if (
      (outcome === "win" && isWin) ||
      (outcome === "loss" && !isWin)
    ) {
      await connection.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [Number(timestamp)],
      });

      return { timestamp, result };
    }

    timestamp++;
  }

  throw new Error(
    "No se encontro un timestamp para el combate",
  );
}

// --------------------------------------------------
// PRUEBAS
// --------------------------------------------------

describe("CryptoZombies - Leccion 4", () => {

  // ================================================
  // 01. NUEVOS CAMPOS DE ZOMBIEFACTORY
  // ================================================

  it("01. Inicializa victorias y derrotas en cero", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    const zombie = await contract.read.zombies([0n]);

    // Estructura de la Leccion 4:
    // [name, dna, level, readyTime, winCount, lossCount]
    assert.equal(BigInt(zombie[4]), 0n);
    assert.equal(BigInt(zombie[5]), 0n);
  });

  // ================================================
  // 02. FUNCIONES PAYABLE
  // ================================================

  it("02. Permite subir de nivel pagando 0.001 ETH", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(BigInt(zombie[2]), 2n);
  });

  it("03. Rechaza un pago insuficiente", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await expectRevert(() =>
      simulateAs(
        contract,
        owner,
        "levelUp",
        [0n],
        parseEther("0.0005"),
      ),
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(BigInt(zombie[2]), 1n);
  });

  it("04. Rechaza un pago superior a la tarifa", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await expectRevert(() =>
      simulateAs(
        contract,
        owner,
        "levelUp",
        [0n],
        parseEther("0.002"),
      ),
    );
  });

  it("05. Acumula los pagos en el contrato", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    const balance = await publicClient.getBalance({
      address: contract.address,
    });

    assert.equal(balance, LEVEL_FEE);
  });

  // ================================================
  // 03. ADMINISTRACION DE TARIFAS
  // ================================================

  it("06. El administrador puede cambiar la tarifa", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    const newFee = parseEther("0.005");

    await writeAs(
      contract,
      owner,
      "setLevelUpFee",
      [newFee],
    );

    // La tarifa anterior ya no sirve.
    await expectRevert(() =>
      simulateAs(
        contract,
        owner,
        "levelUp",
        [0n],
        LEVEL_FEE,
      ),
    );

    // La nueva tarifa si funciona.
    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      newFee,
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(BigInt(zombie[2]), 2n);
  });

  it("07. Un usuario ajeno no puede cambiar la tarifa", async () => {
    const contract = await deploy();

    await expectRevert(() =>
      simulateAs(
        contract,
        alice,
        "setLevelUpFee",
        [parseEther("0.1")],
      ),
    );
  });

  // ================================================
  // 04. RETIRADA DE ETH
  // ================================================

  it("08. El administrador puede retirar el saldo", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    const before = await publicClient.getBalance({
      address: contract.address,
    });

    assert.equal(before, LEVEL_FEE);

    await writeAs(
      contract,
      owner,
      "withdraw",
    );

    const after = await publicClient.getBalance({
      address: contract.address,
    });

    assert.equal(after, 0n);
  });

  it("09. Un usuario ajeno no puede retirar ETH", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    await expectRevert(() =>
      simulateAs(
        contract,
        alice,
        "withdraw",
      ),
    );

    const balance = await publicClient.getBalance({
      address: contract.address,
    });

    assert.equal(balance, LEVEL_FEE);
  });

  // ================================================
  // 05. MODIFICADORES Y NIVELES
  // ================================================

  it("10. Permite cambiar nombre al alcanzar nivel 2", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    // Nivel 1 -> nivel 2.
    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    await writeAs(
      contract,
      owner,
      "changeName",
      [0n, "SuperAlice"],
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(zombie[0], "SuperAlice");
  });

  it("11. Rechaza cambiar nombre de un zombi ajeno", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    await writeAs(
      contract,
      owner,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    await expectRevert(() =>
      simulateAs(
        contract,
        alice,
        "changeName",
        [0n, "Intruso"],
      ),
    );
  });

  it("12. Permite cambiar ADN al alcanzar nivel 20", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    // Nivel inicial = 1.
    // Necesitamos 19 subidas.
    for (let i = 0; i < 19; i++) {
      await writeAs(
        contract,
        owner,
        "levelUp",
        [0n],
        LEVEL_FEE,
      );
    }

    const newDna = 1234567890123456n;

    await writeAs(
      contract,
      owner,
      "changeDna",
      [0n, newDna],
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(BigInt(zombie[2]), 20n);
    assert.equal(zombie[1], newDna);
  });

  it("13. Rechaza cambiar ADN de un zombi ajeno", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice");

    for (let i = 0; i < 19; i++) {
      await writeAs(
        contract,
        owner,
        "levelUp",
        [0n],
        LEVEL_FEE,
      );
    }

    await expectRevert(() =>
      simulateAs(
        contract,
        alice,
        "changeDna",
        [0n, 9999999999999999n],
      ),
    );
  });

  // ================================================
  // 06. COOLDOWN
  // ================================================

  it("14. El zombi nace con cooldown de 24 horas", async () => {
    const contract = await deploy();

    const hash = await contract.write.createRandomZombie([
      "Alice",
    ]);

    const receipt = await confirmed(hash);

    const block = await publicClient.getBlock({
      blockNumber: receipt.blockNumber,
    });

    const zombie = await contract.read.zombies([0n]);

    assert.equal(
      BigInt(zombie[3]),
      block.timestamp + ONE_DAY,
    );
  });

  it("15. El cooldown inicial termina al avanzar 24 horas", async () => {
    const contract = await deploy();
    await createZombie(contract, "Alice");

    const zombie = await contract.read.zombies([0n]);
    const before = await publicClient.getBlock();
    assert.ok(BigInt(zombie[3]) > before.timestamp);

    await advanceTime();
    const after = await publicClient.getBlock();
    assert.ok(after.timestamp >= BigInt(zombie[3]));
  });

  // ================================================
  // 07. ATAQUES
  // ================================================

  it("16. Solo el propietario puede atacar con su zombi", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    await expectRevert(() =>
      simulateAs(
        contract,
        alice,
        "attack",
        [0n, 1n],
      ),
    );
  });

  it("17. Una victoria aumenta nivel y victorias", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    // Forzamos un resultado de victoria
    // calculando el timestamp de randMod.
    const prediction = await prepareBattle(
      owner.account.address,
      1n,
      "win",
    );

    assert.ok(prediction.result <= 70n);

    await writeAs(
      contract,
      owner,
      "attack",
      [0n, 1n],
    );

    const attacker = await contract.read.zombies([0n]);
    const enemy = await contract.read.zombies([1n]);

    // Victoria del atacante.
    assert.equal(BigInt(attacker[4]), 1n);

    // Sube un nivel.
    assert.equal(BigInt(attacker[2]), 2n);

    // Derrota del enemigo.
    assert.equal(BigInt(enemy[5]), 1n);

    // Se crea un descendiente.
    const child = await contract.read.zombies([2n]);

    assert.equal(child[0], "NoName");

    const childOwner =
      await contract.read.zombieToOwner([2n]);

    assert.equal(
      childOwner.toLowerCase(),
      owner.account.address.toLowerCase(),
    );
  });

  it("18. Una derrota actualiza las estadisticas", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    const prediction = await prepareBattle(
      owner.account.address,
      1n,
      "loss",
    );

    assert.ok(prediction.result > 70n);

    await writeAs(
      contract,
      owner,
      "attack",
      [0n, 1n],
    );

    const attacker = await contract.read.zombies([0n]);
    const enemy = await contract.read.zombies([1n]);

    // Derrota del atacante.
    assert.equal(BigInt(attacker[5]), 1n);

    // Victoria del defensor.
    assert.equal(BigInt(enemy[4]), 1n);

    // El atacante no sube de nivel.
    assert.equal(BigInt(attacker[2]), 1n);

    // No se crea descendiente en una derrota.
    const owned =
      await contract.read.getZombiesByOwner([
        owner.account.address,
      ]);

    assert.deepEqual([...owned], [0n]);
  });

  it("19. Una derrota reinicia el cooldown", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    await prepareBattle(
      owner.account.address,
      1n,
      "loss",
    );

    const receipt = await writeAs(
      contract,
      owner,
      "attack",
      [0n, 1n],
    );

    const block = await publicClient.getBlock({
      blockNumber: receipt.blockNumber,
    });

    const zombie = await contract.read.zombies([0n]);

    assert.equal(
      BigInt(zombie[3]),
      block.timestamp + ONE_DAY,
    );
  });

  it("20. Una victoria reinicia el cooldown del atacante", async () => {
    const contract = await deploy();
    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    await prepareBattle(owner.account.address, 1n, "win");
    const receipt = await writeAs(contract, owner, "attack", [0n, 1n]);
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const attacker = await contract.read.zombies([0n]);

    assert.equal(BigInt(attacker[3]), block.timestamp + ONE_DAY);
  });

  
    it("21. Una victoria durante cooldown revierte por completo", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    // LECCION 4:
    // El zombi empieza con un cooldown de 24 horas.
    const block = await publicClient.getBlock();
    const zombie = await contract.read.zombies([0n]);

    const readyTime = BigInt(zombie[3]);

    // Buscamos un timestamp anterior a readyTime
    // que produzca una victoria.
    let target = block.timestamp + 2n;

    while (
        target < readyTime &&
        calculateRand(target, owner.account.address, 1n) > 70n
    ) {
        target++;
    }

    // Debemos haber encontrado una victoria
    // antes de finalizar el cooldown.
    assert.ok(target < readyTime);

    const predictedRand = calculateRand(
        target,
        owner.account.address,
        1n,
    );

    assert.ok(predictedRand <= 70n);

    // Establecemos el timestamp del siguiente bloque.
    await connection.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [Number(target)],
    });

    // LECCION 4:
    // La transaccion debe revertir porque
    // feedAndMultiply exige que el cooldown termine.
    //
    // En Hardhat, writeContract puede lanzar
    // directamente la excepcion de revert.
    await assert.rejects(
        async () => {
        await owner.writeContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "attack",
            args: [0n, 1n],
            gas: 3_000_000n,
        });
        },
        /revert/i,
    );

    // LECCION 4:
    // Solidity garantiza atomicidad.
    // Si una operacion falla, todos los cambios
    // anteriores de esa transaccion se deshacen.

    const attacker = await contract.read.zombies([0n]);
    const defender = await contract.read.zombies([1n]);

    // El atacante conserva su nivel inicial.
    assert.equal(BigInt(attacker[2]), 1n);

    // No registra ninguna victoria.
    assert.equal(BigInt(attacker[4]), 0n);

    // No registra ninguna derrota.
    assert.equal(BigInt(attacker[5]), 0n);

    // El defensor tampoco registra cambios.
    assert.equal(BigInt(defender[4]), 0n);
    assert.equal(BigInt(defender[5]), 0n);

    // No se ha creado ningun descendiente.
    const ownedZombies =
        await contract.read.getZombiesByOwner([
        owner.account.address,
        ]);

    assert.deepEqual([...ownedZombies], [0n]);

    // El cooldown original tampoco cambia.
    assert.equal(BigInt(attacker[3]), readyTime);
    });


  // ================================================
  // 08. COMPORTAMIENTO ORIGINAL
  // ================================================

  it("22. levelUp permite subir un zombi ajeno pagando", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);

    // El codigo original NO usa ownerOf
    // en levelUp.
    await writeAs(
      contract,
      alice,
      "levelUp",
      [0n],
      LEVEL_FEE,
    );

    const zombie = await contract.read.zombies([0n]);

    assert.equal(BigInt(zombie[2]), 2n);

    // El propietario no cambia.
    const zombieOwner =
      await contract.read.zombieToOwner([0n]);

    assert.equal(
      zombieOwner.toLowerCase(),
      owner.account.address.toLowerCase(),
    );
  });

  it("23. Devuelve correctamente los zombis por propietario", async () => {
    const contract = await deploy();

    await createZombie(contract, "Alice", owner);
    await createZombie(contract, "Bob", alice);

    const ownerZombies =
      await contract.read.getZombiesByOwner([
        owner.account.address,
      ]);

    const aliceZombies =
      await contract.read.getZombiesByOwner([
        alice.account.address,
      ]);

    const bobZombies =
      await contract.read.getZombiesByOwner([
        bob.account.address,
      ]);

    assert.deepEqual([...ownerZombies], [0n]);
    assert.deepEqual([...aliceZombies], [1n]);
    assert.deepEqual([...bobZombies], []);
  });

});
