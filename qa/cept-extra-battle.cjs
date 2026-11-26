const assert=require('node:assert/strict');
const C=require('../dist/cept-engine');
const ids=new Map(C.cards.map((c,id)=>[C.combo.key(c),id]));
const id=name=>{assert.ok(ids.has(name),name);return ids.get(name);};
const card=name=>C.cards[id(name)];
function place(s,index,name,owner){
  Object.assign(s.tiles[index],{owner,unit:{id:id(name),hp:card(name).hp},type:'무속성'});
}
function fight(atk,def,atkGear,defGear,setup=()=>{},roll=.99){
  const s=C.start(2,2,5000,'classic'),saved=Math.random;
  s.players.forEach(p=>{p.cash=5000;p.hand=[];});
  place(s,1,def,1);s.players[0].pos=1;
  s.battle={at:1,inv:id(atk),atkItem:null,defItem:null};s.phase='attack';
  setup(s);
  try{
    Math.random=()=>roll;
    for(const [seat,gear] of [[0,atkGear],[1,defGear]]){
      if(gear)s.players[seat].hand.unshift(id(gear));
      const action=gear?['equip',0]:['bare'];
      assert.ok(C.play(s,action),atk+' vs '+def+' / '+(gear||'bare'));
    }
    assert.equal(s.phase,'result');return s;
  }finally{Math.random=saved;}
}
const first=(...args)=>fight(...args).battle.strikes[0];
const stats=(...args)=>fight(...args).battle;
{
  const survivor=fight('fighter','mummy',null,'necroscarab',s=>{s.tiles[1].unit.hp=1;});
  assert.equal(survivor.tiles[1].unit.id,id('zombie'));
  assert.equal(survivor.battle.finalForms[1],id('zombie'));
  assert.equal(survivor.players[1].cash,5000-card('necroscarab').cost);
  assert.equal(survivor.destroyedCount||0,0);
  const loss=fight('fighter','mummy',null,null,s=>{s.tiles[1].unit.hp=1;});
  assert.equal(loss.players[1].cash,5050);
  assert.equal(loss.destroyedCount,1);
}
{
  const attacks=['watershield','towershield','spikeshield'];
  for(const gear of attacks){
    const attack=gear==='watershield'?'pirate':'fighter';
    assert.equal(first(attack,'goblin','blackorb',gear).effect,'hit');
    const withOrb=first(attack,'goblin','blackorb',gear),bare=first(attack,'goblin','blackorb',null);
    assert.deepEqual(withOrb.hp,bare.hp);
  }
  const vampire=fight('vampire','goblin',null,'spikeshield',s=>{s.battle.invHP=1;});
  assert.equal(vampire.battle.strikes[0].hp[0],0);
}
{
  const s=fight('deathgaze','goblin','longsword',null,game=>{
    game.players[1].book=[id('goblin')];
    game.players[1].template=[id('goblin'),id('fighter')];
  },0);
  assert.deepEqual(s.players[1].bannedCards,[id('goblin')]);
  assert.ok(C.play(s,['continue']));
  assert.deepEqual(s.players[1].hand,[id('fighter')]);
}
assert.equal(stats('fighter','goblin','lanceofodin').attackST,card('fighter').st+50);
assert.equal(stats('fighter','goblin','lanceofodin').startHP[0],card('fighter').hp+10);
assert.equal(stats('fighter','goblin','aurablade').attackST,card('fighter').st+card('fighter').hp);
assert.equal(stats('fighter','goblin','daggerofmite').attackST,card('fighter').st+40);
assert.equal(stats('fighter','goblin','chameleonarmor',null,s=>{s.tiles[1].level=4;}).startHP[0],80);
assert.equal(stats('fighter','goblin','shadowarmor',null,s=>{s.tiles[1].level=4;}).startHP[0],card('fighter').hp+30);
assert.equal(stats('fighter','goblin','iksear',null,s=>{place(s,5,'goblin',0);s.tiles[5].type=1;}).startHP[0],card('fighter').hp+20);
assert.equal(stats('fighter','goblin','prismaticwand').startHP[0],card('fighter').hp);
assert.equal(stats('fighter','kobold','prismaticwand').startHP[0],card('fighter').hp+40);
assert.equal(first('fighter','goblin','tearinghalo').hp[1],0);
assert.equal(first('fighter','dryad','stonehail','magicshield').effect,'block');
assert.equal(first('fighter','dryad','hellblaze','holygrail').effect,'block');
assert.equal(first('fighter','dryad','tearinghalo','magussmirror').effect,'reflect');
assert.equal(first('fighter','goblin','stonehail','rainbowpiece').effect,'block');
assert.equal(first('fighter','goblin','stonehail','smoketorch').effect,'block');
assert.equal(first('fighter','goblin',null,'knightshield').effect,'block');
assert.equal(first('kobold','goblin',null,'fireshield').effect,'block');
assert.equal(first('fighter','goblin',null,'talisman').effect,'block');
assert.equal(fight('fighter','goblin',null,'holygrail').players[1].cash,5000-card('holygrail').cost-2*card('fighter').st);
assert.equal(fight('fighter','goblin','stonehail','holygrail').players[1].cash,5000-card('holygrail').cost);
assert.equal(first('fighter','troll',null,'holygrail').effect,'block');
assert.equal(first('fighter','goblin',null,null,s=>{s.tiles[1].unit.enchant='simulacrum';}).effect,'block');
assert.equal(first('fighter','charon').effect,'block');
assert.equal(first('kobold','salamander').effect,'heal');
assert.equal(first('goblin','grindylow').effect,'block');
assert.equal(first('goblin','kraken').effect,'block');
assert.equal(first('kobold','nymph').effect,'block');
assert.equal(first('fighter','battlegearbeta','stonehail').effect,'block');
assert.ok(stats('fighter','carbunfly','stonehail',null,s=>{s.battle.invHP=100;}).strikes.some(h=>h.side===0&&h.effect==='reflect'));
assert.equal(first('fighter','goblin',null,'wingedboots').side,1);
assert.equal(first('fighter','goblin',null,'earthamulet').side,1);
assert.ok(fight('fighter','goblin',null,'wingedboots').players[1].book.includes(id('wingedboots')));
assert.equal(stats('fighter','goblin','markerflag').markerFlag,true);
assert.ok(fight('fighter','goblin','stinkbottle','holygrail').battle.won);
assert.ok(fight('fighter','goblin','kris','gremlinamulet').battle.attackST>=card('fighter').st+30);
{
  const s=fight('fighter','goblin','bellofchaos','markerflag',s=>{for(const p of s.players){p.hand=[id('markerflag')];p.book=[id('markerflag'),id('goblin')];}});
  assert.ok(s.players.every(p=>!p.hand.includes(id('markerflag'))&&!p.book.includes(id('markerflag'))));
}
assert.equal(stats('fighter','nightmare','amberring',null,s=>{s.tiles[1].unit.hp=80;s.tiles[1].type=3;s.tiles[1].level=4;}).finalHP[1],20);
assert.equal(stats('fighter','kelpie','sapphirering',null,s=>{s.tiles[1].unit.hp=80;s.tiles[1].type=1;s.tiles[1].level=4;}).finalHP[1],20);
assert.equal(first('fighter','kobold','icicle',null,s=>{s.tiles[1].unit.hp=120;}).hp[1],30);
assert.equal(first('fighter','colossus','vorpalsword',null,s=>{s.tiles[1].unit.hp=120;}).hp[1],15);
assert.equal(fight('fighter','greenmold','batteringram',null,s=>{s.tiles[1].unit.hp=120;}).tiles[1].owner,0);
assert.equal(stats('fighter','goblin','sleep',null).strikes[0].hp[1],card('goblin').hp);
assert.equal(fight('fighter','goblin','sleep',null).tiles[1].unit.enchant,'sleep');
assert.equal(fight('fighter','goblin','heartfibula').tiles[1].unit.mhp,card('fighter').hp+20);
assert.equal(fight('fighter','goblin','windamulet').tiles[1].unit.mhp,card('fighter').hp+10);
assert.equal(fight('fighter','goblin','coinofpiety',null,s=>{s.tiles[1].type=0;}).players[0].symbols[0],10);
assert.equal(fight('kobold','goblin','offeringdoll',null,s=>{s.tiles[1].unit.hp=5;}).prices[0],13);
assert.equal(stats('goblin','fighter','venom').finalHP[1],0);
assert.equal(stats('goblin','goblin','trapezon').forms[0],id('baal'));
assert.equal(fight('goblin','goblin','trapezon').tiles[1].unit.id,id('goblin'));
assert.notEqual(stats('fighter','goblin','proteanring').forms[0],id('fighter'));
assert.equal(fight('battlegearalpha','goblin','battlegearbeta').tiles[1].unit.id,id('bundlegear'));
assert.equal(fight('carbuncle','goblin','dragonfly').tiles[1].unit.id,id('carbunfly'));
assert.equal(stats('mysticegg','goblin','kris').forms[0],id('firegiant'));
assert.equal(stats('mysticegg','goblin','kris').attackST,card('firegiant').st);
assert.equal(stats('doppelganger','werewolf').forms[0],id('werewolf'));
assert.equal(stats('ambermosquito','goblin',null,null,()=>{},0).forms[0],id('giantrat'));
assert.equal(fight('medusa','fighter',null,null,s=>{s.tiles[1].unit.hp=100;}).tiles[1].unit.id,id('statue'));
assert.equal(fight('cockatrice','fighter',null,null,s=>{s.tiles[1].unit.hp=100;}).tiles[1].unit.id,id('wallofstone'));
assert.equal(fight('werewolf','fighter',null,null,s=>{s.tiles[1].unit.hp=100;},.1).tiles[1].unit.id,id('wolf'));
{
  const s=fight('littlegray','fighter',null,null,()=>{},.1);
  assert.equal(s.tiles[1].owner,0);assert.equal(s.destroyedCount||0,0);assert.ok(s.tiles.some((t,n)=>n!==1&&t.owner===1&&t.unit.id===id('fighter')));
}
{
  const s=fight('bard','fighter');
  assert.equal(s.tiles[1].owner,1);assert.equal(s.destroyedCount||0,0);assert.ok(s.tiles.some((t,n)=>n!==1&&t.unit?.id===id('bard')));
}
{
  const s=fight('nymph','goblin',null,null,()=>{},.1);
  assert.ok(s.players[0].hand.includes(id('goblin')));assert.equal(s.destroyedCount||0,0);
}
{
  const s=fight('fighter','fate',null,null,s=>{s.players[1].book=[id('manna')];});
  assert.ok(s.players[1].hand.includes(id('manna')));assert.equal(s.destroyedCount,1);
  const blocked=fight('fighter','fate',null,null,s=>{s.players[1].book=[id('manna')];place(s,5,'basaltidol',1);});
  assert.ok(!blocked.players[1].hand.includes(id('manna')));
}
assert.equal(fight('goblin','fungonoid').tiles[1].unit.mhp,card('fungonoid').hp+10);
assert.equal(fight('fighter','carbunfly',null,null,s=>{s.tiles[1].unit.hp=1;s.battle.invHP=100;}).tiles[1].unit.id,id('carbuncle'));
assert.equal(fight('goblin','giantrattler').tiles[1].unit.enchant,'disease');
assert.equal(fight('goblin','chonchon').tiles[1].unit.enchant,'antielement');
assert.equal(fight('goblin','suiko').tiles[1].unit.enchant,'vitality');
assert.equal(fight('fighter','goblin','sleep','magussmirror').battle.strikes[0].effect,'reflect');
assert.equal(stats('goblin','ares').attackST,card('goblin').st);
assert.equal(stats('goblin','ares',null,null,s=>{place(s,5,'ares',1);}).attackST,card('goblin').st+20);
assert.equal(stats('goblin','goblin',null,null,s=>{place(s,5,'nue',1);}).attackST,10);
{
  const s=fight('goblin','lizardman',null,null,s=>{place(s,5,'quetzalcoatl',1);place(s,6,'madclown',1);});
  assert.equal(s.battle.startHP[0],card('goblin').hp);
  assert.equal(s.battle.startHP[1],card('lizardman').hp+10);
  assert.equal(s.battle.defendST,card('lizardman').st+10);
  assert.equal(s.battle.strikes[0].side,1);
}
assert.equal(stats('flamelord','goblin',null,null,s=>{place(s,5,'flamelord',0);}).startHP[0],card('flamelord').hp+10);
assert.equal(fight('flamelord','goblin').players[0].cash,4900);
assert.equal(stats('fighter','goblin','livingspear').startHP[0],card('fighter').hp+20);
assert.equal(stats('fighter','goblin','livingsword').attackST,card('fighter').st+30);
assert.equal(stats('fighter','goblin','livingshield').startHP[0],card('fighter').hp+30);
assert.equal(fight('raksas','goblin',null,null,s=>{s.players[1].symbols[1]=20;}).players[1].symbols[1],14);
assert.equal(fight('sanctumguard','goblin',null,null,s=>{s.tiles[1].type=2;}).players[0].symbols[2],5);
assert.equal(fight('squonk','goblin',null,null,s=>{s.tiles[1].unit.hp=10;}).tiles[1].owner,-1);
assert.equal(fight('squonk','goblin',null,null,s=>{s.tiles[1].unit.hp=10;s.players[0].hand=Array(6).fill(id('goblin'));}).tiles[1].owner,0);
assert.equal(fight('medusa','fighter').tiles[1].unit.hp,10);
assert.equal(fight('medusa','fighter','stonehail',null,s=>{s.tiles[1].unit.hp=90;}).tiles[1].unit.id,id('fighter'));
assert.ok(stats('cockatrice','fighter','batteringram',null,s=>{s.tiles[1].unit.hp=80;}).won);
assert.equal(fight('ghoul','fighter',null,null,s=>{s.tiles[1].unit.hp=60;}).tiles[1].unit.enchant,'paralysis');
assert.equal(fight('goblin','vodyanoi',null,null,s=>{s.battle.invHP=100;},.1).battle.finalHP[0],0);
assert.equal(fight('goblin','vodyanoi',null,null,s=>{s.battle.invHP=100;},.9).battle.finalHP[0],60);
assert.equal(fight('goblin','efreet').players[1].cash,4980);
assert.equal(fight('goblin','efreet','stonehail').players[1].cash,5000);
assert.equal(stats('catoblepas','fighter').attackST,card('catoblepas').st);
assert.ok(stats('catoblepas','fighter').won);
assert.equal(fight('fighter','goblin','markerflag',null,s=>{s.battle.teleport=true;}).battle.markerFlag,undefined);
{
  const full=fight('nymph','goblin',null,null,s=>{s.players[0].hand=Array(6).fill(id('fate'));},0);
  assert.ok(!full.players[0].hand.includes(id('goblin')));
  const noVacancy=fight('littlegray','fighter',null,null,s=>{
    for(let j=0;j<s.tiles.length;j++)if(j!==1)place(s,j,'goblin',1);
  },.1);
  assert.equal(noVacancy.tiles[1].owner,0);assert.equal(noVacancy.destroyedCount,1);
}
console.log('PS2 battle items, transformations, wards, hit effects, retreat, growth, rewards and post-battle abilities OK');
