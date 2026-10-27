import fs from "node:fs";
import path from "node:path";
const input = process.argv[2] || "gas-reports/pharmachain-extended.csv";
const rows = fs
    .readFileSync(input, "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => {
        const [family, version, operation, kind, gas] = l.split(",");
        return { family, version, operation, kind, gas: BigInt(gas) };
    });
const idx = new Map();
for (const r of rows) {
    const k = `${r.family}|${r.version}|${r.operation}`;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r.gas);
}
const mean = (a) => a.reduce((s, x) => s + x, 0n) / BigInt(a.length);
const results = [];
for (const [key, values] of idx) {
    const [family, version, operation] = key.split("|");
    if (version === "V0Base") continue;
    const baseline = idx.get(`${family}|V0Base|${operation}`);
    const base = baseline?.length ? mean(baseline) : null;
    const now = mean(values);
    if (base === null) continue;
    const delta = base - now;
    const pct = base === 0n ? 0 : Number((delta * 1000000n) / base) / 10000;
    results.push({
        family,
        version,
        operation,
        baseline: base.toString(),
        optimized: now.toString(),
        saved: delta.toString(),
        savedPct: pct,
    });
}
results.sort(
    (a, b) =>
        a.family.localeCompare(b.family) ||
        a.version.localeCompare(b.version) ||
        a.operation.localeCompare(b.operation),
);
const dir = path.dirname(input);
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, "comparison-extended.csv");
fs.writeFileSync(
    out,
    "family,version,operation,baseline,optimized,saved,savedPct\n" +
        results.map((r) => Object.values(r).join(",")).join("\n") +
        "\n",
);
const summary = results.filter((x) =>
    [
        "deploy",
        "register_first",
        "propose_lab_dist",
        "accept_lab_dist",
        "propose_dist_pharm",
        "accept_dist_pharm",
        "runtime_bytes",
    ].includes(x.operation),
);
console.table(summary);
console.log(`Written ${out} (${results.length} comparisons)`);
