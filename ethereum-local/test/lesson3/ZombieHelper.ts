import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem } = await network.connect();

const HELPER = "contracts/CryptoZombies/lesson-03/L3zombiehelper.sol:Lesson3ZombieHelper";

const MOCK = "test/lesson-03/fixtures/L3MockKitty.sol:Lesson3MockKitty";

const DNA_MODULUS = 10n ** 16n;
const ONE_DAY = 86400n;

async function setup() {
    const [owner, attacker, third] = await viem.getWalletClients();

    const publicClient = await viem.getPublicClient();

    const contract = await viem.deployContract(HELPER);

    return {
        contract,
        publicClient,
        owner,
        attacker,
        third,
    };
}

async function createZombie(
    contract: Awaited<ReturnType<typeof setup>>["contract"],
    name = "Alice",
) {
    return contract.write.createRandomZombie([name]);
}

async function expectRevert(action: () => Promise<unknown>) {
    await assert.rejects(action);
}

describe("CryptoZombies - Leccion 3 completa", () => {
    // --------------------------------------------------
    // OWNABLE
    // --------------------------------------------------

    it("01. Registra al desplegador como administrador", async () => {
        const { contract, owner } = await setup();

        const currentOwner = await contract.read.owner();

        assert.equal(currentOwner.toLowerCase(), owner.account.address.toLowerCase());

        assert.equal(await contract.read.isOwner(), true);
    });

    it("02. Permite transferir la administracion", async () => {
        const { contract, attacker } = await setup();

        await contract.write.transferOwnership([attacker.account.address]);

        const currentOwner = await contract.read.owner();

        assert.equal(currentOwner.toLowerCase(), attacker.account.address.toLowerCase());
    });

    it("03. Impide transferir la administracion a otra cuenta", async () => {
        const { contract, publicClient, attacker, third } = await setup();

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "transferOwnership",
                args: [third.account.address],
                account: attacker.account,
            }),
        );
    });

    it("04. Impide transferir la administracion a cero", async () => {
        const { contract, publicClient, owner } = await setup();

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "transferOwnership",
                args: ["0x0000000000000000000000000000000000000000"],
                account: owner.account,
            }),
        );
    });

    it("05. Permite renunciar a la administracion", async () => {
        const { contract } = await setup();

        await contract.write.renounceOwnership();

        const currentOwner = await contract.read.owner();

        assert.equal(currentOwner.toLowerCase(), "0x0000000000000000000000000000000000000000");
    });

    // --------------------------------------------------
    // ZOMBIEFACTORY
    // --------------------------------------------------

    it("06. Crea un zombi con ADN valido terminado en 00", async () => {
        const { contract } = await setup();

        await createZombie(contract);

        const zombie = await contract.read.zombies([0n]);

        assert.equal(zombie[0], "Alice");
        assert.ok(zombie[1] >= 0n);
        assert.ok(zombie[1] < DNA_MODULUS);
        assert.equal(zombie[1] % 100n, 0n);
    });

    it("07. Asigna nivel inicial 1", async () => {
        const { contract } = await setup();

        await createZombie(contract);

        const zombie = await contract.read.zombies([0n]);

        assert.equal(BigInt(zombie[2]), 1n);
    });

    it("08. Inicializa readyTime a 24 horas", async () => {
        const { contract, publicClient } = await setup();

        const hash = await createZombie(contract);

        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
        });

        const block = await publicClient.getBlock({
            blockNumber: receipt.blockNumber,
        });

        const zombie = await contract.read.zombies([0n]);

        assert.equal(BigInt(zombie[3]), block.timestamp + ONE_DAY);
    });

    it("09. Impide crear dos zombis iniciales", async () => {
        const { contract, publicClient, owner } = await setup();

        await createZombie(contract);

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "createRandomZombie",
                args: ["Segundo"],
                account: owner.account,
            }),
        );
    });

    it("10. Registra correctamente el propietario", async () => {
        const { contract, owner } = await setup();

        await createZombie(contract);

        const zombieOwner = await contract.read.zombieToOwner([0n]);

        assert.equal(zombieOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("11. Emite NewZombie con los datos correctos", async () => {
        const { contract, publicClient } = await setup();

        const hash = await createZombie(contract);

        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
        });

        const zombie = await contract.read.zombies([0n]);

        const events = await contract.getEvents.NewZombie({
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.zombieId, 0n);
        assert.equal(events[0].args.name, "Alice");
        assert.equal(events[0].args.dna, zombie[1]);
    });

    // --------------------------------------------------
    // ZOMBIEFEEDING
    // --------------------------------------------------

    it("12. Mezcla correctamente el ADN humano", async () => {
        const { contract } = await setup();

        await createZombie(contract);

        const parent = await contract.read.zombies([0n]);
        const targetDna = 1234567890123456n;

        await contract.write.feedAndMultiply([0n, targetDna, "human"]);

        const child = await contract.read.zombies([1n]);

        const expectedDna = (parent[1] + (targetDna % DNA_MODULUS)) / 2n;

        assert.equal(child[0], "NoName");
        assert.equal(child[1], expectedDna);
        assert.equal(BigInt(child[2]), 1n);
    });

    it("13. Aplica el sufijo 99 al ADN kitty", async () => {
        const { contract } = await setup();

        await createZombie(contract);

        const parent = await contract.read.zombies([0n]);
        const targetDna = 9876543210123456n;

        await contract.write.feedAndMultiply([0n, targetDna, "kitty"]);

        const child = await contract.read.zombies([1n]);

        const mixedDna = (parent[1] + (targetDna % DNA_MODULUS)) / 2n;

        const expectedDna = mixedDna - (mixedDna % 100n) + 99n;

        assert.equal(child[1], expectedDna);
        assert.equal(child[1] % 100n, 99n);
    });

    it("14. Rechaza alimentar un zombi ajeno", async () => {
        const { contract, publicClient, attacker } = await setup();

        await createZombie(contract);

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "feedAndMultiply",
                args: [0n, 1234n, "human"],
                account: attacker.account,
            }),
        );
    });

    it("15. Permite alimentar durante el cooldown", async () => {
        const { contract } = await setup();

        await createZombie(contract);

        // El cooldown se almacena, pero en esta
        // leccion no bloquea feedAndMultiply.
        await contract.write.feedAndMultiply([0n, 1234567890123456n, "human"]);

        const child = await contract.read.zombies([1n]);

        assert.equal(child[0], "NoName");
    });

    it("16. Solo el administrador configura CryptoKitties", async () => {
        const { contract, publicClient, attacker } = await setup();

        const kitty = await viem.deployContract(MOCK);

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "setKittyContractAddress",
                args: [kitty.address],
                account: attacker.account,
            }),
        );

        // El administrador si puede hacerlo.
        await contract.write.setKittyContractAddress([kitty.address]);
    });

    it("17. Integra feedOnKitty con el contrato externo", async () => {
        const { contract } = await setup();

        const kitty = await viem.deployContract(MOCK);

        await contract.write.setKittyContractAddress([kitty.address]);

        await createZombie(contract);

        const parent = await contract.read.zombies([0n]);

        const kittyData = await kitty.read.getKitty([7n]);
        const kittyDna = kittyData[9];

        await contract.write.feedOnKitty([0n, 7n]);

        const child = await contract.read.zombies([1n]);

        const mixedDna = (parent[1] + (kittyDna % DNA_MODULUS)) / 2n;

        const expectedDna = mixedDna - (mixedDna % 100n) + 99n;

        assert.equal(child[1], expectedDna);
        assert.equal(child[1] % 100n, 99n);
    });

    // --------------------------------------------------
    // ZOMBIEHELPER
    // --------------------------------------------------

    it("18. Rechaza cambiar nombre con nivel menor que 2", async () => {
        const { contract, publicClient, owner } = await setup();

        await createZombie(contract);

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "changeName",
                args: [0n, "NuevoNombre"],
                account: owner.account,
            }),
        );
    });

    it("19. Rechaza cambiar ADN con nivel menor que 20", async () => {
        const { contract, publicClient, owner } = await setup();

        await createZombie(contract);

        await expectRevert(() =>
            publicClient.simulateContract({
                address: contract.address,
                abi: contract.abi,
                functionName: "changeDna",
                args: [0n, 1234567890123456n],
                account: owner.account,
            }),
        );
    });

    it("20. Devuelve los zombis de cada propietario", async () => {
        const { contract, owner, attacker } = await setup();

        await createZombie(contract);

        await contract.write.feedAndMultiply([0n, 1234567890123456n, "human"]);

        const ownerZombies = await contract.read.getZombiesByOwner([owner.account.address]);

        const attackerZombies = await contract.read.getZombiesByOwner([attacker.account.address]);

        assert.deepEqual([...ownerZombies], [0n, 1n]);
        assert.deepEqual([...attackerZombies], []);
    });

    it("21. Distingue zombis de distintos usuarios", async () => {
        const { contract, publicClient, owner, attacker } = await setup();

        await createZombie(contract);

        const hash = await attacker.writeContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "createRandomZombie",
            args: ["Bob"],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        assert.equal(receipt.status, "success");

        const aliceZombies = await contract.read.getZombiesByOwner([owner.account.address]);

        const bobZombies = await contract.read.getZombiesByOwner([attacker.account.address]);

        assert.deepEqual([...aliceZombies], [0n]);
        assert.deepEqual([...bobZombies], [1n]);
    });

    it("22. Asigna los descendientes al propietario", async () => {
        const { contract, owner } = await setup();

        await createZombie(contract);

        await contract.write.feedAndMultiply([0n, 1234567890123456n, "human"]);

        const childOwner = await contract.read.zombieToOwner([1n]);

        assert.equal(childOwner.toLowerCase(), owner.account.address.toLowerCase());
    });
});
