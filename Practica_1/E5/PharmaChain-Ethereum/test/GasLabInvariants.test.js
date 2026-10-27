import { expect } from "chai";
import hre from "hardhat";
const { ethers } = await hre.network.connect();
const versions = [
    "V0Base",
    "V6SinId",
    "V9TransferenciaCompacta",
    "V10PackingCombinado",
    "V11SoloEventos",
    "V12EventosCompacta",
];
let users;
const mine = async (tx) => {
    const r = await (await tx).wait();
    expect(r.status).to.equal(1);
    return r;
};
async function reject(fn) {
    let fail = false;
    try {
        await mine(fn());
    } catch {
        fail = true;
    }
    expect(fail).to.equal(true);
}
async function setup(f, v) {
    const name = f === "Manual" ? `Pharma${v}` : `PharmaOZ${v}`;
    const c = await (await ethers.getContractFactory(name)).deploy();
    await c.waitForDeployment();
    for (let i = 1; i <= 3; i++) {
        if (f === "Manual") await mine(c.asignarRol(users[i].address, i));
        else
            await mine(
                c.grantRole(
                    await c[["", "LABORATORIO_ROLE", "DISTRIBUIDOR_ROLE", "FARMACIA_ROLE"][i]](),
                    users[i].address,
                ),
            );
    }
    return c;
}
function emitted(c, receipt, event) {
    return receipt.logs
        .flatMap((log) => {
            try {
                return [c.interface.parseLog(log)];
            } catch {
                return [];
            }
        })
        .filter((e) => e?.name === event);
}
function random(seed) {
    let x = seed >>> 0;
    return () => {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        return x / 4294967296;
    };
}
before(async () => {
    users = await ethers.getSigners();
});
for (const family of ["Manual", "OZ"])
    for (const version of versions) {
        describe(`Invariants ${family} ${version}`, function () {
            this.timeout(180000);
            it("no puede transferir ni reactivar un lote desactivado; preserva propiedad", async () => {
                const c = await setup(family, version);
                await mine(c.connect(users[1]).registrarLote("F", "M"));
                const r = await mine(
                    c.connect(users[1]).proponerTransferencia(1, users[2].address),
                );
                expect(emitted(c, r, "TransferenciaPropuesta")).to.have.length(1);
                await mine(c.desactivarLote(1));
                expect((await c.consultarLote(1)).propietario).to.equal(users[1].address);
                await reject(() => c.connect(users[2]).aceptarTransferencia(1));
                await reject(() => c.connect(users[1]).proponerTransferencia(1, users[2].address));
                expect((await c.transferencias(1)).pendiente).to.equal(false);
            });
            it("revocar o cambiar el rol del destino invalida una aceptación pendiente", async () => {
                const c = await setup(family, version);
                await mine(c.connect(users[1]).registrarLote("F", "M"));
                await mine(c.connect(users[1]).proponerTransferencia(1, users[2].address));
                if (family === "Manual") await mine(c.asignarRol(users[2].address, 0));
                else await mine(c.revokeRole(await c.DISTRIBUIDOR_ROLE(), users[2].address));
                await reject(() => c.connect(users[2]).aceptarTransferencia(1));
                expect((await c.consultarLote(1)).propietario).to.equal(users[1].address);
                expect((await c.transferencias(1)).pendiente).to.equal(true);
            });
            it("secuencias deterministas: nunca acepta un destino no autorizado", async () => {
                const c = await setup(family, version);
                const rnd = random(1337);
                for (let i = 0; i < 12; i++) {
                    await mine(c.connect(users[1]).registrarLote(`F${i}`, "M"));
                    const id = i + 1;
                    for (let j = 0; j < 3; j++) {
                        const target = rnd() < 0.5 ? users[2] : users[3];
                        if (target === users[3])
                            await reject(() =>
                                c.connect(users[1]).proponerTransferencia(id, target.address),
                            );
                        else {
                            await mine(
                                c.connect(users[1]).proponerTransferencia(id, target.address),
                            );
                            if (rnd() < 0.5)
                                await mine(c.connect(users[1]).cancelarTransferencia(id));
                            else await mine(c.connect(users[2]).aceptarTransferencia(id));
                            break;
                        }
                    }
                    const owner = (await c.consultarLote(id)).propietario;
                    expect([users[1].address, users[2].address]).to.include(owner);
                }
                expect(await c.totalLotes()).to.equal(12n);
            });
        });
    }
