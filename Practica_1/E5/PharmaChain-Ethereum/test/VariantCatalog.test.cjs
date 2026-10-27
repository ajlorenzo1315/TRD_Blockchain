const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const variants=require('../lab/variants.json');
test('identificadores únicos y contratos fuente disponibles',()=>{
 assert.equal(new Set(variants.map(v=>v.id)).size,variants.length);
 for(const v of variants){
  assert.ok(v.title&&v.description&&v.optimization);
  assert.ok(fs.existsSync(path.join(__dirname,'..','contracts',v.id+'.sol')));
 }
});
test('cuatro variantes por modelo de permisos',()=>{
 assert.equal(variants.filter(v=>v.kind==='manual').length,4);
 assert.equal(variants.filter(v=>v.kind==='openzeppelin').length,4);
});
