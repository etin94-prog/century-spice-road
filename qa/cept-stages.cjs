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
    assert.equal(m.types[s.players[s.winner].pos],'성');
    assert.deepEqual(['N','S','R'].map(r=>s.reward.filter(id=>C.cards[id].catalog.rarity===r).length),m.reward.counts);
    assert.ok(s.reward.every(id=>m.reward.categories.includes(C.cards[id].catalog.category)));
  }
}
console.log('40 PS2 stages, 120 completed matches and stage reward pools OK');
for(let stage=1;stage<=40;stage++){
  const id='ps2-'+stage,m=C.maps[id];
  for(const [entry,destination] of Object.entries(m.transit)){
    const at=Number(entry),from=m.links[at][0];
    const s=C.start(2,2,5000,id);
    Object.assign(s.players[0],{pos:from,previous:null,dir:1});
    s.phase='fork';s.remaining=1;
    assert.ok(C.play(s,['route',at]));
    assert.equal(s.players[0].pos,destination);
    assert.deepEqual(s.lastMove.path,[from,at,destination]);
    if(m.types[at]==='전송진'&&m.links[at].length>1){
      s.players[0].pos=from;s.players[0].previous=null;s.phase='fork';s.remaining=2;
      assert.ok(C.play(s,['route',at]));
      assert.notEqual(s.lastMove.path[2],destination,'passing warp on stage '+stage);
    }
  }
  const legacy=C.start(2,2,5000,id);delete legacy.layoutRevision;
  assert.equal(C.board(legacy),C.maps['legacy-'+id]);
}
{
  const s=C.start(2,2,5000,'market'),plague=C.cards.findIndex(c=>c.effect==='plague');
  const targets=[s.tiles.find(t=>t.area===0),s.tiles.find(t=>t.area===1)];
  for(const t of targets)Object.assign(t,{owner:1,unit:{id:0,hp:30}});
  s.players[0].hand=[plague];assert.ok(C.play(s,['cast',0]));assert.ok(C.play(s,['plagueArea',0]));
  assert.equal(targets[0].unit.poisoned,true);assert.equal(targets[1].unit.poisoned,undefined);
}
console.log('All published bridge/warp destinations, legacy layouts and Plague area targeting OK');
