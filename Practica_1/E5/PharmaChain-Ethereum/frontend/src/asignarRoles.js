import { network } from "hardhat";

const { ethers } = await network.connect();

const direccion = process.env.CONTRATO;
const laboratorio = process.env.LABORATORIO;
const distribuidor = process.env.DISTRIBUIDOR;
const farmacia = process.env.FARMACIA;

if (!direccion || !laboratorio || !distribuidor || !farmacia) {
    throw new Error("Faltan direcciones en las variables de entorno");
}

const contrato = await ethers.getContractAt("PharmaChainRolesOpenZeppelin", direccion);

const asignaciones = [
    [await contrato.LABORATORIO_ROLE(), laboratorio],
    [await contrato.DISTRIBUIDOR_ROLE(), distribuidor],
    [await contrato.FARMACIA_ROLE(), farmacia],
];

for (const [rol, cuenta] of asignaciones) {
    const tx = await contrato.grantRole(rol, cuenta);
    await tx.wait();

    console.log("Rol asignado:", cuenta);
}
