import { expect } from 'chai';
import hre from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

// Hardhat 3 + @nomicfoundation/hardhat-ethers + Mocha. No chai-matchers required.
const { ethers } = await hre.network.connect();
const stages = ['V0Base','V1Roles','V2Errores','V3Storage','V4Unchecked','V5Combinada','V6SinId',
  'V7LotePacked','V8HistorialPacked','V9TransferenciaCompacta','V10PackingCombinado',
  'V11SoloEventos','V12EventosCompacta'];
const families = ['Manual','OZ'];
const report = [];
const snapshot = new Map();
let accounts;
const eventOnly = v => v.includes('Eventos');
const noId = v => !['V0Base','V1Roles','V2Errores','V3Storage','V4Unchecked','V5Combinada'].includes(v);
const key = (family,v,operation) => `${family}:${v}:${operation}`;
function record(family, version, operation, gas, kind='tx') {
  report.push({family,version,operation,kind,gas:gas.toString()});
}
async function success(p) {
  const tx=await p;
  const r=await tx.wait();
  expect(r.status).to.equal(1);
  return r;
}
async function measure(f,v,operation,p) {
  const r=await success(p);
  record(f,v,operation,r.gasUsed);
  return r;
}
async function fails(fn,label='expected revert') {
  let failed=false;
  try {const tx=await fn(); await tx.wait();} catch {failed=true;}
  expect(failed,label).to.equal(true);
}
async function deployed(f,v) {
  const contractName=f==='Manual' ? `Pharma${v}` : `PharmaOZ${v}`;
  const fac=await ethers.getContractFactory(contractName);
  const c=await fac.connect(accounts[0]).deploy();
  const r=await success(c.deploymentTransaction());
  record(f,v,'deploy',r.gasUsed,'deployment');
  const code=await ethers.provider.getCode(await c.getAddress());
  record(f,v,'runtime_bytes',BigInt((code.length-2)/2),'bytes');
  return c;
}
async function assign(f,c,addr,role) {
  if(f==='Manual') return success(c.asignarRol(addr,role));
  const name=['','LABORATORIO_ROLE','DISTRIBUIDOR_ROLE','FARMACIA_ROLE'][role];
  return success(c.grantRole(await c[name](),addr));
}
async function setup(f,v) {
  const c=await deployed(f,v);
  for(let i=1;i<=3;i++) await measure(f,v,`role_${i}`, f==='Manual'
    ? c.asignarRol(accounts[i].address,i)
    : c.grantRole(await c[['','LABORATORIO_ROLE','DISTRIBUIDOR_ROLE','FARMACIA_ROLE'][i]](),accounts[i].address));
  return c;
}
async function register(c,name='Paracetamol',maker='Lab A') {
  return success(c.connect(accounts[1]).registrarLote(name,maker));
}
async function state(c,id) {
  const x=await c.consultarLote(id);
  return {name:x.nombre, maker:x.fabricante, owner:x.propietario.toLowerCase(),active:x.activo,stamp:BigInt(x.fechaRegistro)};
}
async function pending(c,id) {
  const t=await c.transferencias(id);
  return {origin:t.origen.toLowerCase(),dest:t.destino.toLowerCase(),pending:t.pendiente};
}
function snapshotState(f,v,caseName,value) {
  const k=`${f}:${caseName}`;
  const normalized=JSON.stringify(value,(k,x)=>typeof x==='bigint'?x.toString():x);
  if(v==='V0Base') snapshot.set(k,normalized);
  else if(snapshot.has(k)) expect(normalized,`${f} ${v} diverges from baseline for ${caseName}`).to.equal(snapshot.get(k));
}

before(async()=>{accounts=await ethers.getSigners();expect(accounts.length).to.be.greaterThan(4);});
for(const family of families) for(const version of stages) {
  describe(`GasLab EXT ${family} ${version}`,function(){
    this.timeout(180000);
    it('registro: ID, eventos, textos, timestamp, permisos, getters y gas',async()=>{
      const c=await setup(family,version);
      await measure(family,version,'register_first',c.connect(accounts[1]).registrarLote('Paracetamol','Lab A'));
      const x=await state(c,1);
      expect(x).to.include({name:'Paracetamol',maker:'Lab A',owner:accounts[1].address.toLowerCase(),active:true});
      expect(x.stamp).to.be.greaterThan(0n);
      expect(await c.totalLotes()).to.equal(1n);
      if(noId(version)) expect((await c.consultarLote(1)).id).to.equal(undefined);
      else expect((await c.consultarLote(1)).id).to.equal(1n);
      snapshotState(family,version,'first',{...x,stamp:'timestamp-checked'});
      await fails(()=>c.connect(accounts[4]).registrarLote('A','B'));
      await fails(()=>c.connect(accounts[1]).registrarLote('','B'));
      await fails(()=>c.connect(accounts[1]).registrarLote('A',''));
      await fails(()=>c.consultarLote(0));
      await fails(()=>c.consultarLote(2));
      expect(await c.totalLotes()).to.equal(1n);
    });
    it('custodia completa: proponer, aceptar, cancelar, roles y gas',async()=>{
      const c=await setup(family,version);
      await register(c);
      await fails(()=>c.connect(accounts[1]).proponerTransferencia(1,accounts[3].address),'no skipping lab->pharmacy');
      await fails(()=>c.connect(accounts[1]).proponerTransferencia(1,ethers.ZeroAddress));
      await fails(()=>c.connect(accounts[4]).proponerTransferencia(1,accounts[2].address));
      await measure(family,version,'propose_lab_dist',c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      expect((await pending(c,1)).pending).to.equal(true);
      await fails(()=>c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      await fails(()=>c.connect(accounts[4]).aceptarTransferencia(1));
      await measure(family,version,'accept_lab_dist',c.connect(accounts[2]).aceptarTransferencia(1));
      expect((await state(c,1)).owner).to.equal(accounts[2].address.toLowerCase());
      expect((await pending(c,1)).pending).to.equal(false);
      await fails(()=>c.connect(accounts[2]).aceptarTransferencia(1));
      await fails(()=>c.connect(accounts[2]).proponerTransferencia(1,accounts[1].address));
      await measure(family,version,'propose_dist_pharm',c.connect(accounts[2]).proponerTransferencia(1,accounts[3].address));
      await fails(()=>c.connect(accounts[4]).cancelarTransferencia(1));
      await measure(family,version,'cancel_dist_pharm',c.connect(accounts[2]).cancelarTransferencia(1));
      expect((await pending(c,1)).pending).to.equal(false);
      await measure(family,version,'repropose_dist_pharm',c.connect(accounts[2]).proponerTransferencia(1,accounts[3].address));
      await measure(family,version,'accept_dist_pharm',c.connect(accounts[3]).aceptarTransferencia(1));
      expect((await state(c,1)).owner).to.equal(accounts[3].address.toLowerCase());
      snapshotState(family,version,'final-owner',{owner:(await state(c,1)).owner,pending:(await pending(c,1)).pending});
      if(!eventOnly(version)) {
        expect(await c.totalMovimientos(1)).to.equal(7n);
        const mov=await c.consultarMovimiento(1,2);
        expect(mov.origen.toLowerCase()).to.equal(accounts[1].address.toLowerCase());
        expect(mov.destino.toLowerCase()).to.equal(accounts[2].address.toLowerCase());
        expect(BigInt(mov.fecha)).to.be.greaterThan(0n);
        await fails(()=>c.consultarMovimiento(1,100));
      }
    });
    it('cancelación administrativa y desactivación con transferencia pendiente',async()=>{
      const c=await setup(family,version);
      await register(c);
      await success(c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      await measure(family,version,'cancel_admin',c.cancelarTransferencia(1));
      expect((await pending(c,1)).pending).to.equal(false);
      await success(c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      await fails(()=>c.connect(accounts[4]).desactivarLote(1));
      await measure(family,version,'deactivate_pending',c.desactivarLote(1));
      expect((await state(c,1)).active).to.equal(false);
      expect((await pending(c,1)).pending).to.equal(false);
      await fails(()=>c.desactivarLote(1));
      await fails(()=>c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      if(!eventOnly(version)) expect(await c.totalMovimientos(1)).to.equal(4n);
    });
    it('pausa, reanudación y cancelación administrativa durante pausa',async()=>{
      const c=await setup(family,version);
      await register(c);
      await success(c.connect(accounts[1]).proponerTransferencia(1,accounts[2].address));
      await fails(()=>c.connect(accounts[4]).pausar());
      await measure(family,version,'pause',c.pausar());
      await fails(()=>c.pausar());
      await fails(()=>c.connect(accounts[1]).registrarLote('X','Y'));
      await fails(()=>c.connect(accounts[2]).aceptarTransferencia(1));
      // Baseline explicitly permits cancel and deactivate while paused.
      await measure(family,version,'cancel_while_paused',c.cancelarTransferencia(1));
      await measure(family,version,'resume',c.reanudar());
      await fails(()=>c.reanudar());
      await fails(()=>c.connect(accounts[4]).reanudar());
    });
    it('registro en serie y longitudes límite para cadenas',async()=>{
      const c=await setup(family,version);
      for(const n of [1,31,32,33,64,128,256]) {
        const name='X'.repeat(n);
        await measure(family,version,`register_len_${n}`,c.connect(accounts[1]).registrarLote(name,'Y'));
        const id=await c.totalLotes();
        expect((await state(c,id)).name).to.equal(name);
      }
      expect(await c.totalLotes()).to.equal(7n);
    });
    it('asignación de roles, revocación y seguridad de autorización',async()=>{
      const c=await setup(family,version);
      await fails(()=>family==='Manual' ? c.connect(accounts[4]).asignarRol(accounts[4].address,1) : c.connect(accounts[4]).grantRole(ethers.ZeroHash,accounts[4].address));
      if(family==='Manual') {
        await fails(()=>c.asignarRol(ethers.ZeroAddress,1));
        await fails(()=>c.asignarRol(accounts[0].address,1));
        await success(c.asignarRol(accounts[4].address,1));
        await success(c.asignarRol(accounts[4].address,0));
        expect(await c.roles(accounts[4].address)).to.equal(0n);
      } else {
        const role=await c.LABORATORIO_ROLE();
        await success(c.grantRole(role,accounts[4].address));
        expect(await c.hasRole(role,accounts[4].address)).to.equal(true);
        await success(c.revokeRole(role,accounts[4].address));
        expect(await c.hasRole(role,accounts[4].address)).to.equal(false);
        await fails(()=>c.connect(accounts[4]).grantRole(role,accounts[4].address));
      }
    });
  });
}
after(()=>{
  const dir=path.resolve('gas-reports');fs.mkdirSync(dir,{recursive:true});
  const run=(process.env.GAS_RUN_LABEL||'extended').replace(/[^a-zA-Z0-9_-]/g,'_');
  const file=path.join(dir,`pharmachain-${run}.csv`);
  fs.writeFileSync(file,['family,version,operation,kind,gas',...report.map(x=>[x.family,x.version,x.operation,x.kind,x.gas].join(','))].join('\n')+'\n');
  fs.writeFileSync(path.join(dir,`pharmachain-${run}.json`),JSON.stringify(report,null,2));
  console.log(`GasLab extended report: ${file}; ${report.length} measurements`);
});
