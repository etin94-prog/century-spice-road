const assert=require('node:assert/strict');
const C=require('../dist/cept-engine'),spells=require('../dist/cept-extra-spells'),room=require('../dist/cept-room-state');
const {key}=C.combo;
const id=n=>{const i=C.cards.findIndex(c=>key(c)===n);assert.ok(i>=0,n);return i;};
const played=new Set();
function game(){
  const s=C.start(4,4,12000,'classic',C.presets.fire,C.presets.fire,3,'teams');
  for(const q of s.players){q.cash=2000;q.hand=[id('goblin'),id('manna'),id('buckler')];q.book=Array(10).fill(id('goblin'));}
  return s;
}
function put(s,n,name,owner,level=1){
  const i=id(name),t=s.tiles[n];t.owner=owner;t.level=level;t.unit={id:i,hp:C.cards[i].hp};return t;
}
function act(s,k,x,y){
  const a=C.choices(s).find(([kind,j,z])=>kind===k&&(x===undefined||j===x)&&(y===undefined||z===y));
  assert.ok(a,s.phase+' '+JSON.stringify([k,x,y])+' valid='+JSON.stringify(C.choices(s)));
  assert.ok(C.play(s,a));return a;
}
function cast(s,n,target){
  const p=s.players[s.turn];s.phase='spell';p.hand.unshift(id(n));played.add(n);
  act(s,'cast',0);if(s.phase==='sacrifice')act(s,'sacrifice',p.hand.length-1);
  if(target!==undefined)act(s,s.spellEffect&&spells.type[n]==='player'?'targetPlayer':'targetLand',target);
}
function withRandom(n,fn){const original=Math.random;try{Math.random=()=>n;fn();}finally{Math.random=original;}}
for(const [n,type] of Object.entries({upheaval:0,sink:1,wildgrowth:2,weathering:3,quintessence:'복합'})){
  const s=game(),t=put(s,1,'goblin',1);cast(s,n);assert.ok(C.choices(s).every(([,at])=>s.tiles[at].unit));
  act(s,'targetLand',1);assert.equal(t.type,type);assert.equal(t.owner,1);
}
for(const [n,enchant] of Object.entries({bindingmist:'paralysis',dullness:'dullness',parasite:'parasite',phantasm:'phantasm',simulacrum:'simulacrum',spiritwalk:'spiritwalk',thornfetter:'thornfetter',wing:'wing',magicfountain:'magicfountain'})){
  const s=game(),t=put(s,1,'goblin',1);t.unit.poisoned=true;cast(s,n,1);assert.equal(t.unit.enchant,enchant);assert.equal(t.unit.poisoned,undefined);
}
for(const n of ['banishingray','bistair','locust','meteor','polymorph','influence','removecurse']){
  const s=game(),t=put(s,2,'goblin',1,5);put(s,1,'goblin',0);put(s,6,'goblin',1);put(s,10,'goblin',1);
  t.unit.enchant='parasite';cast(s,n,2);
  if(n==='banishingray')assert.equal(t.owner,-1);
  if(n==='bistair')assert.equal(t.unit.hp,20);
  if(n==='locust'||n==='meteor')assert.equal(t.level,n==='locust'?4:1);
  if(n==='polymorph'){assert.notEqual(t.unit.id,id('goblin'));assert.equal(t.unit.hp,C.cards[t.unit.id].hp);}
  if(n==='influence')assert.equal(t.type,0);if(n==='removecurse')assert.equal(t.unit.enchant,undefined);
}
for(const [n,wall] of [['goblin','statue'],['hellhound','pillarofflame'],['kingtortoise','wallofice'],['dryad','wallofstone'],['hornet','hurricane']]){
  const s=game(),t=put(s,1,n,1);cast(s,'turntothewall',1);assert.equal(t.unit.id,id(wall));
}
{
 const s=game(),t=put(s,1,'goblin',0);cast(s,'chariot',1);assert.equal(s.players[0].book[0],id('chariot'));assert.ok(C.choices(s).some(a=>a[1]===3));act(s,'teleTo',3);assert.equal(s.tiles[3].unit.id,id('goblin'));assert.equal(t.unit,null);assert.equal(s.phase,'roll');
}
{
 const s=game(),t=put(s,1,'skeleton',1);cast(s,'replace',1);const action=C.choices(s)[0];assert.deepEqual(action,['replaceCard',0,id('goblin')]);assert.deepEqual(room.view(C,s,0).choices,[action]);assert.deepEqual(room.view(C,s,2).choices,[]);
 act(s,'replaceCard',0);assert.equal(t.unit.id,id('goblin'));assert.equal(s.players[1].hand[0],id('skeleton'));
}
for(const n of ['babble','barrier','bind','blackout','fairylight','haunt','lifeforce','torture','backward','holyword2','dispelmagic']){
 const s=game(),q=s.players[1];q.word=6;cast(s,n,1);
 if(n==='holyword2')assert.equal(q.word,2);
 else if(n==='backward')assert.ok(q.reverse);
 else if(n==='dispelmagic')assert.equal(q.word,undefined);
 else{assert.equal(q.status,n);assert.equal(q.word,undefined);}
 if(n==='blackout')assert.equal(C.toll(s,put(s,1,'goblin',1)),0);
 if(n==='haunt')assert.ok(C.isComputer(s,1));
 if(n==='babble')assert.equal(s.players[0].book[0],id(n));
}
{
 const s=game(),q=s.players[1];q.symbols[0]=14;q.symbols[1]=2;cast(s,'corruption',1);assert.equal(q.cash,1840);
 cast(s,'eclipse',1);assert.deepEqual(q.symbols.slice(0,2),[0,2]);assert.equal(q.cash,1980);
}
for(const [r,victim] of [[.1,1],[.9,0]]){
 const s=game();withRandom(r,()=>cast(s,'judgment',1));assert.equal(s.players[victim].cash,victim?400:380);
}
{
 const s=game(),q=s.players[1];q.book=[id('soltis')];q.template=Array(50).fill(id('goblin'));cast(s,'revival',1);assert.deepEqual(q.book,q.template);
 cast(s,'rust',1);assert.ok(q.hand.every(i=>C.cards[i].kind!=='item'));cast(s,'ruin',1);assert.ok([q,s.players[0]].every(w=>w.hand.every(i=>C.cards[i].kind!=='spell')));
}
{
 const s=game(),q=s.players[1];q.hand=[id('mesmerize'),id('goblin'),id('soulsteal')];cast(s,'mesmerize',1);
 assert.deepEqual(room.view(C,s,0).choices,[['mesmerCard',2,id('soulsteal')]]);assert.deepEqual(room.view(C,s,2).choices,[]);
 act(s,'mesmerCard',2);assert.equal(s.players[0].status,'soulsteal');assert.equal(s.players[0].cash,1900);assert.equal(q.hand.length,2);
}
{
 const s=game(),t=put(s,1,'goblin',1,5),other=put(s,2,'skeleton',1,3);cast(s,'subsidence',1);assert.equal(t.level,4);assert.equal(other.level,3);
}
for(const n of ['acidrain','avalanche','elementalrage','energyflash']){
 const s=game(),t=put(s,1,n==='acidrain'?'wallofice':'goblin',1,n==='avalanche'?5:1),u=put(s,3,'skeleton',0,2);const hp=t.unit.hp;
 cast(s,n);if(n==='energyflash'){assert.equal(t.unit,null);assert.ok(u.unit);}else if(n==='avalanche')assert.equal(t.unit,null);else assert.equal(t.unit.hp,n==='acidrain'?hp-30:Math.floor(hp/2));assert.ok(s.mapEffect.hits?.length,n);
}
{
 const s=game();s.players[1].symbols[0]=20;s.players[2].symbols[1]=12;cast(s,'darkcraft');assert.equal(s.players[1].symbols[0],14);assert.equal(s.players[2].symbols[1],12);
 const t=put(s,1,'goblin',0);t.unit.poisoned=true;s.players[2].status='bind';cast(s,'erasure');assert.equal(t.unit.poisoned,undefined);assert.equal(s.players[2].status,undefined);
}
for(const [n,element] of Object.entries({forestleap:2,lakeleap:1,mountainleap:0,plainleap:3})){
 const s=game();cast(s,n);assert.equal(s.tiles[s.players[0].pos].type,element);assert.equal(s.phase,'land');
}
{
 const s=game();cast(s,'escape');assert.ok(s.players[0].pos!==0);cast(s,'teleport');assert.ok(typeof s.tiles[s.players[0].pos].type==='string');
 s.players[2].pos=5;cast(s,'aports');assert.ok(s.players.every(q=>q.pos===s.players[0].pos));assert.equal(s.phase,'land');
}
{
 const s=game(),p=s.players[0];p.hand=Array(6).fill(id('skeleton'));cast(s,'find');assert.equal(p.hand.at(-1),id('find'));assert.equal(s.phase,'discard');while(s.phase==='discard')act(s,'discard',0);assert.equal(s.phase,'roll');
 p.book=[id('manna'),id('soltis'),id('goblin')];p.hand=[];cast(s,'foresight');
 assert.deepEqual(room.view(C,s,0).choices.map(a=>a[2]),[id('goblin'),id('soltis'),id('manna')]);assert.deepEqual(room.view(C,s,1).choices,[]);
 act(s,'foresightCard',1);assert.deepEqual(p.hand,[id('soltis')]);assert.deepEqual(p.book,[id('manna'),id('goblin')]);
 cast(s,'prophecy');act(s,'prophecyKind','spell');assert.deepEqual(p.hand,[id('soltis'),id('manna')]);
 p.book=Array(5).fill(id('skeleton'));cast(s,'reincarnation');assert.deepEqual(p.hand,[id('skeleton'),id('skeleton')]);
}
{
 const s=game(),p=s.players[0],t=put(s,3,'skeleton',0);t.unit.hp=1;cast(s,'lifestream');assert.equal(t.unit.hp,40);
 cast(s,'massgrowth');assert.equal(t.unit.mhp,45);assert.equal(t.unit.hp,45);
 put(s,8,'goblin',0);const before=p.cash;cast(s,'selenear');assert.equal(p.cash,before+150);
 cast(s,'lightcraft');assert.ok(s.players.every(q=>q.hand.length===5&&q.book.length===45));p.hand=[id('meteor')];s.players[1].hand=[id('meteor'),id('goblin')];cast(s,'rayoflaw');assert.deepEqual(p.hand,[]);assert.deepEqual(s.players[1].hand,[id('goblin')]);
}
{
 const s=game(),p=s.players[0];cast(s,'soulsteal');put(s,1,'goblin',1);cast(s,'energyflash');assert.equal(s.destroyedCount,1);assert.equal(p.cash,1940);cast(s,'incineration');assert.equal(s.destroyedCount,0);assert.equal(p.cash,1950);
 cast(s,'spartoi');assert.ok(s.tiles.some(t=>t.owner===0&&t.unit.id===id('skeleton')));
}
for(const n of ['revelation','telegnosis','mistletoe','triumph']){
 const s=game(),p=s.players[0],t=put(s,3,'goblin',0);cast(s,n);assert.equal(p.status,['revelation','telegnosis'].includes(n)?'enlightenment':n);
 if(n==='telegnosis'||n==='revelation'){p.pos=5;s.phase='land';assert.ok(C.choices(s).some(a=>a[0]==='level'&&a[1]===3));}
 if(n==='mistletoe'){const before=p.cash;p.word=6;act(s,'roll');assert.equal(p.cash,before+50);}
 if(n==='triumph'){p.pos=15;p.dir=1;p.previous=14;p.word=1;p.flags=[...C.board(s).forts];const before=p.cash;act(s,'roll');assert.equal(p.status,undefined);assert.equal(p.cash-before,Math.floor(1.5*(C.board(s).bonus+20)));}
}
for(const power of Object.keys(spells.soltis)){
 const s=game(),p=s.players[0],t=put(s,1,'skeleton',0),enemy=put(s,2,'goblin',1);t.unit.hp=22;t.unit.enchant='thornfetter';p.hand=[];
 const before=p.cash,rank=C.total(s,1)>C.total(s,0)-80?2:1;
 cast(s,'soltis');assert.equal(C.choices(s).length,7);act(s,'soltisPower',power);
 if(power==='lifeflow'){assert.equal(s.phase,'soltisArea');act(s,'soltisArea',t.area);assert.equal(t.unit.hp,40);}
 if(power==='goodluck')assert.equal(C.owedToll(s,enemy),0);if(power==='purify')assert.equal(t.unit.enchant,undefined);
 if(power==='hope')assert.equal(p.hand.length,2);if(power==='depression')assert.equal(s.prices[0],8);
 if(power==='suffocate')assert.equal(t.unit.hp,12);if(power==='affection')assert.equal(p.cash,before-80+rank*200);
}
// Time and territory effects are checked through actual turn, toll and move commands.
{
 const s=game(),p=s.players[0],q=s.players[1];q.pos=2;put(s,2,'goblin',3,5);cast(s,'bind',1);s.phase='land';act(s,'pass');
 assert.deepEqual(C.choices(s),[['roll']]);const cash=q.cash;act(s,'roll');assert.equal(q.pos,2);assert.equal(q.cash,cash);assert.equal(s.turn,2);
 for(const seat of [2,3]){s.phase='land';s.players[seat].pos=0;act(s,'pass');}assert.equal(q.status,undefined);
 cast(s,'barrier',1);cast(s,'holyword2');assert.ok(C.choices(s).every(([,j])=>j!==1));act(s,'targetPlayer',0);
 cast(s,'dispelmagic',1);assert.equal(q.status,undefined);cast(s,'fairylight',1);s.phase='land';p.pos=0;const old=q.cash,hand=q.hand.length;act(s,'pass');assert.equal(q.cash-old,hand*10);
 q.pos=15;q.previous=14;q.dir=1;q.word=1;s.phase='roll';act(s,'roll');assert.equal(q.status,undefined);
}
{
 const s=game(),t=put(s,1,'goblin',0);cast(s,'spiritwalk',1);s.players[0].pos=0;s.phase='land';assert.ok(C.choices(s).some(a=>a[0]==='transfer'&&a[1]===1&&a[2]===6));
 cast(s,'thornfetter',1);s.phase='land';assert.ok(!C.choices(s).some(a=>a[0]==='transfer'&&a[1]===1));
 cast(s,'magicfountain',1);s.players[0].pos=0;s.players[0].previous=15;s.players[0].dir=1;s.players[0].word=1;const before=s.players[0].cash;act(s,'roll');assert.equal(s.players[0].cash-before,400);assert.equal(t.unit.enchant,undefined);
}
{
 const s=game(),p=s.players[0];s.players[1].hand=[id('meteor'),id('manna')];s.players[3].hand=[id('buckler'),id('buckler'),id('buckler')];p.hand=[id('rust'),id('skeleton')];p.ai=true;
 assert.deepEqual(C.ai(s),['cast',0]);act(s,...C.ai(s));act(s,...C.ai(s));assert.deepEqual(C.ai(s),['targetPlayer',3]);act(s,...C.ai(s));assert.equal(s.players[3].hand.length,0);
}
assert.deepEqual([...played].sort(),Object.keys(spells.type).sort());
console.log(played.size+' PS2 spell casts verified, including seven Soltis powers, target phases, alliances and room privacy.');
