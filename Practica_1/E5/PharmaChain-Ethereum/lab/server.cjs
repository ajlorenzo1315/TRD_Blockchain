const express=require('express');
const cors=require('cors');
const fs=require('fs');
const path=require('path');
const {Web3}=require('web3');
const app=express();app.use(cors());app.use(express.json());
const root=path.resolve(__dirname,'..');
const rpc=process.env.RPC_URL||'http://127.0.0.1:8545';
const web3=new Web3(rpc);
const variants=require('./variants.json');
const names=variants.map(v=>v.id);
const ledger=[];const pending=new Map();
const asString=x=>typeof x==='bigint'?x.toString():x;
const serialize=x=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v));
const load=async(name)=>{
 if(!names.includes(name))throw Error('Contrato desconocido');
 const file=path.join(root,'build','contracts',name+'.json');
 if(!fs.existsSync(file))throw Error('Falta build/contracts: ejecuta npm run truffle:compile y npm run truffle:migrate');
 const art=JSON.parse(fs.readFileSync(file));const chain=String(await web3.eth.net.getId());
 const addr=art.networks?.[chain]?.address;
 if(!addr)throw Error('No desplegado en red '+chain+': ejecuta npm run truffle:migrate');
 const code=await web3.eth.getCode(addr);
 if(code==='0x')throw Error('No hay bytecode en '+addr+'. Reinicia la migración tras reiniciar Hardhat.');
 return {contract:new web3.eth.Contract(art.abi,addr),address:addr};
};
const fail=(res,e)=>{
 const raw=String(e?.cause?.message||e?.message||e);
 console.error('[PharmaChain API]',raw);
 const reason=/Error happened while trying to execute a function inside a smart contract/i.test(raw)
   ?'El contrato rechazó la operación. Comprueba que la cuenta tiene el rol correcto, que el lote existe y que no está pausado. Detalle: '+raw
   :raw;
 res.status(400).json({error:reason});
};
async function accounts(){return (await web3.eth.getAccounts()).map(a=>a.toLowerCase());}
async function send(name,from,method,args=[],label=method){
 const {contract,address}=await load(name);const known=await accounts();
 if(!known.includes(from.toLowerCase()))throw Error('La cuenta no pertenece al nodo local');
 if(typeof contract.methods[method]!=='function')throw Error('Función no disponible');
 const tx=contract.methods[method](...args);
 // Do not estimate and send rejected tx; show revert as an error without adding misleading gas.
 const estimate=await tx.estimateGas({from});
 const gasLimit=(BigInt(estimate)*125n/100n+10000n).toString();
 const receipt=await tx.send({from,gas:gasLimit});
 const block=await web3.eth.getBlock(receipt.blockNumber);
 const price=receipt.effectiveGasPrice||await web3.eth.getGasPrice();
 const gas=BigInt(receipt.gasUsed);const cost=gas*BigInt(price);
 const item={time:new Date().toISOString(),contract:name,action:label,method,from,to:address,txHash:receipt.transactionHash,block:String(receipt.blockNumber),gasUsed:gas.toString(),gasEstimate:String(estimate),gasPriceGwei:web3.utils.fromWei(String(price),'gwei'),costEth:web3.utils.fromWei(String(cost),'ether'),status:receipt.status===1n||receipt.status===true||receipt.status===1,blockTimestamp:String(block.timestamp)};
 ledger.unshift(item);if(ledger.length>500)ledger.pop();return item;
}
app.get('/api/status',async(req,res)=>{try{
 const chainId=String(await web3.eth.getChainId());const acc=await accounts();const contracts={};
 for(const n of names){try{contracts[n]=(await load(n)).address;}catch(e){contracts[n]=null;}}
 res.json({chainId,rpc,accounts:acc,contracts,transactions:ledger.length});
}catch(e){fail(res,e)}});
app.get('/api/variants',(req,res)=>res.json(variants));
app.get('/api/ledger',(req,res)=>res.json(ledger));
app.get('/api/lotes/:name',async(req,res)=>{try{
 const {contract}=await load(req.params.name);const total=Number(await contract.methods.totalLotes().call());
 const items=[];for(let i=1;i<=Math.min(total,200);i++){
 const l=await contract.methods.consultarLote(i).call();const t=await contract.methods.transferencias(i).call();
 items.push({id:i,nombre:l.nombre,fabricante:l.fabricante,propietario:l.propietario,activo:l.activo,pendiente:t.pendiente,destino:t.destino,fechaRegistro:String(l.fechaRegistro)});
 }res.json({total,items});
}catch(e){fail(res,e)}});
app.post('/api/action',async(req,res)=>{try{
 const {name,action,from,id,destino,nombre,fabricante,usuario,rol}=req.body;
 const allow={registrarLote:[nombre,fabricante],proponerTransferencia:[id,destino],aceptarTransferencia:[id],cancelarTransferencia:[id],desactivarLote:[id],asignarRol:[usuario,rol],pausar:[],reanudar:[]};
 if(!Object.hasOwn(allow,action))throw Error('Acción no permitida');
 if(action==='registrarLote'&&(!String(nombre||'').trim()||!String(fabricante||'').trim()))throw Error('Para registrar un medicamento debes indicar nombre y fabricante');
 if(['proponerTransferencia','aceptarTransferencia','cancelarTransferencia','desactivarLote'].includes(action)&&(!Number.isSafeInteger(Number(id))||Number(id)<1))throw Error('Selecciona un ID de lote válido');
 if(action==='asignarRol'&&!name.includes('Manuales'))throw Error('Usa grantRole para OpenZeppelin');
 res.json(await send(name,from,action,allow[action]));
}catch(e){fail(res,e)}});
app.post('/api/setup',async(req,res)=>{try{
 const {name}=req.body;const acc=await accounts();if(acc.length<4)throw Error('Se requieren 4 cuentas');
 const [admin,lab,dist,farm]=acc;const {contract}=await load(name);const result=[];
 if(name.includes('Manuales')){
 for(const [a,r] of [[lab,1],[dist,2],[farm,3]])result.push(await send(name,admin,'asignarRol',[a,r],'Configurar rol '+r));
 }else{
 for(const [a,r] of [[lab,'LABORATORIO_ROLE'],[dist,'DISTRIBUIDOR_ROLE'],[farm,'FARMACIA_ROLE']]){
 const role=await contract.methods[r]().call();result.push(await send(name,admin,'grantRole',[role,a],'Configurar '+r));
 }}res.json({roles:{admin,lab,dist,farm},transactions:result});
}catch(e){fail(res,e)}});
app.post('/api/scenario',async(req,res)=>{try{
 const {name}=req.body;const acc=await accounts();const [admin,lab,dist,farm]=acc;
 const {contract}=await load(name);const result=[];
 const total=Number(await contract.methods.totalLotes().call());
 result.push(await send(name,lab,'registrarLote',['Paracetamol demo '+(total+1),'Laboratorio Galicia'],'Registrar lote'));
 const id=total+1;
 result.push(await send(name,lab,'proponerTransferencia',[id,dist],'Proponer Lab → Distribuidor'));
 result.push(await send(name,dist,'aceptarTransferencia',[id],'Aceptar distribuidor'));
 result.push(await send(name,dist,'proponerTransferencia',[id,farm],'Proponer Distribuidor → Farmacia'));
 result.push(await send(name,farm,'aceptarTransferencia',[id],'Aceptar farmacia'));
 res.json({id,transactions:result});
}catch(e){fail(res,e)}});
app.post('/api/compare',async(req,res)=>{try{
 // Runs the SAME scenario on all deployed variants; requires roles configured on all.
 const results=[];for(const name of names){const acc=await accounts();const [admin,lab,dist,farm]=acc;
 const {contract}=await load(name);const id=Number(await contract.methods.totalLotes().call())+1;
 const operations=[['Registrar lote','registrarLote',['Comparacion '+id,'Lab Galicia'],lab],['Proponer L-D','proponerTransferencia',[id,dist],lab],['Aceptar D','aceptarTransferencia',[id],dist],['Proponer D-F','proponerTransferencia',[id,farm],dist],['Aceptar F','aceptarTransferencia',[id],farm]];
 for(const [label,method,args,from] of operations)results.push(await send(name,from,method,args,label));
 }res.json({results});
}catch(e){fail(res,e)}});
// Gas realmente consumido: agrupado por método, con muestras comparables del mismo escenario.
app.get('/api/benchmark/summary',(req,res)=>{
 const operations=['registrarLote','proponerTransferencia','aceptarTransferencia','cancelarTransferencia','desactivarLote'];
 const rows=variants.map(v=>({ ...v,operations:Object.fromEntries(operations.map(op=>{
  const samples=ledger.filter(x=>x.contract===v.id&&x.method===op&&x.status).map(x=>Number(x.gasUsed));
  return [op,{count:samples.length,last:samples[0]??null,average:samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):null}];
 }))}));
 res.json({rows,methodology:'GasUsed de recibos reales, agrupado por método. No compara escenarios distintos de forma controlada; para comparar usar /api/compare con roles configurados.',transactions:ledger.length});
});
app.get('/api/export.csv',(req,res)=>{
 const keys=['time','contract','action','from','txHash','block','gasUsed','gasEstimate','gasPriceGwei','costEth','status'];
 const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 res.type('text/csv').attachment('pharmachain-gas.csv').send([keys.join(','),...ledger.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'));
});


// Benchmark funcional on-chain. Cada ejecución modifica los contratos desplegados.
let suiteRunning=false;
let latestSuite=null;
const benchmarkOps=['registrarLote','proponerTransferencia','aceptarTransferencia','cancelarTransferencia','desactivarLote','pausar','reanudar'];
async function contractState(name,id){
 const {contract}=await load(name);
 const lot=await contract.methods.consultarLote(id).call();
 const transfer=await contract.methods.transferencias(id).call();
 return {nombre:lot.nombre,fabricante:lot.fabricante,propietario:String(lot.propietario).toLowerCase(),activo:Boolean(lot.activo),pendiente:Boolean(transfer.pendiente)};
}
async function suiteForVariant(name,round,acc){
 const [admin,lab,dist,farm]=acc;
 const {contract}=await load(name);
 const variant=variants.find(v=>v.id===name);
 const samples=[];
 const execute=async(operation,from,args,stage)=>{
  const tx=await send(name,from,operation,args,`Benchmark ${round}: ${stage}`);
  samples.push({operation,stage,gas:Number(tx.gasUsed),txHash:tx.txHash,block:tx.block});
 };
 // El benchmark configura roles antes de medir y evita que ese coste sesgue el flujo.
 if(variant.kind==='manual'){
  for(const [who,role] of [[lab,1],[dist,2],[farm,3]]){
   const current=await contract.methods.roles(who).call();
   if(Number(current)!==role)await send(name,admin,'asignarRol',[who,role],'Benchmark: preparación de rol');
  }
 }else{
  for(const [who,roleName] of [[lab,'LABORATORIO_ROLE'],[dist,'DISTRIBUIDOR_ROLE'],[farm,'FARMACIA_ROLE']]){
   const role=await contract.methods[roleName]().call();
   if(!await contract.methods.hasRole(role,who).call())await send(name,admin,'grantRole',[role,who],'Benchmark: preparación de rol');
  }
 }
 const total=Number(await contract.methods.totalLotes().call());
 const first=total+1,second=total+2;
 const medicine=`Benchmark ${round} - muestra ${first}`;
 await execute('registrarLote',lab,[medicine,'Laboratorio de prueba'],'registro 1');
 await execute('registrarLote',lab,[`Benchmark ${round} - cancelación`,'Laboratorio de prueba'],'registro 2');
 await execute('proponerTransferencia',lab,[first,dist],'propuesta inicial');
 await execute('cancelarTransferencia',lab,[first],'cancelación');
 await execute('proponerTransferencia',lab,[first,dist],'propuesta laboratorio-distribuidor');
 await execute('aceptarTransferencia',dist,[first],'aceptación distribuidor');
 await execute('proponerTransferencia',dist,[first,farm],'propuesta distribuidor-farmacia');
 await execute('aceptarTransferencia',farm,[first],'aceptación farmacia');
 await execute('pausar',admin,[],'pausa');
 await execute('reanudar',admin,[],'reanudación');
 await execute('desactivarLote',admin,[second],'desactivación');
 const stateA=await contractState(name,first);
 const stateB=await contractState(name,second);
 const expectedA={nombre:medicine,fabricante:'Laboratorio de prueba',propietario:farm.toLowerCase(),activo:true,pendiente:false};
 const expectedB={nombre:`Benchmark ${round} - cancelación`,fabricante:'Laboratorio de prueba',propietario:lab.toLowerCase(),activo:false,pendiente:false};
 const pass=JSON.stringify(stateA)===JSON.stringify(expectedA)&&JSON.stringify(stateB)===JSON.stringify(expectedB);
 return {variant:name,round,pass,states:{first:stateA,second:stateB},samples,error:pass?null:'Estado final distinto del esperado'};
}
app.get('/api/benchmark/suite',(req,res)=>res.json(latestSuite||{runs:[],summary:[],message:'Todavía no se ha ejecutado el benchmark funcional'}));
app.get('/api/benchmark/suite.csv',(req,res)=>{
 const rows=(latestSuite?.runs||[]).flatMap(r=>r.samples.map(s=>({variant:r.variant,round:r.round,pass:r.pass,...s})));
 const keys=['variant','round','pass','operation','stage','gas','txHash','block'];
 const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 res.type('text/csv').attachment('pharmachain-benchmark-funcional.csv').send([keys.join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'));
});
app.post('/api/benchmark/suite',async(req,res)=>{
 if(suiteRunning)return res.status(409).json({error:'Ya hay un benchmark funcional ejecutándose'});
 const rounds=Number(req.body?.rounds??1);
 if(![1,2,3,5].includes(rounds))return res.status(400).json({error:'Rondas permitidas: 1, 2, 3 o 5'});
 const selected=req.body?.variants??names;
 if(!Array.isArray(selected)||!selected.length||selected.some(n=>!names.includes(n))||new Set(selected).size!==selected.length)return res.status(400).json({error:'Selecciona variantes válidas sin duplicados'});
 suiteRunning=true;
 const runs=[];
 try{
  const acc=await accounts();if(acc.length<4)throw Error('Se necesitan al menos cuatro cuentas Hardhat');
  for(let round=1;round<=rounds;round++)for(const name of selected){
   try{runs.push(await suiteForVariant(name,round,acc));}
   catch(e){runs.push({variant:name,round,pass:false,error:String(e.message||e),samples:[]});}
  }
  const summary=selected.map(name=>{
   const samples=runs.filter(r=>r.variant===name).flatMap(r=>r.samples);
   const operations=Object.fromEntries(benchmarkOps.map(op=>{
    const a=samples.filter(s=>s.operation===op).map(s=>s.gas);
    return [op,{count:a.length,mean:a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null,min:a.length?Math.min(...a):null,max:a.length?Math.max(...a):null}];
   }));
   return {id:name,title:variants.find(v=>v.id===name).title,passed:runs.filter(r=>r.variant===name&&r.pass).length,total:rounds,operations};
  });
  latestSuite={createdAt:new Date().toISOString(),rounds,variants:selected,runs,summary,methodology:'Transacciones reales sobre contratos desplegados; setup de roles excluido de las medias. Estado final comprobado. Las rondas alteran almacenamiento y no son un benchmark de gas aislado.'};
  res.json(latestSuite);
 }catch(e){fail(res,e)}finally{suiteRunning=false}
});

// Explorador de contrato: lectura de funciones view y estado de roles.
app.get('/api/inspect/:name',async(req,res)=>{try{
 const {contract,address}=await load(req.params.name);
 const total=Number(await contract.methods.totalLotes().call());
 const acc=await accounts();const roles=[];
 for(let i=0;i<Math.min(acc.length,8);i++){
   const a=acc[i];let role='';
   if(req.params.name.includes('Manuales')){try{role=String(await contract.methods.roles(a).call())}catch(e){role='No disponible'}}
   else{const granted=[];for(const key of ['DEFAULT_ADMIN_ROLE','LABORATORIO_ROLE','DISTRIBUIDOR_ROLE','FARMACIA_ROLE']){try{const hash=await contract.methods[key]().call();if(await contract.methods.hasRole(hash,a).call())granted.push(key)}catch(e){}}role=granted.join(', ')||'Sin roles'}
   roles.push({account:a,role});
 }
 let paused=null;try{paused=await contract.methods.paused().call()}catch(e){}
 const balance=await web3.eth.getBalance(address);
 res.json({name:req.params.name,address,totalLotes:total,paused,balanceWei:String(balance),roles});
}catch(e){fail(res,e)}});
app.get('/api/movements/:name/:id',async(req,res)=>{try{
 const {contract}=await load(req.params.name);const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)throw Error('ID invalido');
 const total=Number(await contract.methods.totalMovimientos(id).call());const items=[];
 for(let i=0;i<Math.min(total,150);i++){
 const m=await contract.methods.consultarMovimiento(id,i).call();
 items.push({index:i,type:String(m.tipoMovimiento),origin:m.origen,destination:m.destino,timestamp:String(m.fecha)});
 }res.json({id,total,items});
}catch(e){fail(res,e)}});
app.get('/api/events/:name',async(req,res)=>{try{
 const {contract}=await load(req.params.name);const current=BigInt(await web3.eth.getBlockNumber());
 const fromBlock=current>2000n?current-2000n:0n;
 const ev=await contract.getPastEvents('allEvents',{fromBlock:fromBlock.toString(),toBlock:'latest'});
 res.json(ev.slice(-100).reverse().map(x=>({name:x.event,block:String(x.blockNumber),hash:x.transactionHash,args:serialize(x.returnValues)})));
}catch(e){fail(res,e)}});
// Pruebas negativas no destructivas: eth_call simula y valida que la llamada revierte.
// Los resultados de estas simulaciones NO son recibos y NO se les atribuye gasUsed.
const cases=[
 {id:'unauthorized-register',label:'Atacante no registra un lote',method:'registrarLote',expected:'revert'},
 {id:'missing-lot',label:'No aceptar lote inexistente',method:'aceptarTransferencia',expected:'revert'},
 {id:'invalid-target',label:'Rechazar destino cero',method:'proponerTransferencia',expected:'revert'},
 {id:'empty-name',label:'Rechazar nombre vacio',method:'registrarLote',expected:'revert'},
 {id:'invalid-transition',label:'Bloquear laboratorio → farmacia',method:'proponerTransferencia',expected:'revert'}
];
app.get('/api/testcases',(req,res)=>res.json(cases));
const testRuns=[];
app.get('/api/test-results',(req,res)=>res.json(testRuns));
app.post('/api/run-tests',async(req,res)=>{try{
 const name=req.body.name;if(!names.includes(name))throw Error('Contrato invalido');
 const acc=await accounts();if(acc.length<5)throw Error('Se requieren cinco cuentas Hardhat');
 const [admin,lab,dist,farm,attacker]=acc;
 const {contract}=await load(name);const total=Number(await contract.methods.totalLotes().call());
 const results=[];
 let labLot=null;for(let i=1;i<=total;i++){const l=await contract.methods.consultarLote(i).call();const t=await contract.methods.transferencias(i).call();if(l.activo&&l.propietario.toLowerCase()===lab&&!t.pendiente){labLot=i;break}}
 for(const c of cases){
   let from=attacker,args=[];
   if(c.id==='unauthorized-register')args=['Falso','Atacante'];
   if(c.id==='missing-lot'){from=dist;args=[total+1000]}
   if(c.id==='invalid-target'){from=lab;args=[labLot,'0x0000000000000000000000000000000000000000']}
   if(c.id==='empty-name'){from=lab;args=['','Fabricante']}
   if(c.id==='invalid-transition'){from=lab;args=[labLot,farm]}
   if((c.id==='invalid-target'||c.id==='invalid-transition')&&!labLot){results.push({id:c.id,label:c.label,passed:false,skipped:true,expected:'revert',observed:'not-run',detail:'Primero registra un lote activo del laboratorio sin transferencia pendiente',mode:'eth_call',gasUsed:null});continue}
   let reverted=false,detail='';
   try{await contract.methods[c.method](...args).call({from})}
   catch(e){reverted=true;detail=String(e.message||e).slice(0,250)}
   results.push({id:c.id,label:c.label,passed:reverted,expected:'revert',observed:reverted?'revert':'success',detail,mode:'eth_call',gasUsed:null});
 }
 const run={id:testRuns.length+1,time:new Date().toISOString(),contract:name,passed:results.filter(x=>x.passed).length,skipped:results.filter(x=>x.skipped).length,total:results.length,results};
 testRuns.unshift(run);if(testRuns.length>50)testRuns.pop();res.json(run);
}catch(e){fail(res,e)}});
app.get('/api/summary',(req,res)=>{
 const totals={};for(const x of ledger){const n=x.contract;if(!totals[n])totals[n]={contract:n,transactions:0,gas:0,costEth:0,byAction:{}};
 const t=totals[n];t.transactions++;t.gas+=Number(x.gasUsed);t.costEth+=Number(x.costEth);const a=t.byAction[x.method]||(t.byAction[x.method]={count:0,gas:0});a.count++;a.gas+=Number(x.gasUsed);
 }res.json({contracts:Object.values(totals),testRuns:testRuns.length,transactions:ledger.length});
});
app.get('/api/tests-export.csv',(req,res)=>{
 const rows=['run,contract,test,passed,expected,observed,mode,detail'];
 const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 for(const run of testRuns)for(const t of run.results)rows.push([run.id,run.contract,t.id,t.passed,t.expected,t.observed,t.mode,t.detail].map(q).join(','));
 res.type('text/csv').attachment('pharmachain-tests.csv').send(rows.join('\n'));
});


// --- V3: auditoria reproducible. Las pruebas negativas usan eth_call (sin gas real).
// Los flujos positivos envian transacciones reales y verifican invariantes on-chain.
const auditRuns=[];
const auditCatalog=[
 ['attacker-register','Atacante intenta registrar un lote','seguridad'],
 ['empty-name','Registro con nombre vacio','validacion'],
 ['empty-maker','Registro con fabricante vacio','validacion'],
 ['nonexistent-accept','Aceptar lote inexistente','validacion'],
 ['nonexistent-propose','Proponer lote inexistente','validacion'],
 ['nonexistent-cancel','Cancelar lote inexistente','validacion'],
 ['zero-address','Transferencia a direccion cero','seguridad'],
 ['self-transfer','Transferencia al propio custodio','seguridad'],
 ['skip-pharmacy','Salto laboratorio a farmacia','negocio'],
 ['outsider-propose','Tercero propone transferencia','autorizacion'],
 ['outsider-deactivate','Atacante desactiva lote','autorizacion'],
 ['unauthorized-assign','Atacante asigna rol','autorizacion'],
 ['wrong-accept','Destinatario incorrecto acepta','autorizacion'],
 ['duplicate-proposal','Segunda propuesta mientras hay pendiente','estado']
];
app.get('/api/audit/catalog',(req,res)=>res.json(auditCatalog.map(([id,title,category])=>({id,title,category}))));
app.get('/api/audit/runs',(req,res)=>res.json(auditRuns));
app.get('/api/audit/export',(req,res)=>{
 res.type('application/json').attachment('pharmachain-audit.json').send(JSON.stringify({generatedAt:new Date().toISOString(),runs:auditRuns},null,2));
});
async function audit(name,mode){
 const acc=await accounts();if(acc.length<5)throw Error('Se necesitan 5 cuentas locales');
 const [admin,lab,dist,farm,attacker]=acc;
 const {contract,address}=await load(name);
 const results=[],steps=[];
 const record=(id,title,category,passed,detail,kind='eth_call',gasUsed=null)=>results.push({id,title,category,passed,detail,kind,gasUsed});
 const callReject=async(id,title,category,method,args,from)=>{
  try{await contract.methods[method](...args).call({from});record(id,title,category,false,'La llamada se permitio inesperadamente')}
  catch(e){record(id,title,category,true,String(e.reason||e.message||e).slice(0,280))}
 };
 const total=Number(await contract.methods.totalLotes().call());
 await callReject('attacker-register','Atacante intenta registrar un lote','seguridad','registrarLote',['Falso','Atacante'],attacker);
 await callReject('empty-name','Registro con nombre vacio','validacion','registrarLote',['','Fabricante'],lab);
 await callReject('empty-maker','Registro con fabricante vacio','validacion','registrarLote',['Medicamento',''],lab);
 await callReject('nonexistent-accept','Aceptar lote inexistente','validacion','aceptarTransferencia',[total+9999],dist);
 await callReject('nonexistent-propose','Proponer lote inexistente','validacion','proponerTransferencia',[total+9999,dist],lab);
 await callReject('nonexistent-cancel','Cancelar lote inexistente','validacion','cancelarTransferencia',[total+9999],lab);
 if(name.includes('Manuales'))await callReject('unauthorized-assign','Atacante asigna rol','autorizacion','asignarRol',[attacker,1],attacker);
 else {const role=await contract.methods.LABORATORIO_ROLE().call();await callReject('unauthorized-assign','Atacante concede rol','autorizacion','grantRole',[role,attacker],attacker)}
 const id=total+1;
 if(mode==='full'){
  const run=async(title,method,args,from)=>{const tx=await send(name,from,method,args,title);steps.push({title,method,gasUsed:tx.gasUsed,txHash:tx.txHash,block:tx.block});return tx};
  await run('Registrar lote','registrarLote',['Audit v3 '+id,'Lab audit'],lab);
  const initial=await contract.methods.consultarLote(id).call();
  record('owner-lab','Custodia inicial del laboratorio','invariante',initial.propietario.toLowerCase()===lab,'Custodio leido del contrato','onchain');
  await callReject('zero-address','Transferencia a direccion cero','seguridad','proponerTransferencia',[id,'0x0000000000000000000000000000000000000000'],lab);
  await callReject('self-transfer','Transferencia al propio custodio','seguridad','proponerTransferencia',[id,lab],lab);
  await callReject('skip-pharmacy','Salto laboratorio a farmacia','negocio','proponerTransferencia',[id,farm],lab);
  await callReject('outsider-propose','Tercero propone transferencia','autorizacion','proponerTransferencia',[id,dist],attacker);
  await callReject('outsider-deactivate','Atacante desactiva lote','autorizacion','desactivarLote',[id],attacker);
  await run('Proponer laboratorio a distribuidor','proponerTransferencia',[id,dist],lab);
  const pending=await contract.methods.transferencias(id).call();
  record('pending','Propuesta pendiente almacenada','invariante',Boolean(pending.pendiente),'Se consulta transferencias(id)','onchain');
  await callReject('wrong-accept','Destinatario incorrecto acepta','autorizacion','aceptarTransferencia',[id],attacker);
  await callReject('duplicate-proposal','Segunda propuesta mientras hay pendiente','estado','proponerTransferencia',[id,dist],lab);
  await run('Aceptar distribuidor','aceptarTransferencia',[id],dist);
  const afterDist=await contract.methods.consultarLote(id).call();
  record('owner-dist','Custodia transferida al distribuidor','invariante',afterDist.propietario.toLowerCase()===dist,'Custodio leido del contrato','onchain');
  await run('Proponer distribuidor a farmacia','proponerTransferencia',[id,farm],dist);
  await run('Aceptar farmacia','aceptarTransferencia',[id],farm);
  const final=await contract.methods.consultarLote(id).call();
  const transfer=await contract.methods.transferencias(id).call();
  record('owner-farm','Custodia final de farmacia','invariante',final.propietario.toLowerCase()===farm,'Custodio final leido del contrato','onchain');
  record('no-pending','Sin transferencia pendiente al terminar','invariante',!transfer.pendiente,'Se consulta transferencias(id)','onchain');
  const moves=Number(await contract.methods.totalMovimientos(id).call());
  record('history','Historial de cinco movimientos','trazabilidad',moves===5,'Movimientos observados: '+moves,'onchain');
 }
 const run={id:auditRuns.length+1,date:new Date().toISOString(),name,mode,lotId:mode==='full'?id:null,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,total:results.length,results,steps,gasTotal:steps.reduce((n,x)=>n+Number(x.gasUsed),0)};
 auditRuns.unshift(run);if(auditRuns.length>40)auditRuns.pop();return run;
}
app.post('/api/audit/run',async(req,res)=>{try{
 const {name,mode}=req.body;if(!names.includes(name)||!['negative','full'].includes(mode))throw Error('Parametros invalidos');
 res.json(await audit(name,mode));
}catch(e){fail(res,e)}});


// Benchmark CLI: solo uso local; bloquea concurrencia y no acepta comandos arbitrarios.
const {spawn}=require('child_process');
let benchmarkRunning=false;
app.get('/api/benchmark/report',(req,res)=>{const f=path.join(root,'reports','framework-benchmark.json');if(!fs.existsSync(f))return res.status(404).json({error:'Ejecuta el benchmark primero'});res.type('json').send(fs.readFileSync(f));});
app.get('/api/benchmark/gas.csv',(req,res)=>{const f=path.join(root,'reports','gas-comparison.csv');if(!fs.existsSync(f))return res.status(404).json({error:'Ejecuta npm run gas:csv'});res.download(f);});
app.get('/api/benchmark/gas',(req,res)=>{const f=path.join(root,'reports','gas-comparison.csv');if(!fs.existsSync(f))return res.json([]);const lines=fs.readFileSync(f,'utf8').trim().split(/\r?\n/).slice(1);res.json(lines.filter(Boolean).map(line=>{const [architecture,operation,original,optimized,saving]=line.split(',');return {architecture,operation,original,optimized,saving};}));});
app.post('/api/benchmark/run',(req,res)=>{
 if(benchmarkRunning)return res.status(409).json({error:'Ya hay un benchmark en ejecución'});
 const rounds=Number(req.body?.rounds);
 if(![1,3,5].includes(rounds))return res.status(400).json({error:'Rondas permitidas: 1, 3, 5'});
 benchmarkRunning=true;
 const child=spawn(process.execPath,[path.join(root,'benchmark','run.cjs'),String(rounds)],{cwd:root,env:{...process.env,FORCE_COLOR:'0'},shell:false});
 let output='';const timer=setTimeout(()=>child.kill('SIGKILL'),600000);
 child.stdout.on('data',d=>output=(output+d).slice(-5000));child.stderr.on('data',d=>output=(output+d).slice(-5000));
 let finished=false;function finish(code){if(finished)return;finished=true;clearTimeout(timer);benchmarkRunning=false;res.status(code===0?200:500).json({exitCode:code,output});}
 child.on('error',e=>finish(-1));child.on('close',code=>finish(code));
});


// V5: operaciones guiadas, vista previa sin estado y evidencias verificables.
const workbenchMethods={
 registrarLote:2,proponerTransferencia:2,aceptarTransferencia:1,
 cancelarTransferencia:1,desactivarLote:1,pausar:0,reanudar:0
};
app.post('/api/workbench/preview',async(req,res)=>{try{
 const {name,from,method,args=[]}=req.body;
 if(!Object.hasOwn(workbenchMethods,method))throw Error('Operación no permitida');
 if(!Array.isArray(args)||args.length!==workbenchMethods[method])throw Error('Número de parámetros incorrecto');
 const known=await accounts();if(!known.includes(String(from).toLowerCase()))throw Error('Cuenta desconocida');
 const {contract,address}=await load(name);
 if(typeof contract.methods[method]!=='function')throw Error('Método no disponible en el ABI');
 const tx=contract.methods[method](...args);
 let estimate=null,accepted=false,reason=null;
 try{estimate=String(await tx.estimateGas({from}));await tx.call({from});accepted=true}
 catch(e){reason=String(e.cause?.message||e.message||e).slice(0,650)}
 res.json({accepted,reason,estimatedGas:estimate,contract:address,method,mode:'simulation',note:'eth_call/estimateGas no produce transacción ni gasUsed real'});
}catch(e){fail(res,e)}});
app.get('/api/workbench/evidence/:name/:id',async(req,res)=>{try{
 const {contract,address}=await load(req.params.name);
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1||id>Number(await contract.methods.totalLotes().call()))throw Error('Lote inexistente');
 const lot=await contract.methods.consultarLote(id).call();
 const transfer=await contract.methods.transferencias(id).call();
 const total=Number(await contract.methods.totalMovimientos(id).call());
 const movements=[];
 for(let i=0;i<Math.min(total,300);i++){
  const m=await contract.methods.consultarMovimiento(id,i).call();
  movements.push({index:i,type:Number(m.tipoMovimiento),from:m.origen,to:m.destino,timestamp:String(m.fecha)});
 }
 const events=ledger.filter(x=>x.contract===req.params.name);
 res.json(serialize({generatedAt:new Date().toISOString(),network:String(await web3.eth.getChainId()),contract:req.params.name,address,id,lot,transfer,movements,transactions:events,disclaimer:'Los recibos solo se conservan en memoria mientras el servidor está activo. El historial on-chain persiste.'}));
}catch(e){fail(res,e)}});

app.use(express.static(path.join(__dirname,'public')));
const port=Number(process.env.PORT||3100);app.listen(port,()=>console.log('PharmaChain gas lab: http://localhost:'+port));
