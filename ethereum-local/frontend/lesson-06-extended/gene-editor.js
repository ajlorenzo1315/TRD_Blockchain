(function () {
  'use strict';
  const ids = ['Head','Eyes','Shirt','Skin','EyeColor','Clothes'];
  const $ = id => document.getElementById(id);
  function read() { return Object.fromEntries(ids.map(id => [id, Number($('gene' + id).value)])); }
  function dnaOf(g) {
    const part = (n, len=2) => String(n).padStart(len, '0');
    const toPair = deg => Math.min(99, Math.round(deg / 360 * 100));
    // El ADN codifica elecciones mediante residuos y colores mediante pares decimales.
    return part(g.Head-1) + part(g.Eyes-1) + part(g.Shirt-1) +
      part(toPair(g.Skin)) + part(toPair(g.EyeColor)) + part(toPair(g.Clothes)) + '0000';
  }
  function update() {
    if (!window.Lesson6Core || typeof window.Lesson6Core.loomPortrait !== 'function') {
      $('genePreview').textContent = 'No se ha cargado el renderizador Loom. Comprueba app-core.js y recarga la página.';
      return;
    }
    const g = read(), dna = dnaOf(g);
    ids.forEach(id => { $('gene' + id + 'Value').textContent = g[id]; });
    $('geneDna').textContent = dna;
    $('genePreview').innerHTML = window.Lesson6Core.loomPortrait(dna, {
      head:g.Head, eyes:g.Eyes, shirt:g.Shirt,
      skin:g.Skin, eyeColor:g.EyeColor, clothes:g.Clothes
    });
    window.Lesson6Loom?.hydrate($('genePreview'));
  }
  window.addEventListener('DOMContentLoaded', () => {
    if (!$('genePreview')) return;
    ids.forEach(id => $('gene' + id).addEventListener('input', update));
    $('geneRandom').addEventListener('click', () => {
      ids.forEach(id => {
        const input = $('gene' + id);
        input.value = Math.floor(Math.random() * (Number(input.max)-Number(input.min)+1)) + Number(input.min);
      });
      update();
    });
    $('geneCopy').addEventListener('click', () => {
      const value = $('geneDna').textContent;
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(() => window.prompt('Copia el ADN:', value));
      else window.prompt('Copia el ADN:', value);
    });
    update();
  });
})();
