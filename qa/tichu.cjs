const assert=require('node:assert/strict'),T=require('../dist/tichu.js');
const id=(r,s=0)=>13*s+(r===14?0:r-1);
const combos=cards=>T.pool(cards).filter(m=>m.cards.length===cards.length);
assert(combos([id(6),id(6,1),T.PH]).some(m=>m.type==='three'));
assert(!combos([id(6),id(6,1),id(6,2),T.PH]).some(m=>m.type==='bomb'));
assert(combos([2,3,4,5,6]).some(m=>m.type==='bomb'));
assert(combos([id(7),id(7,1),id(8),T.PH]).some(m=>m.type==='steps'));
assert.equal(T.points([9,12,4,T.PH,T.DR]),25);
const scenario=T.start();T.grand(scenario,false);T.exchange(scenario,scenario.p[0].hand.slice(0,3));
Object.assign(scenario,{turn:0,top:{type:'one',high:5,cards:[id(5)]},wish:8,leader:3});
scenario.p[0].hand=[id(8),id(13),T.PH];assert(T.required(scenario,0));assert(!T.pass(scenario,0));assert(T.legal(scenario,0).every(m=>m.cards.includes(id(8))));
scenario.p[1].hand=[id(7),id(7,1),id(7,2),id(7,3)];assert(T.legal(scenario,1).some(m=>m.type==='bomb'));
let rounds=0;
for(let match=0;match<4;match++){
 const g=T.start();
 for(let n=0;n<150;n++){
  assert.equal(g.p[0].hand.length,8);T.grand(g,false);T.exchange(g,g.p[0].hand.slice(0,3));assert.equal(new Set(g.p.flatMap(p=>p.hand)).size,56);
  let step=0;
  while(g.phase!=='result'){
   assert(++step<500);
   if(g.phase==='dragon'){assert(T.gift(g,(g.turn+1)%4));continue;}
   const i=g.turn,m=T.ai(g,i);
   assert(m?T.play(g,i,m,m.cards.includes(T.M)?10:0):T.pass(g,i));
  }
  const calls=g.p.reduce((s,p,i)=>s+p.call*(g.order[0]===i?1:-1),0);
  assert.equal(g.delta[0]+g.delta[1]-calls,g.order[0]%2===g.order[1]%2?200:100);
  rounds++;if(Math.max(...g.totals)>=1000&&g.totals[0]!==g.totals[1])break;T.deal(g);
 }
 assert(Math.max(...g.totals)>=1000);
}
console.log('Tichu combinations, wish, interrupt bombs, score conservation and four full matches OK:',rounds,'rounds');
