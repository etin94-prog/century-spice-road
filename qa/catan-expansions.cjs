const assert=require('node:assert/strict');
const game=require('../dist/catan-engine');
let seed=20261124;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
// Opponents' private cards become visible only after the player commits.
{
  const s=game.start('knights');s.phase='turn';s.rolled=true;
  const [me,opponent]=s.players;
  me.progress=[{track:2,card:'spy'}];
  opponent.progress=[{track:1,card:'medicine'},{track:1,card:'engineer'}];
  assert.deepEqual(game.choices(s).filter(a=>a[0]==='progress'),[['progress',0,1]]);
  assert.ok(game.play(s,['progress',0,1]));
  assert.equal(me.progress.length,0);
  assert.equal(game.readSave(JSON.stringify(s)).kind,'ready');
  assert.ok(game.play(s,['takeProgress',1]));
  assert.equal(me.progress[0].card,'engineer');
  assert.equal(s.phase,'turn');
}
{
  const s=game.start();s.phase='turn';s.rolled=true;s.players[0].hand[0]=1;
  const offers=()=>game.choices(s).filter(a=>a[0]==='offer');
  const without=offers();s.players[1].hand[3]=1;
  assert.deepEqual(offers(),without);
  assert.ok(game.play(s,['offer',0,4,1]));
  assert.deepEqual(game.choices(s),[['reject']]);
  assert.equal(game.play(s,['accept']),false);
  assert.ok(game.play(s,['reject']));
  assert.ok(game.play(s,['offer',0,3,1]));
  assert.ok(game.play(s,['accept']));
  assert.equal(s.players[0].hand[3],1);
  const invalidOffer={...s,phase:'offer',offer:{to:1,from:0,give:0,want:999}};
  assert.equal(game.readSave(JSON.stringify(invalidOffer)).kind,'invalid');
  s.respondent=2;assert.equal(game.actor(s),s.turn);
  s.phase='unknown';assert.deepEqual(game.choices(s),[]);
  assert.equal(game.readSave(JSON.stringify(s)).kind,'invalid');
  assert.equal(game.readSave(null).kind,'empty');
  assert.equal(game.readSave('{').kind,'invalid');
}
{
  const s=game.start('knights');s.phase='pillage';s.respondent=0;
  s.eventQueue=[{j:0,phase:'pillage'}];s.dice=[2,1];
  s.nodes.slice(0,6).forEach((v,n)=>{v.owner=0;v.level=n===5?2:1;});
  assert.ok(game.play(s,['pillage',5]));assert.equal(s.nodes[5].pillagedCity,true);
  s.rolled=true;s.players[0].hand[3]=2;s.players[0].hand[4]=3;
  assert.deepEqual(game.choices(s).filter(a=>a[0]==='city'),[['city',5]]);
  assert.ok(game.play(s,['city',5]));assert.equal(s.nodes[5].pillagedCity,undefined);
}
for(const mode of Object.keys(game.modes)){
  for(const count of [3,4]){
    for(let match=0;match<(mode==='knights'||mode==='sea'?15:1);match++){
      let s=game.start(mode,count);
      if(mode==='knights')assert.deepEqual(s.progressDecks.map(deck=>deck.length),[18,18,18]);
      if(mode==='sea'){
        assert.equal(s.tiles.filter(t=>t.res===-2).length,18);
        assert.equal(new Set(s.tiles.filter(t=>t.island>0).map(t=>t.island)).size,3);
      }
      let step=0;
      while(s.phase!=='over'&&step++<8000){
        const action=game.ai(s);assert.ok(action,mode+' · '+s.phase);
        assert.ok(game.play(s,action));
        if(step===count*4&&mode==='knights')assert.equal(s.nodes.filter(v=>v.level===2).length,count);
        if(step===40){
          const snapshot=game.readSave(JSON.stringify(s));assert.equal(snapshot.kind,'ready');
          const restored=snapshot.game;
          assert.deepEqual(game.choices(restored),game.choices(s));s=restored;
        }
        s.bank.forEach((n,r)=>{
          assert.ok(n>=0&&s.players.every(p=>p.hand[r]>=0));
          assert.equal(s.players.reduce((v,p)=>v+p.hand[r],n),r<5?19:12);
        });
        if(mode==='knights')assert.equal(s.progressDecks.flat().length+s.players.reduce((n,p)=>n+p.progress.length+p.progressVP,0),54);
      }
      assert.ok(s.winner>=0,mode+' did not finish');
      assert.ok(game.points(s,s.winner)>=game.target(s));
    }
    console.log(mode,count,'passed');
  }
}