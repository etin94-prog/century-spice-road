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

// Building that completes a row stays legal after every bonus tile is taken.
{
 const {actionsAt}=Function(lib+';return {actionsAt}')();
 let seed=7;const g=newExpedition(2,['Medium'],()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296));
 delete g.departures;g.turn=0;
 const i=g.tiles.findIndex(t=>!t.port&&t.suit===0),p=g.players[0];
 p.boat=i;p.bag=[5,3,1,1];p.tracks=[0,1,1,1];g.stocks=[0,0,0,0,0];
 const build=actionsAt(g,i,{path:[]}).find(c=>c.kind==='build');
 assert(build&&!build.prize,'build blocked by empty bonus stock');
}
