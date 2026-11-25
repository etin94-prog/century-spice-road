const assert=require('node:assert/strict'),C=require('../dist/cept-engine');
const id=n=>C.cards.findIndex(c=>C.combo.key(c)===n);
const own=(s,j,seat,n)=>Object.assign(s.tiles[j],{owner:seat,unit:{id:id(n),hp:C.cards[id(n)].hp}});
const action=(s,...a)=>assert.ok(C.play(s,a),s.phase+' '+a);
const s=C.start(4,1,0,'ps2-8',C.presets.fire,'story',2);
assert.deepEqual(s.teams,[0,1,0,1]);
assert.deepEqual(s.players.slice(1).map(p=>p.name),['Ryvern · Conserve','Selena · Castle Guard','Zagol · Beat You!']);
for(const p of s.players)assert.ok(C.validBook(p.template));
own(s,1,0,'goblin');own(s,2,2,'goblin');
for(const j of [1,2])Object.assign(s.tiles[j],{type:1,area:0,base:100});
assert.equal(C.chain(s,s.tiles[1]),2);
assert.equal(C.total(s,0),700);assert.equal(C.total(s,2),700);assert.equal(C.total(s,1),400);
s.phase='land';s.players[0].pos=2;s.players[0].hand=[id('goblin')];
assert.ok(!C.choices(s).some(([k])=>k==='pay'));assert.ok(C.choices(s).some(([k])=>k==='invade'));
assert.ok(!C.choices(s).some(([k,j])=>k==='level'&&j===2));
assert.deepEqual(C.ai(s),['pass']);action(s,'pass');assert.equal(s.players[0].cash,200);
s.turn=0;s.phase='spell';s.players[0].hand=[id('drainmagic')];action(s,'cast',0);assert.deepEqual(C.choices(s),[['targetPlayer',1],['targetPlayer',3]]);
s.turn=2;s.players[0].cash=s.target;s.phase='fork';const toward=C.board(s).links[0][0];
s.players[2].pos=toward;s.players[2].previous=null;s.remaining=1;action(s,'route',0);
assert.equal(s.winner,2);assert.ok(C.allied(s,s.winner,0));
assert.equal(C.start(4,0,0,'ps2-8',C.presets.fire,C.presets.fire,2,'duel').teams,null);
assert.throws(()=>C.start(3,1,5000,'classic',C.presets.fire,C.presets.fire,2,'teams'));
const game=C.start(2,0,5000,'classic',C.presets.fire,C.presets.fire,3),p=game.players[0];
own(game,1,1,'goblin');game.tiles[1].level=5;game.phase='direction';game.die=1;p.pos=0;
assert.deepEqual(C.ai(game),['direction',-1]);
own(game,1,1,'goblin');game.tiles[1].type=2;game.tiles[1].level=1;game.phase='land';p.pos=1;p.hand=[id('fighter')];p.cash=1000;
assert.deepEqual(C.ai(game),['invade',0]);action(game,'invade',0);
action(game,'bare');game.players[1].hand=[id('petrifystone')];
assert.deepEqual(C.ai(game),['equip',0]);action(game,'equip',0);assert.equal(game.battle.startHP[1],80);
game.phase='defend';game.battle={at:1,inv:id('goblin'),atkItem:null};own(game,1,1,'knight');game.players[1].hand=[id('vestment')];
assert.deepEqual(C.ai(game),['bare']);
console.log('Alliance, three exact story books, team castle victory, toll avoidance, invasion and defensive item decisions OK');


for(const [stage,cast,ally] of [[14,'story','Selena · Castle Guard'],[14,'story-leo','Leo · Revenge'],[15,'story','Selena · Castle Guard']]){
 const g=C.start(4,0,0,'ps2-'+stage,C.presets.fire,cast,2);
 assert.equal(g.players[2].name,ally);
 for(let j=0;j<12000&&g.winner<0;j++)action(g,...C.ai(g));
 assert.ok(g.winner>=0&&C.total(g,g.winner)>=g.target);
}

const finish=C.start(4,0,5000,'classic',C.presets.fire,C.presets.fire,2,'teams');
Object.assign(finish.players[0],{pos:4,previous:3,cash:4800,hand:[id('holyword6')]});
Object.assign(finish.players[2],{pos:14,previous:13});
assert.deepEqual(C.ai(finish),['cast',0]);action(finish,'cast',0);
assert.deepEqual(C.ai(finish),['targetPlayer',2]);

function battle(att,def,atkGear,defGear){
 const g=C.start(2,2);own(g,1,1,def);g.tiles[1].type='무속성';
 g.players[0].cash=g.players[1].cash=1000;
 g.players[0].hand=atkGear?[id(atkGear)]:[];g.players[1].hand=defGear?[id(defGear)]:[];
 g.battle={at:1,inv:id(att),atkItem:null,defItem:null};g.phase='attack';
 for(const gear of [atkGear,defGear])if(gear)action(g,'equip',0);else action(g,'bare');
 return g;
}
assert.equal(battle('goblin','carbuncle','windcutter').battle.strikes[0].effect,'reflect');
assert.equal(battle('wereboar','goblin').battle.attackST,C.cards[id('wereboar')].st+30);
assert.equal(battle('thief','goblin',null,'petrifystone').battle.startHP[0],80);
assert.equal(battle('hellhound','kelpie').battle.strikes[0].hp[1],C.cards[id('kelpie')].hp-Math.floor(C.cards[id('hellhound')].st/2));

assert.equal(battle('nightmare','bunyip').battle.strikes[0].effect,'block');
assert.ok(battle('goblin','bunyip').battle.strikes[0].hp[1]<C.cards[id('bunyip')].hp);
