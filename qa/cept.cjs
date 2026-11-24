const assert=require('node:assert/strict');
const g=require('../dist/cept-engine');
let seed=104;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const exec=(s,a)=>assert.ok(g.play(s,a),'invalid '+JSON.stringify(a)+' in '+s.phase);
function owned(s,n,i,id){Object.assign(s.tiles[n],{owner:i,unit:{id,hp:g.cards[id].hp}});}
{
  const s=g.start(4,4);
  for(const p of s.players){const book=[...p.book,...p.hand];assert.equal(book.length,50);assert.equal(new Set(book).size,13);assert.ok(book.every(id=>book.filter(v=>v===id).length<=4));}
  // Non-adjacent territories of the same element form a chain.
  owned(s,1,1,1);owned(s,6,1,1);s.tiles[1].level=3;
  assert.equal(g.value(s,s.tiles[1]),480);assert.equal(g.toll(s,s.tiles[1]),192);
  const before=JSON.stringify(s);assert.equal(g.play(s,['invade',0]),false);assert.equal(JSON.stringify(s),before);
}
{
  const s=g.start(2,2),p=s.players[0];p.pos=1;p.hand=[5];s.phase='land';
  owned(s,1,1,1); // 50 HP + 10 land HP survives a 50 ST attack.
  exec(s,['invade',0]);exec(s,['bare']);assert.equal(g.actor(s),1);
  const loaded=JSON.parse(JSON.stringify(s));assert.deepEqual(g.choices(loaded),g.choices(s));
  exec(s,['bare']);assert.equal(s.phase,'result');assert.equal(s.tiles[1].unit.hp,10);
  assert.deepEqual(p.hand,[5]);exec(s,['continue']);assert.equal(p.cash,200-70-16);
}
{
  const s=g.start(2,2);s.phase='land';s.players[0].pos=1;s.players[0].hand=[5];owned(s,1,1,0);
  exec(s,['invade',0]);exec(s,['bare']);exec(s,['bare']);assert.equal(s.tiles[1].owner,0);
  assert.equal(s.battle.guard,0);exec(s,['continue']);assert.equal(s.players[0].cash,130);
}
{
  const s=g.start(2,2);s.players[0].cash=4000;s.players[0].pos=15;s.players[0].dir=1;s.phase='roll';s.fixed=2;
  exec(s,['roll']);assert.equal(s.winner,0);assert.equal(s.players[0].pos,0);assert.equal(s.players[0].lap,0);
}
{
  const s=g.start(2,2);s.phase='land';s.players[0].pos=2;owned(s,2,1,3);owned(s,1,0,1);s.players[0].cash=0;
  exec(s,['pay']);assert.equal(s.phase,'sell');exec(s,['sell',1]);assert.equal(s.tiles[1].owner,-1);assert.equal(s.players[0].cash,64);
}
for(const count of [2,3,4]){
  for(let game=0;game<20;game++){
    const s=g.start(count,0);
    let turns=0;
    while(s.phase!=='over'&&turns++<4000){const a=g.ai(s);assert.ok(a);exec(s,a);}
    assert.ok(s.winner>=0);assert.ok(g.total(s,s.winner)>=s.target);assert.equal(s.players[s.winner].pos,0);
  }
  console.log(count+' seats: 20 completed games');
}