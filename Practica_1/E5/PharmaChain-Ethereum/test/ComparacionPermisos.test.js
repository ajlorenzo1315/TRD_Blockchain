import { expect } from "chai";
import { network } from "hardhat";

describe("Diferencias de permisos", function () {
    let ethers, admin, lab, otra;
    beforeEach(async function () {
        const conexion = await network.connect();
        ethers = conexion.ethers;
        [admin, lab, otra] = await ethers.getSigners();
    });

    it("manual: un usuario solo tiene un rol", async function () {
        const F = await ethers.getContractFactory("PharmaChainRolesManuales");
        const c = await F.deploy();
        await c.asignarRol(lab.address, 1);
        expect(await c.roles(lab.address)).to.equal(1n);
        await c.asignarRol(lab.address, 2);
        expect(await c.roles(lab.address)).to.equal(2n);
    });

    it("manual: un atacante no puede asignar roles", async function () {
        const F = await ethers.getContractFactory("PharmaChainRolesManuales");
        const c = await F.deploy();
        await expect(c.connect(otra).asignarRol(lab.address, 1)).to.revert(ethers);
    });

    it("OpenZeppelin: permite conceder y revocar un rol", async function () {
        const F = await ethers.getContractFactory("PharmaChainRolesOpenZeppelin");
        const c = await F.deploy();
        const role = await c.LABORATORIO_ROLE();
        await c.grantRole(role, lab.address);
        expect(await c.hasRole(role, lab.address)).to.equal(true);
        await c.revokeRole(role, lab.address);
        expect(await c.hasRole(role, lab.address)).to.equal(false);
    });

    it("OpenZeppelin: un atacante no puede conceder roles", async function () {
        const F = await ethers.getContractFactory("PharmaChainRolesOpenZeppelin");
        const c = await F.deploy();
        await expect(c.connect(otra).grantRole(await c.LABORATORIO_ROLE(), lab.address)).to.revert(
            ethers,
        );
    });

    it("OpenZeppelin: una cuenta puede tener varios roles", async function () {
        const F = await ethers.getContractFactory("PharmaChainRolesOpenZeppelin");
        const c = await F.deploy();
        const labRole = await c.LABORATORIO_ROLE();
        const distRole = await c.DISTRIBUIDOR_ROLE();
        await c.grantRole(labRole, lab.address);
        await c.grantRole(distRole, lab.address);
        expect(await c.hasRole(labRole, lab.address)).to.equal(true);
        expect(await c.hasRole(distRole, lab.address)).to.equal(true);
    });
});
