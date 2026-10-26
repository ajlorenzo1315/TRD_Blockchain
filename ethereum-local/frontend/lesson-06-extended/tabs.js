(() => {
  'use strict';
  const activate = (name, updateHash = true) => {
    if (!document.getElementById('tab-' + name)) name = 'inicio';
    document.querySelectorAll('.game-tab').forEach(b => {
      const selected = b.dataset.tab === name;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.tab-page').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    if (updateHash) history.replaceState(null, '', '#' + name);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => activate(b.dataset.go)));
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (document.getElementById('tab-' + id)) {e.preventDefault(); activate(id);}
    }));
    if (window.Lesson6Core?.loomPortrait) {
      const hero = document.getElementById('heroFigure');
      if (hero) { hero.innerHTML = window.Lesson6Core.loomPortrait('0306030019226000'); window.Lesson6Loom?.hydrate(hero); }
    }
    activate(location.hash.slice(1) || 'inicio', false);
  });
  window.Lesson6Tabs = {activate};
})();
