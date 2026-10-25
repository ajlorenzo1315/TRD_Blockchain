import { network } from "hardhat";

// Despliega en la red elegida con --network localhost.
// La dirección resultante se usa para generar contract-config.js.
const { viem } = await network.connect();
const contract = await viem.deployContract(
  "contracts/CryptoZombies/lesson-06/L6zombieownership.sol:Lesson6ZombieOwnership",
);
console.log("Lesson6ZombieOwnership deployed at:", contract.address);
console.log("Next: node scripts/export-lesson-06-abi.mjs", contract.address);
