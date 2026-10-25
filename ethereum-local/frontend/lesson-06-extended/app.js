(function () {
  'use strict';
  const core = window.Lesson6Core;
  const $ = (id) => document.getElementById(id);
  let web3, contract, account, subscription;
  const state = { ids: [], zombies: [], busy: false };
  function message(text, kind = 'info') { $('txStatus').textContent = String(text); $('txStatus').dataset.kind = kind; }
  function needMethod(name) {
    if (!contract || typeof contract.methods[name] !== 'function') throw new Error(`El ABI no incluye ${name}. Regenera contract-config.js con el contrato Lesson6ZombieOwnership.`);
    return contract.methods[name];
  }
  async function readZombie(id) { return needMethod('zombies')(core.requireId(id)).call(); }
  async function refresh() {
    if (!account || !contract) return;
    const ids = await needMethod('getZombiesByOwner')(account).call();
    const zombies = await Promise.all(ids.map(readZombie));
    state.ids = ids.map(String); state.zombies = zombies;
    $('zombies').innerHTML = zombies.length ? zombies.map((z,i) => core.renderZombie(z, state.ids[i])).join('') : '<div class="empty">Todavía no tienes zombis. Crea tu primer personaje.</div>';
    $('armyCount').textContent = String(ids.length);
    const victories = zombies.reduce((acc,z) => acc + BigInt(core.normalizeZombie(z).winCount), 0n);
    $('victoryCount').textContent = String(victories);
    $('myZombie').innerHTML = ids.map((id,i) => `<option value="${core.escapeHtml(id)}">#${core.escapeHtml(id)} · ${core.escapeHtml(core.normalizeZombie(zombies[i]).name)}</option>`).join('');
    $('myZombie').disabled = ids.length === 0;
    $('attackBtn').disabled = ids.length === 0;
    $('network').textContent = `Cadena ${await web3.eth.getChainId()}`;
  }
  async function connect() {
    if (!window.ethereum) throw new Error('Instala MetaMask para utilizar la dApp');
    if (!window.Web3) throw new Error('Web3.js no se ha cargado');
    if (!window.LESSON6_ABI?.length) throw new Error('Falta el ABI. Ejecuta el script export-lesson-06-abi.mjs');
    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) throw new Error('MetaMask no ha autorizado ninguna cuenta');
    account = core.requireAddress(accounts[0]);
    contract = new web3.eth.Contract(window.LESSON6_ABI, core.requireAddress(window.LESSON6_ADDRESS));
    $('account').textContent = `${account.slice(0,6)}…${account.slice(-4)}`;
    $('account').title = account;
    $('connectionDot').classList.add('connected');
    message('Conectado. Las batallas ejecutan transacciones reales en el contrato.', 'success');
    await refresh();
    if (subscription?.unsubscribe) { try { await subscription.unsubscribe(); } catch (_) {} }
    try {
      subscription = contract.events.Transfer({ filter: { _to: account } }).on('data', () => refresh().catch(e => message(e.message, 'error')));
    } catch (_) { /* El proveedor HTTP puede no ofrecer suscripciones; Actualizar funciona. */ }
  }
  async function send(method, value) {
    if (!account || !contract) throw new Error('Conecta MetaMask primero');
    if (state.busy) throw new Error('Ya hay una transacción en curso');
    state.busy = true;
    try {
      message('Confirma la transacción en MetaMask…');
      const receipt = await method.send({ from: account, ...(value ? { value } : {}) });
      if (receipt.status === false || receipt.status === 0 || receipt.status === 0n) throw new Error('La transacción ha revertido');
      message(`Transacción confirmada: ${receipt.transactionHash}`, 'success');
      await refresh();
      return receipt;
    } finally { state.busy = false; }
  }
  async function attack() {
    if (!account) throw new Error('Conecta MetaMask primero');
    const attackerId = core.requireId($('myZombie').value);
    const defenderId = core.requireId($('enemyId').value);
    if (attackerId === defenderId) throw new Error('Selecciona un zombi rival distinto');
    const [beforeA, beforeD, owner] = await Promise.all([
      readZombie(attackerId), readZombie(defenderId), needMethod('ownerOf')(defenderId).call()
    ]);
    if (owner.toLowerCase() === account.toLowerCase()) throw new Error('El rival debe pertenecer a otra cuenta');
    $('battleResult').textContent = 'Combate pendiente de confirmación…';
    // No se simula el resultado: attack() ejecuta el consenso y la aleatoriedad del contrato.
    try {
      const receipt = await send(needMethod('attack')(attackerId, defenderId));
      const [afterA, afterD] = await Promise.all([readZombie(attackerId), readZombie(defenderId)]);
      const outcome = core.battleOutcome(beforeA, afterA, beforeD, afterD);
      $('battleResult').textContent = outcome === 'victoria' ? '🏆 ¡Victoria real confirmada en blockchain!' :
        outcome === 'derrota' ? '💀 Derrota registrada en blockchain.' : 'Transacción confirmada; comprueba las estadísticas.';
      $('battleResult').dataset.outcome = outcome;
      $('battleTx').textContent = receipt.transactionHash;
    } catch (err) {
      $('battleResult').textContent = 'Combate no confirmado: ' + err.message;
      $('battleResult').dataset.outcome = 'error';
      throw err;
    }
  }
  async function inspectEnemy() {
    const id = core.requireId($('enemyId').value);
    const [z, owner] = await Promise.all([readZombie(id), needMethod('ownerOf')(id).call()]);
    $('enemyPreview').innerHTML = core.renderZombie(z, id) + `<p class="enemy-owner">Propietario: ${core.escapeHtml(owner)}</p>`;
  }
  function bind() {
    $('connect').addEventListener('click', () => connect().catch(e => message(e.message,'error')));
    $('refresh').addEventListener('click', () => refresh().catch(e => message(e.message,'error')));
    $('create').addEventListener('submit', async e => { e.preventDefault(); try { await send(needMethod('createRandomZombie')($('name').value.trim())); } catch(err) { message(err.message,'error'); } });
    $('levelup').addEventListener('submit', async e => { e.preventDefault(); try { await send(needMethod('levelUp')(core.requireId($('zombieId').value)),core.feeToWei(web3)); } catch(err) { message(err.message,'error'); } });
    $('feed').addEventListener('submit', async e => { e.preventDefault(); try { await send(needMethod('feedOnKitty')(core.requireId($('feedZombieId').value),core.requireId($('kittyId').value))); } catch(err) { message(err.message,'error'); } });
    $('battle').addEventListener('submit', e => { e.preventDefault(); attack().catch(err => message(err.message,'error')); });
    $('inspectEnemy').addEventListener('click', () => inspectEnemy().catch(err => message(err.message,'error')));
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', () => { account = undefined; contract = undefined; state.ids = []; $('account').textContent = 'Sin conectar'; $('connectionDot').classList.remove('connected'); $('zombies').textContent = ''; $('myZombie').innerHTML = ''; message('Cuenta modificada: vuelve a conectar'); });
      window.ethereum.on('chainChanged', () => location.reload());
    }
  }
  window.addEventListener('DOMContentLoaded', bind);
})();
