const assert=require('node:assert/strict');
const C=require('../dist/cept-engine'),room=require('../dist/cept-room-state');
const original=C.cards.filter(c=>c.catalog);
assert.equal(original.length,492);
assert.deepEqual(original.filter(c=>c.catalogOnly).map(c=>c.name),[]);
assert.deepEqual(original.filter(c=>c.generatedOnly).map(C.combo.key).sort(),['bundlegear','carbunfly','gooba']);
const id=name=>{
  const index=C.cards.findIndex(c=>C.combo.key(c)===name);
  assert.ok(index>=0,name);return index;
};
const play=(s,...a)=>assert.ok(C.play(s,a),s.phase+' '+a);
function put(s,at,name,owner=0){
  const key=id(name),tile=s.tiles[at];
  return Object.assign(tile,{type:2,owner,unit:{id:key,hp:C.cards[key].hp}});
}
function setup(name){
  const s=C.start(4,4,5000,'classic',C.presets.fire,C.presets.fire,2,'teams');
  s.phase='land';s.players[0].cash=2000;put(s,1,name);return s;
}
function ability(s,kind,at){
  play(s,'ability',1);
  if(kind)play(s,kind,at);
}
{
  const s=setup('bookworm'),victim=s.players[1];
  victim.hand=[id('hydra'),id('manna')];ability(s,'abilityPlayer',1);
  assert.equal(s.phase,'bookWorm');assert.equal(s.players[0].cash,1960);
  assert.deepEqual(room.view(C,s,0).game.players[1].hand,victim.hand);
  assert.deepEqual(room.view(C,s,2).game.players[1].hand,[]);
  victim.book.push(id('goblin'));
  play(s,'wormDiscard',0);assert.deepEqual(victim.hand,[id('manna'),id('goblin')]);assert.equal(s.turn,1);
}
for(const [caster,effect] of [['domovoi','phantasm'],['hyde','paralysis']]){
  const s=setup(caster),t=put(s,2,'goblin',1);
  ability(s,'abilityLand',2);assert.equal(t.unit.enchant,effect);
}
{
  const s=setup('archbishop'),t=put(s,2,'goblin',1);t.unit.enchant='landprotection';
  ability(s,'abilityLand',2);assert.equal(t.unit.enchant,undefined);
}
{
  const s=setup('astralqueen'),t=put(s,3,'goblin',1);ability(s);assert.equal(t.unit.enchant,'camouflage');
}
{
  const s=setup('dancingdoll');s.prices[0]=17;ability(s);assert.equal(s.prices[0],13);
}
{
  const s=setup('sharazad'),p=s.players[2];p.antiMagic=true;p.status='lifeforce';p.word=2;
  ability(s);assert.ok(!p.antiMagic&&!p.status&&p.word==null);
}
{
  const s=setup('algasphere');s.tiles[1].unit.mhp=75;s.tiles[1].unit.hp=60;
  ability(s);assert.equal(s.tiles[1].unit.mhp,80);assert.equal(s.tiles[1].unit.hp,65);
}
{
  const s=setup('fate'),size=s.players[0].hand.length;ability(s);assert.equal(s.players[0].hand.length,size+1);
}
{
  const s=setup('barometz');s.players[0].lap=2;ability(s);assert.equal(s.players[0].cash,2090);
}
{
  const s=setup('holyllama');ability(s,'abilityPlayer',2);assert.equal(s.players[2].word,6);
}
{
  const s=setup('clockworkowl');ability(s,'abilityPlayer',1);Object.assign(s.players[1],{dir:1,pos:2,previous:1,word:1});
  play(s,'roll');assert.equal(s.phase,'direction');assert.equal(s.players[1].chooseDirection,undefined);
}
{
  const s=setup('fanatic'),victim=put(s,2,'mephistopheles',1);victim.unit.hp=20;
  s.players[2].status='soulsteal';ability(s,'abilityLand',2);
  assert.equal(s.destroyedCount,2);assert.equal(s.tiles[1].unit,null);assert.equal(victim.unit,null);
  assert.equal(s.players[0].cash,1740);assert.equal(s.players[2].cash,300);
}
{
  const s=setup('archer'),victim=put(s,2,'goblin',1);put(s,3,'crayidol',1);
  put(s,4,'goblin',2);s.phase='territoryTarget';s.abilityFrom=1;
  assert.ok(!C.choices(s).some(([,target])=>target===4));s.phase='land';
  ability(s,'abilityLand',2);assert.equal(victim.unit.hp,30);
}
{
  const s=setup('healer');put(s,2,'goblin',1).unit.hp=1;put(s,3,'goblin',2).unit.hp=5;
  play(s,'ability',1);assert.deepEqual(C.ai(s),['abilityLand',3]);
}
{
  const s=setup('healer'),victim=put(s,2,'odradek',1);victim.unit.hp=1;
  ability(s,'abilityLand',2);assert.equal(victim.unit.hp,1);
}
{
  const s=setup('banshee'),immune=put(s,2,'odradek',1),normal=put(s,3,'goblin',1);
  ability(s);assert.equal(immune.unit.hp,C.cards[id('odradek')].hp);assert.equal(normal.unit.hp,23);
}
{
  const s=setup('quakebeast'),adjacent=C.board(s).links[1].find(i=>i!==0);
  const t=put(s,adjacent,'goblin',1);t.level=3;ability(s);assert.equal(t.level,2);assert.equal(s.tiles[1].unit,null);
}
{
  const s=setup('quakebeast');put(s,4,'jadeidol',1);const t=put(s,2,'goblin',1);t.level=3;
  ability(s);assert.equal(t.level,3);
}
{
  const s=setup('holyllama');put(s,3,'ebonyidol',1);assert.ok(!C.choices(s).some(a=>a[0]==='ability'));
  s.tiles[1].unit.id=id('goldentotem');assert.ok(!C.choices(s).some(a=>a[0]==='totem'));
}
{
  const s=setup('ivoryidol'),p=s.players[0],c=C.cards[id('colossus')];
  assert.equal(C.price(p,c,s),240);p.status='lifeforce';assert.equal(C.price(p,c,s),120);
  s.phase='spell';p.hand=[id('manna')];assert.deepEqual(C.choices(s),[['roll']]);
}
{
  const s=setup('goldidol'),p=s.players[0];p.pos=2;s.tiles[2].type=0;p.hand=[id('mephistopheles')];
  play(s,'summon',0);assert.equal(s.tiles[2].unit.id,id('mephistopheles'));
  s.turn=0;s.phase='land';p.pos=3;s.tiles[3].type=0;p.hand=[id('megarodon')];
  assert.ok(!C.choices(s).some(a=>a[0]==='summon'));
}
{
  const s=setup('ironidol');s.phase='spell';play(s,'roll');assert.ok(s.die>=4&&s.die<=6);
  s.phase='roll';s.players[0].word=1;play(s,'roll');assert.equal(s.die,1);
}
{
  const s=setup('trampleweed');assert.ok(!C.choices(s).some(a=>a[0]==='level'&&a[1]===1));
}
{
  const s=setup('colossus');const p=s.players[0];s.tiles[1].unit.hp=1;
  p.pos=1;p.previous=null;p.flags=C.board(s).forts.slice();s.remaining=1;s.phase='fork';
  play(s,'route',0);assert.equal(s.tiles[1].unit.hp,1);
}
{
  const s=setup('blynx');s.tiles[6].type=0;s.tiles[6].area=s.tiles[1].area;
  assert.ok(C.choices(s).some(([k,x,y])=>k==='transfer'&&x===1&&y===6));
}
{
  const s=setup('bundlegear'),p=s.players[0];p.hand=[id('livingspear'),id('livingsword'),id('longsword')];
  s.battle={at:1,inv:id('colossus')};s.phase='attack';
  assert.deepEqual(C.choices(s),[['equip',0],['equip',1],['bare']]);
  assert.ok(C.cards[id('bundlegear')].generatedOnly);assert.ok(!C.validBook([id('bundlegear'),...C.presets.fire.slice(1)]));
}
{
  const s=setup('barometz');put(s,3,'goblin',1);s.players[1].cash=-20;ability(s);
  assert.equal(s.phase,'sell');assert.equal(C.actor(s),1);
  play(s,'sell',3);assert.equal(s.turn,1);assert.equal(s.phase,'spell');
}
console.log('PS2 territory commands, global idols, creature movement, debt settlement and private hand selection passed.');
