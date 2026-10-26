// Ejecutar desde la raíz ethereum-local: node frontend/lesson-06-extended/ACTUALIZAR-CONTRATO.mjs 0xDIRECCION
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const address = process.argv[2];
if (!/^0x[a-fA-F0-9]{40}$/.test(address ?? '')) throw new Error('Pasa la dirección desplegada como argumento');
const here = path.dirname(fileURLToPath(import.meta.url));
const artifact = path.resolve(here, '../../artifacts/contracts/CryptoZombies/lesson-06/L6zombieownership.sol/Lesson6ZombieOwnership.json');
const abi = JSON.parse(fs.readFileSync(artifact, 'utf8')).abi;
for (const method of ['createRandomZombie','feedOnKitty','attack','getZombiesByOwner','zombies']) {
  if (!abi.some(x => x.type === 'function' && x.name === method)) throw new Error('Falta '+method+' en el artefacto');
}
fs.writeFileSync(path.join(here,'contract-config.js'), `window.LESSON6_ADDRESS = ${JSON.stringify(address)};\nwindow.LESSON6_ABI = ${JSON.stringify(abi,null,2)};\n`);
console.log('ABI y dirección actualizados en', here);
