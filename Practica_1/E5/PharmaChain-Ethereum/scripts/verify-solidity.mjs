import fs from "node:fs";
import path from "node:path";
const folder = "contracts/gas-lab";
const files = fs.readdirSync(folder).filter((x) => x.endsWith(".sol"));
for (const file of files) {
    const src = fs.readFileSync(path.join(folder, file), "utf8");
    const name = file.replace(".sol", "");
    if (!new RegExp(`\\b(contract|abstract contract)\\s+${name}\\b`).test(src)) {
        console.error(`Contract/file name mismatch: ${file}`);
        process.exitCode = 1;
    }
    if (!src.includes("pragma solidity 0.8.34;")) {
        console.error(`Solidity version mismatch: ${file}`);
        process.exitCode = 1;
    }
}
console.log(`Checked ${files.length} Solidity file names and pragmas (not a compiler)`);
