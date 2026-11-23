const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const lib=['cards','expedition-data','expedition-engine','combinations','combination-ai','expedition-ai'].map(f=>fs.readFileSync(path.join(__dirname,'../dist/'+f+'.js'),'utf8')).join('\n');
const {newMix,apply,chooseMove,expRanks,mixSites,mixOptions,refreshMarket,starter,receiveToll}=Function(lib+';return {newMix,apply,chooseMove,expRanks,mixSites,mixOptions,refreshMarket,starter,receiveToll}')();
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
  require('./audit-final.cjs')(g,n,expRanks(g));
  assert(g.over,'unfinished '+combo+' '+n);assert.deepEqual(g,copy);console.log(combo,n,turns,expRanks(g));
}

// Score tracks and a non-rectangular outpost column are easy to misread on the player boards.
const sea=newMix(12,['Medium'],()=>.4);
sea.players[0].tracks=[1,2,3,4];
assert.equal(expRanks(sea).find(r=>r.i===0).points,17);
const all=newMix(123,['Medium'],()=>.4),p=all.players[0];
p.tracks=[1,1,0,0];p.bag=[4,2,2,2];
const island=all.islands.findIndex(t=>t.suit===2);
const move=all.tiles.findIndex(t=>t.range===99);
const rewards=mixOptions(all,move).filter(c=>c.dest===island&&c.build);
assert(rewards.length&&rewards.every(c=>c.reward>=0));
const route=newMix(13,['Medium'],()=>.4);
route.players[0].route=[0,1,2].map(()=>({card:starter,workers:0}));
const last=mixSites(route).findLastIndex(t=>t.special==='route');
assert(mixOptions(route,last).every(c=>c.need===3));
route.players[0].route[0].workers=1;
assert(mixOptions(route,last).some(c=>c.need===2));

const recipient={bag:[4,3,2,1],bonus:[],priority:[3,2,1,0]};
receiveToll(recipient,1);
assert.deepEqual(recipient.bag,[4,4,2,0]);
for(const combo of [13,123]){
 const board=newMix(combo,['Medium'],()=>.4);
 const i=board.tiles.findIndex(t=>t.industry===1&&!t.cover);
 board.players[0].bag=[0,0,0,1];
 const opts=mixOptions(board,i);
 assert(opts.some(c=>c.kind==='upgrade'&&c.steps.length===0));
 assert(apply(board,{edition:3,combo,i,kind:'upgrade',option:opts.length-1}));
 assert.deepEqual(board.players[0].bag,[0,0,0,1]);
 assert.equal(board.tiles[i].occupant.seat,0);
}
