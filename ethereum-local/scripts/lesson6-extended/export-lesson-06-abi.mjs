import fs from "node:fs";
import path from "node:path";
const artifactPath = path.resolve(
    "artifacts/contracts/CryptoZombies/lesson-06/L6zombieownership.sol/Lesson6ZombieOwnership.json",
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const address = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    console.error(
        "Uso: node scripts/lesson6-extended/export-lesson-06-abi.mjs 0xDIRECCION_DEL_CONTRATO",
    );
    process.exit(1);
}
const target = path.resolve("frontend/lesson-06-extended/contract-config.js");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(
    target,
    `window.LESSON6_ADDRESS = ${JSON.stringify(address)};\nwindow.LESSON6_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`,
);
console.log(`ABI y dirección exportados a ${target}`);
