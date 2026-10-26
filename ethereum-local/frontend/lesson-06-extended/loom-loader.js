(function () {
  'use strict';
  function hydrate(root = document) {
    for (const portrait of root.querySelectorAll('.loom-portrait:not([data-hydrated])')) {
      portrait.dataset.hydrated = '1';
      const images = [...portrait.querySelectorAll('.loom-layer')];
      Promise.all(images.map(img => new Promise((resolve, reject) => {
        if (img.complete) return img.naturalWidth ? resolve() : reject(new Error('PNG no disponible'));
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', reject, { once: true });
      }))).then(() => portrait.classList.add('loom-loaded')).catch(() => {
        portrait.classList.add('loom-unavailable');
      });
    }
  }
  window.Lesson6Loom = { hydrate };
  window.addEventListener('DOMContentLoaded', () => {
    hydrate();
    new MutationObserver(() => hydrate()).observe(document.body, { childList: true, subtree: true });
  });
})();
