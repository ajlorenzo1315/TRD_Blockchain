(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const actionNames = ['⬆ Subir nivel','✏ Cambiar nombre','🧬 Cambiar ADN','📦 Transferir NFT','✓ Aprobar transferencia'];
  const actions = Array.from(document.querySelectorAll('.selected-actions form'));
  const slider = $('actionSlider');
  function showAction(index) {
    const n = Math.min(actionNames.length - 1, Math.max(0, Number(index) || 0));
    slider.value = String(n); $('actionName').textContent = actionNames[n];
    actions.forEach((form, i) => { form.hidden = i !== n; });
    document.querySelectorAll('[data-action]').forEach(b => { b.setAttribute('aria-pressed', String(Number(b.dataset.action) === n)); });
  }
  slider?.addEventListener('input', () => showAction(slider.value));
  $('actionPills')?.addEventListener('click', e => { const b = e.target.closest('[data-action]'); if (b) showAction(b.dataset.action); });
  showAction(0);
  const panes = {simulation: $('demo'), chain: $('arena')};
  document.querySelectorAll('[data-battle-mode]').forEach(b => b.addEventListener('click', () => {
    const selected = b.dataset.battleMode;
    Object.entries(panes).forEach(([mode, pane]) => { pane.hidden = mode !== selected; });
    document.querySelectorAll('[data-battle-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.battleMode === selected)));
  }));
})();
