import fs from "node:fs";
const files = process.argv.slice(2);
if (files.length < 1) {
    console.error(
        "Uso: node scripts/compare-gas.mjs gas-reports/pharmachain-default.csv [otro.csv]",
    );
    process.exit(1);
}
for (const file of files) {
    const rows = fs
        .readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .slice(1)
        .map((s) => {
            const [version, operation, kind, value, run] = s.split(",");
            return { version, operation, kind, value: BigInt(value), run };
        });
    const baseline = new Map(
        rows.filter((x) => x.version === "V0Base").map((x) => [x.operation, x]),
    );
    console.log("\n", file);
    console.log("Version | Operación | Antes | Después | Diferencia | Ahorro %");
    for (const r of rows.filter((x) => x.version !== "V0Base")) {
        const b = baseline.get(r.operation);
        if (!b) continue;
        const delta = b.value - r.value;
        const pct = Number((delta * 10000n) / b.value) / 100;
        console.log(
            `${r.version} | ${r.operation} | ${b.value} | ${r.value} | ${delta} | ${pct.toFixed(2)}%`,
        );
    }
}
