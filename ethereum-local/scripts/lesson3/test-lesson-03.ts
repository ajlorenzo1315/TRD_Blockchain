import assert from "node:assert/strict";
import { network } from "hardhat";

const { viem } = await network.connect();

const publicClient = await viem.getPublicClient();
const [owner, attacker] = await viem.getWalletClients();

const CONTRACT = "contracts/CryptoZombies/lesson-03/L3zombiehelper.sol:Lesson3ZombieHelper";

const ONE_DAY = 86400n;
const DNA_MODULUS = 10n ** 16n;

function check(condition: boolean, message: string) {
    assert.ok(condition, message);
    console.log(`PASS: ${message}`);
}

async function expectRevert(action: () => Promise<unknown>, message: string) {
    let reverted = false;

    try {
        await action();
    } catch {
        reverted = true;
    }

    check(reverted, message);
}

console.log("\n=== CryptoZombies - Leccion 3 ===");
console.log("Pruebas sin modificar los contratos Solidity\n");

// --------------------------------------------------
// 1. DESPLIEGUE
// --------------------------------------------------

const contract = await viem.deployContract(CONTRACT);

console.log("Contrato:", contract.address);

check(contract.address.startsWith("0x"), "Despliegue correcto");

// --------------------------------------------------
// 2. PROPIETARIO DEL CONTRATO
// --------------------------------------------------

const contractOwner = await contract.read.owner();

check(
    contractOwner.toLowerCase() === owner.account.address.toLowerCase(),
    "El desplegador es el propietario del contrato",
);

// --------------------------------------------------
// 3. CREACION DEL ZOMBI
// --------------------------------------------------

const creationHash = await contract.write.createRandomZombie(["Alice"]);

const receipt = await publicClient.waitForTransactionReceipt({
    hash: creationHash,
});

check(receipt.status === "success", "Creacion del zombi correcta");

const zombie = await contract.read.zombies([0n]);

check(zombie[0] === "Alice", "Nombre correcto");

check(zombie[1] >= 0n && zombie[1] < DNA_MODULUS, "ADN dentro del rango permitido");

check(BigInt(zombie[2]) === 1n, "Nivel inicial igual a 1");

// --------------------------------------------------
// 4. COOLDOWN
// --------------------------------------------------

const block = await publicClient.getBlock({
    blockNumber: receipt.blockNumber,
});

const readyTime = BigInt(zombie[3]);

check(readyTime === block.timestamp + ONE_DAY, "Cooldown inicial de 24 horas");

// --------------------------------------------------
// 5. PROPIEDAD DEL ZOMBI
// --------------------------------------------------

const zombieOwner = await contract.read.zombieToOwner([0n]);

check(
    zombieOwner.toLowerCase() === owner.account.address.toLowerCase(),
    "Propietario del zombi correcto",
);

// --------------------------------------------------
// 6. RESTRICCION DE CREACION
// --------------------------------------------------

await expectRevert(
    () => contract.write.createRandomZombie(["Bob"]),
    "No se permite crear otro zombi inicial",
);

// --------------------------------------------------
// 7. CONSULTA POR PROPIETARIO
// --------------------------------------------------

const ownerZombies = await contract.read.getZombiesByOwner([owner.account.address]);

check(
    ownerZombies.length === 1 && ownerZombies[0] === 0n,
    "La consulta devuelve el zombi del propietario",
);

const attackerZombies = await contract.read.getZombiesByOwner([attacker.account.address]);

check(attackerZombies.length === 0, "La cuenta ajena no tiene zombis");

// --------------------------------------------------
// 8. REQUISITOS DE NIVEL
// --------------------------------------------------

await expectRevert(
    () => contract.write.changeName([0n, "NuevoNombre"]),
    "No permite cambiar nombre con nivel insuficiente",
);

await expectRevert(
    () => contract.write.changeDna([0n, 1234567890123456n]),
    "No permite cambiar ADN con nivel insuficiente",
);

// --------------------------------------------------
// 9. PROTECCION FRENTE A OTRAS CUENTAS
// --------------------------------------------------

await expectRevert(
    () =>
        attacker.writeContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "feedAndMultiply",
            args: [0n, 1234n, "human"],
        }),
    "Un usuario ajeno no puede alimentar el zombi",
);

// --------------------------------------------------
// 10. COOLDOWN EN LA ALIMENTACION
// --------------------------------------------------

await expectRevert(
    () => contract.write.feedAndMultiply([0n, 1234567890123456n, "human"]),
    "No permite alimentar durante el cooldown",
);

// --------------------------------------------------
// RESULTADOS
// --------------------------------------------------

console.log("\n=== RESULTADO FINAL ===");
console.log("Todas las comprobaciones han pasado.");
console.log("Contrato:", contract.address);
console.log("Zombi:", zombie);
console.log("Nivel:", zombie[2]);
console.log("ReadyTime:", readyTime.toString());
console.log("Zombis del propietario:", ownerZombies);
