const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const lib=['data','engine','ai'].map(f=>fs.readFileSync(path.join(__dirname,'../dist/expedition-'+f+'.js'),'utf8')).join('\n');
const {newExpedition,apply,chooseMove,expRanks}=Function(lib+';return {newExpedition,apply,chooseMove,expRanks}')();
for(const edition of [2,3])for(const n of [2,3,4]){
 const setup=()=>{let seed=123456+n;return newExpedition(edition,Array(n-1).fill('Medium'),()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296));};
 const g=setup(),copy=setup();let turns=0;
 while(!g.over&&turns<700){
   const a=chooseMove(g,['Easy','Medium','Hard','Hell'][g.turn]);
   assert(apply(g,a));assert(apply(copy,structuredClone(a)));turns++;
   assert(g.players.every(p=>p.bag.every(n=>n>=0)&&p.ready>=0));
 }
 require('./audit-final.cjs')(g,n,expRanks(g));
  console.log(edition,n,turns,g.players.map(p=>p.won.length),expRanks(g));
 assert(g.over);assert.deepEqual(g,copy);
}
