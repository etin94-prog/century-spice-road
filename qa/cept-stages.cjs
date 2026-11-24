const assert=require('node:assert/strict');
const C=require('../dist/cept-engine');
let seed=3831;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let stage=1;stage<=40;stage++){
  for(const players of [2,3,4]){
    const s=C.start(players,0,5000,'ps2-'+stage,C.presets.fire);
    let actions=0;
    while(s.winner<0&&actions++<9000)assert.ok(C.play(s,C.ai(s)),s.phase);
    assert.ok(s.winner>=0,'Unfinished stage '+stage+' with '+players+' players');
    const m=C.board(s);
    assert.equal(s.players[s.winner].pos,0);
    assert.deepEqual(['N','S','R'].map(r=>s.reward.filter(id=>C.cards[id].catalog.rarity===r).length),m.reward.counts);
    assert.ok(s.reward.every(id=>m.reward.categories.includes(C.cards[id].catalog.category)));
  }
}
console.log('40 PS2 stages, 120 completed matches and stage reward pools OK');
