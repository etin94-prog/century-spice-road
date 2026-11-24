const assert=require('node:assert/strict');
const C=require('../dist/cept-engine');
let seed=1969;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const id=name=>C.cards.findIndex(c=>C.combo.key(c)===name);
const card=name=>C.cards[id(name)];
const land=(s,j,n,owner)=>Object.assign(s.tiles[j],{type:card(n).element,owner,unit:{id:id(n),hp:card(n).hp}});
const play=(s,...a)=>assert.ok(C.play(s,a),s.phase+' '+a);
const cast=(s,n,target)=>{s.phase='spell';s.players[s.turn].hand.unshift(id(n));play(s,'cast',0);if(s.phase==='sacrifice')play(s,'sacrifice',1);if(target)play(s,...target);};
assert.equal(C.combo.recipes.length,108);
assert.equal(C.combo.matches(C.combo.recipes[70],['catastrophe']),false);
assert.equal(C.combo.matches(C.combo.recipes[4],['gnome','greed']),true);
{
 const s=C.start(2,0,3000,'classic',C.practiceBook(4),C.practiceBook(4),2);
 land(s,1,'boggart',0);land(s,2,'goblin',1);s.players[0].hand=[id('greed')];
 const toll=C.toll(s,s.tiles[1]);assert.deepEqual(C.ai(s),['cast',0]);play(s,...C.ai(s));
 assert.deepEqual(C.ai(s),['targetLand',1]);play(s,...C.ai(s));assert.equal(C.toll(s,s.tiles[1]),toll*1.5);
}
{
 const s=C.start(2,2);s.players[0].cash=2000;land(s,1,'goldentotem',0);
 cast(s,'soulhunt',['targetLand',1]);s.phase='land';const cash=s.players[0].cash;play(s,'totem',1);
 assert.equal(s.players[0].cash-cash,450);s.turn=0;cast(s,'raisedead');assert.ok(s.players[0].hand.includes(id('goldentotem')));
}
{
 const s=C.start(2,2);s.players[0].cash=1000;land(s,1,'gascloud',0);
 cast(s,'mutation',['targetLand',1]);assert.equal(s.tiles[1].unit.mhp,50);assert.equal(s.tiles[1].unit.poisoned,true);
 cast(s,'vitality',['targetLand',1]);assert.ok(!s.tiles[1].unit.poisoned);
 cast(s,'catastrophe');assert.equal(s.tiles[1].unit.hp,25);cast(s,'catastrophe');assert.equal(s.tiles[1].unit,null);
}
{
 const s=C.start(2,0,3000,'classic',C.practiceBook(41),C.practiceBook(41),3);
 land(s,1,'goblin',1);land(s,4,'sprite',0);s.players[0].hand=[id('leprechaun'),id('dynamite'),id('goblin')];s.players[1].hand=[];
 s.players[0].cash=500;s.players[0].pos=1;s.phase='land';play(s,'invade',0);play(s,'sacrifice',2);
 assert.deepEqual(C.ai(s),['equip',0]);play(s,...C.ai(s));play(s,'bare');
 assert.ok(s.battle.finalHP[1]<=0);assert.ok(!s.players[0].hand.length);
}
{
 const s=C.start(2,2);land(s,1,'kelpie',1);s.players[0].word=5;play(s,'roll');play(s,'direction',1);assert.equal(s.players[0].pos,1);
 cast(s,'holyword0',['targetPlayer',0]);play(s,'roll');assert.equal(s.phase,'land');assert.equal(s.players[0].pos,1);
}
// Start at the public equipment decision to isolate each interaction from the dice.
function fight(att,guard,attackGear,guardGear,setup=()=>{}){
 const s=C.start(2,2);s.players.forEach(p=>{p.cash=1000;p.hand=[];});
 land(s,1,guard,1);s.tiles[1].type='무속성';s.players[0].pos=1;
 s.battle={at:1,inv:id(att),atkItem:null,defItem:null};s.phase='attack';setup(s);
 for(const [gear,seat] of [[attackGear,0],[guardGear,1]]){
   if(gear){s.players[seat].hand.unshift(id(gear));play(s,'equip',0);}else play(s,'bare');
 }
 return s;
}
assert.equal(fight('executor','caitsith',null,'buckler').battle.finalHP[1],30);
assert.equal(fight('goblin','caitsith',null,'buckler').battle.finalHP[1],30);
assert.equal(fight('cerberus','goblin','rathunter').battle.finalHP[1],0);
assert.equal(fight('executor','cornfolk',null,'goldengoose').players[1].cash,1600-card('goldengoose').cost);
assert.equal(fight('executor','mermecoleo').tiles[1].unit.id,id('dragonfly'));
assert.equal(fight('executor','zombie',null,'necroscarab').tiles[1].unit.id,id('zombie'));
assert.equal(fight('goblin','leshy',null,'silverplow').tiles[1].level,3);
assert.equal(fight('goblin','centaur',null,'stormcauser').players[1].book[0],id('stormcauser'));
assert.equal(fight('goblin','phoenix',null,'dynamite').players[1].hand[0],id('phoenix'));
assert.equal(fight('goblin','lunatichare',null,'ringofthesuccubus').battle.finalHP[0],0);
assert.equal(fight('executor','migoal',null,'dragonhelm',s=>{s.battle.inv=id('grendel');}).battle.finalHP[1],card('migoal').hp);
assert.equal(fight('executor','sonascetic',null,'decoy').battle.strikes[0].effect,'reflect');
assert.equal(fight('goblin','bloodypudding',null,'behemoth').tiles[1].unit.mhp,80);
{
 const s=fight('nightfiend','goblin',null,null,s=>{s.tiles[1].level=5;s.tiles[1].unit.enchant='antielement';});
 assert.equal(s.battle.attackST,card('nightfiend').st+100);assert.equal(s.battle.landHP,0);
}
{
 const s=C.start(2,2);s.players[0].cash=3000;land(s,1,'gascloud',0);land(s,2,'goblin',1);
 cast(s,'massphantasm',['comboArea',s.tiles[1].area]);cast(s,'invisibility');cast(s,'tempest');
 assert.equal(s.tiles[1].unit.hp,card('gascloud').hp);
 cast(s,'mutation',['targetLand',1]);cast(s,'exorcism',['comboArea',s.tiles[1].area]);
 assert.equal(s.tiles[1].unit.mhp,60);assert.ok(!C.combo.enchanted(s.tiles[1].unit));
 cast(s,'temperance',['targetLand',1]);cast(s,'sculpture',['comboArea',s.tiles[1].area]);assert.equal(s.tiles[1].unit.id,id('statue'));
}
{
 const s=C.start(2,2);s.players[0].cash=1000;land(s,1,'goblin',0);land(s,2,'powdereater',0);
 cast(s,'demonictrade');assert.equal(s.players[0].cash,1200-card('demonictrade').cost);
 cast(s,'demonictrade');assert.equal(s.players[0].cash,1400-2*card('demonictrade').cost);
}
{
 const s=C.start(2,2);s.players[0].cash=1000;const enemy=s.players[1];enemy.symbols[0]=10;
 cast(s,'aurora');cast(s,'grace',['targetPlayer',1]);assert.equal(s.prices[0],12);
 assert.equal(s.players[0].cash,1000-card('aurora').cost-card('grace').cost+18);
 cast(s,'wizardeye',['targetPlayer',1]);const seen=s.players[0].peek.ids;
 assert.deepEqual(seen,enemy.book.slice(-6).reverse());const old=enemy.book.slice();
 cast(s,'mindseeker',['targetPlayer',1]);play(s,'eraseDraw',2);old.splice(-3,1);assert.deepEqual(enemy.book,old);
}
for(let i=0;i<108;i++){
 const book=C.practiceBook(i);assert.ok(C.validBook(book),'book '+(i+1));
 assert.ok(C.combo.matches(C.combo.recipes[i],book.map(v=>C.combo.key(C.cards[v]))),'recipe '+(i+1));
 const s=C.start(2,0,3000,'market',book,C.practiceBook((i+1)%108),2);let steps=0;
 while(s.phase!=='over'&&steps++<10000){
   const action=C.ai(s);assert.ok(action,'no action '+(i+1)+' '+s.phase);play(s,...action);
   assert.ok(s.players.every(p=>Number.isFinite(p.cash)),'cash '+i);
 }
 assert.ok(s.winner>=0,'no winner for combo '+(i+1));
}
console.log('108 combo practice books and seeded matches completed; targeted effect and AI scenarios passed.');
