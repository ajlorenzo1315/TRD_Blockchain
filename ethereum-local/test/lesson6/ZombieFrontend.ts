import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, parseEventLogs } from "viem";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();
const [owner, alice, bob] = await viem.getWalletClients();
const FQN = "contracts/CryptoZombies/lesson-06/L6zombieownership.sol:Lesson6ZombieOwnership";
const deploy = () => viem.deployContract(FQN);

async function send(
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
    } as Parameters<typeof wallet.writeContract>[0]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
    return receipt;
}
async function create(
    contract: Awaited<ReturnType<typeof deploy>>,
    name = "Alice",
    wallet = owner,
) {
    return send(contract, wallet, "createRandomZombie", [name]);
}
async function rejects(
    contract: Awaited<ReturnType<typeof deploy>>,
    wallet: typeof owner,
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint,
) {
    await assert.rejects(() =>
        publicClient.simulateContract({
            address: contract.address,
            abi: contract.abi,
            functionName,
            args,
            account: wallet.account,
            ...(value === undefined ? {} : { value }),
        } as Parameters<typeof publicClient.simulateContract>[0]),
    );
}

describe("CryptoZombies - Lección 6 - Ethereum local", () => {
    it("01. despliega el contrato final con el namespace Lesson6", async () => {
        const contract = await deploy();
        assert.match(contract.address, /^0x[0-9a-fA-F]{40}$/);
    });
    it("02. call() consulta el balance inicial sin transacción", async () => {
        const c = await deploy();
        assert.equal(await c.read.balanceOf([owner.account.address]), 0n);
    });
    it("03. send() crea un zombi y actualiza el balance", async () => {
        const c = await deploy();
        await create(c);
        assert.equal(await c.read.balanceOf([owner.account.address]), 1n);
        assert.equal((await c.read.zombies([0n]))[0], "Alice");
    });
    it("04. el evento NewZombie registra la creación", async () => {
        const c = await deploy();
        const receipt = await create(c);
        const logs = parseEventLogs({ abi: c.abi, logs: receipt.logs, eventName: "NewZombie" });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].args.name, "Alice");
        assert.equal(logs[0].args.zombieId, 0n);
    });
    it("05. getZombiesByOwner devuelve los IDs del usuario", async () => {
        const c = await deploy();
        await create(c, "Alice", owner);
        await create(c, "Bob", alice);
        assert.deepEqual([...(await c.read.getZombiesByOwner([owner.account.address]))], [0n]);
        assert.deepEqual([...(await c.read.getZombiesByOwner([alice.account.address]))], [1n]);
    });
    it("06. crear un segundo zombi inicial revierte", async () => {
        const c = await deploy();
        await create(c);
        await rejects(c, owner, "createRandomZombie", ["Segundo"]);
    });
    it("07. levelUp recibe 0.001 ETH y sube de nivel", async () => {
        const c = await deploy();
        await create(c);
        await send(c, owner, "levelUp", [0n], parseEther("0.001"));
        assert.equal(BigInt((await c.read.zombies([0n]))[2]), 2n);
        assert.equal(await publicClient.getBalance({ address: c.address }), parseEther("0.001"));
    });
    it("08. levelUp rechaza una cantidad distinta", async () => {
        const c = await deploy();
        await create(c);
        await rejects(c, owner, "levelUp", [0n], parseEther("0.0005"));
    });
    it("09. onlyOwner impide modificar tarifas desde otra cuenta", async () => {
        const c = await deploy();
        await rejects(c, alice, "setLevelUpFee", [123n]);
    });
    it("10. approve emite Approval y no cambia propietario", async () => {
        const c = await deploy();
        await create(c);
        const receipt = await send(c, owner, "approve", [alice.account.address, 0n]);
        const logs = parseEventLogs({ abi: c.abi, logs: receipt.logs, eventName: "Approval" });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].args._approved.toLowerCase(), alice.account.address.toLowerCase());
        assert.equal(
            (await c.read.ownerOf([0n])).toLowerCase(),
            owner.account.address.toLowerCase(),
        );
    });
    it("11. el propietario transfiere y se emite Transfer", async () => {
        const c = await deploy();
        await create(c);
        const receipt = await send(c, owner, "transferFrom", [
            owner.account.address,
            bob.account.address,
            0n,
        ]);
        const logs = parseEventLogs({ abi: c.abi, logs: receipt.logs, eventName: "Transfer" });
        assert.equal(logs.length, 1);
        assert.equal((await c.read.ownerOf([0n])).toLowerCase(), bob.account.address.toLowerCase());
        assert.equal(await c.read.balanceOf([owner.account.address]), 0n);
        assert.equal(await c.read.balanceOf([bob.account.address]), 1n);
    });
    it("12. un tercero sin aprobación no puede transferir", async () => {
        const c = await deploy();
        await create(c);
        await rejects(c, alice, "transferFrom", [owner.account.address, bob.account.address, 0n]);
    });
    it("13. reproduce la limitación del contrato: aprobado sin tokens revierte", async () => {
        const c = await deploy();
        await create(c);
        await send(c, owner, "approve", [alice.account.address, 0n]);
        // _transfer resta a ownerZombieCount[msg.sender] y no a ownerZombieCount[_from].
        await rejects(c, alice, "transferFrom", [owner.account.address, bob.account.address, 0n]);
    });
    it("14. transferFrom no comprueba que _from sea el propietario real", async () => {
        const c = await deploy();
        await create(c);
        // Caso documentado del código histórico: _from se usa para el evento, no para validar propiedad.
        const receipt = await send(c, owner, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        const logs = parseEventLogs({ abi: c.abi, logs: receipt.logs, eventName: "Transfer" });
        assert.equal(logs[0].args._from.toLowerCase(), alice.account.address.toLowerCase());
        assert.equal((await c.read.ownerOf([0n])).toLowerCase(), bob.account.address.toLowerCase());
    });
    it("15. cambiar nombre requiere nivel 2 y propiedad", async () => {
        const c = await deploy();
        await create(c);
        await rejects(c, owner, "changeName", [0n, "Nuevo"]);
        await send(c, owner, "levelUp", [0n], parseEther("0.001"));
        await send(c, owner, "changeName", [0n, "Nuevo"]);
        assert.equal((await c.read.zombies([0n]))[0], "Nuevo");
        await rejects(c, alice, "changeName", [0n, "Intruso"]);
    });
});
