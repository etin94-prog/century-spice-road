const assert=require('node:assert/strict'),g=require('../dist/cept-engine');
const id=name=>{const i=g.cards.findIndex(c=>c.name===name);assert.ok(i>=0,name);return i;};
const play=(s,...a)=>assert.ok(g.play(s,a),s.phase+' '+a);
const own=(s,n,i,name,hp)=>{const k=id(name);Object.assign(s.tiles[n],{owner:i,unit:{id:k,hp:hp??g.cards[k].hp}});};
let seed=2202;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
// Second's enemy-only Bolt and Shatter differ from the first game's untargeted allegiance on Bolt.
for(const edition of ['ps2','dc','saturn','ps1']){
  const engine=edition==='ps2'?g:g.createEdition(edition);
  const game=engine.start(4,2,5000,edition+'-1',engine.presets.fire,engine.presets.fire,2,'teams');
  const goblin=engine.cards.findIndex(c=>engine.combo.key(c)==='goblin');
  const gear=engine.presets.fire.find(id=>engine.cards[id].kind==='item');
  for(let i=0;i<4;i++){
    Object.assign(game.tiles[i+1],{owner:i,unit:{id:goblin,hp:15}});
    game.players[i].hand=[gear];
  }
  game.phase='spellTarget';game.spellEffect='bolt';
  const second=['ps2','dc'].includes(edition);
  assert.deepEqual(engine.choices(game).map(a=>a[1]),second?[2,4]:[1,2,3,4]);
  if(second)assert.equal(engine.play(game,['targetLand',3]),false);
  game.spellEffect='shatter';assert.deepEqual(engine.choices(game),[['targetPlayer',1],['targetPlayer',3]]);
  game.players[1].hand=game.players[3].hand=[goblin];assert.deepEqual(engine.choices(game),[['fizzle']]);
  game.tiles[1].unit.enchant='phantasm';game.spellEffect='heal';
  assert.ok(engine.play(game,['targetLand',1]));assert.equal(game.tiles[1].unit.hp,15);
}
{
  const room=require('../dist/cept-room-state'),game=g.start(4,2),guard=id('고블린'),item=id('레더 아머');
  own(game,1,1,'고블린');game.turn=2;game.phase='defend';
  game.battle={at:1,inv:guard,atkItem:item,defItem:null,attackerSeat:3,teleport:true};
  assert.equal(room.view(g,game,2).game.battle.atkItem,null);
  assert.equal(room.view(g,game,3).game.battle.atkItem,item);
  play(game,'bare');assert.equal(g.actor(game),1);
  assert.equal(room.runAI(g,game),0);assert.deepEqual(room.view(g,game,1).choices,[['continue']]);
  play(game,'continue');assert.equal(game.turn,2);assert.equal(game.phase,'roll');
}
assert.ok(g.validBook(g.presets.fire));assert.equal(new Set(g.presets.fire).size,26);
assert.ok(!g.validBook(g.presets.fire.slice(1)));assert.ok(!g.validBook(Array(50).fill(13)));
function battle(att,def,atkItem,defItem,{land=0,level=1,hp}={}){
  const s=g.start(2,2);s.phase='land';s.players[0].pos=1;own(s,1,1,def,hp);s.tiles[1].type=land;s.tiles[1].level=level;
  s.players[0].hand=[id(att),...(atkItem?[id(atkItem)]:[])];s.players[1].hand=defItem?[id(defItem)]:[];
  play(s,'invade',0);if(atkItem)play(s,'equip',0);else play(s,'bare');
  if(defItem)play(s,'equip',0);else play(s,'bare');return s;
}
assert.equal(battle('자이언트 랫','드래곤플라이',null,null,{land:2}).battle.won,true);
assert.equal(battle('고블린','드래곤플라이',null,null,{land:2}).battle.won,false);
assert.equal(battle('파이터','고블린',null,'카운터 애뮬릿').battle.finalHP[0],0);
assert.equal(battle('파이터','고블린','블랙 오브','카운터 애뮬릿').battle.won,true);
assert.equal(battle('파이터','고블린',null,'가시어스 폼').tiles[1].unit.hp,30);
assert.equal(battle('파이터','고블린','프리즈','가시어스 폼').battle.won,true);
assert.equal(battle('파이터','타이거 비틀','에메랄드 링','레더 아머',{land:2,level:3}).battle.won,true);
assert.equal(battle('코볼트','타이거 비틀','에메랄드 링','레더 아머',{land:2,level:3}).battle.won,false);
{
 const s=g.start(2,2,5000,'market',g.presets.fire);s.phase='roll';s.fixed=5;play(s,'roll');play(s,'direction',1);
 assert.equal(s.phase,'fork');assert.equal(s.remaining,3);play(s,'route',16);assert.equal(s.phase,'temple');assert.equal(s.remaining,1);
 const before=g.total(s,0);play(s,'buySymbol',0,3);assert.equal(s.players[0].symbols[0],3);assert.equal(g.total(s,0),before);
 s.phase='land';s.players[0].pos=0;own(s,1,0,'고블린');s.players[0].cash=2000;play(s,'level',1,3);
 assert.equal(s.prices[0],13);assert.deepEqual(s.prices.slice(1),Array(7).fill(10));
}
{
 const s=g.start(2,2,5000,'dunnan',g.presets.fire);s.players[0].hand=[id('매직 볼트')];own(s,1,1,'고블린',20);s.tiles[1].level=3;
 play(s,'cast',0);play(s,'targetLand',1);assert.equal(s.tiles[1].owner,-1);assert.equal(s.tiles[1].level,3);
}
for(const map of ['market','dunnan'])for(const count of [2,3,4]){
 for(let match=0;match<12;match++){
  let s=g.start(count,0,5000,map,g.presets.fire),n=0;
  while(s.phase!=='over'&&n++<5000){
   const a=g.ai(s);assert.ok(a,s.phase);play(s,...a);if(n===24)s=JSON.parse(JSON.stringify(s));
  }
  assert.ok(s.winner>=0,map+' stalled');assert.ok(g.total(s,s.winner)>=5000);
 }
 console.log(map,count,'12 matches OK');
}
