import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";

const pairs = [
    ["Manuales", "PharmaChainRolesManuales", "PharmaChainRolesManualesOptimized"],
    ["OpenZeppelin", "PharmaChainRolesOpenZeppelin", "PharmaChainRolesOpenZeppelinOptimized"],
];

async function measure(ethers, name, accounts) {
    const [admin, lab, dist, pharmacy] = accounts;
    const factory = await ethers.getContractFactory(name);
    const c = await factory.deploy();
    const deployed = await c.deploymentTransaction().wait();
    const manual = name.includes("Manuales");
    if (manual) {
        await (await c.asignarRol(lab.address, 1)).wait();
        await (await c.asignarRol(dist.address, 2)).wait();
        await (await c.asignarRol(pharmacy.address, 3)).wait();
    } else {
        await (await c.grantRole(await c.LABORATORIO_ROLE(), lab.address)).wait();
        await (await c.grantRole(await c.DISTRIBUIDOR_ROLE(), dist.address)).wait();
        await (await c.grantRole(await c.FARMACIA_ROLE(), pharmacy.address)).wait();
    }
    const gas = async (tx) => (await (await tx).wait()).gasUsed;
    const result = { despliegue: deployed.gasUsed };
    result.registrarLote = await gas(
        c.connect(lab).registrarLote("Paracetamol", "Laboratorio Galicia"),
    );
    result.proponerTransferencia = await gas(c.connect(lab).proponerTransferencia(1, dist.address));
    result.aceptarTransferencia = await gas(c.connect(dist).aceptarTransferencia(1));
    result.proponerParaCancelar = await gas(
        c.connect(dist).proponerTransferencia(1, pharmacy.address),
    );
    result.cancelarTransferencia = await gas(c.connect(dist).cancelarTransferencia(1));
    result.desactivarLote = await gas(c.connect(admin).desactivarLote(1));
    return result;
}

describe("Comparación reproducible de gas", function () {
    it("genera tabla CSV original vs optimizado", async function () {
        const { ethers } = await network.connect();
        const accounts = await ethers.getSigners();
        const rows = ["arquitectura,operacion,original,optimizado,ahorro_porcentaje"];
        for (const [label, original, optimized] of pairs) {
            const a = await measure(ethers, original, accounts);
            const b = await measure(ethers, optimized, accounts);
            for (const operation of Object.keys(a)) {
                const before = a[operation],
                    after = b[operation];
                const saving = ((Number(before - after) / Number(before)) * 100).toFixed(2);
                rows.push(`${label},${operation},${before},${after},${saving}`);
                console.log(
                    `${label.padEnd(13)} ${operation.padEnd(25)} ${String(before).padStart(9)} → ${String(after).padStart(9)} (${saving}%)`,
                );
            }
        }
        mkdirSync("reports", { recursive: true });
        writeFileSync("reports/gas-comparison.csv", rows.join("\n") + "\n");
    });
});
