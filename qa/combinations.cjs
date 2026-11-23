const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const lib=['cards','expedition-data','expedition-engine','combinations','combination-ai','expedition-ai'].map(f=>fs.readFileSync(path.join(__dirname,'../dist/'+f+'.js'),'utf8')).join('\n');
const {newMix,apply,chooseMove,expRanks,mixSites,mixOptions,refreshMarket}=Function(lib+';return {newMix,apply,chooseMove,expRanks,mixSites,mixOptions,refreshMarket}')();
for(const combo of [12,13,123])for(const n of [2,3,4]){
  let seed=1240+n;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const g=newMix(combo,Array(n-1).fill('Medium'),rng),copy=structuredClone(g);
  if(combo!==12){
    assert.equal(g.deck.length+4,[22,33,44][n-2]);
    const preview=structuredClone(g);assert(refreshMarket(preview));
    const next=chooseMove(preview,'Medium');assert(apply(preview,next));
    const replay=structuredClone(g);assert(apply(replay,{...next,refresh:true}));
    assert.deepEqual(preview.players,replay.players);assert.deepEqual(preview.market,replay.market);
  }
  let turns=0;
  while(!g.over&&turns<900){
    const a=chooseMove(g,'Medium');assert(apply(g,a));assert(apply(copy,a));turns++;
    assert(g.players.every(p=>p.ready>=0&&p.bag.every(k=>k>=0)));
  }
  assert(g.over,'unfinished '+combo+' '+n);assert.deepEqual(g,copy);console.log(combo,n,turns,expRanks(g));
}
