const B=require('../dist/blackjack-engine.js'),assert=require('node:assert/strict');
function start(draws){
  const g=B.table();g.shoe=Array(80).fill(9).concat(draws.slice().reverse());assert(B.deal(g));return g;
}
function finish(g){while(['bots','dealer'].includes(g.phase))B.dealerStep(g);}
assert.deepEqual(B.score([0,13,9]),{total:12,soft:false});
let g=start([0,8,12,7]);finish(g);assert.equal(g.chips,515);
g=start([9,0,1,12]);B.play(g,'insure');assert.equal(g.chips,500);
g=start([0,13,12,11]);B.play(g,'decline');assert.equal(g.chips,500);
g=start([4,0,5,5,9]);B.play(g,'decline');B.play(g,'double');finish(g);assert.equal(g.chips,520);assert.equal(g.dealer.length,2);
g=start([0,9,13,7,12,9]);B.play(g,'split');finish(g);assert.equal(g.hands.length,2);assert.equal(g.chips,520);assert(g.hands.every(h=>h.cards.length===2));
for(let count=1;count<=4;count++)for(let run=0;run<40;run++){
  g=B.table(count);for(let n=0;n<5;n++){assert(B.deal(g));while(g.phase!=='result'){
    if(g.phase==='insurance')B.play(g,'decline');
    else if(g.phase==='play')B.play(g,B.score(g.hands[g.index].cards).total<16?'hit':'stand');
    else B.dealerStep(g);
  }assert(g.chips>=0&&g.bots.every(p=>p.chips>=0));g.phase='bet';}
}
console.log('Payouts, split aces, soft 17, insurance, doubles and 160 five-round tables OK');
