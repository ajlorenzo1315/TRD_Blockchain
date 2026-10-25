(function () {
  "use strict";
  let web3;
  let contract;
  let account;
  let transferSubscription;
  const $ = (id) => document.getElementById(id);
  const status = (message) => { $("txStatus").textContent = String(message); };

  async function refresh() {
    if (!account || !contract) return;
    const ids = await contract.methods.getZombiesByOwner(account).call();
    const zombies = await Promise.all(ids.map((id) => contract.methods.zombies(id).call()));
    $("zombies").innerHTML = zombies.map(Lesson6Core.renderZombie).join("");
  }

  async function connect() {
    if (!window.ethereum) throw new Error("Instala MetaMask y selecciona tu red local");
    if (!window.Web3) throw new Error("No se ha cargado Web3.js");
    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts.length) throw new Error("No hay ninguna cuenta conectada");
    account = Lesson6Core.requireAddress(accounts[0]);
    $("account").textContent = account;
    contract = new web3.eth.Contract(window.LESSON6_ABI, Lesson6Core.requireAddress(window.LESSON6_ADDRESS));
    await refresh();
    try {
      if (transferSubscription && transferSubscription.unsubscribe) await transferSubscription.unsubscribe();
      transferSubscription = contract.events.Transfer({ filter: { _to: account } })
        .on("data", () => refresh().catch((err) => status(err.message)))
        .on("error", (err) => status("Suscripción no disponible: " + err.message));
    } catch (err) { status("Eventos en tiempo real no disponibles; usa Actualizar"); }
  }

  async function send(method, value) {
    if (!account || !contract) throw new Error("Conecta MetaMask primero");
    status("Esperando confirmación en MetaMask...");
    const receipt = await method.send({ from: account, ...(value ? { value } : {}) });
    status("Transacción confirmada: " + receipt.transactionHash);
    await refresh();
    return receipt;
  }

  function bind() {
    $("connect").addEventListener("click", () => connect().catch((e) => status(e.message)));
    $("refresh").addEventListener("click", () => refresh().catch((e) => status(e.message)));
    $("create").addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await send(contract.methods.createRandomZombie($("name").value)); }
      catch (err) { status(err.message); }
    });
    $("levelup").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await send(contract.methods.levelUp($("zombieId").value), Lesson6Core.feeToWei(web3));
      } catch (err) { status(err.message); }
    });
    $("feed").addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await send(contract.methods.feedOnKitty($("feedZombieId").value, $("kittyId").value)); }
      catch (err) { status(err.message); }
    });
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on("accountsChanged", () => { account = undefined; $("account").textContent = "Sin conectar"; $("zombies").textContent = ""; status("La cuenta ha cambiado: conecta de nuevo"); });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }
  window.addEventListener("DOMContentLoaded", bind);
})();
