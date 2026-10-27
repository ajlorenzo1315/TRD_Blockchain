import { expect } from 'chai';
import hre from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

const { ethers } = await hre.network.connect();

const VARIANTS = ['Base', 'Cache', 'Errors', 'CacheErrors'];
const results = [];
const asNum = (x) => Number(x);
async function measured(variant, operation, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  results.push({ variant, operation, gas: asNum(receipt.gasUsed) });
  return receipt;
}
async function fixture(variant) {
  const [admin, lab, distributor, pharmacy, attacker] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(`GasLab${variant}`);
  const c = await factory.deploy();
  const deployment = await c.deploymentTransaction().wait();
  results.push({ variant, operation: 'deploy', gas: asNum(deployment.gasUsed) });
  const code = await ethers.provider.getCode(await c.getAddress());
  results.push({ variant, operation: 'runtime_bytecode_bytes', gas: (code.length - 2) / 2 });
  await (await c.asignarRol(lab.address, 1)).wait();
  await (await c.asignarRol(distributor.address, 2)).wait();
  await (await c.asignarRol(pharmacy.address, 3)).wait();
  return { c, admin, lab, distributor, pharmacy, attacker };
}

describe('Gas Lab: equivalencia funcional y mediciones', function () {
  for (const variant of VARIANTS) {
    it(`variante ${variant}`, async function () {
      const { c, admin, lab, distributor, pharmacy, attacker } = await fixture(variant);
      await expect(c.connect(attacker).registrarLote('Falso', 'Falso')).to.be.reverted;
      await measured(variant, 'register_1', c.connect(lab).registrarLote('Paracetamol', 'Lab A'));
      expect((await c.consultarLote(1)).propietario).to.equal(lab.address);
      await measured(variant, 'register_2', c.connect(lab).registrarLote('Ibuprofeno', 'Lab B'));
      await expect(c.connect(lab).proponerTransferencia(1, pharmacy.address)).to.be.reverted;
      await measured(variant, 'propose_lab_to_dist', c.connect(lab).proponerTransferencia(1, distributor.address));
      await expect(c.connect(attacker).aceptarTransferencia(1)).to.be.reverted;
      await measured(variant, 'accept_lab_to_dist', c.connect(distributor).aceptarTransferencia(1));
      expect((await c.consultarLote(1)).propietario).to.equal(distributor.address);
      await measured(variant, 'propose_dist_to_pharm', c.connect(distributor).proponerTransferencia(1, pharmacy.address));
      await measured(variant, 'accept_dist_to_pharm', c.connect(pharmacy).aceptarTransferencia(1));
      expect((await c.consultarLote(1)).propietario).to.equal(pharmacy.address);
      expect(await c.totalMovimientos(1)).to.equal(5n);
      await measured(variant, 'pause', c.connect(admin).pausar());
      await expect(c.connect(lab).registrarLote('Bloqueado', 'Lab')).to.be.reverted;
      await measured(variant, 'resume', c.connect(admin).reanudar());
      await measured(variant, 'deactivate', c.connect(admin).desactivarLote(1));
      expect((await c.consultarLote(1)).activo).to.equal(false);
    });
  }
  after(function () {
    const dir = path.join(process.cwd(), 'gas-reports');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'gas-experiments.csv');
    fs.writeFileSync(file, 'variant,operation,gas\n' + results.map(r => `${r.variant},${r.operation},${r.gas}`).join('\n') + '\n');
    console.log(`\nInforme generado: ${file}`);
    const baseline = new Map(results.filter(r => r.variant === 'Base').map(r => [r.operation, r.gas]));
    console.log('\nVariante | Operacion | Gas | Diferencia respecto a Base (%)');
    for (const r of results) {
      const b = baseline.get(r.operation);
      console.log(`${r.variant} | ${r.operation} | ${r.gas} | ${b ? ((b-r.gas)/b*100).toFixed(2) : 'N/A'}`);
    }
  });
});
