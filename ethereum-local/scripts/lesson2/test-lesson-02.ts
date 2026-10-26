import assert from "node:assert/strict";
import { network } from "hardhat";

const { viem } = await network.connect();

const publicClient = await viem.getPublicClient();
const [owner, attacker] = await viem.getWalletClients();

const DNA_MODULUS = 10n ** 16n;

const CRYPTOKITTIES_ADDRESS = "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d" as const;

function check(condition: boolean, message: string) {
    assert.ok(condition, message);
    console.log(`PASS: ${message}`);
}

async function expectRevert(operation: () => Promise<unknown>, message: string) {
    let rejected = false;

    try {
        await operation();
    } catch {
        rejected = true;
    }

    check(rejected, message);
}

console.log("\n=== CryptoZombies - Leccion 2 ===");
console.log("Pruebas del contrato original\n");

// 1. Desplegar el contrato.
const factory = await viem.deployContract(
    "contracts/CryptoZombies/lesson-02/L2zombiefeeding.sol:Lesson2ZombieFeeding",
);

console.log("ZombieFeeding:", factory.address);
console.log("CryptoKitties Mainnet:", CRYPTOKITTIES_ADDRESS);

// 2. Crear el primer zombi.
const creationHash = await factory.write.createRandomZombie(["Alice"]);

const creationReceipt = await publicClient.waitForTransactionReceipt({
    hash: creationHash,
});

check(creationReceipt.status === "success", "La creacion del primer zombi funciona");

const alice = await factory.read.zombies([0n]);

check(alice[0] === "Alice", "El nombre se almacena correctamente");

check(alice[1] >= 0n && alice[1] < DNA_MODULUS, "El ADN esta dentro del rango permitido");

// 3. Comprobar el propietario.
const actualOwner = await factory.read.zombieToOwner([0n]);

check(
    actualOwner.toLowerCase() === owner.account.address.toLowerCase(),
    "El propietario del zombi es correcto",
);

// 4. Comprobar el evento.
const creationEvents = await factory.getEvents.NewZombie({
    fromBlock: creationReceipt.blockNumber,
    toBlock: creationReceipt.blockNumber,
});

check(
    creationEvents.some(
        (event) =>
            event.args.zombieId === 0n &&
            event.args.name === "Alice" &&
            event.args.dna === alice[1],
    ),
    "El evento NewZombie contiene los datos correctos",
);

// 5. Impedir un segundo zombi inicial.
await expectRevert(
    () => factory.write.createRandomZombie(["Segundo"]),
    "Se rechaza un segundo zombi inicial",
);

// 6. Alimentacion humana.
const targetDna = 1234567890123456n;

const feedingHash = await factory.write.feedAndMultiply([0n, targetDna, "human"]);

const feedingReceipt = await publicClient.waitForTransactionReceipt({
    hash: feedingHash,
});

check(feedingReceipt.status === "success", "La alimentacion humana funciona");

const child = await factory.read.zombies([1n]);

const expectedChildDna = (alice[1] + (targetDna % DNA_MODULUS)) / 2n;

check(child[1] === expectedChildDna, "La mezcla del ADN es correcta");

check(child[0] === "NoName", "El descendiente recibe el nombre esperado");

// 7. Alimentacion de especie kitty.
const kittyTargetDna = 9876543210123456n;

const kittyHash = await factory.write.feedAndMultiply([0n, kittyTargetDna, "kitty"]);

const kittyReceipt = await publicClient.waitForTransactionReceipt({
    hash: kittyHash,
});

check(kittyReceipt.status === "success", "La alimentacion de especie kitty funciona");

const kittyChild = await factory.read.zombies([2n]);

const mixedDna = (alice[1] + (kittyTargetDna % DNA_MODULUS)) / 2n;

const expectedKittyDna = mixedDna - (mixedDna % 100n) + 99n;

check(kittyChild[1] === expectedKittyDna, "La mezcla de ADN kitty es correcta");

check(kittyChild[1] % 100n === 99n, "El ADN kitty termina en 99");

// 8. Seguridad.
await expectRevert(
    () =>
        attacker.writeContract({
            address: factory.address,
            abi: factory.abi,
            functionName: "feedAndMultiply",
            args: [0n, 1234n, "human"],
        }),
    "Un usuario ajeno no puede alimentar a Alice",
);

// 9. Propiedad de los tres zombis.
for (let id = 0n; id < 3n; id++) {
    const zombieOwner = await factory.read.zombieToOwner([id]);

    check(
        zombieOwner.toLowerCase() === owner.account.address.toLowerCase(),
        `Propietario correcto del zombi ${id}`,
    );
}

// 10. Dependencia externa.
const externalCode = await publicClient.getCode({
    address: CRYPTOKITTIES_ADDRESS,
});

check(
    externalCode === undefined || externalCode === "0x",
    "CryptoKitties no existe en esta red local",
);

await expectRevert(async () => {
    const hash = await factory.write.feedOnKitty([0n, 1n]);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(receipt.status, "success");
}, "feedOnKitty no puede completarse sin CryptoKitties");

// Resultado final.
console.log("\n=== RESULTADO FINAL ===");
console.log("Todas las comprobaciones han pasado.");
console.log("Zombi inicial:", alice);
console.log("Descendiente humano:", child);
console.log("Descendiente de especie kitty:", kittyChild);

console.log(
    "\nLa integracion externa con CryptoKitties " + "no esta disponible en esta red local.",
);
