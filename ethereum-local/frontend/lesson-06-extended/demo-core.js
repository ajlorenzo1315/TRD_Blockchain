(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Lesson6Demo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const enemies=[
 {id:'F-01',name:'Capitán Tumba',dna:'0306030019226000',level:5,readyTime:0,winCount:7,lossCount:2},
 {id:'F-02',name:'Doctora Plaga',dna:'0702010410022000',level:8,readyTime:0,winCount:12,lossCount:3},
 {id:'F-03',name:'Rey de las Criptas',dna:'0908030611054000',level:12,readyTime:0,winCount:20,lossCount:1},
 {id:'F-04',name:'Zombi Recluta',dna:'0102030405067000',level:2,readyTime:0,winCount:1,lossCount:6}
];
const heroes=[
 {id:'D-01',name:'Mortimer',dna:'0306030019226000',level:6,readyTime:0,winCount:3,lossCount:1},
 {id:'D-02',name:'Violeta',dna:'0207040513089000',level:4,readyTime:0,winCount:2,lossCount:0}
];
function toTuple(z){return [z.name,z.dna,z.level,z.readyTime,z.winCount,z.lossCount];}
function maxHp(z){return 50+Number(z.level)*12;}
function damage(attacker,defender,round){const a=BigInt(attacker.dna),b=BigInt(defender.dna);return 7+Number((a/BigInt(round+1)+b%97n+BigInt(round*31))%17n)+Math.floor(Number(attacker.level)/2);}
function simulateBattle(hero,enemy){if(!hero||!enemy)throw new Error('Falta un luchador');let hpA=maxHp(hero),hpB=maxHp(enemy);const turns=[];for(let r=0;r<40&&hpA>0&&hpB>0;r++){let hit=damage(hero,enemy,r);hpB=Math.max(0,hpB-hit);turns.push({actor:'hero',damage:hit,heroHp:hpA,enemyHp:hpB});if(hpB===0)break;hit=damage(enemy,hero,r);hpA=Math.max(0,hpA-hit);turns.push({actor:'enemy',damage:hit,heroHp:hpA,enemyHp:hpB});}return {winner:hpA>0?'hero':'enemy',turns,maxHeroHp:maxHp(hero),maxEnemyHp:maxHp(enemy)};}
return {enemies,heroes,toTuple,maxHp,damage,simulateBattle};
});
