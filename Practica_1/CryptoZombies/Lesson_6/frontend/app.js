/* LECCION 6 - CAPITULOS 1-9: Web3.js, MetaMask, call/send, pagos y eventos. */
(function () {
  "use strict";
  // LECCION 6 - CAPITULO 1: El navegador ejecuta JavaScript.
  // Web3.js actúa como puente entre esta página y el contrato Ethereum.
  // Este frontend no modifica la lógica del contrato: solamente la invoca.
  let web3;
  // LECCION 6 - CAPITULO 3: contract representa la dirección + ABI.
  // account representa la cuenta de MetaMask que firma transacciones.
  let contract;
  let account;
  let transferSubscription;
  const $ = (id) => document.getElementById(id);
  const status = (message) => { $("txStatus").textContent = String(message); };

  async function refresh() {
    if (!account || !contract) return;
    // CAPITULO 4: call() solo lee, no requiere firma ni consume gas de usuario.
    // LECCION 6 - CAPITULO 6, PASO 1:
    // Primero consultamos los IDs de los zombis pertenecientes a la cuenta.
    // El contrato devuelve, por ejemplo, [0, 3, 8].
    const ids = await contract.methods.getZombiesByOwner(account).call();
    // LECCION 6 - CAPITULO 6, PASO 2:
    // Por cada ID, recuperamos name, dna, level, readyTime,
    // winCount y lossCount. Promise.all permite agrupar consultas.
    const zombies = await Promise.all(ids.map((id) => contract.methods.zombies(id).call()));
    // CAPITULO 6: pintar los datos del ejército evitando inyectar HTML no confiable.
    $("zombies").innerHTML = zombies.map(Lesson6Core.renderZombie).join("");
  }

  async function connect() {
    // CAPITULO 2: el proveedor EIP-1193 lo expone MetaMask como window.ethereum.
    if (!window.ethereum) throw new Error("Instala MetaMask y selecciona tu red local");
    if (!window.Web3) throw new Error("No se ha cargado Web3.js");
    web3 = new Web3(window.ethereum);
    // LECCION 6 - CAPITULO 5: MetaMask muestra un permiso al usuario.
    // NO se deben extraer ni almacenar claves privadas en el frontend.
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts.length) throw new Error("No hay ninguna cuenta conectada");
    account = Lesson6Core.requireAddress(accounts[0]);
    $("account").textContent = account;
    // CAPITULO 3: dirección y ABI deben corresponder al contrato desplegado.
    contract = new web3.eth.Contract(window.LESSON6_ABI, Lesson6Core.requireAddress(window.LESSON6_ADDRESS));
    await refresh();
    // CAPITULO 9: escuchar Transfer en redes que admitan suscripciones.
    // Si el proveedor HTTP no las soporta, la interfaz sigue funcionando con refresh.
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
    // CAPITULO 7: send() escribe en Ethereum y requiere firma y gas.
    // LECCION 6 - CAPITULO 7:
    // El usuario firma la operación; el nodo la incluye en un bloque.
    // Si es payable, "value" expresa la cantidad de wei enviados.
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
        // CAPITULO 8: 0.001 ETH expresados en wei, sin números de coma flotante.
        await send(contract.methods.levelUp($("zombieId").value), Lesson6Core.feeToWei(web3));
      } catch (err) { status(err.message); }
    });
    $("feed").addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await send(contract.methods.feedOnKitty($("feedZombieId").value, $("kittyId").value)); }
      catch (err) { status(err.message); }
    });
    // LECCION 6 - CAPITULO 5:
    // Al cambiar de cuenta ya no debemos mostrar zombis de la cuenta anterior.
    // Al cambiar de red, el contrato puede no existir en esa cadena.
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on("accountsChanged", () => { account = undefined; $("account").textContent = "Sin conectar"; $("zombies").textContent = ""; status("La cuenta ha cambiado: conecta de nuevo"); });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }
  window.addEventListener("DOMContentLoaded", bind);
})();
