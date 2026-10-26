import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem } = await network.connect();

const DNA_MODULUS = 10n ** 16n;

describe("CryptoZombies - Leccion 2 (codigo original)", () => {
    async function setup() {
        const [owner, attacker] = await viem.getWalletClients();

        const factory = await viem.deployContract("Lesson2ZombieFeeding");

        return { factory, owner, attacker };
    }

    it("1. Despliega el contrato original", async () => {
        const { factory } = await setup();

        assert.ok(factory.address);
    });

    it("2. Permite crear un zombi inicial", async () => {
        const { factory } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        const zombie = await factory.read.zombies([0n]);

        assert.equal(zombie[0], "Alice");
        assert.ok(zombie[1] < DNA_MODULUS);
    });

    it("3. Registra correctamente el propietario", async () => {
        const { factory, owner } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        const actualOwner = await factory.read.zombieToOwner([0n]);

        assert.equal(actualOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("4. Impide crear un segundo zombi inicial", async () => {
        const { factory } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        await assert.rejects(factory.write.createRandomZombie(["Bob"]));
    });

    it("5. Permite alimentar y multiplicar un zombi", async () => {
        const { factory } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        const parent = await factory.read.zombies([0n]);
        const targetDna = 1234567890123456n;

        await factory.write.feedAndMultiply([0n, targetDna, "human"]);

        const child = await factory.read.zombies([1n]);

        const expectedDna = (parent[1] + (targetDna % DNA_MODULUS)) / 2n;

        assert.equal(child[0], "NoName");
        assert.equal(child[1], expectedDna);
    });

    it("6. Aplica la terminacion 99 a la especie kitty", async () => {
        const { factory } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        const parent = await factory.read.zombies([0n]);
        const targetDna = 9876543210123456n;

        await factory.write.feedAndMultiply([0n, targetDna, "kitty"]);

        const child = await factory.read.zombies([1n]);

        const mixedDna = (parent[1] + (targetDna % DNA_MODULUS)) / 2n;

        const expectedDna = mixedDna - (mixedDna % 100n) + 99n;

        assert.equal(child[1], expectedDna);
        assert.equal(child[1] % 100n, 99n);
    });

    it("7. Rechaza la alimentacion de zombis ajenos", async () => {
        const { factory, attacker } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        await assert.rejects(
            attacker.writeContract({
                address: factory.address,
                abi: factory.abi,
                functionName: "feedAndMultiply",
                args: [0n, 1234n, "human"],
            }),
        );
    });

    it("8. Asigna la descendencia al propietario original", async () => {
        const { factory, owner } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        await factory.write.feedAndMultiply([0n, 1234567890123456n, "human"]);

        const childOwner = await factory.read.zombieToOwner([1n]);

        assert.equal(childOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("9. Emite NewZombie al crear un zombi", async () => {
        const { factory } = await setup();
        const publicClient = await viem.getPublicClient();

        const hash = await factory.write.createRandomZombie(["Alice"]);

        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
        });

        const events = await factory.getEvents.NewZombie({
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.zombieId, 0n);
        assert.equal(events[0].args.name, "Alice");
    });

    it("10. Comprueba la limitacion de feedOnKitty en red local", async () => {
        const { factory } = await setup();

        await factory.write.createRandomZombie(["Alice"]);

        // El contrato consulta la direccion fija de CryptoKitties.
        // En una red Hardhat local vacia no hay codigo en esa direccion.
        await assert.rejects(factory.write.feedOnKitty([0n, 1n]));
    });
});
