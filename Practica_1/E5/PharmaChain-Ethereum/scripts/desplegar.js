import { network } from "hardhat";

const { ethers } = await network.connect();

const [administrador] = await ethers.getSigners();

const Fabrica = await ethers.getContractFactory("PharmaChainRolesOpenZeppelin");

const contrato = await Fabrica.deploy();
await contrato.waitForDeployment();

console.log("Administrador:", administrador.address);
console.log("Contrato:", await contrato.getAddress());
