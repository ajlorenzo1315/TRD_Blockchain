(() => {
    "use strict";
    const $ = (id) => document.getElementById(id);
    const RPC = "http://127.0.0.1:8545";
    const PAGE_SIZE = 6;
    let records = [],
        filtered = [];
    const core = window.Lesson6Core;
    const safe = (value) => core.escapeHtml(String(value));
    const status = (text) => {
        $("rankingStatus").textContent = text;
    };
    const number = (value) => Number(value);
    async function load() {
        const button = $("rankingRefresh");
        button.disabled = true;
        status("Consultando eventos NewZombie y estadísticas en Hardhat…");
        try {
            if (!window.Web3 || !Array.isArray(window.LESSON6_ABI))
                throw Error("Web3 o ABI no disponible.");
            const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
            if (number(await web3.eth.getChainId()) !== 31337)
                throw Error("La red no es Hardhat 31337.");
            const contract = new web3.eth.Contract(window.LESSON6_ABI, window.LESSON6_ADDRESS);
            if ((await web3.eth.getCode(window.LESSON6_ADDRESS)) === "0x")
                throw Error("Contrato no desplegado en la dirección configurada.");
            // NewZombie se emite en _createZombie; incluye zombis creados por reproducción o batalla.
            const events = await contract.getPastEvents("NewZombie", {
                fromBlock: 0,
                toBlock: "latest",
            });
            const byId = new Map();
            for (const event of events) {
                const id = String(event.returnValues.zombieId ?? event.returnValues[0]);
                if (!byId.has(id))
                    byId.set(id, {
                        id,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash,
                    });
            }
            const blockTimes = new Map();
            const entries = [...byId.values()];
            records = await Promise.all(
                entries.map(async (entry) => {
                    const zombie = await contract.methods.zombies(entry.id).call();
                    const owner = await contract.methods.ownerOf(entry.id).call();
                    let timestamp = blockTimes.get(entry.blockNumber);
                    if (timestamp === undefined) {
                        const block = await web3.eth.getBlock(entry.blockNumber);
                        timestamp = number(block.timestamp);
                        blockTimes.set(entry.blockNumber, timestamp);
                    }
                    return {
                        ...entry,
                        zombie,
                        owner,
                        timestamp,
                        normalized: core.normalizeZombie(zombie),
                    };
                }),
            );
            applyFilters();
        } catch (error) {
            status("No se pudo cargar el ranking: " + error.message);
            $("rankingCards").innerHTML = "";
        } finally {
            button.disabled = false;
        }
    }
    function applyFilters() {
        const name = $("rankingName").value.trim().toLocaleLowerCase();
        const minLevel = Math.max(1, number($("rankingMinLevel").value) || 1);
        const age = $("rankingAge").value;
        const now = Math.floor(Date.now() / 1000);
        filtered = records.filter((record) => {
            const z = record.normalized;
            if (!String(z.name).toLocaleLowerCase().includes(name) || number(z.level) < minLevel)
                return false;
            if (age === "24h" && record.timestamp < now - 86400) return false;
            if (age === "7d" && record.timestamp < now - 604800) return false;
            return true;
        });
        // Victorias SIEMPRE mandan. Antigüedad solo rompe empates.
        filtered.sort((a, b) => {
            const wins = BigInt(b.normalized.winCount) - BigInt(a.normalized.winCount);
            if (wins !== 0n) return wins > 0n ? 1 : -1;
            if (age === "newest") return b.timestamp - a.timestamp || number(a.id) - number(b.id);
            return a.timestamp - b.timestamp || number(a.id) - number(b.id);
        });
        const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const slider = $("rankingPage");
        slider.max = String(pages);
        slider.value = String(Math.min(number(slider.value) || 1, pages));
        render();
    }
    function render() {
        const page = number($("rankingPage").value) || 1;
        const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        $("rankingPageLabel").textContent = `Página ${page} de ${pages}`;
        status(
            `${filtered.length} zombis encontrados · ${records.length} zombis registrados · clasificación por victorias`,
        );
        const start = (page - 1) * PAGE_SIZE;
        $("rankingCards").innerHTML =
            filtered
                .slice(start, start + PAGE_SIZE)
                .map((r, index) => {
                    const position = start + index + 1;
                    const created = new Date(r.timestamp * 1000).toLocaleString("es-ES");
                    return `<div class="ranking-card"><span class="ranking-medal">#${position} · ${safe(r.normalized.winCount)} victorias</span>${core.renderZombie(r.zombie, r.id)}<div class="ranking-meta">Creado: ${safe(created)}<div title="${safe(r.owner)}">Propietario: ${safe(r.owner.slice(0, 8))}…${safe(r.owner.slice(-6))}</div></div></div>`;
                })
                .join("") || '<div class="empty">No hay zombis que cumplan los filtros.</div>';
        window.Lesson6Loom?.hydrate($("rankingCards"));
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (!$("rankingRefresh")) return;
        $("rankingRefresh").addEventListener("click", load);
        ["rankingName", "rankingMinLevel", "rankingAge"].forEach((id) =>
            $(id).addEventListener(id === "rankingName" ? "input" : "change", applyFilters),
        );
        $("rankingPage").addEventListener("input", render);
        load();
    });
})();
