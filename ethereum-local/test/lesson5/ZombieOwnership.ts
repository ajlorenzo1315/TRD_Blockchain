import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, parseEventLogs, zeroAddress } from "viem";

const CONTRACT = "contracts/CryptoZombies/lesson-05/L5zombieownership.sol:Lesson5ZombieOwnership";
const LEVEL_FEE = parseEther("0.001");
const ONE_DAY = 86_400n;

const { viem, provider } = await network.connect();
const publicClient = await viem.getPublicClient();
const [admin, alice, bob, carol] = await viem.getWalletClients();

type ZombieContract = Awaited<ReturnType<typeof deploy>>;
type Wallet = typeof admin;

async function deploy() {
    return viem.deployContract(CONTRACT);
}

async function mined(hash: `0x${string}`) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
    return receipt;
}

async function send(
    contract: ZombieContract,
    wallet: Wallet,
    functionName: string,
    args: readonly unknown[] = [],
    value?: bigint,
) {
    const hash = await wallet.writeContract({
        address: contract.address,
        abi: contract.abi,
        functionName,
        args,
        account: wallet.account,
        gas: 3_000_000n,
        ...(value === undefined ? {} : { value }),
    } as Parameters<typeof wallet.writeContract>[0]);
    return mined(hash);
}

async function simulate(
    contract: ZombieContract,
    wallet: Wallet,
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

async function reverts(action: () => Promise<unknown>) {
    await assert.rejects(action);
}

async function create(contract: ZombieContract, wallet: Wallet, name: string) {
    await send(contract, wallet, "createRandomZombie", [name]);
}

async function balance(contract: ZombieContract, wallet: Wallet) {
    return contract.read.balanceOf([wallet.account.address]);
}

async function tokenOwner(contract: ZombieContract, tokenId: bigint) {
    return contract.read.ownerOf([tokenId]);
}

function sameAddress(actual: string, expected: string) {
    assert.equal(actual.toLowerCase(), expected.toLowerCase());
}

async function advance(seconds: bigint = ONE_DAY) {
    await provider.request({
        method: "evm_increaseTime",
        params: [Number(seconds)],
    });
    await provider.request({ method: "evm_mine", params: [] });
}

// Pruebas centradas en los cambios de la Lección 5.
// Cada prueba despliega un contrato nuevo para aislar su estado.
describe("CryptoZombies - Lección 5 - ERC721 y SafeMath", () => {
    it("01. Despliega Lesson5ZombieOwnership y conserva al administrador", async () => {
        const contract = await deploy();
        sameAddress(await contract.read.owner(), admin.account.address);
    });

    it("02. Un zombi recién creado tiene tokenId 0 y balance ERC721 de 1", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        assert.equal(await balance(contract, alice), 1n);
        sameAddress(await tokenOwner(contract, 0n), alice.account.address);
    });

    it("03. El balance ERC721 es cero para una cuenta sin zombis", async () => {
        const contract = await deploy();
        assert.equal(await balance(contract, bob), 0n);
    });

    it("04. La creación inicial sigue limitada a un zombi por cuenta", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await reverts(() => simulate(contract, alice, "createRandomZombie", ["Otro"]));
        assert.equal(await balance(contract, alice), 1n);
    });

    it("05. Cada cuenta recibe un tokenId distinto", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await create(contract, bob, "Beta");
        sameAddress(await tokenOwner(contract, 0n), alice.account.address);
        sameAddress(await tokenOwner(contract, 1n), bob.account.address);
        assert.equal(await balance(contract, alice), 1n);
        assert.equal(await balance(contract, bob), 1n);
    });

    it("06. El propietario transfiere un zombi y se actualizan los balances", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        sameAddress(await tokenOwner(contract, 0n), bob.account.address);
        assert.equal(await balance(contract, alice), 0n);
        assert.equal(await balance(contract, bob), 1n);
    });

    it("07. La transferencia emite Transfer con from, to y tokenId", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        const receipt = await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        const logs = parseEventLogs({
            abi: contract.abi,
            logs: receipt.logs,
            eventName: "Transfer",
        });
        assert.equal(logs.length, 1);
        sameAddress(logs[0].args._from, alice.account.address);
        sameAddress(logs[0].args._to, bob.account.address);
        assert.equal(logs[0].args._tokenId, 0n);
    });

    it("08. getZombiesByOwner refleja una transferencia directa", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        assert.deepEqual([...(await contract.read.getZombiesByOwner([alice.account.address]))], []);
        assert.deepEqual([...(await contract.read.getZombiesByOwner([bob.account.address]))], [0n]);
    });

    it("09. Una cuenta no autorizada no puede transferir un zombi", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await reverts(() =>
            simulate(contract, bob, "transferFrom", [
                alice.account.address,
                carol.account.address,
                0n,
            ]),
        );
        sameAddress(await tokenOwner(contract, 0n), alice.account.address);
    });

    it("10. El propietario puede aprobar a otra cuenta", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        sameAddress(await tokenOwner(contract, 0n), alice.account.address);
    });

    it("11. approve emite Approval con los parámetros correctos", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        const receipt = await send(contract, alice, "approve", [bob.account.address, 0n]);
        const logs = parseEventLogs({
            abi: contract.abi,
            logs: receipt.logs,
            eventName: "Approval",
        });
        assert.equal(logs.length, 1);
        sameAddress(logs[0].args._owner, alice.account.address);
        sameAddress(logs[0].args._approved, bob.account.address);
        assert.equal(logs[0].args._tokenId, 0n);
    });

    it("12. Un tercero no puede aprobar un zombi ajeno", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await reverts(() => simulate(contract, bob, "approve", [carol.account.address, 0n]));
    });

    it("13. El propietario puede sustituir una aprobación anterior", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        await send(contract, alice, "approve", [carol.account.address, 0n]);
        await reverts(() =>
            simulate(contract, bob, "transferFrom", [
                alice.account.address,
                bob.account.address,
                0n,
            ]),
        );
    });

    it("14. El propietario puede aprobar la dirección cero", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        const receipt = await send(contract, alice, "approve", [zeroAddress, 0n]);
        const logs = parseEventLogs({
            abi: contract.abi,
            logs: receipt.logs,
            eventName: "Approval",
        });
        sameAddress(logs[0].args._approved, zeroAddress);
    });

    it("15. Un aprobado sin zombis no puede transferir por el bug de _transfer", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        await reverts(() =>
            simulate(contract, bob, "transferFrom", [
                alice.account.address,
                carol.account.address,
                0n,
            ]),
        );
        sameAddress(await tokenOwner(contract, 0n), alice.account.address);
        assert.equal(await balance(contract, alice), 1n);
    });

    it("16. Un aprobado con zombi propio puede transferir, pero descuenta su balance", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await create(contract, bob, "Beta");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        await send(contract, bob, "transferFrom", [
            alice.account.address,
            carol.account.address,
            0n,
        ]);
        sameAddress(await tokenOwner(contract, 0n), carol.account.address);
        assert.equal(await balance(contract, alice), 1n);
        assert.equal(await balance(contract, bob), 0n);
        assert.equal(await balance(contract, carol), 1n);
    });

    it("17. El código original acepta un _from falso y lo publica en Transfer", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        const receipt = await send(contract, alice, "transferFrom", [
            carol.account.address,
            bob.account.address,
            0n,
        ]);
        const logs = parseEventLogs({
            abi: contract.abi,
            logs: receipt.logs,
            eventName: "Transfer",
        });
        sameAddress(logs[0].args._from, carol.account.address);
        sameAddress(await tokenOwner(contract, 0n), bob.account.address);
        assert.equal(await balance(contract, alice), 0n);
    });

    it("18. El código original permite transferir a la dirección cero", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "transferFrom", [alice.account.address, zeroAddress, 0n]);
        sameAddress(await tokenOwner(contract, 0n), zeroAddress);
        assert.equal(await contract.read.balanceOf([zeroAddress]), 1n);
    });

    it("19. El código original conserva la aprobación después de transferir", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await create(contract, bob, "Beta");
        await send(contract, alice, "approve", [bob.account.address, 0n]);
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            carol.account.address,
            0n,
        ]);
        // Bob aún tiene saldo propio y conserva la aprobación del token 0.
        await send(contract, bob, "transferFrom", [carol.account.address, bob.account.address, 0n]);
        sameAddress(await tokenOwner(contract, 0n), bob.account.address);
    });

    it("20. levelUp usa SafeMath32 y recibe la tarifa en ETH", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "levelUp", [0n], LEVEL_FEE);
        const zombie = await contract.read.zombies([0n]);
        assert.equal(BigInt(zombie[2]), 2n);
        assert.equal(await publicClient.getBalance({ address: contract.address }), LEVEL_FEE);
    });

    it("21. levelUp revierte si el pago no coincide con la tarifa", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await reverts(() => simulate(contract, alice, "levelUp", [0n], parseEther("0.0005")));
        assert.equal(BigInt((await contract.read.zombies([0n]))[2]), 1n);
    });

    it("22. Solo el administrador puede modificar la tarifa", async () => {
        const contract = await deploy();
        await reverts(() => simulate(contract, alice, "setLevelUpFee", [parseEther("0.002")]));
        await send(contract, admin, "setLevelUpFee", [parseEther("0.002")]);
        await create(contract, alice, "Alfa");
        await send(contract, alice, "levelUp", [0n], parseEther("0.002"));
        assert.equal(BigInt((await contract.read.zombies([0n]))[2]), 2n);
    });

    it("23. Solo el administrador puede retirar los pagos", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "levelUp", [0n], LEVEL_FEE);
        await reverts(() => simulate(contract, alice, "withdraw"));
        await send(contract, admin, "withdraw");
        assert.equal(await publicClient.getBalance({ address: contract.address }), 0n);
    });

    it("24. Un zombi transferido solo puede cambiar de nombre por su nuevo propietario", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "levelUp", [0n], LEVEL_FEE);
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        await reverts(() => simulate(contract, alice, "changeName", [0n, "Invalido"]));
        await send(contract, bob, "changeName", [0n, "Beta"]);
        assert.equal((await contract.read.zombies([0n]))[0], "Beta");
    });

    it("25. El nuevo propietario puede transferir de nuevo el token", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        await send(contract, bob, "transferFrom", [bob.account.address, carol.account.address, 0n]);
        sameAddress(await tokenOwner(contract, 0n), carol.account.address);
        assert.equal(await balance(contract, alice), 0n);
        assert.equal(await balance(contract, bob), 0n);
        assert.equal(await balance(contract, carol), 1n);
    });

    it("26. El zombi conserva ADN, nivel y estadísticas después de transferirse", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "levelUp", [0n], LEVEL_FEE);
        const before = await contract.read.zombies([0n]);
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        const after = await contract.read.zombies([0n]);
        assert.deepEqual([...after], [...before]);
    });

    it("27. El cooldown inicial sigue siendo de 24 horas", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        const zombie = await contract.read.zombies([0n]);
        const before = await publicClient.getBlock();
        assert.ok(BigInt(zombie[3]) > before.timestamp);
        await advance();
        const after = await publicClient.getBlock();
        assert.ok(after.timestamp >= BigInt(zombie[3]));
    });

    it("28. El propietario anterior puede crear otro zombi al quedar con balance cero", async () => {
        const contract = await deploy();
        await create(contract, alice, "Alfa");
        await send(contract, alice, "transferFrom", [
            alice.account.address,
            bob.account.address,
            0n,
        ]);
        await create(contract, alice, "Nuevo");
        assert.equal(await balance(contract, alice), 1n);
        sameAddress(await tokenOwner(contract, 1n), alice.account.address);
    });
});
