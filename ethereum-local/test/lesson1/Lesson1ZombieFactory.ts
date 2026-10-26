import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem } = await network.connect();

describe("CryptoZombies - Leccion 1", () => {
    // PRUEBA 1: Despliegue del contrato
    it("despliega Lesson1ZombieFactory", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        assert.ok(factory.address);
    });

    // PRUEBA 2: El array comienza vacio
    it("no tiene zombis inicialmente", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        await assert.rejects(factory.read.zombies([0n]));
    });

    // PRUEBA 3: Crear un zombi
    it("crea un zombi llamado Alice", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        await factory.write.createRandomZombie(["Alice"]);

        const zombie = await factory.read.zombies([0n]);

        assert.equal(zombie[0], "Alice");
    });

    // PRUEBA 4: Comprobar el ADN
    it("genera ADN dentro del rango", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        await factory.write.createRandomZombie(["Bob"]);

        const zombie = await factory.read.zombies([0n]);
        const dna = zombie[1];

        assert.ok(dna >= 0n);
        assert.ok(dna < 10n ** 16n);
    });

    // PRUEBA 5: Crear varios zombis
    it("almacena varios zombis", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        await factory.write.createRandomZombie(["Alice"]);
        await factory.write.createRandomZombie(["Bob"]);
        await factory.write.createRandomZombie(["Charlie"]);

        const first = await factory.read.zombies([0n]);
        const second = await factory.read.zombies([1n]);
        const third = await factory.read.zombies([2n]);

        assert.equal(first[0], "Alice");
        assert.equal(second[0], "Bob");
        assert.equal(third[0], "Charlie");
    });

    // PRUEBA 6: ADN determinista
    it("genera el mismo ADN para el mismo nombre", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");

        await factory.write.createRandomZombie(["Alice"]);
        await factory.write.createRandomZombie(["Alice"]);

        const first = await factory.read.zombies([0n]);
        const second = await factory.read.zombies([1n]);

        assert.equal(first[1], second[1]);
    });

    // PRUEBA 7: Evento NewZombie
    it("emite NewZombie al crear un zombi", async () => {
        const factory = await viem.deployContract("Lesson1ZombieFactory");
        const publicClient = await viem.getPublicClient();

        const hash = await factory.write.createRandomZombie(["Alice"]);
        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
        });

        assert.equal(receipt.status, "success");

        const events = await factory.getEvents.NewZombie({
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        assert.equal(events.length, 1);
        assert.equal(events[0].args.zombieId, 0n);
        assert.equal(events[0].args.name, "Alice");
    });
});
