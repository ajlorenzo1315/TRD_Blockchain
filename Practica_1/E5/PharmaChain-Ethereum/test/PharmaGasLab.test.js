import { expect } from "chai";
import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";

// Hardhat 3 + Mocha + @nomicfoundation/hardhat-ethers; no chai-matchers required.
const { ethers } = await hre.network.connect();
const variants = [
    "V0Base",
    "V1Roles",
    "V2Errores",
    "V3Storage",
    "V4Unchecked",
    "V5Combinada",
    "V6SinId",
];
const measurements = [];
const runLabel = process.env.GAS_RUN_LABEL || "default";
const runId = runLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
let signers;

function record(version, operation, gas, kind = "transaction") {
    measurements.push({ version, operation, kind, gas: gas.toString() });
}
async function receipt(txPromise) {
    const tx = await txPromise;
    const r = await tx.wait();
    expect(r.status).to.equal(1);
    return r;
}
async function measured(version, operation, txPromise) {
    const r = await receipt(txPromise);
    record(version, operation, r.gasUsed);
    return r;
}
async function rejected(fn) {
    try {
        const tx = await fn();
        await tx.wait();
    } catch {
        return;
    }
    throw new Error("La operación debería revertir");
}
async function deploy(version) {
    const factory = await ethers.getContractFactory(`Pharma${version}`);
    const c = await factory.connect(signers[0]).deploy();
    const deployReceipt = await c.deploymentTransaction().wait();
    record(version, "despliegue", deployReceipt.gasUsed, "deployment");
    await c.waitForDeployment();
    const bytecode = await ethers.provider.getCode(await c.getAddress());
    record(version, "runtime_bytes", BigInt((bytecode.length - 2) / 2), "bytes");
    return c;
}
async function setup(version) {
    const c = await deploy(version);
    for (const [idx, role] of [
        [1, 1],
        [2, 2],
        [3, 3],
    ]) {
        await measured(version, `asignar_rol_${role}`, c.asignarRol(signers[idx].address, role));
    }
    return c;
}
function canonicalLote(lote, id) {
    return {
        id: BigInt(id),
        nombre: lote.nombre,
        fabricante: lote.fabricante,
        propietario: lote.propietario.toLowerCase(),
        activo: lote.activo,
        fechaRegistro: lote.fechaRegistro,
    };
}
async function assertLote(c, id, version, owner, activo = true) {
    const lote = await c.consultarLote(id);
    const v = canonicalLote(lote, id);
    expect(v.propietario).to.equal(owner.address.toLowerCase());
    expect(v.activo).to.equal(activo);
    expect(v.id).to.equal(BigInt(id));
    if (version !== "V6SinId") expect(lote.id).to.equal(BigInt(id));
    return v;
}

before(async () => {
    signers = await ethers.getSigners();
});
for (const version of variants) {
    describe(`GasLab ${version}`, function () {
        this.timeout(120000);
        it("recorre cadena de custodia y comprueba historial", async () => {
            const c = await setup(version);
            const [admin, lab, dist, pharmacy, attacker] = signers;
            await measured(
                version,
                "registro_corto",
                c.connect(lab).registrarLote("Paracetamol", "Lab A"),
            );
            await assertLote(c, 1, version, lab);
            expect(await c.totalMovimientos(1)).to.equal(1n);
            await measured(
                version,
                "propuesta_lab_dist",
                c.connect(lab).proponerTransferencia(1, dist.address),
            );
            await rejected(() => c.connect(attacker).aceptarTransferencia(1));
            await measured(version, "aceptacion_lab_dist", c.connect(dist).aceptarTransferencia(1));
            await assertLote(c, 1, version, dist);
            await measured(
                version,
                "propuesta_dist_farm",
                c.connect(dist).proponerTransferencia(1, pharmacy.address),
            );
            await measured(version, "cancelacion", c.connect(dist).cancelarTransferencia(1));
            expect((await c.transferencias(1)).pendiente).to.equal(false);
            await measured(version, "desactivar_sin_pendiente", c.connect(admin).desactivarLote(1));
            await assertLote(c, 1, version, dist, false);
            expect(await c.totalMovimientos(1)).to.equal(5n);
            const mov = await c.consultarMovimiento(1, 2);
            expect(mov.origen.toLowerCase()).to.equal(lab.address.toLowerCase());
            expect(mov.destino.toLowerCase()).to.equal(dist.address.toLowerCase());
        });
        it("desactiva con transferencia pendiente", async () => {
            const c = await setup(version);
            const [admin, lab, dist] = signers;
            await receipt(c.connect(lab).registrarLote("Ibuprofeno", "Lab B"));
            await receipt(c.connect(lab).proponerTransferencia(1, dist.address));
            await measured(version, "desactivar_con_pendiente", c.connect(admin).desactivarLote(1));
            expect((await c.transferencias(1)).pendiente).to.equal(false);
            // Comportamiento existente: desactivación cancela pero NO añade movimiento al historial.
            expect(await c.totalMovimientos(1)).to.equal(2n);
        });
        it("rechaza acciones inválidas y conserva la pausa", async () => {
            const c = await setup(version);
            const [admin, lab, dist, pharmacy, attacker] = signers;
            await rejected(() => c.connect(attacker).asignarRol(attacker.address, 1));
            await rejected(() => c.asignarRol(ethers.ZeroAddress, 1));
            await rejected(() => c.asignarRol(admin.address, 1));
            await rejected(() => c.connect(attacker).registrarLote("X", "Y"));
            await rejected(() => c.connect(lab).registrarLote("", "Y"));
            await rejected(() => c.connect(lab).registrarLote("X", ""));
            await receipt(c.connect(lab).registrarLote("X", "Y"));
            await rejected(() => c.connect(lab).proponerTransferencia(1, pharmacy.address));
            await rejected(() => c.connect(lab).proponerTransferencia(1, ethers.ZeroAddress));
            await receipt(c.connect(lab).proponerTransferencia(1, dist.address));
            await rejected(() => c.connect(lab).proponerTransferencia(1, dist.address));
            await rejected(() => c.connect(attacker).cancelarTransferencia(1));
            await rejected(() => c.connect(attacker).aceptarTransferencia(1));
            await measured(version, "pausar", c.pausar());
            await rejected(() => c.pausar());
            await rejected(() => c.connect(lab).registrarLote("Z", "Y"));
            await rejected(() => c.connect(dist).aceptarTransferencia(1));
            await measured(version, "reanudar", c.reanudar());
            await rejected(() => c.reanudar());
            await receipt(c.connect(dist).aceptarTransferencia(1));
            await rejected(() => c.connect(dist).proponerTransferencia(1, lab.address));
            await rejected(() => c.consultarMovimiento(1, 999));
            await rejected(() => c.consultarLote(999));
        });
        it("mide registros sucesivos, cadenas largas y cancelación administrativa", async () => {
            const c = await setup(version);
            const [admin, lab, dist, pharmacy] = signers;
            for (let i = 1; i <= 6; i++) {
                const name = i === 6 ? "F".repeat(128) : `Farmaco ${i}`;
                await measured(
                    version,
                    `registro_serie_${i}`,
                    c.connect(lab).registrarLote(name, "Fabricante"),
                );
            }
            expect(await c.totalLotes()).to.equal(6n);
            await measured(
                version,
                "propuesta_para_cancelar_admin",
                c.connect(lab).proponerTransferencia(1, dist.address),
            );
            await measured(version, "cancelacion_admin", c.connect(admin).cancelarTransferencia(1));
            await measured(
                version,
                "propuesta_2_lab_dist",
                c.connect(lab).proponerTransferencia(2, dist.address),
            );
            await measured(
                version,
                "aceptacion_2_lab_dist",
                c.connect(dist).aceptarTransferencia(2),
            );
            await measured(
                version,
                "propuesta_2_dist_farm",
                c.connect(dist).proponerTransferencia(2, pharmacy.address),
            );
            await measured(
                version,
                "aceptacion_2_dist_farm",
                c.connect(pharmacy).aceptarTransferencia(2),
            );
            await assertLote(c, 2, version, pharmacy);
        });
    });
}

after(function () {
    const dir = path.resolve("gas-reports");
    fs.mkdirSync(dir, { recursive: true });
    const csv =
        [
            "version,operation,kind,value,run",
            ...measurements.map((r) => `${r.version},${r.operation},${r.kind},${r.gas},${runId}`),
        ].join("\n") + "\n";
    fs.writeFileSync(path.join(dir, `pharmachain-${runId}.csv`), csv);
    fs.writeFileSync(
        path.join(dir, `pharmachain-${runId}.json`),
        JSON.stringify(measurements, null, 2),
    );
    const base = new Map(
        measurements.filter((x) => x.version === "V0Base").map((x) => [x.operation, x]),
    );
    console.log("\n--- GasLab: comparación contra V0Base ---");
    for (const r of measurements.filter((x) => x.version !== "V0Base")) {
        const b = base.get(r.operation);
        if (!b) continue;
        const before = BigInt(b.gas),
            after = BigInt(r.gas);
        const pct = Number(((before - after) * 10000n) / before) / 100;
        console.log(
            `${r.version.padEnd(13)} ${r.operation.padEnd(29)} ${String(r.gas).padStart(9)} vs ${String(b.gas).padStart(9)} | ${pct.toFixed(2)}%`,
        );
    }
    console.log(`CSV: gas-reports/pharmachain-${runId}.csv`);
});
