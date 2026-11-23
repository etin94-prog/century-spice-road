const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=['data','engine'].map(n=>fs.readFileSync(path.join(__dirname,'../dist/splendor-'+n+'.js'),'utf8')).join('\n');
const {newGame,chooseMove,apply,rankings}=Function(src+';return {newGame,chooseMove,apply,rankings}')();
function seeded(n){return ()=>((n=(Math.imul(1664525,n)+1013904223)>>>0)/4294967296);}
const start=Number(process.argv[2]||1),count=Number(process.argv[3]||16);
for(const rival of ['Easy','Medium','Hard']){
  let wins=0,losses=0,ties=0;
  for(let seed=start;seed<start+count;seed++)for(const seat of [0,1]){
    const g=newGame(['Medium'],seeded(seed)),streams=[seeded(391*seed+3),seeded(391*seed+11)];
    while(!g.over){
      const expert=g.turn===seat;Math.random=streams[expert?0:1];
      assert(g.log.length<450&&apply(g,chooseMove(g,expert?'Hell':rival)));
    }
    const rows=rankings(g);if(rows[1].rank===1)ties++;else if(rows[0].i===seat)wins++;else losses++;
  }
  console.log({rival,start,count,wins,losses,ties});
}
