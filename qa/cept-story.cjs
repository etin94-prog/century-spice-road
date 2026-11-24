const assert=require('node:assert/strict'),C=require('../dist/cept-engine');
const id=n=>C.cards.findIndex(c=>C.combo.key(c)===n);
for(const [stage,goal] of [5000,6000,6000,8000,8000,8000,9000,9000,9000,8000,9000,9000,9000,9000,10000,12000].entries()){
 const s=C.start(2,2,0,'ps2-'+(stage+1));assert.equal(s.target,goal);assert.equal(s.mapGoal,true);
}
assert.equal(C.start(2,2,3000,'ps2-16').target,3000);
assert.equal(C.start(2,2,0,'ps2-17').target,5000);
const s=C.start(2,2,5000,'market'),p=s.players[0];
function own(i,seat,name){Object.assign(s.tiles[i],{owner:seat,unit:{id:id(name),hp:C.cards[id(name)].hp}});}
function play(...a){assert.ok(C.play(s,a),s.phase+' '+a);}
own(1,0,'kelpie');p.pos=1;p.word=0;p.cash=2000;
play('roll');assert.ok(C.choices(s).some(([k,n])=>k==='level'&&n===1));
assert.ok(C.choices(s).some(([k,n,j])=>k==='transfer'&&n===1&&j===2));
assert.equal(C.levelCost(s.tiles[1],2),100);
p.hand=[id('drainmagic')];s.phase='spell';s.players[1].cash=1001;
play('cast',0);assert.deepEqual(C.choices(s),[['targetPlayer',1]]);play('targetPlayer',1);
assert.equal(p.cash,2220);assert.equal(s.players[1].cash,701);
own(2,1,'goblin');s.tiles[1].level=3;s.tiles[2].level=3;
p.hand=[id('drought'),id('earthshaker'),id('goblin')];s.phase='spell';
play('cast',0);play('targetLand',2);s.phase='spell';play('cast',0);play('sacrifice',1);
assert.equal(s.tiles[1].level,2);assert.equal(s.tiles[2].level,3);assert.equal(s.tiles[3].level,1);
console.log('16 PS2 story targets, custom games, zero-step territory, movement costs and 3 spells OK');
