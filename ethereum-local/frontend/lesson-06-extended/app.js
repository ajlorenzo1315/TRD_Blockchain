(() => {
    "use strict";
    const core = window.Lesson6Core;
    const $ = (id) => document.getElementById(id);
    const RPC = "http://127.0.0.1:8545",
        CHAIN = 31337;
    let web3,
        contract,
        account,
        busy = false,
        localMode = false;
    let ids = [],
        zombies = [];
    let selectedZombieId = null;
    let hardhatAccounts = [];
    let accountRevision = 0;
    const notify = (text, kind = "info") => {
        const el = $("txStatus");
        if (el) {
            el.textContent = String(text);
            el.dataset.kind = kind;
        }
    };
    function abiCheck() {
        if (!Array.isArray(window.LESSON6_ABI)) throw Error("No se ha cargado contract-config.js");
        for (const name of [
            "createRandomZombie",
            "getZombiesByOwner",
            "zombies",
            "ownerOf",
            "attack",
        ]) {
            if (!window.LESSON6_ABI.some((f) => f.type === "function" && f.name === name))
                throw Error(
                    "Falta " +
                        name +
                        " en el ABI. Regenera contract-config.js con ACTUALIZAR-CONTRATO.mjs",
                );
        }
    }
    const method = (name) => {
        if (!contract) throw Error("Selecciona una cuenta local de Hardhat o conecta MetaMask.");
        if (typeof contract.methods[name] !== "function")
            throw Error("Método " + name + " no disponible en el contrato/ABI.");
        return contract.methods[name];
    };
    async function rpc(methodName, params = []) {
        const response = await fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: methodName, params, id: 1 }),
        });
        if (!response.ok) throw Error("HTTP " + response.status);
        const body = await response.json();
        if (body.error) throw Error(body.error.message);
        return body.result;
    }
    async function verifyNode() {
        const chain = await rpc("eth_chainId");
        if (Number(chain) !== CHAIN) throw Error("RPC no es Hardhat 31337");
        const code = await rpc("eth_getCode", [window.LESSON6_ADDRESS, "latest"]);
        if (!code || code === "0x")
            throw Error(
                "No hay contrato en " +
                    window.LESSON6_ADDRESS +
                    ". Despliega y actualiza el ABI/dirección.",
            );
        $("localNodeStatus").textContent = "● Hardhat 31337 · Contrato disponible";
        $("localNodeStatus").dataset.kind = "success";
        $("network").textContent = "Hardhat 31337";
        return true;
    }
    async function checkNode() {
        try {
            await verifyNode();
            notify("Nodo Hardhat y contrato verificados", "success");
        } catch (e) {
            $("localNodeStatus").textContent = "○ " + e.message;
            $("localNodeStatus").dataset.kind = "error";
            notify(e.message, "error");
        }
    }
    async function connect() {
        abiCheck();
        await verifyNode();
        if (!window.ethereum)
            throw Error(
                "MetaMask no está disponible. El editor y la arena demo funcionan sin cartera; para transacciones reales instala/activa MetaMask en este navegador.",
            );
        if (!window.Web3)
            throw Error("Web3.js no está cargado. Comprueba el CDN o utiliza una copia local.");
        let chain = Number(await window.ethereum.request({ method: "eth_chainId" }));
        if (chain !== CHAIN) {
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x7a69" }],
                });
            } catch (e) {
                if (e.code !== 4902) throw e;
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: "0x7a69",
                            chainName: "Hardhat Local",
                            rpcUrls: [RPC],
                            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                        },
                    ],
                });
            }
        }
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts.length) throw Error("MetaMask no autorizó ninguna cuenta");
        localMode = false;
        web3 = new Web3(window.ethereum);
        account = core.requireAddress(accounts[0]);
        contract = new web3.eth.Contract(
            window.LESSON6_ABI,
            core.requireAddress(window.LESSON6_ADDRESS),
        );
        $("account").textContent = account.slice(0, 6) + "…" + account.slice(-4);
        $("account").title = account;
        $("connectionDot").classList.add("connected");
        notify("MetaMask conectada a Hardhat Local", "success");
        await refresh();
    }
    async function connectLocal(address) {
        if (busy) throw Error("Espera a que termine la transacción antes de cambiar de cuenta.");
        const revision = ++accountRevision;
        abiCheck();
        await verifyNode();
        if (!window.Web3) throw Error("Web3.js no se ha cargado.");
        const accounts = await rpc("eth_accounts");
        if (!accounts?.length)
            throw Error("El nodo no tiene cuentas desbloqueadas. Inicia npx hardhat node.");
        if (revision !== accountRevision) return;
        hardhatAccounts = accounts;
        account = core.requireAddress(address || accounts[0]);
        if (!accounts.some((a) => a.toLowerCase() === account.toLowerCase()))
            throw Error("La cuenta no pertenece al nodo Hardhat.");
        localMode = true;
        web3 = new Web3(new Web3.providers.HttpProvider(RPC));
        contract = new web3.eth.Contract(window.LESSON6_ABI, window.LESSON6_ADDRESS);
        $("account").textContent =
            "Hardhat #" +
            accounts.findIndex((a) => a.toLowerCase() === account.toLowerCase()) +
            " · " +
            account.slice(0, 6) +
            "…" +
            account.slice(-4);
        $("localAccount").value = account;
        $("account").title = account;
        $("connectionDot").classList.add("connected");
        notify(
            "Cuenta de prueba Hardhat activa. Las transacciones se envían al nodo local desbloqueado.",
            "success",
        );
        await refresh();
    }
    async function populateLocalAccounts() {
        const select = $("localAccount");
        try {
            const accounts = await rpc("eth_accounts");
            hardhatAccounts = accounts;
            select.innerHTML = accounts
                .map(
                    (a, i) =>
                        `<option value="${core.escapeHtml(a)}">Cuenta local #${i} · ${a.slice(0, 6)}…${a.slice(-4)}</option>`,
                )
                .join("");
        } catch (e) {
            select.innerHTML = '<option value="">Hardhat desconectado</option>';
        }
    }
    async function publicRead(name, ...args) {
        if (!window.Web3) throw Error("Web3.js no está disponible");
        abiCheck();
        await verifyNode();
        const client = new Web3(new Web3.providers.HttpProvider(RPC));
        const c = new client.eth.Contract(window.LESSON6_ABI, window.LESSON6_ADDRESS);
        if (typeof c.methods[name] !== "function")
            throw Error("Método de consulta no disponible: " + name);
        return c.methods[name](...args).call();
    }
    function currentZombieId() {
        const id = $("selectedZombie")?.value;
        if (!id || !ids.includes(id))
            throw Error("Selecciona primero uno de tus zombis en Mi ejército.");
        return core.requireId(id);
    }
    function updateSelection() {
        const id = $("selectedZombie")?.value;
        const index = ids.indexOf(id);
        selectedZombieId = index >= 0 ? id : null;
        $("selectedZombieVisual").innerHTML =
            index >= 0
                ? core.renderZombie(zombies[index], ids[index])
                : '<div class="empty">Selecciona un zombi.</div>';
        window.Lesson6Loom?.hydrate();
    }
    async function refresh() {
        if (!account || !contract) return;
        const requestedAccount = account,
            requestedContract = contract;
        const rawIds = await requestedContract.methods.getZombiesByOwner(requestedAccount).call();
        const nextIds = rawIds.map(String);
        const nextZombies = await Promise.all(
            nextIds.map((id) => requestedContract.methods.zombies(id).call()),
        );
        if (requestedAccount !== account || requestedContract !== contract) return;
        ids = nextIds;
        zombies = nextZombies;
        $("accountCreationInfo").textContent = ids.length
            ? "Esta cuenta ya ha creado su zombi inicial. El contrato original permite un solo createRandomZombie por cuenta. Cambia de cuenta Hardhat para crear otro, o usa las funciones originales del contrato para obtener más zombis."
            : "Esta cuenta todavía no tiene zombis: puedes crear su primer zombi.";
        $("zombies").innerHTML = ids.length
            ? zombies
                  .map(
                      (z, i) =>
                          `<div class="army-card" data-zombie-id="${core.escapeHtml(ids[i])}">${core.renderZombie(z, ids[i])}<button class="btn btn-ghost choose-zombie" type="button" data-zombie-id="${core.escapeHtml(ids[i])}">Seleccionar #${core.escapeHtml(ids[i])}</button></div>`,
                  )
                  .join("")
            : '<div class="empty">Todavía no tienes zombis en esta cuenta. Crea uno o cambia de cuenta Hardhat.</div>';
        const createButton = $("create")?.querySelector('button[type="submit"]');
        if (createButton) {
            createButton.disabled = ids.length > 0;
            createButton.title = ids.length
                ? "Selecciona otra cuenta Hardhat para crear un zombi inicial"
                : "Crear el primer zombi de esta cuenta";
        }
        $("armyCount").textContent = String(ids.length);
        $("victoryCount").textContent = String(
            zombies.reduce((n, z) => n + BigInt(core.normalizeZombie(z).winCount), 0n),
        );
        const fighter = $("myZombie").value;
        $("myZombie").innerHTML = ids
            .map(
                (id, i) =>
                    `<option value="${core.escapeHtml(id)}">#${core.escapeHtml(id)} · ${core.escapeHtml(core.normalizeZombie(zombies[i]).name)}</option>`,
            )
            .join("");
        if (ids.includes(fighter)) $("myZombie").value = fighter;
        $("myZombie").disabled = !ids.length;
        $("attackBtn").disabled = !ids.length;
        const index = ids.indexOf($("myZombie").value);
        $("chainHeroCard").innerHTML =
            index >= 0
                ? core.renderZombie(zombies[index], ids[index])
                : '<div class="empty">Crea un zombi para combatir.</div>';
        const select = $("selectedZombie");
        const previous = selectedZombieId || select.value;
        select.innerHTML = ids.length
            ? ids
                  .map(
                      (id, i) =>
                          `<option value="${core.escapeHtml(id)}">#${core.escapeHtml(id)} · ${core.escapeHtml(core.normalizeZombie(zombies[i]).name)}</option>`,
                  )
                  .join("")
            : '<option value="">Sin zombis</option>';
        select.disabled = !ids.length;
        if (ids.includes(previous)) select.value = previous;
        updateSelection();
        window.Lesson6Loom?.hydrate();
    }
    async function send(name, args = [], value) {
        if (!account) throw Error("Selecciona una cuenta local de Hardhat o conecta MetaMask.");
        if (busy) throw Error("Hay otra transacción pendiente.");
        busy = true;
        try {
            notify(
                localMode
                    ? "Ejecutando " + name + " en Hardhat local…"
                    : "Confirma " + name + " en MetaMask…",
            );
            const tx = method(name)(...args);
            const receipt = await tx.send({ from: account, ...(value ? { value } : {}) });
            if (receipt.status === false || receipt.status === 0)
                throw Error("Transacción revertida");
            notify("✓ " + name + " confirmado: " + receipt.transactionHash, "success");
            const history = $("collectionTxHistory");
            if (history) {
                const line = document.createElement("p");
                line.className = "tx-history-item";
                line.textContent = name + " · " + receipt.transactionHash;
                history.prepend(line);
            }
            await refresh();
            return receipt;
        } finally {
            busy = false;
        }
    }
    async function inspect() {
        const id = core.requireId($("enemyId").value);
        const [z, owner] = await Promise.all([
            publicRead("zombies", id),
            publicRead("ownerOf", id),
        ]);
        $("enemyPreview").innerHTML =
            core.renderZombie(z, id) + `<p class="hint">Propietario: ${core.escapeHtml(owner)}</p>`;
        $("chainEnemyCard").innerHTML = core.renderZombie(z, id);
        $("chainCombatStatus").textContent = "Rival disponible";
        window.Lesson6Loom?.hydrate();
    }
    async function fight() {
        const a = core.requireId($("myZombie").value),
            b = core.requireId($("enemyId").value);
        if (a === b) throw Error("Elige un rival distinto");
        if (!account) throw Error("Selecciona una cuenta de Hardhat primero.");
        const attackerOwner = await publicRead("ownerOf", a);
        if (attackerOwner.toLowerCase() !== account.toLowerCase())
            throw Error("El atacante no pertenece a la cuenta seleccionada.");
        const owner = await publicRead("ownerOf", b);
        if (owner.toLowerCase() === account?.toLowerCase())
            throw Error("El rival debe pertenecer a otra cuenta");
        const beforeA = await publicRead("zombies", a),
            beforeB = await publicRead("zombies", b);
        const latest = await web3.eth.getBlock("latest");
        const ready = Number(beforeA.readyTime ?? beforeA[3]);
        if (Number(latest.timestamp) < ready)
            throw Error(
                "Zombi en cooldown hasta " +
                    new Date(ready * 1000).toLocaleString() +
                    ". En la demo local pulsa «Avanzar 1 día» antes de atacar. El contrato original impide que una victoria se complete durante el cooldown.",
            );
        try {
            await method("attack")(a, b).estimateGas({ from: account });
        } catch (e) {
            throw Error(
                "El contrato rechazaría el combate antes de gastar gas. Verifica propietario, rival y cooldown. Detalle: " +
                    e.message,
            );
        }
        $("chainCombatStatus").textContent = localMode
            ? "Ejecutando ataque en Hardhat local"
            : "Esperando confirmación en MetaMask";
        $("chainProgress").hidden = false;
        $("chainHeroHp").style.width = "100%";
        $("chainEnemyHp").style.width = "100%";
        try {
            const receipt = await send("attack", [a, b]);
            const [afterA, afterB] = await Promise.all([
                publicRead("zombies", a),
                publicRead("zombies", b),
            ]);
            const outcome = core.battleOutcome(beforeA, afterA, beforeB, afterB);
            $("battleResult").textContent =
                outcome === "victoria"
                    ? "🏆 Victoria confirmada en Hardhat"
                    : outcome === "derrota"
                      ? "💀 Derrota confirmada en Hardhat"
                      : "Ataque confirmado; consulta las estadísticas";
            $("battleTx").textContent = receipt.transactionHash;
            $("chainCombatStatus").textContent =
                "Resultado on-chain: " +
                outcome +
                " · barras de vida ilustrativas (el contrato no almacena HP)";
            if (outcome === "victoria") {
                $("chainHeroHp").style.width = "60%";
                $("chainEnemyHp").style.width = "0%";
            } else if (outcome === "derrota") {
                $("chainHeroHp").style.width = "0%";
                $("chainEnemyHp").style.width = "55%";
            } else {
                $("chainHeroHp").style.width = "80%";
                $("chainEnemyHp").style.width = "80%";
            }
            const aEl = $("chainHeroCard"),
                bEl = $("chainEnemyCard");
            aEl.classList.remove("chain-win", "chain-lose");
            bEl.classList.remove("chain-win", "chain-lose");
            void aEl.offsetWidth;
            aEl.classList.add(outcome === "victoria" ? "chain-win" : "chain-lose");
            bEl.classList.add(outcome === "victoria" ? "chain-lose" : "chain-win");
        } finally {
            $("chainProgress").hidden = true;
        }
    }
    function onForm(id, handler) {
        $(id)?.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                await handler();
            } catch (err) {
                notify(err.message, "error");
            }
        });
    }
    function bind() {
        $("checkNode")?.addEventListener("click", checkNode);
        checkNode();
        $("connect")?.addEventListener("click", () =>
            connect().catch((e) => notify(e.message, "error")),
        );
        $("connectLocal")?.addEventListener("click", () =>
            connectLocal($("localAccount").value).catch((e) => notify(e.message, "error")),
        );
        $("localAccount")?.addEventListener("change", () =>
            connectLocal($("localAccount").value).catch((e) => notify(e.message, "error")),
        );
        populateLocalAccounts();
        $("refresh")?.addEventListener("click", () =>
            refresh().catch((e) => notify(e.message, "error")),
        );
        $("selectedZombie")?.addEventListener("change", updateSelection);
        $("zombies")?.addEventListener("click", (e) => {
            const button = e.target.closest(".choose-zombie");
            if (!button) return;
            const id = button.dataset.zombieId;
            if (ids.includes(id)) {
                $("selectedZombie").value = id;
                updateSelection();
            }
        });
        $("myZombie")?.addEventListener("change", () =>
            refresh().catch((e) => notify(e.message, "error")),
        );
        $("inspectEnemy")?.addEventListener("click", () =>
            inspect().catch((e) => notify(e.message, "error")),
        );
        onForm("publicZombieForm", async () => {
            $("publicZombieResult").innerHTML = core.renderZombie(
                await publicRead("zombies", core.requireId($("publicZombieId").value)),
                $("publicZombieId").value,
            );
            window.Lesson6Loom?.hydrate();
        });
        onForm("create", async () => {
            await refresh();
            if (ids.length > 0)
                throw Error(
                    "Esta cuenta ya tiene un zombi. El contrato original solo permite crear el primero mediante createRandomZombie. Cambia a otra cuenta Hardhat para crear uno nuevo.",
                );
            const name = $("name").value.trim();
            if (!name) throw Error("Introduce un nombre.");
            try {
                await send("createRandomZombie", [name]);
            } catch (err) {
                if (ids.length > 0 && /revert|opcode|gas|reason string/i.test(String(err.message)))
                    throw Error(
                        "El contrato original permite crear un zombi inicial por cuenta. Selecciona otra cuenta Hardhat en la parte superior para crear otro. No hace falta modificar Solidity. Detalle: " +
                            err.message,
                    );
                throw err;
            }
        });
        onForm("levelup", () => send("levelUp", [currentZombieId()], core.feeToWei(web3)));
        onForm("renameZombie", () =>
            send("changeName", [currentZombieId(), $("newName").value.trim()]),
        );
        onForm("changeDna", () =>
            send("changeDna", [currentZombieId(), core.requireId($("newDna").value)]),
        );
        onForm("transferZombie", () =>
            send("transferFrom", [
                account,
                core.requireAddress($("transferTo").value.trim()),
                currentZombieId(),
            ]),
        );
        onForm("approveZombie", () =>
            send("approve", [core.requireAddress($("approveTo").value.trim()), currentZombieId()]),
        );
        onForm("battle", () => fight());
        $("advanceTime")?.addEventListener("click", async () => {
            try {
                if (!localMode)
                    throw Error("Esta herramienta solo funciona con una cuenta local Hardhat.");
                await rpc("evm_increaseTime", [86401]);
                await rpc("evm_mine", []);
                notify(
                    "Tiempo de Hardhat avanzado 1 día. Puedes volver a intentar el combate.",
                    "success",
                );
                $("chainCombatStatus").textContent = "Cooldown avanzado 1 día (solo Hardhat local)";
            } catch (e) {
                notify(e.message, "error");
            }
        });
        window.ethereum?.on?.("accountsChanged", () => {
            if (localMode) return;
            account = null;
            contract = null;
            ids = [];
            zombies = [];
            $("account").textContent = "Sin conectar";
            $("connectionDot").classList.remove("connected");
            $("zombies").innerHTML = '<div class="empty">Conecta MetaMask de nuevo.</div>';
            notify("Cuenta modificada; reconecta MetaMask");
        });
        window.ethereum?.on?.("chainChanged", () => {
            if (!localMode) location.reload();
        });
    }
    document.addEventListener("DOMContentLoaded", bind);
})();
