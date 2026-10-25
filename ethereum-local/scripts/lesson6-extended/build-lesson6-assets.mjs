import fs from 'node:fs';
import path from 'node:path';
const repo = process.cwd();
const dir = path.join(repo,'..','external', 'zombie-char-component', 'zombieparts');
const dest = path.join(repo, 'frontend', 'lesson-06-extended', 'zombie-assets.js');
if (!fs.existsSync(dir)) {
  console.error('Falta el submódulo: external/zombie-char-component/zombieparts');
  process.exitCode = 1;
} else {
  const files = [];
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const abs = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(png|svg|webp|jpe?g)$/i.test(entry.name)) {
        // El servidor debe arrancar desde la raíz del repositorio.
        files.push('/' + path.relative(repo, abs).split(path.sep).map(encodeURIComponent).join('/'));
      }
    }
  }
  walk(dir);
  fs.writeFileSync(dest, 'window.LESSON6_ASSETS = ' + JSON.stringify(files.sort(), null, 2) + ';\n');
  console.log(`Encontradas ${files.length} imágenes del submódulo. Manifest: ${dest}`);
}
