import { expect } from 'chai';
import hre from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

// Hardhat 3 + @nomicfoundation/hardhat-ethers + Mocha.
const { ethers } = await hre.network.connect();
const report = [];
const labels = ['base', 'optimizada'];
const contracts = ['PharmaBase', 'PharmaGasOptimizada'];

async function deploy(index) {
  const [admin, lab, dist, pharmacy, attacker] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(contracts[index]);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const code = await ethers.provider.getCode(await contract.getAddress());
  report.push({ version: labels[index], operacion: 'bytecode_bytes', valor: (code.length - 2) / 2 });
  for (const [who, role] of [[lab, 1], [dist, 2], [pharmacy, 3]]) {
    await (await contract.connect(admin).asignarRol(who.address, role)).wait();
  }
  return { contract, admin, lab, dist, pharmacy, attacker };
}
async function mustRevert(action) {
  let failed = false;
  try { await (await action()).wait(); } catch { failed = true; }
  expect(failed).to.equal(true);
}
async function gas(version, operation, txPromise) {
  const receipt = await (await txPromise).wait();
  report.push({ version, operacion: operation, valor: Number(receipt.gasUsed) });
}

for (let i = 0; i < contracts.length; i++) {
  describe(`PharmaChain gas ${labels[i]}`, function () {
    it('ejecuta registro, transferencia, cancelacion y desactivacion', async function () {
      const { contract: c, admin, lab, dist, pharmacy } = await deploy(i);
      const version = labels[i];
      await gas(version, 'registro_1', c.connect(lab).registrarLote('Paracetamol', 'Lab A'));
      expect((await c.consultarLote(1)).propietario).to.equal(lab.address);
      expect(await c.totalMovimientos(1)).to.equal(1n);
      await gas(version, 'propuesta_lab_dist', c.connect(lab).proponerTransferencia(1, dist.address));
      await gas(version, 'aceptacion_lab_dist', c.connect(dist).aceptarTransferencia(1));
      expect((await c.consultarLote(1)).propietario).to.equal(dist.address);
      await gas(version, 'propuesta_dist_farm', c.connect(dist).proponerTransferencia(1, pharmacy.address));
      await gas(version, 'cancelacion_dist', c.connect(dist).cancelarTransferencia(1));
      expect((await c.transferencias(1)).pendiente).to.equal(false);
      await gas(version, 'desactivar_sin_pendiente', c.connect(admin).desactivarLote(1));
      expect((await c.consultarLote(1)).activo).to.equal(false);
      expect(await c.totalMovimientos(1)).to.equal(5n);
    });
    it('desactiva con transferencia pendiente', async function () {
      const { contract: c, admin, lab, dist } = await deploy(i);
      await (await c.connect(lab).registrarLote('Ibuprofeno', 'Lab B')).wait();
      await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
      await gas(labels[i], 'desactivar_con_pendiente', c.connect(admin).desactivarLote(1));
      expect((await c.transferencias(1)).pendiente).to.equal(false);
    });
    it('mantiene permisos, validaciones y pausa', async function () {
      const { contract: c, admin, lab, dist, pharmacy, attacker } = await deploy(i);
      await mustRevert(() => c.connect(attacker).registrarLote('X', 'Y'));
      await mustRevert(() => c.connect(lab).registrarLote('', 'Y'));
      await mustRevert(() => c.connect(lab).registrarLote('X', ''));
      await (await c.connect(lab).registrarLote('X', 'Y')).wait();
      await mustRevert(() => c.connect(lab).proponerTransferencia(1, pharmacy.address));
      await (await c.connect(lab).proponerTransferencia(1, dist.address)).wait();
      await mustRevert(() => c.connect(attacker).aceptarTransferencia(1));
      await mustRevert(() => c.connect(attacker).cancelarTransferencia(1));
      await (await c.connect(admin).pausar()).wait();
      await mustRevert(() => c.connect(lab).registrarLote('Z', 'Y'));
      await (await c.connect(admin).reanudar()).wait();
      await (await c.connect(dist).aceptarTransferencia(1)).wait();
      expect((await c.consultarLote(1)).propietario).to.equal(dist.address);
    });
    it('registra varios lotes para medir ranuras nuevas', async function () {
      const { contract: c, lab } = await deploy(i);
      for (let j = 1; j <= 5; j++) {
        await gas(labels[i], `registro_${j}_serie`, c.connect(lab).registrarLote(`Farmaco ${j}`, 'Fabricante'));
      }
      expect(await c.totalLotes()).to.equal(5n);
    });
  });
}

after(function () {
  const dir = path.resolve('gas-reports');
  fs.mkdirSync(dir, { recursive: true });
  const rows = ['version,operacion,valor', ...report.map(r => `${r.version},${r.operacion},${r.valor}`)];
  fs.writeFileSync(path.join(dir, 'pharmachain-gas.csv'), rows.join('\n') + '\n');
  const base = new Map(report.filter(r => r.version === 'base').map(r => [r.operacion, r.valor]));
  console.log('\nOPERACION | BASE | OPTIMIZADA | AHORRO %');
  for (const r of report.filter(r => r.version === 'optimizada')) {
    const old = base.get(r.operacion);
    if (old !== undefined) console.log(`${r.operacion} | ${old} | ${r.valor} | ${((old-r.valor)/old*100).toFixed(2)}%`);
  }
  console.log(`CSV: ${path.join(dir, 'pharmachain-gas.csv')}`);
});
