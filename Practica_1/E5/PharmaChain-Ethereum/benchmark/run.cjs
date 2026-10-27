// Benchmark real de los CLI. Requiere Hardhat node para Truffle.
// Ejecuta las suites existentes; NO atribuye diferencias de gas al framework.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');
const reports=path.join(root,'reports');fs.mkdirSync(reports,{recursive:true});
const rounds=Math.max(1,Math.min(10,Number(process.argv[2]||3)));
const timeoutMs=180000;
function run(name,args){return new Promise(resolve=>{
 const start=performance.now();let stdout='',stderr='';
 const child=spawn(process.platform==='win32'?'npx.cmd':'npx',args,{cwd:root,env:{...process.env,FORCE_COLOR:'0'},shell:false});
 const timer=setTimeout(()=>child.kill('SIGKILL'),timeoutMs);
 child.stdout.on('data',d=>stdout=(stdout+d).slice(-16000));
 child.stderr.on('data',d=>stderr=(stderr+d).slice(-16000));
 child.on('error',e=>{clearTimeout(timer);resolve({name,seconds:(performance.now()-start)/1000,exitCode:-1,output:e.message})});
 child.on('close',code=>{clearTimeout(timer);resolve({name,seconds:(performance.now()-start)/1000,exitCode:code??-1,output:(stdout+'\n'+stderr).slice(-5000)})});
})}
function median(xs){const a=[...xs].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2}
(async()=>{
 const results=[];
 // Suites NO equivalentes: se comparan tiempos de ejecución de las suites existentes.
 for(let i=1;i<=rounds;i++){
  for(const [framework,args] of [
   ['Truffle',['truffle','test','--network','development','--config','truffle-config.cjs']],
   ['Hardhat',['hardhat','test','mocha']]
  ]){
   const r=await run(framework,args);r.round=i;results.push(r);
   console.log(`${framework} #${i}: ${r.seconds.toFixed(2)} s, exit=${r.exitCode}`);
  }
 }
 const summary=['Truffle','Hardhat'].map(framework=>{
  const subset=results.filter(x=>x.name===framework);
  const valid=subset.filter(x=>x.exitCode===0);
  return {framework,runs:subset.length,passed:valid.length,medianSeconds:valid.length?median(valid.map(x=>x.seconds)):null};
 });
 const payload={createdAt:new Date().toISOString(),rounds,methodology:'Tiempo total de suites existentes, NO suites equivalentes. Truffle usa nodo RPC externo y Hardhat red simulada propia; no atribuir diferencia a rendimiento intrínseco.',summary,results};
 fs.writeFileSync(path.join(reports,'framework-benchmark.json'),JSON.stringify(payload,null,2));
 console.log('Informe: reports/framework-benchmark.json');
 if(results.some(x=>x.exitCode!==0))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
