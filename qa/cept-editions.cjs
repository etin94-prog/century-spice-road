const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createContext,runInContext}=require('node:vm');
const ps2=require('../dist/cept-engine');
const describeSpell=require('../dist/cept-spell-text');
const describeItem=require('../dist/cept-item-text');
const creatureText=require('../dist/cept-creature-text');
for(const edition of ['ps2','dc','ps1','saturn','3ds','saga','revolt','begins']){
  const C=edition==='ps2'?ps2:ps2.createEdition(edition);
  const spells=C.cards.filter(c=>!c.unlisted&&c.kind==='spell');
  const find=effect=>spells.find(c=>!c.catalogOnly&&c.effect===effect);
  for(const card of spells){
    const text=describeSpell(C,card);
    if(card.catalogOnly)assert.equal(text,undefined,edition+' '+card.name+' is catalog-only');
    else assert.match(text||'',/[가-힣]/,edition+' '+card.name+' should have a Korean effect');
  }
  const bolt=describeSpell(C,find('bolt'));
  assert.equal(bolt.includes('적 크리처'),!['ps1','saturn'].includes(edition));
  assert.match(describeSpell(C,find('word1')),/고정값은 1입니다/);
  assert.match(describeSpell(C,find('manna')),edition==='begins'?/100G/:/50G/);
  if(find('fly'))assert.match(describeSpell(C,find('fly')),edition==='revolt'?/3개/:/2개/);
  if(find('landdrain'))assert.match(describeSpell(C,find('landdrain')),edition==='saga'?/20G/:/30G/);
  if(find('reincarnation'))assert.equal(describeSpell(C,find('reincarnation')).includes('한 장 더'),['revolt','begins','3ds'].includes(edition));
  const items=C.cards.filter(c=>!c.unlisted&&c.kind==='item');
  for(const card of items){
    const summary=describeItem(C,card);
    if(card.catalogOnly)assert.equal(summary,undefined,edition+' '+card.name+' is catalog-only');
    else assert.match(summary||'',/[가-힣]/,edition+' '+card.name+' should have a Korean effect');
  }
  const creatures=C.cards.filter(c=>!c.unlisted&&c.kind==='creature');
  for(const card of creatures){
    const summary=creatureText.describe(C,card);
    if(card.catalogOnly)assert.equal(summary,undefined,edition+' '+card.name+' is catalog-only');
    else{
      assert.match(summary||'',/[가-힣]/,edition+' '+card.name+' should have a Korean effect');
      const printed=card.catalog?.ability?.replace(/(?:Item Limit|Land Limit): (?:no\w+ ?)+/g,'').trim();
      if(printed&&printed!=='-')assert.notEqual(summary,'기본 ST와 HP로 전투합니다.',edition+' '+card.name+' has an ability');
      const price=C.territoryAbilityCost(card);
      if(price!=null){
        const territory=creatureText.territorySummary(C,card);
        assert.ok(territory?.startsWith('영지 능력 '+price+'G · '),edition+' '+card.name+' land ability');
        assert.ok(summary.includes(territory));
      }
    }
  }
  const unit=name=>creatures.find(c=>!c.catalogOnly&&C.combo.key(c)===name);
  if(unit('dragon'))assert.match(creatureText.describe(C,unit('dragon')),['ps1','saturn'].includes(edition)?/ST가 10, 수비할 때 전투 HP가 10/:/ST가 20 오르고 전투 HP가 20/);
  if(unit('deathgaze'))assert.match(creatureText.describe(C,unit('deathgaze')),['ps1','saturn'].includes(edition)?/60%/:/80%/);
  if(unit('fontaciel'))assert.match(creatureText.describe(C,unit('fontaciel')),/영지 능력 50G.*내 모든 크리처.*100/);
  if(unit('firebeak'))assert.match(creatureText.describe(C,unit('firebeak')),/선제.*수·풍 속성 상대에게 강타.*관통/);
  console.log(edition,'Korean summaries cover',...[spells,items,creatures].map(group=>group.filter(c=>!c.catalogOnly).length),'spells/items/creatures');
}
let seed=89231;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const [edition,count,mapCount] of [['dc',459,39],['ps1',361,36],['saturn',361,10],['saga',487,18],['revolt',489,39],['begins',400,15]]){
  const modern=['saga','revolt','begins'].includes(edition);
  const C=ps2.createEdition(edition),catalog=C.cards.filter(c=>!c.unlisted);
  assert.equal(catalog.length,count);
  assert.equal(Object.keys(C.maps).length,mapCount);
  const savedMaps={saga:{'saga-11':'chariot','saga-13':'the-speckled-band'},revolt:{'revolt-1':'battle-wagon','revolt-34':'yin-yang-flat'},begins:{'begins-10':'fortune-alley','begins-11':'holy-hammer','begins-15':'x'}};
  for(const [id,slug] of Object.entries(savedMaps[edition]||{}))assert.equal(C.maps[id].slug,slug);
  for(const book of Object.values(C.presets))assert.ok(C.validBook(book));
  if(!modern&&edition!=='dc'){
    const sneph=C.start(2,0,0,edition+'-2');
    assert.equal(sneph.target,7000);assert.equal(sneph.players[0].cash,edition==='ps1'?440:450);
    assert.equal(C.board(sneph).die,7);
    assert.ok(C.presets.fireAir.includes(C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='giantspider')));
  }
  assert.ok(!C.validBook(ps2.presets.intro));
  const goblin=catalog.find(c=>C.combo.key(c)==='goblin');
  if(!modern)assert.equal(goblin.cost,edition==='dc'?0:10);
  if(modern){
    assert.ok(catalog.filter(c=>!c.catalogOnly).length>=30,edition+' playable cards');
    assert.ok(catalog.every(c=>c.editionArt&&c.catalog.source.includes('culdceptcentral.com')));
    assert.deepEqual(Object.keys(C.presets),['intro','fire','stronghold',...(edition==='saga'?['sagaStarterWater','sagaStarterFire','sagaImmediate','sagaAffinity']:[])]);
    assert.equal(new Set(Object.values(C.presets).map(deck=>[...deck].sort((a,b)=>a-b).join(','))).size,Object.keys(C.presets).length);
    for(const deck of Object.values(C.presets)){
      assert.ok(deck.every(id=>!C.cards[id].unlisted));
      assert.deepEqual(new Set(deck.map(id=>C.cards[id].kind)),new Set(['creature','item','spell']));
    }
    const fighter=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.kind==='creature'&&!c.first&&!c.last&&c.category==='neutral');
    const mace=C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='mace');
    const armor=C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='diamondarmor');
    const checkGear=(gear,st,hp,first)=>{
      const s=C.start(2,2,5000,edition+'-1');
      s.players[0].cash=5000;s.players[0].hand=[gear];
      Object.assign(s.tiles[1],{owner:1,type:'무속성',unit:{id:fighter,hp:C.cards[fighter].hp}});
      s.players[0].pos=1;s.phase='attack';
      s.battle={at:1,inv:fighter,atkItem:null,defItem:null};
      assert.ok(C.play(s,['equip',0]));
      assert.ok(C.play(s,['bare']));
      assert.equal(s.battle.attackST,Math.max(0,C.cards[fighter].st+st));
      assert.equal(s.battle.startHP[0],C.cards[fighter].hp+hp);
      assert.equal(s.battle.strikes[0].side,first);
    };
    checkGear(mace,20,0,0);
    checkGear(armor,-30,60,1);
  }
  for(const [id,map] of Object.entries(C.maps)){
    assert.equal(map.types[0],'성');
    for(const [i,links] of map.links.entries())assert.ok(links.length&&links.every(j=>map.links[j].includes(i)),id);
    for(const seats of [2,3,4]){
      const s=C.start(seats,0,0,id,C.presets.fire,C.presets.intro,1,seats===4?'teams':'duel');
      let steps=0;
      while(s.winner<0&&steps++<20000)assert.ok(C.play(s,C.ai(s)),id+' '+s.phase);
      assert.ok(s.winner>=0,id+' '+seats+' seats');
    }
  }
  console.log(edition,count,'cards;',catalog.filter(c=>!c.catalogOnly).length,'playable;',mapCount*3,'matches completed');
}

{
  const revolt=ps2.createEdition('revolt'),begins=ps2.createEdition('begins');
  function card(C,name){
    const id=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
    assert.ok(id>=0,name+' is available in '+C.edition);
    return id;
  }
  function scenario(C,spell){
    const s=C.start(2,2,5000,C.edition+'-1');
    s.players[0].cash=500;
    s.players[0].hand=[card(C,spell)];
    return s;
  }
  function cast(C,s){
    assert.ok(C.play(s,['cast',0]));
  }
  function place(C,s,at,owner,element,hp){
    const id=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.kind==='creature'&&c.element===element&&c.hp>=30);
    assert.ok(id>=0,C.edition+' has an eligible creature of element '+element);
    Object.assign(s.tiles[at],{type:element,owner,unit:{id,hp}});
  }
  const shift=scenario(revolt,'watershift');
  place(revolt,shift,1,0,0,20);place(revolt,shift,2,1,0,20);place(revolt,shift,3,0,1,20);
  cast(revolt,shift);
  assert.ok(!revolt.choices(shift).some(([,at])=>at===2));
  assert.ok(revolt.play(shift,['targetLand',1]));
  assert.equal(shift.tiles[1].type,1);
  assert.equal(revolt.chain(shift,shift.tiles[1]),2);

  const hail=scenario(revolt,'burninghail');
  place(revolt,hail,1,1,1,20);place(revolt,hail,2,1,3,30);place(revolt,hail,3,0,0,30);
  assert.deepEqual(revolt.ai(hail),['cast',0]);
  cast(revolt,hail);
  assert.equal(hail.tiles[1].unit,null);
  assert.equal(hail.tiles[2].unit.hp,10);
  assert.equal(hail.tiles[3].unit.hp,30);
  assert.deepEqual(hail.mapEffect.hits.map(h=>[h.at,h.damage,h.defeated]),[[1,20,true],[2,20,false]]);

  const swarm=scenario(revolt,'insectswarm');
  place(revolt,swarm,1,1,1,25);place(revolt,swarm,2,1,3,25);
  swarm.tiles[2].area=1;swarm.tiles[2].unit.hp=revolt.cards[swarm.tiles[2].unit.id].hp;
  cast(revolt,swarm);
  assert.equal(swarm.tiles[1].unit.hp,5);
  assert.equal(swarm.tiles[2].unit.hp,revolt.cards[swarm.tiles[2].unit.id].hp);

  const reincarnation=scenario(revolt,'reincarnation');
  const backup=card(revolt,'manna'),bolt=card(revolt,'magicbolt');
  reincarnation.players[0].hand.push(backup);
  reincarnation.players[0].book=[bolt,bolt];
  cast(revolt,reincarnation);
  assert.deepEqual(reincarnation.players[0].hand,[bolt,bolt]);

  const mana=scenario(begins,'manna');
  mana.players[0].lap=2;
  cast(begins,mana);
  assert.equal(mana.players[0].cash,800);
  const prophecy=scenario(begins,'prophecy');
  prophecy.players[0].book=[card(begins,'manna'),card(begins,'fly')];
  cast(begins,prophecy);
  assert.deepEqual(begins.choices(prophecy),[['prophecyKind','spell']]);

  function roll(C,s,random,faces,total){
    const oldRandom=Math.random;
    let cursor=0;
    try{
      Math.random=()=>random[cursor++]??.5;
      assert.ok(C.play(s,['roll']));
    }finally{Math.random=oldRandom;}
    assert.deepEqual(s.mapEffect.faces,faces);
    assert.equal(s.die,total);
    assert.equal(s.mapEffect.label,String(total));
  }
  roll(revolt,scenario(revolt,'fly'),[0,0],[0,0],12);
  roll(revolt,scenario(revolt,'fly'),[0,.2],[0,1],1);
  const fly=scenario(revolt,'fly');cast(revolt,fly);
  roll(revolt,JSON.parse(JSON.stringify(fly)),[.2,.4,.9],[1,2,5],8);
  const fixedFly=scenario(revolt,'fly');fixedFly.players[0].word=6;cast(revolt,fixedFly);
  roll(revolt,fixedFly,[.5],[6,3],9);
  const holy=scenario(revolt,'holyword8');cast(revolt,holy);
  assert.ok(revolt.play(holy,['targetPlayer',0]));
  roll(revolt,holy,[],[8],8);
  assert.equal(holy.players[0].word,undefined);
  const beginsFly=scenario(begins,'fly');cast(begins,beginsFly);
  roll(begins,beginsFly,[0,0],[1,1],2);
  console.log('Modern spell targets, AI, damage, redraw, economy and edition dice OK');

  const C=revolt;
  const battleWagon=C.maps['revolt-1'];
  assert.deepEqual(battleWagon.checkpoints,[0,5,24]);
  assert.equal(battleWagon.gates[12],battleWagon.gates[5]);
  assert.equal(battleWagon.gateNames[0],'서쪽 게이트');
  function moveOne(s,at){
    s.phase='fork';s.remaining=1;
    Object.assign(s.players[0],{pos:C.board(s).links[at][0],previous:null});
    assert.ok(C.play(s,['route',at]));
  }
  const gates=C.start(2,2,5000,'revolt-1');
  place(C,gates,1,0,0,15);place(C,gates,2,1,1,15);
  gates.tiles[1].unit.mhp=60;
  gates.tiles[1].unit.fatigued=true;gates.tiles[2].unit.fatigued=true;
  assert.equal(gates.players[0].cash,220);
  moveOne(gates,5);
  assert.deepEqual(gates.players[0].flags,[5]);
  assert.equal(gates.tiles[1].unit.fatigued,undefined);
  assert.equal(gates.tiles[2].unit.fatigued,true);
  const afterGate=gates.players[0].cash;
  moveOne(gates,12);
  assert.equal(gates.players[0].cash,afterGate);
  moveOne(gates,0);
  gates.tiles[1].unit.fatigued=true;
  moveOne(gates,24);
  assert.equal(gates.players[0].lap,1);
  assert.deepEqual(gates.players[0].flags,[]);
  assert.equal(gates.tiles[1].unit.hp,25);
  assert.equal(gates.tiles[1].unit.fatigued,undefined);

  const win=C.start(2,2,5000,'revolt-1');
  win.players[0].cash=5000;
  moveOne(win,5);
  assert.equal(win.winner,0);

  const commands=C.start(2,2,5000,'revolt-1');
  commands.players[0].cash=5000;commands.phase='land';
  place(C,commands,4,0,1,20);place(C,commands,6,0,2,20);commands.tiles[6].unit.fatigued=true;
  assert.equal(commands.players[0].pos,0);
  assert.ok(C.choices(commands).some(([k,at])=>k==='level'&&at===4));
  assert.ok(!C.choices(commands).some(([k,at])=>k==='level'&&at===6));
  assert.ok(C.play(commands,['level',4,2]));
  assert.equal(commands.tiles[4].unit.fatigued,true);

  const discards=scenario(C,'windofhope');
  discards.players[0].hand.push(...Array(6).fill(card(C,'manna')));
  cast(C,discards);
  assert.equal(discards.phase,'roll');
  assert.equal(discards.players[0].hand.length,8);
  discards.phase='land';
  assert.ok(C.play(discards,['pass']));
  assert.equal(discards.turn,0);
  for(let n=0;n<2;n++)assert.ok(C.play(discards,['discard',0]));
  assert.equal(discards.turn,1);
  assert.equal(discards.players[0].hand.length,6);
  assert.equal(discards.players[1].cash,220);
  assert.equal(discards.phase,'spell');

  const alarm=scenario(C,'alarm');
  place(C,alarm,1,0,1,25);alarm.tiles[1].unit.fatigued=true;
  cast(C,alarm);
  assert.equal(alarm.tiles[1].unit.fatigued,undefined);
  const disaster=scenario(C,'disaster');
  place(C,disaster,1,1,1,40);place(C,disaster,2,1,3,40);
  for(const at of [1,2])disaster.tiles[at].unit.mhp=50;
  disaster.tiles[1].unit.fatigued=true;
  disaster.players[0].hand.push(card(C,'manna'));
  cast(C,disaster);
  assert.equal(disaster.phase,'sacrifice');
  assert.ok(C.play(disaster,['sacrifice',1]));
  assert.equal(disaster.tiles[1].unit.hp,10);
  assert.equal(disaster.tiles[2].unit.hp,40);
  console.log('Revolt gate directions, lap and victory, fatigue and recovery, and end-of-turn discards OK');

  const remission=scenario(C,'remission');
  remission.players[0].flags=[0];
  cast(C,remission);
  assert.ok(!C.choices(remission).some(([,at])=>at===0));
  assert.ok(C.play(remission,['targetLand',12]));
  assert.deepEqual(remission.players[0].flags,[0,5]);
  assert.equal(remission.players[0].cash,400);
  remission.phase='spell';remission.players[0].hand=[card(C,'remission')];
  cast(C,remission);
  assert.deepEqual(C.choices(remission),[['fizzle']]);

  const transfer=scenario(C,'landtransfer');
  place(C,transfer,1,0,0,20);place(C,transfer,2,1,1,30);
  transfer.tiles[1].level=3;
  const worth=C.value(transfer,transfer.tiles[1]);
  cast(C,transfer);
  assert.deepEqual(C.choices(transfer),[['targetLand',1]]);
  assert.ok(C.play(transfer,['targetLand',1]));
  assert.equal(transfer.players[0].cash,400+Math.floor(.7*worth));
  assert.equal(transfer.tiles[1].unit,null);

  const drain=scenario(begins,'landdrain');
  place(begins,drain,1,1,0,20);drain.players[1].cash=10;
  cast(begins,drain);
  assert.deepEqual(begins.choices(drain),[['targetPlayer',1]]);
  assert.ok(begins.play(drain,['targetPlayer',1]));
  assert.equal(drain.players[0].cash,480);
  assert.equal(drain.phase,'sell');

  const vigorous=C.start(2,2,5000,'revolt-1');
  const shieldmaiden=card(C,'shieldmaiden');
  assert.equal(C.cards[shieldmaiden].vigorous,true);
  vigorous.phase='land';vigorous.players[0].pos=1;vigorous.players[0].hand=[shieldmaiden];
  assert.ok(C.play(vigorous,['summon',0]));
  assert.equal(vigorous.tiles[1].unit.fatigued,undefined);

  const restore=scenario(C,'restore');
  place(C,restore,1,0,0,20);Object.assign(restore.tiles[1].unit,{mhp:50,fatigued:true});
  cast(C,restore);
  assert.ok(C.play(restore,['targetLand',1]));
  assert.equal(restore.tiles[1].unit.hp,50);
  assert.equal(restore.tiles[1].unit.fatigued,undefined);
  console.log('Revolt gate spells, land transfer, Vigorous and Restore, and Begins debt settlement OK');

  function battle(engine,attacker,defender,level,gear){
    const s=engine.start(2,2,5000,engine.edition+'-1');
    const attackId=card(engine,attacker),guardId=card(engine,defender),guard=engine.cards[guardId];
    s.players[0].pos=1;
    Object.assign(s.tiles[1],{owner:1,type:guard.element>=0?guard.element:'무속성',level,unit:{id:guardId,hp:guard.hp}});
    s.phase='attack';s.battle={at:1,inv:attackId,atkItem:null,defItem:null};
    assert.ok(engine.play(s,['bare']));
    if(gear){
      s.players[1].hand=[card(engine,gear)];s.players[1].cash=500;
      assert.ok(engine.play(s,['equip',0]));
    }else assert.ok(engine.play(s,['bare']));
    return s.battle;
  }
  const beak=battle(C,'firebeak','giantnautilus',3);
  assert.equal(beak.landHP,30);
  assert.equal(beak.strikes[0].side,0);
  assert.match(beak.strikes[0].notes.join(' '),/관통.*75 피해/);
  assert.equal(beak.won,true);
  const eel=battle(C,'greenogre','gianteel',1);
  assert.equal(eel.strikes[0].effect,'block');
  const decoy=battle(C,'fighter','decoy',1);
  assert.equal(decoy.strikes[0].effect,'reflect');
  assert.equal(decoy.finalHP[0],0);

  const saga=ps2.createEdition('saga');
  const counter=battle(saga,'minotaur','fighter',1,'magmacounter');
  assert.equal(counter.startHP[1],saga.cards[card(saga,'fighter')].hp+20);
  assert.equal(counter.strikes[0].effect,'block');
  const nonMatching=battle(saga,'goblin','fighter',1,'magmacounter');
  assert.equal(nonMatching.strikes[0].effect,'hit');
  console.log('Modern elemental critical hits, penetration, reflection and neutralization OK');
}

{
  const C=ps2.createEdition('saga'),id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const newMatch=()=>C.start(2,2,5000,'saga-1');
  function unit(s,at,name,owner,type,level=1,hp=C.cards[id(name)].hp){
    assert.ok(id(name)>=0,name+' is playable');
    Object.assign(s.tiles[at],{owner,type,level,unit:{id:id(name),hp}});
  }
  const pairs={crimsonvine:[0,2],flammefleur:[0,2],fontaciel:[1,3],frostbeast:[1,3],gogma:[2,3],
    jackolantern:[0,2],magmaavatar:[0,2],stormavatar:[1,3],stymphalides:[1,3],warlock:[0,1]};
  for(const [name,pair] of Object.entries(pairs)){
    assert.ok(id(name)>=0,name+' is playable');
    assert.deepEqual(C.cards[id(name)].elements,pair);
    const s=newMatch();
    for(const [type,bonus] of [[pair[0],30],[pair[1],30],['복합',30],['무속성',0],[[0,1,2,3].find(e=>!pair.includes(e)),0]]){
      unit(s,1,name,1,type,3);
      assert.equal(C.battleGround(s,{at:1,inv:id('goblin')}).hp,bonus,name+' on '+type);
    }
  }
  function fight(attacker,defender,terrain='무속성',gear=null,setup=null,defenseGear=null){
    const s=newMatch();
    unit(s,1,defender,1,terrain);
    s.players[0].pos=1;s.players[0].cash=500;s.players[0].hand=[];
    s.phase='attack';s.battle={at:1,inv:id(attacker),atkItem:null,defItem:null};
    if(setup)setup(s);
    if(gear){
      s.players[0].hand.unshift(id(gear));
      assert.ok(C.play(s,['equip',0]));
    }else assert.ok(C.play(s,['bare']));
    if(defenseGear){
      Object.assign(s.players[1],{cash:500,hand:[id(defenseGear)]});
      assert.ok(C.play(s,['equip',0]));
    }else assert.ok(C.play(s,['bare']));
    return s;
  }
  assert.equal(fight('goblin','aqualing').battle.strikes[0].effect,'block');
  assert.equal(fight('fighter','aqualing').battle.strikes[0].effect,'hit');
  assert.equal(fight('blitzraven','goblin').battle.won,true);
  assert.equal(fight('blitzraven','goblin','무속성',null,s=>{s.tiles[1].unit.mhp=40;}).battle.won,false);
  assert.equal(fight('phlogiston','dwarf').battle.attackST,40);
  assert.equal(fight('fighter','phlogiston').battle.defendST,20);
  assert.equal(fight('fighter','wallofice').battle.startHP[1],70);
  const tornado=fight('fighter','tornado');
  assert.deepEqual([tornado.battle.startHP[1],tornado.battle.defendST,tornado.battle.strikes[0].side],[40,50,1]);
  for(const [gear,weak,strong] of [['freezingwind','redogre','blueogre'],['firestone','blueogre','redogre']]){
    assert.equal(fight('fighter',weak,'무속성',gear).battle.won,true);
    assert.equal(fight('fighter',strong,'무속성',gear).battle.won,false);
  }
  for(const occupied of [false,true]){
    const s=C.start(2,2,5000,'saga-original-crosswind');
    const p=s.players[0],source=2,dest=3;
    unit(s,source,'creepingflame',0,2);
    p.pos=source;p.cash=100;s.phase='land';
    if(occupied)unit(s,dest,'goblin',1,0);
    s.tiles[1].type=1;
    assert.ok(!C.choices(s).some(([action])=>action==='transfer'));
    assert.ok(C.play(s,['ability',source]));
    assert.equal(p.cash,70);
    const saved=structuredClone(s);
    assert.deepEqual(C.choices(saved),[['teleTo',dest]]);
    assert.ok(C.play(saved,['teleTo',dest]));
    if(occupied){
      assert.equal(saved.phase,'attack');
      assert.equal(saved.battle.from,source);
    }else{
      assert.equal(saved.tiles[dest].unit.id,id('creepingflame'));
      assert.equal(saved.tiles[source].owner,-1);
    }
  }
  const gearStats=gear=>fight('fighter','dwarf','무속성',gear,s=>{
    s.players[0].hand=[id('goblin'),id('minotaur')];
    unit(s,8,'crimsonvine',1,0);unit(s,10,'frostbeast',0,1);
  }).battle;
  assert.equal(gearStats('aurablade').attackST,80);
  assert.equal(gearStats('forcebracelet').attackST,60);
  assert.equal(gearStats('forceanklet').startHP[0],60);
  for(const armor of ['magmaarmor','stormarmor']){
    assert.equal(gearStats(armor).attackST,50);
    assert.equal(gearStats(armor).startHP[0],armor==='magmaarmor'?60:50);
  }
  assert.equal(fight('fighter','dwarf','무속성','shadowarmor').battle.startHP[0],100);
  const tonfa=fight('goblin','dwarf','무속성','tonfa');
  assert.deepEqual(tonfa.battle.strikes.map(v=>v.side),[0,0,1]);
  assert.equal(fight('fighter','wallofice','무속성','batteringram').battle.won,true);
  assert.equal(fight('redogre','wallofice','무속성','magmahammer').battle.won,true);
  assert.equal(fight('blueogre','wallofice','무속성','stormspear').battle.won,true);
  assert.equal(fight('blueogre','wallofice','무속성','magmahammer').battle.won,false);
  assert.equal(fight('fighter','wallofice','무속성','vorpalsword').battle.won,true);
  assert.equal(fight('fighter','redogre','무속성',null,null,'fireshield').battle.strikes[0].effect,'block');
  assert.equal(fight('fighter','dwarf','무속성','freezingwind',null,'smoketorch').battle.strikes[0].effect,'block');
  assert.equal(fight('fighter','dwarf','무속성','mace',null,'knightsshield').battle.strikes[0].effect,'block');
  assert.deepEqual(fight('fighter','dwarf','무속성',null,null,'spikedshield').battle.strikes[0].hp,[20,30]);
  assert.equal(fight('fighter','dwarf','무속성','ringofthesuccubus').tiles[1].unit.st,0);
  assert.equal(fight('fighter','dwarf','무속성','sleep').tiles[1].unit.enchant,'sleep');
  assert.equal(fight('redogre','blueogre','무속성','tearinghalo',null,'gremlinclaw').battle.won,true);
  assert.equal(fight('fighter','blueogre','무속성','tearinghalo').battle.won,false);
  assert.equal(fight('fighter','dwarf','무속성','kris',null,'gremlinclaw').battle.attackST,70);
  assert.equal(fight('fighter','dwarf','무속성','mace',null,'gremlinclaw').battle.attackST,40);
  assert.equal(fight('fighter','dwarf','무속성','gremlintooth',null,'shadowarmor').battle.startHP[1],50);
  assert.ok(fight('fighter','goblin','무속성','soulray').players[0].hand.includes(id('soulray')));
  assert.ok(!fight('fighter','goblin','무속성','soulray',s=>{s.players[0].hand=Array(6).fill(id('goblin'));}).players[0].hand.includes(id('soulray')));
  assert.equal(fight('fighter','goblin',1,'coinofpiety').players[0].symbols[1],10);
  const leoknight=fight('leoknight','goblin','무속성',null,s=>{
    unit(s,8,'goblin',0,0);unit(s,10,'goblin',0,1);unit(s,11,'goblin',1,2);
  }).battle;
  assert.deepEqual([leoknight.attackST,leoknight.startHP[0]],[20,20]);
  assert.equal(fight('sanctumguard','goblin',1).players[0].symbols[1],5);
  assert.equal(fight('trojanhorse','dwarf',2,'fighter').battle.strikes[0].hp[1],10);
  assert.equal(fight('anubias','dwarf','무속성',null,s=>{s.destroyedCount=6;}).battle.startHP[0],30);
  assert.equal(fight('lilith','dwarf','무속성',null,s=>{s.players[0].hand=[id('mace'),id('mace'),id('mace')];}).battle.attackST,30);
  assert.equal(fight('dwarf','gargoyle').battle.defendST,50);
  assert.equal(fight('nightfiend','dwarf','무속성',null,s=>{s.tiles[1].level=3;}).battle.attackST,80);
  assert.equal(fight('nike','dwarf').tiles[1].unit.enchant,'paralysis');
  for(const card of ['pegasus','beastgear']){
    assert.equal(fight('fighter',card,'무속성','firestone').battle.strikes.find(a=>a.side===0).effect,'block');
    const s=newMatch();
    s.players[0].cash=200;s.players[0].hand=[id('zap')];
    unit(s,1,card,1,1);unit(s,2,'goblin',1,1);
    assert.ok(C.play(s,['cast',0]));
    assert.deepEqual(C.choices(s).filter(v=>v[0]==='targetLand'),[['targetLand',2]]);
  }
  const immune=newMatch();
  immune.players[0].cash=300;immune.players[0].hand=[id('zap')];
  unit(immune,1,'odradek',1,2);
  assert.ok(C.play(immune,['cast',0])&&C.play(immune,['targetLand',1]));
  assert.equal(immune.tiles[1].unit.hp,20);
  assert.equal(fight('soulcollector','dwarf','무속성',null,s=>{s.destroyedCount=6;}).battle.attackST,50);
  assert.deepEqual(fight('bia','woodfolk','무속성',null,null,'goblin').battle.startHP,[70,60]);
  assert.equal(fight('bia','woodfolk','무속성',null,null,'goblin').battle.attackST,60);
  assert.equal(fight('bia','woodfolk','무속성',null,null,'chainmail').battle.attackST,30);
  const titan=fight('burningtitan','dwarf','무속성',null,s=>{
    [8,9,10,11,12].forEach(n=>unit(s,n,'goblin',0,0));
  }).battle;
  assert.deepEqual([titan.attackST,titan.startHP[0]],[30,30]);
  const kasha=fight('kasha','dwarf','무속성',null,s=>{s.tiles[1].unit.enchant='peace';}).battle;
  assert.deepEqual([kasha.attackST,kasha.startHP[0]],[50,60]);
  const aspi=fight('aspidochelone','dwarf','무속성',null,s=>{s.round=12;}).battle;
  assert.deepEqual([aspi.attackST,aspi.startHP[0]],[42,52]);
  assert.equal(fight('weretiger','dwarf','무속성',null,s=>{s.round=24;}).battle.attackST,60);
  assert.equal(fight('weretiger','dwarf','무속성',null,s=>{s.round=25;}).battle.attackST,40);
  assert.deepEqual(fight('tetrarm','dwarf','무속성','tonfa').battle.strikes.map(v=>v.side),[0,0,1]);
  assert.equal(id('gearion'),-1,'fusion-only creature is not a collectible card');
  assert.equal(fight('flammefleur','goblin').battle.won,true);
  const overlap=fight('warlock','frostbeast',1,'prismaticwand');
  const equal=fight('stymphalides','frostbeast',1,'prismaticwand');
  assert.equal(overlap.battle.attackST,60);
  assert.equal(equal.battle.attackST,50);
  assert.equal(equal.battle.strikes[0].effect,'reflect');
  const vine=fight('goblin','crimsonvine',2,null,s=>{s.tiles[1].unit.hp=27;});
  assert.equal(vine.tiles[1].unit.hp,47);
  const jack=fight('jackolantern','goblin');
  assert.equal(jack.battle.strikes[0].side,1);
  assert.equal(jack.players[0].cash,580);
  const magma=fight('magmaavatar','goblin','무속성',null,s=>{
    const distant=s.tiles.map((_,i)=>i).filter(i=>i>1&&!C.board(s).links[1].includes(i));
    [0,2,2,1].forEach((type,i)=>unit(s,distant[i],'goblin',0,type));
  });
  assert.equal(magma.battle.attackST,45);
  assert.equal(magma.battle.startHP[0],45);
  const storm=fight('stormavatar','goblin','무속성',null,s=>{
    const distant=s.tiles.map((_,i)=>i).filter(i=>i>1&&!C.board(s).links[1].includes(i));
    [1,3,2].forEach((type,i)=>unit(s,distant[i],'goblin',0,type));
  });
  assert.equal(storm.battle.attackST,30);
  const fontBattle=fight('fontaciel','goblin','무속성',null,s=>{
    const distant=s.tiles.map((_,i)=>i).filter(i=>i>1&&!C.board(s).links[1].includes(i));
    [1,3].forEach((type,i)=>unit(s,distant[i],'goblin',0,type));
  });
  assert.equal(fontBattle.battle.startHP[0],20);
  const stymph=fight('stymphalides','frostbeast',1);
  assert.equal(stymph.battle.strikes[0].effect,'reflect');

  const rage=newMatch();
  unit(rage,1,'warlock',1,1);unit(rage,2,'warlock',1,2);
  unit(rage,3,'crimsonvine',0,2);unit(rage,4,'frostbeast',1,'복합');
  rage.players[0].cash=500;rage.players[0].hand=[id('elementalrage')];
  assert.ok(C.play(rage,['cast',0]));
  assert.deepEqual(rage.tiles.slice(1,5).map(t=>t.unit.hp),[30,15,50,30]);

  function territory(){
    const s=newMatch();
    s.players[0].cash=600;s.phase='land';
    return s;
  }
  const font=territory();
  unit(font,1,'fontaciel',0,1);unit(font,2,'goblin',0,2,1,20);unit(font,3,'fighter',1,0);
  font.tiles[2].unit.mhp=98;
  assert.ok(C.play(font,['ability',1]));
  assert.deepEqual([font.tiles[2].unit.mhp,font.tiles[2].unit.hp],[100,22]);
  assert.equal(font.tiles[3].unit.mhp,undefined);

  const gogma=territory();
  unit(gogma,1,'gogma',0,3);unit(gogma,2,'goblin',0,2);unit(gogma,3,'fighter',1,0,2);
  assert.ok(C.play(gogma,['ability',1]));
  assert.ok(!C.choices(gogma).some(([,i])=>i===3));
  assert.ok(C.play(gogma,['abilityLand',2]));
  assert.equal(gogma.tiles[2].level,3);
  assert.equal(gogma.players[0].cash,400);

  const bolt=newMatch();
  unit(bolt,1,'warlock',1,1);unit(bolt,2,'goblin',1,2);
  bolt.players[0].cash=500;bolt.players[0].hand=[id('magicbolt')];
  assert.ok(C.play(bolt,['cast',0]));
  assert.deepEqual(C.choices(bolt),[['targetLand',2]]);

  const warlock=territory();
  unit(warlock,1,'warlock',0,0);
  assert.ok(C.play(warlock,['ability',1]));
  assert.ok(C.play(warlock,['abilityPlayer',0]));
  assert.equal(warlock.players[0].antiMagic,true);
  warlock.players[1].hand=[id('drainmagic')];warlock.players[1].cash=500;
  assert.ok(C.play(warlock,['cast',0]));
  assert.ok(C.play(warlock,['targetPlayer',0]));
  assert.equal(warlock.players[0].antiMagic,undefined);
  assert.equal(warlock.players[0].cash,540);
  console.log('Saga dual elements, starter card battles, Creeping Flame movement, 23 additional items and 18 additional creatures OK');

  const economy=territory();
  unit(economy,1,'goblin',0,2,4);
  unit(economy,2,'goblin',0,'복합',4);
  economy.players[0].cash=599;
  assert.equal(C.elementCost(economy.tiles[1]),600);
  assert.equal(C.elementCost(economy.tiles[2]),400);
  assert.ok(!C.choices(economy).some(([k,at])=>k==='element'&&at===1));
  assert.ok(C.play(economy,['element',2,2]));
  assert.equal(economy.players[0].cash,199);
  assert.equal(C.chain(economy,economy.tiles[2]),2);
  assert.equal(C.toll(economy,economy.tiles[2]),Math.floor(C.value(economy,economy.tiles[2])*.6));

  const temple=territory();
  temple.players[0].pos=3;
  temple.tiles[3].type='신전';
  unit(temple,1,'goblin',0,2);
  assert.ok(C.choices(temple).some(([k,at])=>k==='level'&&at===1));

  const lap=newMatch(),map=C.board(lap);
  lap.players[0].lap=1;lap.players[0].flags=map.checkpoints.slice();
  lap.players[0].pos=map.links[0][0];lap.players[0].previous=null;
  const startCash=lap.players[0].cash;
  lap.phase='fork';lap.remaining=1;
  assert.ok(C.play(lap,['route',0]));
  assert.equal(lap.players[0].cash-startCash,275);
  const debt=territory();
  debt.players[0].pos=1;debt.players[0].cash=0;
  unit(debt,1,'goblin',1,2);
  assert.ok(C.play(debt,['pay']));
  assert.equal(debt.players[0].pos,0);
  assert.equal(debt.players[0].cash,375);
  console.log('Saga level-dependent terrain costs, temple commands, lap increment and bankruptcy recovery OK');
}

{
  const C=ps2.createEdition('saga'),id=name=>C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)===name);
  assert.deepEqual(C.maps['saga-5'].shrineKinds,{4:'light',52:'dark'});
  assert.deepEqual(C.maps['saga-9'].shrineKinds,{46:'light',64:'dark'});
  function atShrine(mapId,at){
    const s=C.start(2,2,5000,mapId);
    s.players[0].pos=C.board(s).links[at][0];s.players[0].previous=null;
    s.phase='fork';s.remaining=1;
    return s;
  }
  function step(s,at,random){
    const old=Math.random;
    let i=0;
    try{
      Math.random=()=>random[i++]??0;
      assert.ok(C.play(s,['route',at]));
    }finally{Math.random=old;}
  }
  const light=atShrine('saga-5',4),cash=light.players[0].cash;
  assert.equal(C.routePreview(light,['route',4]).cashGain,0);
  assert.equal(light.shrineNotice,undefined);
  const passing=atShrine('saga-5',4);passing.remaining=2;
  step(passing,4,[0]);
  assert.equal(passing.shrineNotice,undefined);
  step(light,4,[0]);
  assert.equal(light.players[0].cash,cash+200);
  assert.match(light.shrineNotice,/빛의 성소.*200G/);
  const ordinary=atShrine('saga-2',1);
  ordinary.tiles[2]={type:1,level:1,area:0,owner:1,unit:{id:id('warlock'),hp:25}};
  ordinary.tiles[4]={type:0,level:1,area:1,owner:1,unit:{id:id('minotaur'),hp:5}};
  ordinary.tiles[5]={type:1,level:1,area:0,owner:1,unit:{id:id('frostbeast'),hp:25}};
  step(ordinary,1,[0,0]);
  assert.equal(ordinary.tiles[2].unit.hp,20);
  assert.equal(ordinary.tiles[4].unit,null);
  assert.equal(ordinary.tiles[5].unit.hp,25);
  assert.match(ordinary.shrineNotice,/HP −5 · 2체/);

  const dark=atShrine('saga-5',52);
  step(dark,52,[.26]);
  assert.equal(dark.players[0].status,'blackout');
  assert.equal(dark.players[0].statusUntil,dark.round+1);
  dark.tiles[1]={type:0,level:3,owner:0,area:0,unit:{id:id('minotaur'),hp:20}};
  assert.equal(C.toll(dark,dark.tiles[1]),0);
  assert.match(dark.shrineNotice,/어둠의 성소/);

  const foresight=atShrine('saga-5',4),p=foresight.players[0];
  p.book=[id('manna'),id('goblin'),id('frostbeast'),id('warlock')];
  p.hand=Array(6).fill(id('goblin'));
  step(foresight,4,[.14]);
  assert.equal(foresight.phase,'foresightCard');
  assert.deepEqual(C.choices(foresight).map(a=>a[2]),p.book.slice(-3).reverse());
  const action=C.choices(foresight)[0];
  assert.ok(C.play(foresight,action));
  assert.equal(foresight.phase,'discard');
  assert.equal(p.hand.at(-1),id('warlock'));
  assert.ok(C.play(foresight,['discard',0]));
  assert.equal(foresight.phase,'land');

  const door=atShrine('saga-5',4);
  step(door,4,[.59]);
  assert.equal(door.phase,'shrineChoice');
  assert.equal(C.choices(door).length,7);
  const chosen=C.ai(door);
  assert.ok(C.choices(door).some(c=>c.join('/')===chosen.join('/')));
  const saved=JSON.parse(JSON.stringify(door)),prior=saved.players.map(q=>q.cash);
  assert.ok(C.play(saved,['shrineChoice','labor']));
  assert.deepEqual(saved.players.map((q,i)=>q.cash-prior[i]),[100,100]);
  assert.equal(saved.shrineChoices,undefined);
  assert.match(saved.shrineNotice,/노동의 결실/);
  console.log('Saga shrine map types, real stops, elemental casualties, timed effects, private draw and replayable choice OK');
}

{
  const data=require('../dist/cept-edition-data-modern');
  const map={section:'arena',slug:'qa-portal',name:'QA portal',loc:[[0,0],[0,1],[2,8],[2,9]],
    types:['castle','teleport','teleport','fort-north'],transit:{1:2,2:1}};
  data.maps.saga.unshift(map);
  try{
    const C=ps2.createEdition('saga'),id='saga-arena-qa-portal';
    assert.equal(C.maps['saga-1'].slug,'alcyon');
    const s=C.start(2,2,5000,id);
    s.phase='fork';s.remaining=1;
    assert.equal(C.routePreview(s,['route',1]).at,2);
    assert.equal(s.players[0].pos,0);
    assert.ok(C.play(s,['route',1]));
    assert.equal(s.players[0].pos,2);
    assert.deepEqual(s.lastMove.path,[0,1,2]);
    const saved=JSON.parse(JSON.stringify(s));
    assert.equal(C.board(saved).transit[1],2);
    map.transit={1:42};
    assert.throws(()=>ps2.createEdition('saga'),/qa-portal/);
    map.transit={3:1};
    assert.throws(()=>ps2.createEdition('saga'),/qa-portal/);
  }finally{
    data.maps.saga.shift();
  }
  console.log('Modern portal destination validation, preview, travel, and saved map IDs OK');
}

{
  const fight=(edition,attacker,defender,weapon,armor)=>{
    const C=edition==='ps2'?ps2:ps2.createEdition(edition);
    const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
    const atk=id(attacker),def=id(defender),w=weapon?id(weapon):-1,a=armor?id(armor):-1;
    assert.ok(atk>=0&&def>=0&&(!weapon||w>=0)&&(!armor||a>=0),[edition,attacker,defender,weapon,armor].join(' '));
    const s=C.start(2,2,5000,edition+'-1');
    const at=1;
    Object.assign(s.tiles[at],{owner:1,type:'무속성',unit:{id:def,hp:C.cards[def].hp}});
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    if(w>=0)s.players[0].hand.push(w);
    if(a>=0)s.players[1].hand.push(a);
    s.players[0].pos=at;s.phase='attack';s.battle={at,inv:atk,atkItem:null,defItem:null};
    assert.ok(C.play(s,w>=0?['equip',0]:['bare']));
    assert.ok(C.play(s,a>=0?['equip',0]:['bare']));
    assert.equal(s.phase,'result');
    return {C,s,a,w};
  };
  for(const edition of ['ps2','dc','ps1','saturn','saga']){
    const {C,s,w}=fight(edition,'fighter','goblin','boomerang');
    const first=['ps1','saturn'].includes(edition);
    assert.equal(s.players[0].hand.includes(w),!first);
    const description=describeItem(C,C.cards[w]);
    assert.equal(description.includes('선제'),first);
    assert.equal(description.includes('돌아옵니다'),!first);
  }
  const begins=(w,a,attacker='fighter',defender='goblin')=>fight('begins',attacker,defender,w,a);
  const {s:scroll}=begins('nuclearfusion');
  const {s:tower}=begins('nuclearfusion','towershield');
  assert.equal(scroll.battle.startHP[1]-scroll.battle.strikes[0].hp[1],30);
  assert.equal(tower.battle.startHP[1]-tower.battle.strikes[0].hp[1],25);
  const {s:normal}=begins(null,'towershield');
  assert.equal(normal.battle.startHP[1]-normal.battle.strikes[0].hp[1],20);
  const {s:magic}=begins('nuclearfusion','magicshield');
  assert.equal(magic.battle.startHP[1],60);
  assert.equal(magic.battle.strikes[0].effect,'block');
  assert.equal(begins(null,'knightsshield').s.battle.strikes[0].effect,'block');
  assert.equal(begins(null,'buckler','goblin','fighter').s.battle.strikes[0].effect,'block');
  assert.equal(begins(null,'countershield').s.battle.strikes[0].effect,'reflect');
  const {s:spiked}=begins(null,'spikedshield');
  assert.deepEqual(spiked.battle.strikes[0].hp,spiked.battle.startHP.map(h=>h-20));
  const {s:eternal,a}=begins(null,'eternalmail');
  assert.equal(eternal.players[1].book.at(0),a);
  const loser=begins('claymore','eternalmail');
  assert.equal(loser.s.battle.finalHP[1],0);
  assert.notEqual(loser.s.players[1].book.at(0),loser.a);
  console.log('Edition Boomerang return, Begins armor protection, scroll reduction, reflection, and surviving book return OK');
}

{
  const C=ps2.createEdition('saga'),mapId='saga-original-crosswind';
  assert.ok(!ps2.maps[mapId]);
  const game=()=>C.start(2,2,5000,mapId),map=C.maps[mapId];
  assert.equal(map.areaCount,2);
  assert.deepEqual([...new Set(map.areas)],[0,1]);
  const walk=(from,previous,remaining)=>{
    const s=game();s.phase='fork';s.remaining=remaining;s.visited=[];
    Object.assign(s.players[0],{pos:from,previous});
    return s;
  };
  const passed=walk(4,3,2);
  assert.deepEqual(C.routePreview(passed,['route',5]).at,6);
  assert.ok(C.play(passed,['route',5]));
  assert.deepEqual(passed.lastMove.path,[4,5,6]);
  const stopped=walk(4,3,1);
  assert.deepEqual(C.routePreview(stopped,['route',5]).at,24);
  assert.ok(C.play(stopped,['route',5]));
  assert.deepEqual(stopped.lastMove.path,[4,5,24]);
  const crossed=walk(6,5,2);
  const preview=C.routePreview(crossed,['route',7]);
  assert.deepEqual([preview.at,preview.remaining,preview.phase],[18,1,'fork']);
  assert.ok(C.play(crossed,['route',7]));
  assert.deepEqual(crossed.lastMove.path,[6,7,18]);
  assert.deepEqual(C.choices(crossed),[['route',17],['route',19]]);
  assert.ok(C.play(crossed,['route',19]));
  assert.equal(crossed.players[0].pos,19);
  const returned=walk(26,25,1);
  assert.ok(C.play(returned,['route',27]));
  assert.deepEqual(returned.lastMove.path,[26,27,2]);

  const economy=game(),goblin=C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='goblin');
  economy.phase='land';economy.players[0].cash=1000;
  for(const at of [3,17])Object.assign(economy.tiles[at],{owner:0,unit:{id:goblin,hp:30}});
  assert.equal(economy.prices.length,8);
  assert.deepEqual([C.chain(economy,economy.tiles[3]),C.chain(economy,economy.tiles[17])],[1,1]);
  assert.ok(C.play(economy,['level',3,2]));
  assert.deepEqual([economy.prices[0],economy.prices[4]],[11,10]);
  const saved=JSON.parse(JSON.stringify(economy));
  assert.deepEqual(saved.prices,economy.prices);
  assert.equal(C.board(saved).areaCount,2);
  const compound=game();
  compound.tiles[3].base=80;compound.tiles[3].owner=0;compound.tiles[3].unit={id:goblin,hp:30};
  for(const level of [2,3]){
    Object.assign(compound,{phase:'land',turn:0});compound.players[0].cash=1000;
    assert.ok(C.play(compound,['level',3,level]));
  }
  assert.deepEqual([compound.prices[0],compound.priceRemainder[0],compound.prices[4]],[12,40,10]);
  console.log('Saga independent area chains, fractional symbol prices, and normal/mandatory warp movement and previews OK');
}

{
  const C=ps2.createEdition('saga'),game=()=>C.start(2,2,5000,'saga-original-crosswind');
  const id=key=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===key);
  const goblin=id('goblin'),fire=id('minotaur'),dual=id('crimsonvine');
  assert.ok([goblin,fire,dual].every(id=>id>=0));
  const place=(creature,requirements=[])=>{
    const s=game(),p=s.players[0];
    s.phase='land';p.pos=1;p.cash=1000;p.hand=[creature];
    requirements.forEach((type,i)=>Object.assign(s.tiles[2+i],{type,owner:0,unit:{id:goblin,hp:30}}));
    assert.equal(s.tiles[1].type,'모프');
    assert.ok(C.play(s,['summon',0]));
    assert.equal(s.tiles[1].unit.id,creature);
    return s;
  };
  const colored=place(fire),neutral=place(goblin),mixed=place(dual,[0,2]);
  assert.equal(colored.tiles[1].type,0);
  assert.equal(neutral.tiles[1].type,'무속성');
  assert.equal(mixed.tiles[1].type,'복합');
  assert.equal(colored.prices[0],11);
  Object.assign(colored,{phase:'sell',turn:0,debtor:0,debtResume:'land'});
  colored.players[0].cash=-50;
  assert.ok(C.play(colored,['sell',1]));assert.equal(colored.tiles[1].type,0);
  assert.equal(colored.tiles[1].owner,-1);
  const move=game(),owner=move.players[0];
  move.phase='land';owner.pos=0;owner.cash=1000;
  Object.assign(move.tiles[2],{owner:0,unit:{id:fire,hp:40}});
  assert.ok(C.play(move,['transfer',2,1]));
  assert.equal(move.tiles[1].type,0);assert.equal(move.tiles[2].unit,null);

  const fromFountain=(steps,book)=>{
    const s=game(),p=s.players[0];s.phase='fork';s.remaining=steps;
    Object.assign(p,{pos:10,previous:9,hand:[goblin,goblin,goblin,goblin],book:book.slice()});
    return s;
  };
  const deck=[goblin,fire,dual,fire,dual],s=fromFountain(1,deck),p=s.players[0];
  assert.equal(C.routePreview(s,['route',11]).fountain,true);
  assert.ok(C.play(s,['route',11]));assert.deepEqual(p.hand,[dual,fire,dual,fire]);assert.deepEqual(p.book,[goblin]);
  assert.equal(s.phase,'land');assert.match(s.shrineNotice,/분수.*4장 뽑음/);
  const sparse=fromFountain(1,[dual]);assert.ok(C.play(sparse,['route',11]));
  assert.deepEqual(sparse.players[0].hand,[dual]);assert.deepEqual(sparse.players[0].book,[]);
  const empty=fromFountain(1,[]);assert.ok(C.play(empty,['route',11]));assert.deepEqual(empty.players[0].hand,[]);
  const passing=fromFountain(2,deck);assert.ok(C.play(passing,['route',11]));
  assert.deepEqual(passing.players[0].hand,[goblin,goblin,goblin,goblin]);
  assert.deepEqual(passing.players[0].book,deck);
  const map=C.maps['saga-original-crosswind'],prior=map.transit[5];
  try{
    map.transit[5]=11;
    const warp=fromFountain(1,deck);
    Object.assign(warp.players[0],{pos:4,previous:3});
    assert.equal(C.routePreview(warp,['route',5]).fountain,false);
    assert.ok(C.play(warp,['route',5]));
    assert.equal(warp.players[0].pos,11);
    assert.deepEqual(warp.players[0].hand,[goblin,goblin,goblin,goblin]);
  }finally{map.transit[5]=prior;}
  console.log('Saga one-time morph claims and regional pricing, Fountain stop/pass, and book depletion OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-trapway';
  const s=C.start(4,4,5000,mapId);
  function approach(state,seat,dice,remaining){
    Object.assign(state,{phase:'fork',turn:seat,die:dice||12,rollSum:dice,remaining,visited:[]});
    Object.assign(state.players[seat],{pos:2,previous:1,cash:303});
  }
  approach(s,0,6,2);
  assert.deepEqual(C.choices(s),[['route',3],['route',16]]);
  assert.equal(C.routePreview(s,['route',16]).trapDelta,-60);
  assert.equal(s.tiles[16].trapMagic??0,0);
  assert.equal(s.players[0].cash,303);
  assert.ok(C.play(s,['route',16]));
  assert.deepEqual([s.players[0].pos,s.players[0].cash,s.tiles[16].trapMagic],[17,243,60]);
  assert.equal(s.tiles[9].trapMagic??0,0);
  for(const [seat,dice] of [[1,4],[2,5]]){
    approach(s,seat,dice,1);
    assert.equal(C.routePreview(s,['route',16]).trapDelta,0);
    assert.ok(C.play(s,['route',16]));
    assert.equal(s.players[seat].cash,303);
    assert.equal(s.tiles[16].trapMagic,60);
  }
  const saved=JSON.parse(JSON.stringify(s));
  approach(saved,3,3,1);
  assert.equal(C.routePreview(saved,['route',16]).trapDelta,60);
  assert.ok(C.play(saved,['route',16]));
  assert.deepEqual([saved.players[3].pos,saved.players[3].cash,saved.tiles[16].trapMagic],[16,363,0]);
  assert.match(saved.shrineNotice,/마력 트랩 \+60G/);
  approach(s,3,0,1);
  Object.assign(s,{phase:'roll',remaining:0});
  delete s.rollSum;
  const oldRandom=Math.random;
  try{
    Math.random=()=>0;
    assert.ok(C.play(s,['roll']));
  }finally{Math.random=oldRandom;}
  assert.deepEqual([s.phase,s.rollSum,s.die,s.remaining],['fork',0,12,12]);
  assert.equal(C.routePreview(s,['route',16]).trapDelta,60);
  assert.ok(C.play(s,['route',16]));
  assert.equal(s.players[3].cash,363);

  const ai=C.start(2,1,5000,mapId);
  ai.aiLevel=3;
  approach(ai,1,6,1);
  ai.players[1].cash=2000;
  assert.deepEqual(C.ai(ai),['route',3]);
  approach(ai,1,3,1);
  ai.tiles[16].trapMagic=600;
  assert.deepEqual(C.ai(ai),['route',16]);
  console.log('Revolt trap pass/stop, 0/3/4/5/6 dice thresholds, separate pots, preview and serialized state OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-watchpost';
  const card=key=>C.cards.findIndex(c=>!c.catalogOnly&&C.combo.key(c)===key);
  const goblin=card('goblin'),gear=card('longsword'),guard=card('minotaur');
  assert.ok([goblin,gear,guard].every(id=>id>=0));
  function approach(steps=1,humans=4){
    const s=C.start(4,humans,5000,mapId,undefined,undefined,3,'teams'),p=s.players[0];
    Object.assign(s,{phase:'fork',die:steps,rollSum:steps,remaining:steps});
    Object.assign(p,{pos:17,previous:16,cash:600,hand:[goblin,gear]});
    assert.equal(C.routePreview(s,['route',18]).tower,steps===1);
    assert.ok(C.play(s,['route',18]));
    return s;
  }
  const passing=approach(2);
  assert.equal(passing.players[0].pos,19);
  assert.ok(!C.choices(passing).some(([kind])=>kind==='towerAim'));

  const s=approach(),p=s.players[0];
  assert.equal(p.pos,18);
  const teammate=s.players.findIndex((_,i)=>i!==0&&C.allied(s,i,0));
  const enemy=s.players.findIndex((_,i)=>!C.allied(s,i,0));
  Object.assign(s.tiles[3],{owner:teammate,unit:{id:goblin,hp:20}});
  Object.assign(s.tiles[5],{owner:enemy,unit:{id:guard,hp:40,enchant:'peace'}});
  Object.assign(s.tiles[6],{owner:0,unit:{id:goblin,hp:20}});
  assert.ok(C.choices(s).some(([kind])=>kind==='level'));
  assert.ok(C.play(s,['towerAim']));
  assert.ok(!C.play(s,['towerTo',0]));
  assert.ok(!C.play(s,['towerTo',3]));
  assert.ok(!C.play(s,['towerTo',5]));
  assert.ok(!C.play(s,['towerTo',6]));
  assert.ok(C.play(s,['towerTo',8]));
  assert.equal(s.towerAt,8);
  assert.deepEqual(C.choices(s),[['summon',0],['towerCancel']]);
  assert.ok(C.play(s,['towerCancel']));
  assert.equal(s.phase,'towerTarget');
  assert.ok(C.play(s,['towerTo',10]));
  const restored=JSON.parse(JSON.stringify(s));
  assert.ok(C.play(restored,['summon',0]));
  assert.equal(restored.players[0].pos,18);
  assert.equal(restored.players[0].cash,600-C.cards[goblin].cost);
  assert.equal(restored.tiles[10].owner,0);
  assert.equal(restored.tiles[10].unit.fatigued,true);
  assert.equal(restored.turn,1);
  assert.equal(restored.towerAt,undefined);

  for(const wins of [false,true]){
    const battle=approach(),defender=battle.players.findIndex((_,i)=>!C.allied(battle,i,0));
    Object.assign(battle.tiles[8],{type:1,level:3,owner:defender,unit:{id:guard,hp:wins?1:40}});
    assert.ok(C.play(battle,['towerAim']));
    assert.ok(C.play(battle,['towerTo',8]));
    assert.ok(C.play(battle,['invade',0]));
    assert.equal(battle.battle.at,8);
    assert.equal(battle.players[0].pos,18);
    assert.ok(C.play(battle,['bare']));
    assert.equal(C.actor(battle),defender);
    assert.ok(C.play(battle,['bare']));
    assert.equal(battle.phase,'result');
    assert.equal(battle.battle.won,wins);
    assert.equal(battle.battle.noToll,true);
    assert.equal(battle.tiles[8].owner,wins?0:defender);
    assert.ok(C.play(battle,['continue']));
    assert.equal(battle.players[0].pos,18);
    assert.equal(battle.players[0].cash,600-C.cards[goblin].cost);
    assert.equal(battle.turn,1);
  }

  const ai=approach(1,0);
  Object.assign(ai.tiles[7],{type:0,owner:0,unit:{id:goblin,hp:20,fatigued:true}});
  Object.assign(ai.tiles[8],{type:0,owner:0,unit:{id:goblin,hp:20,fatigued:true}});
  assert.deepEqual(C.ai(ai),['towerAim']);
  assert.ok(C.play(ai,C.ai(ai)));
  const choice=C.ai(ai);
  assert.equal(choice[0],'towerTo');assert.equal(ai.tiles[choice[1]].type,0);
  console.log('Revolt Command Tower stop/pass, allied exclusions, save/cancel, fatigue, capture, no toll and AI selection OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-switchyard';
  const spell=C.cards.findIndex(c=>c.effect==='remoteswitch'&&!c.catalogOnly);
  const goblin=C.cards.findIndex(c=>!c.catalogOnly&&C.combo.key(c)==='goblin');
  assert.ok(spell>=0);
  function enter(steps,round=1){
    const game=C.start(4,4,5000,mapId);
    Object.assign(game,{phase:'fork',round,die:steps,rollSum:steps,remaining:steps});
    Object.assign(game.players[0],{pos:0,previous:15,dir:1,cash:600,hand:[spell]});
    return game;
  }
  const through=enter(2);
  assert.equal(C.routePreview(through,['route',1]).at,2);
  assert.equal(through.switchRound,undefined);
  assert.ok(C.play(through,['route',1]));
  assert.equal(through.players[0].pos,2);
  assert.equal(through.switchRound,undefined);

  const s=enter(1,2);
  C.configureMatch(s,{recordReplay:true});
  assert.deepEqual([C.pathSwitch(s,1,0).to,C.pathSwitch(s,7,6).to],[2,8]);
  const preview=C.routePreview(s,['route',1]);
  assert.deepEqual([preview.phase,preview.switchTo],['pathSwitch',2]);
  assert.ok(C.play(s,['route',1]));
  assert.equal(s.phase,'pathSwitch');assert.equal(s.switchRound,6);
  assert.ok(C.play(s,['switchFlip']));
  assert.equal(s.phase,'land');
  assert.deepEqual([C.pathSwitch(s,1,0).to,C.pathSwitch(s,7,6).to],[16,20]);
  assert.equal(s.replay.steps.at(-1).switchSide,true);
  assert.equal(s.replay.steps.at(-1).switchRound,6);
  assert.ok(!C.play(s,['switchFlip']));

  const restored=JSON.parse(JSON.stringify(s));
  restored.phase='roll';restored.players[0].word=1;
  assert.ok(C.play(restored,['roll']));
  assert.deepEqual(restored.lastMove.path,[1,16]);
  const comingBack=enter(2);
  Object.assign(comingBack.players[0],{pos:16,previous:17});
  assert.equal(C.routePreview(comingBack,['route',1]).at,0);
  comingBack.switchSide=true;
  assert.equal(C.routePreview(comingBack,['route',1]).at,2);

  const automatic=enter(1,5);
  Object.assign(automatic,{phase:'land',turn:3,switchRound:6,switchSide:true});
  automatic.players[3].hand=[];
  assert.ok(C.play(automatic,['pass']));
  assert.deepEqual([automatic.round,automatic.switchSide,automatic.switchRound],[6,false,10]);
  const keep=enter(1,3);
  assert.ok(C.play(keep,['route',1]));
  assert.ok(C.play(keep,['switchKeep']));
  assert.deepEqual([keep.switchRound,C.pathSwitch(keep,1,0).to],[7,2]);

  const remote=enter(1);
  remote.phase='spell';remote.players[0].book=[goblin];
  assert.ok(C.play(remote,['cast',0]));
  assert.equal(remote.phase,'roll');
  assert.deepEqual([C.pathSwitch(remote,1,0).to,C.pathSwitch(remote,7,6).to],[16,20]);
  assert.ok(remote.players[0].book.includes(spell));
  assert.equal(remote.players[0].cash,600-30);
  const noSwitch=C.start(2,2,5000,'revolt-original-trapway');
  Object.assign(noSwitch.players[0],{book:[goblin],hand:[spell],cash:600});
  assert.ok(C.play(noSwitch,['cast',0]));
  assert.deepEqual(noSwitch.players[0].hand,[goblin]);
  assert.deepEqual(noSwitch.players[0].book,[spell]);
  console.log('Revolt Path Switch forced cross, approach directions, stop choice, synchronized timer, spell recycle and replay OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-gem-route';
  const spell=effect=>C.cards.findIndex(c=>c.effect===effect&&!c.catalogOnly);
  function approach(steps=1,humans=4){
    const s=C.start(4,humans,5000,mapId,undefined,undefined,3,'teams');
    C.configureMatch(s,{recordReplay:true});
    Object.assign(s,{phase:'fork',die:steps,rollSum:steps,remaining:steps});
    Object.assign(s.players[0],{pos:8,previous:7,cash:600,hand:[]});
    const preview=C.routePreview(s,['route',9]);
    assert.deepEqual([preview.at,preview.phase,preview.remaining],[9,'gemStore',steps-1]);
    assert.ok(C.play(s,['route',9]));
    return s;
  }
  const buy=approach(2);
  assert.deepEqual(buy.prices,[50,50,50,50]);
  assert.deepEqual(C.gemQuote(buy,['buyGem',0,5]),{cost:250,received:0,holdings:5,prices:[75,40,50,50]});
  assert.ok(C.play(buy,['buyGem',0,5]));
  assert.deepEqual([buy.phase,buy.players[0].pos,buy.players[0].cash,C.personalTotal(buy,0)],['land',10,350,725]);
  assert.deepEqual(buy.replay.steps.at(-1).gemPrices,[75,40,50,50]);
  assert.deepEqual(buy.replay.steps.at(-1).gems[0],[5,0,0,0]);

  const limits=approach();
  limits.players[0].cash=4000;limits.players[0].symbols[0]=18;limits.prices[0]=298;
  assert.ok(C.choices(limits).some(a=>a.join('/')==='buyGem/0/2'));
  assert.ok(!C.play(limits,['buyGem',0,3]));
  assert.ok(!C.play(limits,['buyGem',1,11]));
  assert.ok(C.play(limits,['buyGem',0,2]));assert.equal(limits.prices[0],300);
  assert.equal(limits.players[0].symbols[0],20);

  const sell=approach();
  sell.prices=[75,40,50,50];sell.players[0].symbols[0]=5;
  assert.deepEqual(C.gemQuote(sell,['sellGem',0,1]).prices,[75,40,50,50]);
  assert.ok(C.play(sell,['sellGem',0,5]));
  assert.deepEqual([sell.players[0].cash,sell.players[0].symbols[0],sell.prices, sell.players[0].pos],[975,0,[50,55,50,50],9]);
  assert.ok(!C.play(sell,['sellGem',0,1]));

  const steal=approach(2);
  steal.prices[0]=55;steal.players[1].symbols[0]=4;steal.players[2].symbols[0]=4;
  const sellerCash=steal.players[1].cash;
  assert.ok(!C.play(steal,['stealGem',0,2,2]));
  assert.ok(C.play(steal,['stealGem',0,2,1]));
  assert.deepEqual([steal.players[0].cash,steal.players[0].symbols[0],steal.players[1].cash,steal.players[1].symbols[0],steal.prices[0]],[436,2,sellerCash+110,2,55]);
  assert.equal(steal.players[0].pos,10);

  function ownedFire(){
    const s=approach();
    assert.ok(C.play(s,['leaveGem']));
    s.players[0].cash=1200;
    Object.assign(s.tiles[5],{owner:0,level:2,unit:{id:C.cards.findIndex(c=>C.combo.key(c)==='goblin'),hp:30}});
    return s;
  }
  const level=ownedFire();
  assert.ok(C.play(level,['level',5,4]));
  assert.deepEqual(level.prices,[90,40,70,50]);
  const terrain=ownedFire();
  assert.ok(C.play(terrain,['element',5,2]));
  assert.deepEqual(terrain.prices,[40,50,60,50]);

  const grab=spell('stealgem'),obliterate=spell('obliterate');assert.ok(grab>=0&&obliterate>=0);
  const on=C.start(4,4,5000,mapId),off=C.start(4,4,5000,'revolt-original-watchpost');
  for(const s of [on,off]){
    s.players.forEach(p=>p.cash=1000);
    s.players[0].hand=[grab];
    assert.ok(C.play(s,['cast',0]));
    if(s===on){assert.deepEqual(C.choices(s),[['fizzle']]);s.players[1].symbols[2]=2;}
    assert.ok(C.play(s,['targetPlayer',1]));
    if(s===on)assert.deepEqual([s.players[0].symbols[2],s.players[1].symbols[2]],[1,1]);
    else assert.deepEqual([s.players[0].cash,s.players[1].cash],[1040,920]);
    s.phase='spell';s.players[0].hand=[obliterate];s.players.forEach(p=>p.cash=1000);
    assert.ok(C.play(s,['cast',0]));
    assert.deepEqual([s.players[0].cash,s.players[1].cash],s===on?[850,930]:[828,900]);
  }
  const ai=approach(1,0);
  assert.equal(C.ai(ai)[0],'buyGem');
  console.log('Revolt gem shop pass/stop, caps, opponent purchase, price movement, spells, replay and AI OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-circle-court';
  const groupA='escape gift greed growthbody spiritwalk vitality barrier purify haste windofhope massphantasm manna lifestream restore revival reincarnation'.split(' ');
  const groupB='elementalwrath quintessence shatter stoneblast turntothewall disease drainmagic bindingmist pacifism blackout holybanishment holyword3 magicbolt liquidform rayoflaw'.split(' ');
  const id=name=>C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)===name);
  function base(){
    const s=C.start(4,4,5000,mapId),p=s.players[0];
    Object.assign(p,{pos:2,previous:1,cash:600,hand:[id('goblin')],book:Array(10).fill(id('goblin'))});
    Object.assign(s,{phase:'fork',die:1,rollSum:1,remaining:1});
    Object.assign(s.tiles[3],{owner:0,unit:{id:id('minotaur'),hp:12,fatigued:true}});
    Object.assign(s.tiles[8],{owner:1,unit:{id:id('wallofstone'),hp:40}});
    s.players[1].hand=[id('longsword')];
    return s;
  }
  const draw=base();
  C.configureMatch(draw,{recordReplay:true});
  assert.equal(C.routePreview(draw,['route',19]).phase,'spellCircle');
  assert.equal(draw.circlePools,undefined);
  assert.ok(C.play(draw,['route',19]));
  assert.deepEqual(draw.circlePools.map(p=>p.length),[15,14]);
  const first=draw.circleOffers.slice();
  assert.deepEqual(draw.replay.steps.at(-1).circleOffers,first);
  assert.ok(C.play(draw,['circleSkip']));
  assert.equal(draw.phase,'land');
  Object.assign(draw,{phase:'fork',die:1,remaining:1});
  Object.assign(draw.players[0],{pos:16,previous:14});
  assert.ok(C.play(draw,['route',17]));
  assert.equal(draw.players[0].pos,17);
  assert.ok(draw.circleOffers.every(card=>!first.includes(card)));
  assert.deepEqual(draw.circlePools.map(p=>p.length),[14,13]);

  const pass=base();pass.die=2;pass.remaining=2;
  assert.ok(C.play(pass,['route',19]));assert.equal(pass.players[0].pos,17);
  assert.equal(pass.phase,'spellCircle');
  const past=base();Object.assign(past,{die:2,remaining:2});Object.assign(past.players[0],{pos:17,previous:16});
  assert.ok(C.play(past,['route',19]));assert.equal(past.players[0].pos,2);
  assert.equal(past.circlePools,undefined);

  for(const name of [...groupA,...groupB]){
    const s=base(),selected=id(name),p=s.players[0];
    assert.ok(selected>=0&&!C.cards[selected].catalogOnly,name);
    Object.assign(s,{phase:'spellCircle',circleOffers:[selected]});
    Object.assign(p,{pos:19,previous:2,hand:[id('goblin')]});
    assert.ok(C.play(s,['circleCast',selected]),name);
    if(s.phase==='spellTarget'){
      const actions=C.choices(s);
      const aim=actions.find(([kind,x])=>kind==='targetLand'&&x===8||kind==='targetPlayer'&&x===1)||actions[0];
      assert.notEqual(aim[0],'fizzle',name);
      assert.ok(C.play(s,aim),name);
    }
    if(s.phase==='shatter')assert.ok(C.play(s,['breakCard',0]));
    assert.equal(s.phase,'land',name);
    assert.equal(s.circleCasting,undefined,name);
    assert.equal(s.circleOffers,undefined,name);
    assert.ok(!C.choices(s).some(([kind])=>kind==='roll'),name);
    if(name==='manna')assert.deepEqual([p.cash,p.hand],[650,[id('goblin')]]);
    if(name==='escape')assert.ok(p.pos!==19&&C.territoryType(s.tiles[p.pos].type));
    if(name==='stoneblast')assert.equal(s.tiles[8].unit.hp,10);
    if(name==='turntothewall')assert.equal(s.tiles[8].unit.id,id('wallofstone'));
    if(name==='pacifism')assert.ok(s.players.every(q=>q.status==='pacifism'));
  }
  const fast=base();fast.phase='spellCircle';fast.circleOffers=[id('haste')];
  assert.ok(C.play(fast,['circleCast',id('haste')]));
  assert.ok(C.play(fast,['targetPlayer',0]));
  assert.equal(fast.players[0].hasteRolls,2);
  for(const count of [1,0]){
    fast.phase='roll';
    assert.ok(C.play(fast,['roll']));
    assert.ok(fast.die>=6&&fast.die<=8);
    assert.equal(fast.players[0].hasteRolls??0,count);
  }

  const peace=base();peace.phase='land';peace.players[0].pos=8;peace.players[0].status='pacifism';
  assert.ok(!C.choices(peace).some(([k])=>k==='invade'));
  console.log('Revolt Spell Circle shared pools, stop-only activation, replay, all 31 spells, two-roll Haste and Pacifism OK');
}

{
  const C=ps2.createEdition('revolt'),mapId='revolt-original-gem-route';
  function debtor(cash){
    const s=C.start(2,2,5000,mapId);
    s.phase='land';Object.assign(s.players[0],{cash,pos:3,lap:2});
    Object.assign(s.tiles[1],{owner:0,unit:{id:C.cards.findIndex(c=>C.combo.key(c)==='goblin'),hp:30}});
    assert.ok(C.play(s,['pass']));
    assert.equal(s.phase,'sell');
    assert.equal(C.debtSaleValue(s,s.tiles[1]),80);
    assert.ok(C.play(s,['sell',1]));
    return s.players[0];
  }
  const repaid=debtor(-70);assert.equal(repaid.cash,10);
  const restart=debtor(-100);assert.deepEqual([restart.cash,restart.pos,restart.flags],[360,0,[]]);
  console.log('Revolt forced sale yields 80 percent, depleted player restarts at gate with 1.5x lap magic');
}

{
  const C=ps2.createEdition('revolt'),map='revolt-original-gem-route';
  const card=name=>C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)===name);
  const place=(s,i,owner,name,hp,extra={})=>Object.assign(s.tiles[i],{owner,unit:{id:card(name),hp,...extra}});
  const fixtures=()=>{
    const s=C.start(4,4,5000,map,undefined,undefined,2,'teams');
    s.players[0].cash=100;
    C.configureMatch(s,{recordReplay:true});
    return s;
  };
  const s=fixtures();
  place(s,1,0,'healer',12);
  place(s,2,2,'elvenarcher',30);
  place(s,3,1,'fate',10);
  place(s,4,3,'fate',10,{enchant:'landprotection'});
  place(s,5,0,'archbishop',7,{fatigued:true});
  assert.deepEqual(C.choices(s).filter(a=>a[0]==='secretArt'),[['secretArt',1],['secretArt',2]]);
  assert.ok(C.play(s,['secretArt',2]));
  assert.deepEqual(C.choices(s),[['secretLand',3],['secretCancel']]);
  assert.ok(!C.play(s,['secretLand',4]));
  assert.ok(C.play(s,['secretCancel']));
  assert.equal(s.players[0].cash,100);
  assert.ok(!s.tiles[2].unit.fatigued);
  assert.ok(C.play(s,['secretArt',2]));
  assert.ok(C.play(s,['secretLand',3]));
  assert.deepEqual([s.phase,s.players[0].cash,s.tiles[2].unit.fatigued,s.tiles[3].unit,s.mapEffect.source,s.mapEffect.tile],['roll',80,true,null,2,3]);
  assert.ok(!C.choices(s).some(a=>a[0]==='secretArt'||a[0]==='cast'));
  assert.ok(s.replay.steps.length>=3);

  const heal=fixtures();
  place(heal,1,2,'healer',12);
  place(heal,3,0,'elvenarcher',29);
  assert.ok(C.play(heal,['secretArt',1]));
  assert.deepEqual(C.choices(heal),[['secretLand',3],['secretCancel']]);
  assert.ok(C.play(heal,['secretLand',3]));
  assert.deepEqual([heal.tiles[3].unit.hp,heal.players[0].cash,heal.tiles[1].unit.fatigued],[40,90,undefined]);

  const dispel=fixtures();
  place(dispel,1,0,'archbishop',30);
  place(dispel,3,1,'fate',40,{enchant:'landprotection'});
  assert.ok(C.play(dispel,['secretArt',1]));
  assert.ok(C.play(dispel,['secretLand',3]));
  assert.deepEqual([dispel.players[0].cash,dispel.tiles[3].unit.enchant,dispel.tiles[1].unit.fatigued],[70,undefined,undefined]);

  const totem=fixtures();
  place(totem,1,0,'goldentotem',30);
  assert.deepEqual(C.ai(totem),['secretArt',1]);
  assert.ok(C.play(totem,['secretArt',1]));
  assert.deepEqual([totem.phase,totem.players[0].cash,totem.tiles[1].owner,totem.tiles[1].unit],['roll',300,-1,null]);

  const fate=fixtures();
  place(fate,1,0,'fate',40);
  fate.players[0].hand=Array(6).fill(card('fate'));
  assert.ok(C.play(fate,['secretArt',1]));
  assert.deepEqual([fate.players[0].cash,fate.players[0].hand.length,fate.tiles[1].unit.fatigued],[60,7,true]);
  fate.phase='land';
  assert.ok(!C.choices(fate).some(a=>['ability','totem','secretArt'].includes(a[0])));
  for(const [name,element,other,cost,damage] of [
    ['armoreddragon',-1,0,80,30],['hardrockdragon',0,1,60,20],['lightningdragon',2,3,60,20]
  ]){
    const duel=fixtures();
    place(duel,1,0,name,40);
    const unit=e=>C.presets.intro.find(id=>C.cards[id].kind==='creature'&&C.cards[id].element===e)??C.cards.findIndex(c=>!c.catalogOnly&&c.kind==='creature'&&c.element===e);
    Object.assign(duel.tiles[2],{owner:1,unit:{id:unit(element),hp:40}});
    Object.assign(duel.tiles[3],{owner:1,unit:{id:unit(other),hp:40}});
    assert.ok(C.play(duel,['secretArt',1]));
    assert.deepEqual(C.choices(duel),[...(name==='armoreddragon'?[['secretLand',1]]:[]),['secretLand',2],['secretCancel']]);
    assert.ok(C.play(duel,['secretLand',2]));
    assert.deepEqual([duel.players[0].cash,duel.tiles[2].unit.hp],[100-cost,40-damage]);
  }
  const llama=fixtures();
  place(llama,1,0,'holyllama',30);
  assert.ok(C.play(llama,['secretArt',1])&&C.play(llama,['roll']));
  assert.deepEqual([llama.players[0].cash,llama.die,llama.mapEffect.faces], [50,6,[6]]);

  const fay=fixtures();
  place(fay,1,0,'fay',30);
  place(fay,3,0,'healer',40,{st:90});
  assert.ok(C.play(fay,['secretArt',1])&&C.play(fay,['secretLand',3]));
  assert.equal(fay.tiles[3].unit.st,100);

  const world=fixtures();
  world.players[0].hand=['darkworld','mistyworld','wasteworld'].map(card);
  world.players[0].cash=1000;
  place(world,1,0,'elvenarcher',40);
  place(world,2,1,'fate',40,{enchant:'vitality'});
  place(world,3,1,'fate',40);
  assert.ok(C.play(world,['cast',0]));
  assert.deepEqual(world.world,{effect:'darkworld',until:7});
  world.phase='spell';
  assert.ok(C.play(world,['secretArt',1]));
  assert.deepEqual(C.choices(world),[['secretLand',3],['secretCancel']]);
  assert.ok(C.play(world,['secretCancel']));
  assert.ok(C.play(world,['cast',0]));
  assert.equal(C.combo.activeWorld(world),'mistyworld');
  world.phase='spellTarget';world.spellEffect='word6';
  assert.deepEqual(C.choices(world),[['fizzle']]);
  world.phase='spell';
  assert.ok(C.play(world,['cast',0]));
  assert.equal(C.combo.activeWorld(world),'wasteworld');
  assert.equal(C.price(world.players[0],C.cards[card('fate')],world),90);
  assert.equal(C.price(world.players[0],C.cards[card('darkworld')],world),140);
  const snapshot=JSON.parse(JSON.stringify(world));
  place(world,4,0,'uriel',50);
  world.phase='spell';
  assert.ok(C.play(world,['secretArt',4]));
  assert.equal(C.combo.activeWorld(world),null);
  assert.equal(world.tiles[4].unit.fatigued,true);
  snapshot.round=6;snapshot.turn=3;snapshot.phase='land';
  assert.ok(C.play(snapshot,['pass']));
  assert.equal(snapshot.round,7);
  assert.equal(snapshot.world,undefined);
  assert.equal(C.price(snapshot.players[0],C.cards[card('fate')],snapshot),60);

  const joint=fixtures();
  joint.players[0].hand=[card('jointworld')];
  place(joint,5,0,'healer',40);
  place(joint,6,2,'healer',40);
  Object.assign(joint.tiles[6],{area:joint.tiles[5].area,type:2});
  place(joint,7,1,'healer',40);
  Object.assign(joint.tiles[7],{area:joint.tiles[5].area,type:2});
  const beforeValue=C.value(joint,joint.tiles[5]);
  const beforeToll=C.toll(joint,joint.tiles[5]);
  assert.equal(C.chain(joint,joint.tiles[5]),1);
  assert.ok(C.play(joint,['cast',0]));
  assert.equal(C.chain(joint,joint.tiles[5]),2);
  assert.equal(C.chain(joint,joint.tiles[7]),1);
  assert.match(joint.chainNotice,/화·지 · 2연쇄/);
  assert.equal(C.value(joint,joint.tiles[5]),Math.floor(beforeValue*1.5));
  assert.ok(C.toll(joint,joint.tiles[5])>beforeToll);
  joint.round=6;joint.turn=3;joint.phase='land';
  assert.ok(C.play(joint,['pass']));
  assert.equal(C.chain(joint,joint.tiles[5]),1);
  assert.match(joint.chainNotice,/화·지 · 연쇄 해제/);

  const bright=fixtures();
  const richDragon=C.evo.encode({age:10,st:70,hp:30,element:0,land:1,discard:1,abilities:[]},0);
  const trainee=bright.players[0];
  trainee.cash=100;trainee.hand=[richDragon];trainee.pos=5;bright.phase='land';
  assert.ok(!C.choices(bright).some(([kind])=>kind==='summon'));
  trainee.hand.unshift(card('brightworld'));bright.phase='spell';
  assert.ok(C.play(bright,['cast',0]));
  bright.phase='land';
  assert.ok(C.play(bright,['summon',0]));
  assert.equal(bright.tiles[5].unit.id,richDragon);
  assert.equal(trainee.cash,30-C.cards[richDragon].cost);

  for(const blocked of [false,true]){
    const natural=fixtures();
    place(natural,1,0,'goldentotem',30);
    place(natural,5,1,'fate',40);
    const defender=natural.players[1];
    defender.hand=[];
    if(blocked){
      natural.players[0].hand=[card('naturalworld')];
      assert.ok(C.play(natural,['cast',0]));
    }
    natural.phase='spell';
    assert.equal(C.choices(natural).some(([kind])=>kind==='secretArt'),!blocked);
    if(blocked)assert.ok(!C.play(natural,['secretArt',1]));
    natural.phase='attack';
    natural.battle={at:5,inv:card('armoreddragon'),atkItem:null,defItem:null};
    assert.ok(C.play(natural,['bare'])&&C.play(natural,['bare']));
    assert.equal(natural.battle.won,true);
    assert.equal(defender.hand.length,blocked?0:1);
  }

  const solid=fixtures();
  solid.players[0].cash=1200;solid.players[0].pos=5;
  solid.players[0].hand=[card('solidworld'),card('watershift')];
  place(solid,5,0,'fate',40);
  solid.tiles[5].level=3;
  assert.ok(C.play(solid,['cast',0]));
  solid.phase='spell';
  assert.ok(C.play(solid,['cast',0]));
  assert.deepEqual(C.choices(solid),[['fizzle']]);
  assert.ok(C.play(solid,['fizzle']));
  solid.phase='spellTarget';solid.spellEffect='meteor';
  assert.deepEqual(C.choices(solid),[['fizzle']]);
  solid.phase='land';
  assert.ok(C.play(solid,['element',5,1]));
  assert.deepEqual([solid.tiles[5].type,solid.tiles[5].level],[1,3]);

  const mercy=fixtures();
  mercy.players[0].cash=1200;mercy.players[2].cash=1100;mercy.players[1].cash=100;mercy.players[3].cash=100;
  mercy.players[0].hand=[card('mercifulworld'),card('goblin')];
  place(mercy,5,2,'goblin',40);
  place(mercy,6,1,'fate',40);
  assert.ok(C.play(mercy,['cast',0]));
  mercy.phase='land';mercy.players[0].pos=6;
  assert.ok(C.choices(mercy).some(([kind])=>kind==='pay'));
  assert.ok(!C.choices(mercy).some(([kind,a,b])=>kind==='invade'||kind==='transfer'&&a===5&&b===6));
  mercy.players[1].cash=3000;
  assert.ok(C.choices(mercy).some(([kind])=>kind==='invade'));
  assert.ok(C.choices(mercy).some(([kind,a,b])=>kind==='transfer'&&a===5&&b===6));

  for(const duplicate of [false,true]){
    const mirror=fixtures();
    mirror.players[0].hand=[card('mirrorworld')];
    place(mirror,5,1,'fate',40);
    if(duplicate)place(mirror,6,3,'fate',40);
    assert.ok(C.play(mirror,['cast',0]));
    mirror.phase='attack';mirror.battle={at:5,inv:card('goblin'),atkItem:null,defItem:null};
    assert.ok(C.play(mirror,['bare'])&&C.play(mirror,['bare']));
    assert.equal(mirror.battle.won,duplicate);
    assert.equal(mirror.battle.strikes.length===0,duplicate);
    if(duplicate)assert.ok(mirror.battle.lines.some(line=>line.startsWith('미러 월드')));
  }

  for(const [name,cost,owner,extra,verify] of [
    ['alp',50,1,{},t=>assert.equal(t.unit.fatigued,true)],
    ['captaincock',60,0,{fatigued:true},t=>assert.equal(t.unit.fatigued,undefined)],
    ['domovikha',80,0,{},t=>assert.equal(t.unit.enchant,'landprotection')],
    ['hyde',50,1,{},t=>assert.equal(t.unit.enchant,'paralysis')],
    ['screamer',40,1,{},t=>assert.equal(t.unit.enchant,'antielement')],
    ['hidebehind',40,0,{},t=>assert.equal(t.unit.enchant,'camouflage')],
    ['kawahime',30,1,{st:5},t=>assert.equal(t.unit.st,0)]
  ]){
    const match=fixtures();
    place(match,5,0,name,30);
    place(match,6,owner,'fate',40,extra);
    place(match,7,2,'fate',40,extra);
    assert.ok(C.play(match,['secretArt',5]));
    assert.ok(C.choices(match).some(([kind,at])=>kind==='secretLand'&&at===6));
    if(['alp','captaincock','domovikha','screamer','hidebehind'].includes(name))
      assert.ok(!C.choices(match).some(([kind,at])=>kind==='secretLand'&&at===7));
    assert.ok(C.play(match,['secretLand',6]));
    assert.equal(match.players[0].cash,100-cost);
    assert.equal(!!match.tiles[5].unit.fatigued,!C.cards[card(name)].vigorous);
    verify(match.tiles[6]);
  }
  const peace=fixtures();
  place(peace,5,0,'rockshell',30);
  assert.ok(C.play(peace,['secretArt',5]));
  assert.equal(peace.tiles[5].unit.enchant,'peace');
  assert.equal(C.toll(peace,peace.tiles[5]),0);

  for(const [book,effects] of [['fire',['brightworld']],['stronghold',['jointworld','darkworld']]]){
    assert.ok(C.validBook(C.presets[book]));
    for(const effect of effects)assert.ok(C.presets[book].some(id=>C.cards[id].effect===effect));
  }
  assert.ok(C.presets.fire.filter(id=>C.cards[id].kind==='creature'&&C.cards[id].catalog?.additionalCost).length>=6);
  const reuse=fixtures();
  reuse.players[0].cash=800;reuse.players[0].pos=5;
  reuse.players[0].hand=['peace','senility','exile','squeeze','goblin'].map(card);
  reuse.players[1].cash=200;
  reuse.players[1].hand=Array(6).fill(card('goblin'));
  place(reuse,5,1,'fate',40);
  place(reuse,6,1,'healer',40,{enchant:'disease'});
  place(reuse,7,1,'elvenarcher',40,{enchant:'disease'});
  assert.ok(C.play(reuse,['cast',0])&&C.play(reuse,['targetLand',5]));
  assert.equal(C.toll(reuse,reuse.tiles[5]),0);
  reuse.phase='land';
  assert.ok(!C.choices(reuse).some(([kind])=>kind==='invade'));
  reuse.phase='spell';
  assert.ok(C.play(reuse,['cast',0])&&C.play(reuse,['targetLand',5]));
  assert.equal(reuse.tiles[5].unit.enchant,'senility');
  reuse.phase='attack';reuse.battle={at:5,inv:card('goblin'),atkItem:null,defItem:null};
  assert.ok(C.play(reuse,['bare'])&&C.play(reuse,['bare']));
  assert.equal(reuse.battle.won,true);
  reuse.phase='spell';
  assert.ok(C.play(reuse,['cast',0]));
  assert.deepEqual(C.choices(reuse),[['targetLand',6]]);
  const held=reuse.players[1].hand.length;
  assert.ok(C.play(reuse,['targetLand',6]));
  assert.equal(reuse.players[1].hand.length,held+1);
  assert.equal(reuse.players[1].hand.at(-1),card('healer'));
  assert.equal(reuse.tiles[6].unit,null);
  reuse.phase='spell';
  assert.ok(C.play(reuse,['cast',0])&&C.play(reuse,['targetPlayer',1]));
  assert.ok(C.play(reuse,['breakCard',0]));
  assert.deepEqual([reuse.players[1].cash,reuse.players[1].hand.length],[350,held]);

  const tollBonus=fixtures();tollBonus.teams=null;
  tollBonus.players[0].hand=[card('dreamterrain')];
  place(tollBonus,5,3,'fate',40);
  assert.ok(C.play(tollBonus,['cast',0]));
  assert.equal(tollBonus.players[0].enchantDeadline,20);
  const baseCash=tollBonus.players[0].cash,toll=C.toll(tollBonus,tollBonus.tiles[5]);
  tollBonus.turn=1;tollBonus.phase='land';tollBonus.players[1].pos=5;
  assert.ok(C.play(tollBonus,['pay']));
  assert.equal(tollBonus.players[0].cash,baseCash+Math.floor(toll/2));
  tollBonus.round=5;tollBonus.turn=3;tollBonus.phase='land';
  assert.ok(C.play(tollBonus,['pass']));
  assert.equal(tollBonus.round,6);
  assert.equal(tollBonus.players[0].dream,undefined);

  const trap=fixtures();
  const walker=trap.players[0];walker.hand=[card('quicksand')];
  place(trap,3,1,'fate',40);
  assert.ok(C.play(trap,['cast',0])&&C.play(trap,['targetLand',3]));
  Object.assign(walker,{pos:2,previous:1,dir:1,word:1});
  assert.ok(C.play(trap,['roll']));
  assert.equal(walker.pos,3);
  assert.equal(trap.tiles[3].unit.enchant,'quicksand');
  Object.assign(walker,{pos:2,previous:1,dir:1,word:2});trap.phase='roll';
  assert.ok(C.play(trap,['roll']));
  assert.equal(walker.pos,3);
  assert.equal(trap.tiles[3].unit.enchant,undefined);

  const trained=Array.from({length:6}).reduce(C.evo.won,C.evo.fresh());
  for(const [part,key,expectedCost,check] of [
    [32,'heal',10,g=>assert.equal(g.tiles[6].unit.hp,40)],
    [33,'arrow',20,g=>assert.equal(g.tiles[6].unit.hp,10)],
    [34,'lapGain',0,g=>assert.equal(g.players[0].cash,160)],
    [35,'dispel',30,g=>assert.equal(g.tiles[6].unit.enchant,undefined)],
    [36,'blind',50,g=>assert.equal(g.tiles[6].unit.enchant,'fog')],
    [37,'boost',40,g=>assert.equal(g.tiles[6].unit.enchant,'vitality')],
    [38,'weaken',40,g=>assert.equal(g.tiles[6].unit.enchant,'disease')],
    [39,'worldDispel',50,g=>assert.equal(g.world,undefined)]
  ]){
    const recipe=C.evo.apply(trained,'ability',part),id=C.evo.encode(recipe,0);
    assert.deepEqual(C.evo.decode(id).abilities,[part]);
    assert.equal(C.cards[id].secretArt,key);
    assert.equal(C.secretArt(C.cards[id]).cost,expectedCost);
    assert.equal(C.evo.apply(recipe,'ability',part===32?33:32),null);
    const deck=C.presets.intro.slice();deck[0]=id;
    assert.deepEqual(C.evo.unpackBook(C.evo.packBook(deck)),deck);
    const match=fixtures();
    match.players[0].lap=2;
    Object.assign(match.tiles[5],{owner:0,unit:{id,hp:30}});
    place(match,6,part===32?0:1,'healer',20,part===35?{enchant:'landprotection'}:{});
    if(key==='worldDispel'){
      assert.ok(!C.choices(match).some(([kind])=>kind==='secretArt'));
      match.world={effect:'darkworld',until:7};
    }
    assert.ok(C.play(match,['secretArt',5]));
    if(!['lapGain','worldDispel'].includes(key))assert.ok(C.play(match,['secretLand',6]));
    assert.equal(match.phase,'roll');
    assert.equal(match.tiles[5].unit.fatigued,true);
    assert.equal(match.players[0].cash,key==='lapGain'?160:100-expectedCost);
    check(match);
  }
  console.log('Revolt native and Evo Secret Arts before rolling, alliance targeting, fatigue, cancel, lethal damage, card draw, spell ward and replay OK');
}
{
  const C=ps2.createEdition('revolt'),E=C.evo,map='revolt-original-gem-route';
  const evolved=Array.from({length:6}).reduce(E.won,E.fresh());
  const base=E.encode(E.fresh(),0),other=E.encode(E.fresh(),1);
  assert.equal(E.apply(E.fresh(),'ability',1),null);
  const trained=E.apply(E.fresh(),'growth','stUp');
  assert.deepEqual([trained.st,trained.hp,trained.sp,E.summonCost(trained)],[30,30,1,10]);
  const stamped=E.apply(evolved,'element',0);
  const withFirst=E.apply(stamped,'ability',1);
  assert.equal(E.apply(withFirst,'ability',2),null,'two parts in one group');
  const fire=E.apply(E.apply(E.apply(withFirst,'ability',10),'land'),'discard');
  const fireId=E.encode(fire,0);
  assert.deepEqual([C.cards[fireId].element,C.cards[fireId].cost,C.cards[fireId].catalog.additionalCost],[0,10,'R,+[]']);
  assert.ok(C.cards[fireId].first&&C.cards[fireId].neutralizeScroll);
  assert.deepEqual(E.decode(fireId),{age:6,element:0,st:20,hp:30,land:1,discard:1,abilities:[1,10],slot:0});
  const reduced=E.apply(fire,'removeAbility',10);
  assert.equal(reduced.sp,fire.sp,'removing a part does not refund SP');
  assert.equal(E.apply(E.fresh(),'land'),null);
  assert.equal(E.encode(E.apply(evolved,'growth','hpDown'),0),null,'negative summon cost is not a playable card');
  assert.equal(E.encode({...E.fresh(),st:80,hp:80,sp:0},0),null,'age zero cannot fund maximal stats');
  assert.equal(Array.from({length:15}).reduce(E.won,E.fresh()).age,10);

  const deck=C.presets.intro.slice();deck.splice(-2,2,fireId,other);
  assert.ok(C.validBook(deck));
  const envelope=E.packBook(deck);
  assert.match(JSON.stringify(envelope),/^\[[0-9]{1,4}(,[0-9]{1,4}){49}\]$/);
  assert.deepEqual(E.unpackBook(envelope),deck);
  assert.deepEqual(E.unpackBook(C.presets.intro),C.presets.intro);
  assert.equal(E.unpackBook([9999,...Array(49).fill(0)]),null);
  assert.ok(!C.validBook([...deck.slice(0,-1),base]),'only one recipe per Evo slot');
  assert.ok(!C.validBook([...deck.slice(0,-1),1_999_999_999]));
  assert.ok(!ps2.validBook(deck));

  const evoCount=book=>book.filter(id=>C.cards[id]?.evo).length;
  for(const layout of ['teams','teams-12','teams-14']){
    const match=C.start(4,4,5000,map,deck,deck,2,layout);
    const ally=match.teams.findIndex((team,seat)=>seat&&team===0);
    assert.ok(C.setOpeningBook(match,ally,deck));
    assert.deepEqual([evoCount(match.players[0].template),evoCount(match.players[ally].template),match.players[ally].evoOpeningLimited],[2,0,2]);
    assert.ok(match.players.every(p=>C.validBook(p.template)));
    for(const team of [0,1])assert.equal(match.players.reduce((n,p,i)=>n+(match.teams[i]===team?evoCount(p.template):0),0),2);
    const State=require('../dist/cept-room-state');
    assert.equal(State.view(C,match,ally).game.players[ally].evoOpeningLimited,2);
    assert.equal(State.view(C,match,0).game.players[ally].evoOpeningLimited,undefined);
    assert.equal(State.view(C,match,ally).game.players[ally].evoOpeningBook,undefined);
    assert.ok(C.setOpeningBook(match,0,C.presets.intro));
    assert.equal(evoCount(match.players[ally].template),2);
    assert.equal(match.players[ally].evoOpeningLimited,undefined);
  }
  const allies=C.start(4,4,5000,map,deck,deck,2,'teams');
  const weak=C.presets.intro.find(id=>C.cards[id].kind==='creature'&&!C.cards[id].stationary);
  const allyEvo=E.encode({age:10,st:70,hp:30,element:-1,land:0,discard:0,abilities:[]},1);
  allies.phase='land';allies.players[0].pos=2;allies.players[0].cash=600;allies.players[0].hand=[base];
  Object.assign(allies.tiles[1],{type:1,owner:2,unit:{id:allyEvo,hp:30}});
  Object.assign(allies.tiles[2],{type:1,owner:2,unit:{id:weak,hp:10}});
  Object.assign(allies.tiles[3],{type:3,owner:1,unit:{id:weak,hp:10,fatigued:true}});
  Object.assign(allies.tiles[15],{type:0,owner:2,unit:{id:base,hp:30,fatigued:true}});
  assert.ok(C.choices(allies).some(([k,x,y])=>k==='level'&&x===1&&y===2));
  assert.ok(!C.choices(allies).some(([k,x])=>['level','exchange','transfer'].includes(k)&&x===15));
  assert.ok(!C.choices(allies).some(([k])=>['pay','invade'].includes(k)));
  const upgrade=structuredClone(allies);
  assert.ok(C.play(upgrade,['level',1,2]));
  assert.deepEqual([upgrade.tiles[1].owner,upgrade.tiles[1].level,upgrade.tiles[1].unit.fatigued],[2,2,true]);
  assert.ok(!C.choices(allies).some(([k,x,y])=>k==='transfer'&&x===1&&y===2));
  allies.tiles[2].unit={id:allyEvo,hp:30};
  assert.ok(C.play(allies,['transfer',2,3]));
  assert.deepEqual([C.actor(allies),allies.turn],[2,0]);
  assert.ok(C.play(allies,['bare']));assert.equal(C.actor(allies),1);
  assert.ok(C.play(allies,['bare']));assert.ok(allies.battle.won);
  assert.equal(allies.tiles[3].owner,2);
  assert.ok(C.play(allies,['continue']));assert.equal(allies.turn,1);

  const s=C.start(4,4,5000,map,deck,deck,2,'teams');
  C.configureMatch(s,{recordReplay:true});
  assert.ok(C.setOpeningBook(s,1,[...deck.slice(0,-2),other,base]));
  s.players[0].cash=600;s.phase='land';s.players[0].pos=3;s.players[0].hand=[fireId,C.presets.intro[0]];
  assert.ok(!C.choices(s).some(([kind,i])=>kind==='summon'&&i===0));
  Object.assign(s.tiles[1],{type:0,owner:0,unit:{id:base,hp:30}});
  assert.ok(C.play(s,['summon',0]));
  assert.equal(s.phase,'sacrifice');
  assert.ok(C.play(s,['sacrifice',1]));
  assert.deepEqual([s.tiles[3].unit.id,s.tiles[3].unit.hp,s.tiles[3].unit.fatigued,s.players[0].cash],[fireId,30,true,590]);
  const restored=JSON.parse(JSON.stringify(s));
  assert.equal(C.cards[restored.tiles[3].unit.id].name,'에보 드래곤 1');
  assert.ok(restored.replay.steps.some(step=>step.tiles.some(([i,v])=>i===3&&v[3]===fireId)));
  const State=require('../dist/cept-room-state');
  assert.equal(State.view(C,restored,0).game.players[0].evoRewardBook,undefined);
  restored.phase='over';restored.winner=0;
  assert.deepEqual(State.view(C,restored,0).game.players[0].evoRewardBook,[fireId,other]);
  assert.equal(State.view(C,restored,1).game.players[0].evoRewardBook,undefined);
  const duel=C.start(2,2,5000,map,deck);
  duel.phase='attack';duel.battle={at:3,inv:fireId,atkItem:null,defItem:null};
  const guard=C.presets.fire.find(id=>C.cards[id].kind==='creature'&&!C.cards[id].first);
  Object.assign(duel.tiles[3],{type:1,owner:1,unit:{id:guard,hp:60}});
  assert.ok(C.play(duel,['bare']));assert.ok(C.play(duel,['bare']));
  assert.equal(duel.battle.strikes[0].side,0);
  assert.equal(duel.battle.attackST,20);
  assert.equal(base,1_000_119_646,'released Evo deck IDs retain their meaning');
  const build=part=>E.encode(E.apply(evolved,'ability',part),0);
  const verifyAttack=(attacker,round=2)=>{
    const s=C.start(2,2,5000,map,deck);s.round=round;
    s.phase='attack';s.battle={at:3,inv:attacker,atkItem:null,defItem:null};
    Object.assign(s.tiles[3],{type:1,level:3,owner:1,unit:{id:guard,hp:60,st:60}});
    Object.assign(s.tiles[1],{owner:0,unit:{id:other,hp:30}});
    assert.ok(C.play(s,['bare']));assert.ok(C.play(s,['bare']));
    return s;
  };
  const scroll=verifyAttack(build(17));
  assert.equal(scroll.battle.attackST,30);
  assert.ok(scroll.battle.strikes[0].notes.some(line=>line.includes('30 피해')));
  const era=verifyAttack(build(20),12);
  assert.equal(era.battle.attackST,32);
  const same=verifyAttack(build(22));
  assert.equal(same.battle.attackST,25);
  const habitat=verifyAttack(build(18));
  assert.equal(habitat.battle.attackST,10);
  const years=verifyAttack(build(24));
  assert.equal(years.battle.attackST,44);
  const drainer=verifyAttack(build(26));
  assert.equal(drainer.tiles[3].unit.st,0);
  const legacy=verifyAttack(build(29));
  assert.equal(legacy.battle.finalHP[0],0);
  assert.ok(legacy.battle.lines.some(line=>line.includes('마력 유산')));
  assert.equal(legacy.players[0].cash,(C.maps[map].startCash??200)+120);
  const tollGame=C.start(2,2,5000,map,deck);
  Object.assign(tollGame.tiles[3],{owner:0,unit:{id:base,hp:30}});
  const ordinary=C.toll(tollGame,tollGame.tiles[3]);
  tollGame.tiles[3].unit.id=build(27);
  assert.equal(C.toll(tollGame,tollGame.tiles[3]),Math.floor(ordinary*1.5));

  const spell=C.cards.findIndex(c=>c.effect==='miraclecall'&&!c.catalogOnly);
  assert.ok(spell>=0);
  for(const hasDragon of [false,true]){
    const s=C.start(2,2,5000,map,deck),p=s.players[0],normal=C.presets.intro[0];
    p.hand=[spell];p.book=hasDragon?[base,normal,normal]:[normal,normal,normal];p.cash=500;
    assert.ok(C.play(s,['cast',0]));assert.equal(s.phase,'roll');
    assert.deepEqual(p.hand,hasDragon?[base]:[normal,normal]);
    assert.equal(p.cash,430);
  }
  console.log('Revolt alliance fatigue, team Evo cap, Breed training budget, part groups, legal book slots, summon costs, serialization, replay, privacy, packed version compatibility, battle parts and Miracle Call OK');
}

{
  const C=ps2.createEdition('saga'),map=Object.keys(C.maps)[0];
  const id=name=>C.cards.findIndex(card=>!card.unlisted&&!card.catalogOnly&&C.combo.key(card)===name);
  for(const book of ['sagaStarterWater','sagaStarterFire','sagaImmediate','sagaAffinity'])assert.ok(C.validBook(C.presets[book]));
  const starters={
    sagaStarterWater:'aqualing blueogre giantamoeba lizardman wallofice blitzraven griffon harpy tornado yellowogre freezingwind',
    sagaStarterFire:'creepingflame gascloud minotaur phlogiston redogre dwarf greenogre squirrine wallofstone woodfolk firestone'
  };
  for(const [book,names] of Object.entries(starters)){
    const expected=new Map('fighter giantrat goblin skeleton chainmail leatherarmor longsword mace crusher cure holyword1 holyword6 magicbolt manna'.split(' ').map(n=>[id(n),2]));
    expected.set(id('haste'),1);
    names.split(' ').forEach((n,i)=>expected.set(id(n),i===10?1:2));
    const actual=new Map();
    const counts={creature:0,item:0,spell:0};
    for(const index of C.presets[book]){
      actual.set(index,(actual.get(index)||0)+1);
      counts[C.cards[index].kind]++;
    }
    assert.deepEqual(actual,expected);
    assert.deepEqual(counts,{creature:28,item:9,spell:13});
  }
  const idolMatch=()=>C.start(2,2,5000,'saga-original-crosswind');
  const place=(s,at,name,owner,type,level=1)=>{
    const c=C.cards[id(name)];
    Object.assign(s.tiles[at],{owner,type,level,unit:{id:id(name),hp:c.hp}});
  };
  const commands=idolMatch();
  Object.assign(commands.players[0],{pos:2,cash:500,hand:[id('goblin')]});
  commands.phase='land';
  place(commands,2,'fay',0,0);
  for(const action of ['ability','transfer','exchange','level','element'])assert.ok(C.choices(commands).some(([k])=>k===action));
  place(commands,8,'leadidol',1,0);
  for(const action of ['transfer','exchange'])assert.ok(!C.choices(commands).some(([k])=>k===action));
  for(const action of ['ability','level','element'])assert.ok(C.choices(commands).some(([k])=>k===action));
  commands.tiles[8].unit.enchant='paralysis';
  assert.ok(C.choices(commands).some(([k])=>k==='transfer'));
  place(commands,8,'ebonyidol',1,0);
  assert.ok(!C.choices(commands).some(([k])=>k==='ability'));
  assert.ok(C.choices(commands).some(([k])=>k==='exchange'));

  const prices=idolMatch(),buyer=prices.players[0];
  place(prices,8,'ivoryidol',1,0);
  for(const [name,g] of [['magicbolt',50],['shadowarmor',45],['comet',240]])assert.equal(C.price(buyer,C.cards[id(name)],prices),g);
  prices.tiles[8].unit.enchant='paralysis';
  assert.equal(C.price(buyer,C.cards[id('comet')],prices),120);
  Object.assign(buyer,{pos:2,cash:300,hand:[id('soulcollector')]});
  prices.phase='land';
  assert.ok(!C.choices(prices).some(([k])=>k==='summon'));
  place(prices,8,'goldidol',1,0);
  assert.ok(C.play(prices,['summon',0]));
  assert.equal(C.combo.key(C.cards[prices.tiles[2].unit.id]),'soulcollector');
  assert.equal(buyer.cash,240);
  const gold=idolMatch();
  Object.assign(gold.players[0],{pos:2,cash:300,hand:[id('nightfiend')]});
  gold.phase='land';place(gold,8,'goldidol',1,0);
  assert.ok(C.choices(gold).some(([k])=>k==='summon'));
  gold.tiles[8].unit.enchant='paralysis';
  assert.ok(!C.choices(gold).some(([k])=>k==='summon'));

  const protectedLands=idolMatch();
  place(protectedLands,2,'sakuya',0,0);
  place(protectedLands,3,'minotaur',1,0,3);
  Object.assign(protectedLands.players[0],{pos:2,cash:500,hand:[id('comet'),id('goblin')]});
  protectedLands.phase='land';
  assert.ok(C.choices(protectedLands).some(([k])=>k==='ability'));
  place(protectedLands,8,'jadeidol',1,0);
  assert.ok(!C.choices(protectedLands).some(([k])=>k==='ability'));
  assert.ok(C.choices(protectedLands).some(([k])=>k==='element'));
  protectedLands.phase='spell';
  const shielded=structuredClone(protectedLands);
  assert.ok(C.play(shielded,['cast',0])&&C.play(shielded,['sacrifice',1]));
  assert.deepEqual(C.choices(shielded),[['fizzle']]);
  assert.equal(shielded.tiles[3].level,3);
  protectedLands.tiles[8].unit.enchant='paralysis';
  assert.ok(C.play(protectedLands,['cast',0])&&C.play(protectedLands,['sacrifice',1])&&C.play(protectedLands,['targetLand',3]));
  assert.equal(protectedLands.tiles[3].level,1);

  const harm=idolMatch();
  harm.players[0].cash=500;harm.players[0].hand=[id('magicbolt'),id('magicbolt')];
  place(harm,3,'minotaur',1,0);
  place(harm,8,'clayidol',1,0);
  assert.ok(C.play(harm,['cast',0])&&C.play(harm,['targetLand',3]));
  assert.equal(harm.tiles[3].unit.hp,30);
  harm.phase='spell';harm.tiles[8].unit.enchant='paralysis';
  assert.ok(C.play(harm,['cast',0])&&C.play(harm,['targetLand',3]));
  assert.equal(harm.tiles[3].unit.hp,10);
  for(const word of [undefined,1]){
    for(let sample=0;sample<12;sample++){
      const dice=idolMatch();
      place(dice,8,'ironidol',1,0);
      if(word)dice.players[0].word=word;
      assert.ok(C.play(dice,['roll']));
      assert.ok(word?dice.die===word:[4,5,6].includes(dice.die));
    }
  }
  console.log('Saga seven active map Idols: paralysis, summon costs, dice, territory commands and damage protection OK');
  assert.equal(C.presets.sagaImmediate.filter(id=>C.cards[id].doublecast).length,10);
  assert.equal(C.presets.sagaAffinity.filter(id=>['sagabistair','sagaselenear'].includes(C.cards[id].effect)).length,6);
  const special=['reincarnation','cleanse','crusher','debility','fistfight','illness','mimicry','paralyzer','zap','bulimia','fatbody','hustle','poisonmind'];
  for(const name of special){
    assert.equal(C.cards[id(name)].doublecast,true);
    assert.match(describeSpell(C,C.cards[id(name)]),/주문을 더 쓸 수 있습니다/);
  }
  const s=C.start(2,2,5000,map),p=s.players[0],q=s.players[1],goblin=id('goblin');
  p.cash=1500;p.hand=['zap','debility','holyword8'].map(id);
  const at=s.tiles.findIndex(t=>typeof t.type==='number');
  Object.assign(s.tiles[at],{owner:1,unit:{id:goblin,hp:30}});
  C.configureMatch(s,{recordReplay:true});
  assert.ok(C.play(s,['cast',0]));
  assert.equal(s.doublecast,'pending');
  const saved=structuredClone(s);
  assert.ok(C.play(saved,['targetLand',at]));
  assert.equal(saved.tiles[at].unit.hp,20);
  assert.deepEqual([saved.phase,saved.doublecast,saved.turn],['spell','ready',0]);
  assert.ok(C.play(saved,['cast',0])&&C.play(saved,['targetLand',at]));
  assert.equal(saved.tiles[at].unit.st,0);
  assert.equal(saved.phase,'spell');
  assert.ok(C.play(saved,['cast',0])&&C.play(saved,['targetPlayer',1]));
  assert.equal(saved.phase,'roll');
  assert.equal(saved.doublecast,undefined);
  assert.equal(saved.players[1].word,8);
  assert.equal(saved.replay.steps.length,6);

  q.hand=[id('holyword8')];
  p.hand=['crusher','reincarnation','holyword8'].map(id);p.book=[goblin,goblin];
  assert.ok(C.play(s,['targetLand',at])&&C.play(s,['cast',0])&&C.play(s,['targetPlayer',1])&&C.play(s,['breakCard',0]));
  assert.equal(q.hand.length,0);
  assert.equal(s.phase,'spell');
  assert.ok(C.play(s,['cast',0]));
  assert.deepEqual(p.hand,[goblin]);
  assert.equal(s.phase,'spell');
  assert.ok(C.play(s,['roll']));
  assert.equal(s.doublecast,undefined);
  const proof=C.start(2,2,5000,map);
  const [caster,victim]=proof.players;
  caster.cash=1000;caster.hand=['fatbody','hustle','bulimia','poisonmind'].map(id);victim.book=[id('holyword8'),goblin];
  Object.assign(proof.tiles[at],{owner:1,unit:{id:goblin,hp:30,mhp:90,st:25}});
  assert.ok(C.play(proof,['cast',0])&&C.play(proof,['targetLand',at]));
  assert.deepEqual([proof.tiles[at].unit.mhp,proof.tiles[at].unit.hp,proof.tiles[at].unit.st],[100,40,5]);
  assert.ok(C.play(proof,['cast',0])&&C.play(proof,['targetLand',at]));
  assert.equal(proof.tiles[at].unit.enchant,'hustle');
  assert.ok(C.play(proof,['cast',0])&&C.play(proof,['targetLand',at]));
  assert.equal(proof.tiles[at].unit.enchant,'bulimia');
  assert.ok(C.play(proof,['cast',0])&&C.play(proof,['targetPlayer',1]));
  const roomState=require('../dist/cept-room-state');
  assert.deepEqual(roomState.view(C,proof,0).game.players[0].peek.ids,[goblin,id('holyword8')]);
  assert.equal(roomState.view(C,proof,1).game.players[0].peek,undefined);
  assert.ok(C.play(proof,['eraseDraw',1]));
  assert.deepEqual(victim.book,[goblin]);
  assert.equal(proof.phase,'spell');
  victim.hand=[goblin];
  proof.phase='attack';proof.battle={at,inv:goblin,atkItem:null,defItem:null};
  assert.ok(C.play(proof,['bare'])&&C.play(proof,['bare']));
  assert.equal(victim.hand.length,0);
  assert.ok(proof.battle.lines.some(line=>line.startsWith('불리미아')));
  const renewed=C.start(2,2,5000,map),[owner,enemy]=renewed.players;
  owner.cash=2000;owner.hand=['shrink','massgrowth','mutation','reinforce','dispelmagic','windofhope'].map(id);
  enemy.status='blackout';enemy.statusUntil=3;
  Object.assign(renewed.tiles[at],{owner:1,unit:{id:goblin,hp:65,mhp:95,st:95}});
  assert.ok(C.play(renewed,['cast',0])&&C.play(renewed,['targetLand',at]));
  assert.deepEqual([renewed.tiles[at].unit.hp,renewed.tiles[at].unit.mhp,renewed.tiles[at].unit.st],[65,85,85]);
  renewed.phase='spell';assert.ok(C.play(renewed,['cast',0]));
  assert.equal(renewed.tiles[at].unit.mhp,90);
  renewed.phase='spell';assert.ok(C.play(renewed,['cast',0])&&C.play(renewed,['targetLand',at]));
  assert.deepEqual([renewed.tiles[at].unit.mhp,renewed.tiles[at].unit.poisoned],[100,true]);
  renewed.tiles[at].unit.st=95;
  renewed.phase='spell';assert.ok(C.play(renewed,['cast',0])&&C.play(renewed,['comboArea',renewed.tiles[at].area]));
  assert.equal(renewed.tiles[at].unit.st,100);
  renewed.phase='spell';assert.ok(C.play(renewed,['cast',0])&&C.play(renewed,['targetPlayer',1]));
  assert.equal(enemy.status,undefined);assert.equal(owner.book[0],id('dispelmagic'));
  renewed.phase='spell';owner.hand=Array(5).fill(goblin).concat(id('windofhope'));owner.book=[];
  assert.ok(C.play(renewed,['cast',5]));
  assert.deepEqual([renewed.phase,renewed.discardReturn,owner.hand.length,owner.book.length],['discard','roll',7,48]);
  assert.ok(C.play(renewed,['discard',0]));
  assert.deepEqual([renewed.phase,owner.hand.length],['roll',6]);
  renewed.phase='spell';renewed.doublecast='pending';owner.hand.push(goblin);
  renewed.phase='mindseeker';renewed.spellTarget=1;enemy.book=[goblin];
  assert.ok(C.play(renewed,['eraseDraw',0]));
  assert.deepEqual([renewed.phase,renewed.discardReturn,renewed.doublecast],['discard','spell','ready']);
  assert.ok(C.play(renewed,['discard',0]));assert.equal(renewed.phase,'spell');
  console.log('Saga Doublecast: all 13 cards, reload, private choices, base and battle effects, roll exit OK');
  const affinity=C.start(4,4,5000,map,undefined,undefined,0,'teams');
  const [artist,guest]=affinity.players;
  const cells=affinity.tiles.flatMap((tile,i)=>typeof tile.type==='number'?[i]:[]).slice(0,7);
  const [hit]=cells.slice(-1);
  artist.cash=2000;artist.hand=['bistair','bistair','selenear','iksear','terrair','gift'].map(id);
  Object.assign(affinity.tiles[hit],{owner:1,type:1,level:4,unit:{id:goblin,hp:55}});
  for(const cell of cells.slice(0,4))Object.assign(affinity.tiles[cell],{owner:0,type:0,unit:{id:goblin,hp:30}});
  Object.assign(affinity.tiles[cells[4]],{owner:2,type:2,unit:{id:goblin,hp:30}});
  assert.ok(C.play(affinity,['cast',0])&&C.play(affinity,['targetLand',hit]));
  assert.equal(affinity.tiles[hit].unit.hp,55,'allied holdings do not satisfy the caster requirement');
  affinity.tiles[cells[4]].owner=0;
  affinity.phase='spell';assert.ok(C.play(affinity,['cast',0])&&C.play(affinity,['targetLand',hit]));
  assert.equal(affinity.tiles[hit].unit.hp,15);
  const beforeGain=artist.cash;
  affinity.phase='spell';assert.ok(C.play(affinity,['cast',0]));
  assert.equal(artist.cash,beforeGain-C.cards[id('selenear')].cost+500);
  for(const [n,cell] of cells.slice(0,5).entries())affinity.tiles[cell].type=n%2?1:3;
  affinity.phase='spell';assert.ok(C.play(affinity,['cast',0]));
  assert.equal(artist.hand.length,8);assert.equal(affinity.phase,'discard');
  assert.ok(C.play(affinity,['discard',7])&&C.play(affinity,['discard',6]));
  assert.equal(artist.hand.length,6);
  affinity.phase='spell';assert.ok(C.play(affinity,['cast',0])&&C.play(affinity,['targetLand',hit]));
  assert.equal(affinity.tiles[hit].level,1);
  guest.hand=Array(6).fill(goblin);
  const priorCash=guest.cash;
  affinity.phase='spell';assert.ok(C.play(affinity,['cast',0])&&C.play(affinity,['targetPlayer',1]));
  assert.deepEqual([affinity.turn,C.actor(affinity),affinity.phase,guest.hand.length,guest.cash],[0,1,'discard',7,priorCash+100]);
  assert.equal(roomState.view(C,affinity,0).game.players[1].hand.length,0);
  assert.equal(roomState.view(C,affinity,0).choices.length,0);
  assert.equal(roomState.view(C,affinity,1).choices.length,7);
  assert.ok(C.play(affinity,['discard',6]));
  assert.deepEqual([affinity.phase,C.actor(affinity),guest.hand.length],['roll',0,6]);
  console.log('Saga spell stat limits, recycling, exhausted book, element thresholds and private six-card correction OK');
  const placed=C.start(2,2,5000,map),builder=placed.players[0],barbarian=id('barbarian');
  builder.pos=at;builder.hand=[barbarian,goblin];builder.cash=650;placed.phase='land';
  assert.ok(C.play(placed,['summon',0]));
  assert.deepEqual([placed.immediateAt,placed.turn,placed.phase],[at,0,'land']);
  const restored=JSON.parse(JSON.stringify(placed));
  assert.ok(C.choices(restored).every(([type,source])=>type==='pass'||['level','element','transfer','ability'].includes(type)&&source===at));
  assert.ok(!C.play(restored,['exchange',at,0]));
  assert.ok(C.play(restored,['level',at,2]));
  assert.equal(restored.tiles[at].level,2);
  assert.deepEqual([restored.turn,restored.immediateAt],[1,undefined]);
  assert.ok(C.play(placed,['pass']));
  assert.equal(placed.turn,1);

  const swapped=C.start(2,2,5000,map);
  swapped.phase='land';swapped.players[0].cash=650;swapped.players[0].hand=[id('tokebi')];
  swapped.players[0].pos=at;Object.assign(swapped.tiles[at],{owner:0,unit:{id:goblin,hp:30}});
  assert.ok(C.play(swapped,['exchange',at,0]));
  assert.equal(swapped.immediateAt,at);
  const priorValue=C.value(swapped,swapped.tiles[at]),priorSwap=swapped.players[0].cash;
  assert.ok(C.play(swapped,['ability',at])&&C.play(swapped,['abilityLand',at]));
  assert.deepEqual([swapped.tiles[at].owner,swapped.tiles[at].unit,swapped.players[0].cash],[-1,null,priorSwap+priorValue]);

  const win=C.start(2,2,5000,map);
  win.phase='attack';win.players[0].pos=at;win.battle={at,inv:barbarian,atkItem:null,defItem:null};
  Object.assign(win.tiles[at],{owner:1,unit:{id:goblin,hp:30}});
  assert.ok(C.play(win,['bare'])&&C.play(win,['bare'])&&C.play(win,['continue']));
  assert.deepEqual([win.tiles[at].owner,win.immediateAt,win.turn],[0,at,0]);

  const poison=C.start(2,2,5000,map);
  poison.phase='attack';poison.battle={at,inv:goblin,atkItem:null,defItem:null};
  Object.assign(poison.tiles[at],{owner:1,unit:{id:goblin,hp:50,mhp:50,poisoned:true}});
  assert.ok(C.play(poison,['bare'])&&C.play(poison,['bare']));
  assert.ok(poison.battle.lines.includes('독 · 15 피해'));
  assert.equal(poison.tiles[at].unit.hp,15);
  console.log('Saga Immediate after summon, exchange and invasion, restricted commands and poison at 30 percent OK');
}
{
  const C=ps2.createEdition('begins');
  const id=effect=>C.cards.findIndex(card=>!card.unlisted&&!card.catalogOnly&&card.effect===effect);
  const unit=C.cards.findIndex(card=>!card.unlisted&&!card.catalogOnly&&C.combo.key(card)==='goblin');
  const s=C.start(2,2,5000,Object.keys(C.maps)[0]),p=s.players[0];
  p.cash=1500;
  p.hand=['growthbody','massgrowth','disease','revoltlandtransfer'].map(id);
  const [siteA,siteB]=s.tiles.flatMap((tile,i)=>typeof tile.type==='number'?[i]:[]).slice(0,2);
  Object.assign(s.tiles[siteA],{owner:0,level:2,unit:{id:unit,hp:90,mhp:96}});
  Object.assign(s.tiles[siteB],{owner:1,unit:{id:unit,hp:90,mhp:94}});
  assert.ok(C.play(s,['cast',0])&&C.play(s,['targetLand',siteA]));
  assert.deepEqual([s.tiles[siteA].unit.hp,s.tiles[siteA].unit.mhp],[100,100]);
  s.phase='spell';
  assert.ok(C.play(s,['cast',0]));
  assert.deepEqual([s.tiles[siteB].unit.hp,s.tiles[siteB].unit.mhp],[95,99]);
  s.phase='spell';
  assert.ok(C.play(s,['cast',0])&&C.play(s,['targetLand',siteB]));
  assert.equal(s.tiles[siteB].unit.enchant,'disease');
  assert.equal(p.hand.length,2);
  s.phase='spell';
  const before=p.cash,territory=C.value(s,s.tiles[siteA]);
  assert.ok(C.play(s,['cast',0])&&C.play(s,['targetLand',siteA]));
  assert.deepEqual([s.tiles[siteA].owner,s.tiles[siteA].unit,p.cash],[-1,null,before-C.cards[id('revoltlandtransfer')].cost+Math.floor(territory*.8)]);
  console.log('Begins spells, 100 MHP cap, redraw, and 80 percent land liquidation OK');
}
{
  const C=ps2.createEdition('3ds'),archives=require('../dist/cept-edition-data-2012');
  const names=Object.keys(C.maps),intro='3ds-original-bend',shore='3ds-original-shore';
  const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const catalog=C.cards.filter(c=>!c.unlisted);
  assert.equal(catalog.length,487);
  assert.equal(new Set(catalog.map(c=>C.combo.key(c))).size,487);
  assert.equal(archives.maps.length,41);
  assert.deepEqual(archives.maps.find(m=>m.name==='Dunnan'),{name:'Dunnan',section:'story',goal:6000,die:6,areas:1,tiles:18,start:200,lap:200,forts:'S',fortBonus:100});
  assert.ok(catalog.every(c=>!c.editionArt));
  assert.equal(names.length,3);
  assert.ok(Object.values(C.presets).every(C.validBook));
  assert.equal(new Set(Object.values(C.presets).map(book=>book.join(','))).size,3);
  assert.ok(['goobaqueen','sakuya','wildgrowth'].every(name=>C.presets.intro.includes(id(name))));
  assert.ok(['ixtol','shadefolk','sleipnir','blackorb'].every(name=>C.presets.fire.includes(id(name))));
  assert.ok(['wallofice','bookworm','watershield','holygrail'].every(name=>C.presets.stronghold.includes(id(name))));
  for(const mapId of names)for(const count of [2,3,4]){
    const map=C.maps[mapId];
    assert.ok(map.links.every((links,i)=>links.length&&links.every(j=>map.links[j].includes(i))));
    const s=C.start(count,0,0,mapId,C.presets.fire,C.presets.stronghold,3,count===4?'teams':'duel');
    assert.equal(s.players[0].cash,map.startCash);
    const limit=20000;
    for(let n=0;n<limit&&s.phase!=='over';n++)assert.ok(C.play(s,C.ai(s)),mapId+' '+s.phase);
    assert.equal(s.phase,'over',mapId+' '+count+' seats');
  }
  const base=C.start(4,4,0,intro);
  assert.deepEqual([base.edition,base.target,base.players[0].cash,base.prices.length],['3ds',6000,200,4]);
  base.phase='roll';assert.ok(C.play(base,['roll']));
  assert.equal(base.mapEffect.faces.length,1);assert.ok(base.die>=1&&base.die<=6);
  base.phase='roll';base.fly=true;assert.ok(C.play(base,['roll']));
  assert.equal(base.mapEffect.faces.length,2);
  base.phase='roll';base.players[0].status='haste';assert.ok(C.play(base,['roll']));
  assert.ok(base.die>=5&&base.die<=7);

  const lap=C.start(4,4,0,shore,undefined,undefined,0,'teams');
  Object.assign(lap,{phase:'fork',die:1,remaining:1});
  Object.assign(lap.players[0],{pos:15,previous:14,lap:1,flags:[4,20],symbols:[3,0,0,0,0,0,0,0]});
  lap.players[2].symbols[0]=2;lap.players[1].symbols[0]=4;
  Object.assign(lap.tiles[10],{owner:2,unit:{id:id('goblin'),hp:30}});
  assert.ok(C.play(lap,['route',0]));
  assert.deepEqual([lap.players[0].lap,lap.players[0].cash],[2,568]);

  function alliedCommand(){
    const s=C.start(4,4,0,intro,undefined,undefined,0,'teams');
    s.phase='land';s.visited=[7];s.players[0].pos=8;
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    Object.assign(s.tiles[7],{type:0,owner:2,unit:{id:id('minotaur'),hp:40}});
    Object.assign(s.tiles[8],{type:0,owner:2,unit:{id:id('goblin'),hp:30}});
    return s;
  }
  const allyLevel=alliedCommand();
  allyLevel.players[0].hand=[id('minotaur')];
  assert.ok(!C.choices(allyLevel).some(([kind])=>kind==='pay'||kind==='invade'));
  assert.ok(!C.choices(allyLevel).some(([kind,x,y])=>kind==='transfer'&&x===7&&y===8));
  assert.ok(C.play(allyLevel,['level',7,2]));
  assert.deepEqual([allyLevel.tiles[7].owner,allyLevel.tiles[7].level,allyLevel.players[0].cash,allyLevel.players[2].cash],[2,2,900,1000]);

  const allyExchange=alliedCommand();
  allyExchange.players[0].hand=[id('ixtol')];
  assert.ok(C.play(allyExchange,['exchange',8,0]),'ally fire territory satisfies Ixtol summon cost');
  assert.deepEqual([allyExchange.tiles[8].owner,allyExchange.tiles[8].unit.id,allyExchange.players[0].hand],[0,id('ixtol'),[id('goblin')]]);
  const allyMove=alliedCommand();
  assert.ok(C.play(allyMove,['transfer',7,6]));
  assert.deepEqual([allyMove.tiles[7].owner,allyMove.tiles[6].owner],[-1,2]);

  const allyFight=alliedCommand();
  Object.assign(allyFight.tiles[6],{owner:1,unit:{id:id('minotaur'),hp:40}});
  allyFight.players[2].hand=[id('battleaxe')];
  assert.ok(C.play(allyFight,['transfer',7,6]));
  assert.deepEqual([allyFight.turn,C.actor(allyFight)],[0,2]);
  assert.ok(C.play(allyFight,['equip',0]));
  assert.deepEqual([allyFight.players[0].cash,allyFight.players[2].cash,C.actor(allyFight)],[1000,970,1]);
  assert.ok(C.play(allyFight,['bare']));
  assert.ok(allyFight.battle.won);
  assert.deepEqual([allyFight.tiles[6].owner,allyFight.tiles[7].owner,C.actor(allyFight)],[2,-1,0]);
  assert.ok(C.play(allyFight,['continue']));
  assert.equal(allyFight.turn,1);

  const fight=(attacker,gear,shield,st,prepare)=>{
    const s=C.start(2,2,0,intro);
    const attackerId=id(attacker),guard=id('minotaur');assert.ok(attackerId>=0&&guard>=0);
    Object.assign(s,{phase:'attack',battle:{at:3,inv:attackerId,atkItem:null,defItem:null}});
    s.players[0].pos=3;
    Object.assign(s.tiles[3],{type:1,owner:1,unit:{id:guard,hp:40}});
    if(st!=null){
      s.battle.from=8;
      Object.assign(s.tiles[8],{owner:0,unit:{id:attackerId,hp:C.cards[attackerId].hp,st}});
    }
    s.players.forEach(q=>q.cash=1000);
    s.players[0].hand=gear?[id(gear)]:[];s.players[1].hand=shield?[id(shield)]:[];
    prepare?.(s);
    assert.ok(C.play(s,[gear?'equip':'bare',...(gear?[0]:[])]));
    assert.ok(C.play(s,[shield?'equip':'bare',...(shield?[0]:[])]));
    return s;
  };
  const block=fight('minotaur','lifestealer','gaseousform');
  assert.ok(block.battle.lines.some(x=>x.includes('최대 HP −30')));
  assert.equal(block.tiles[3].unit.mhp,10);
  const kodama=fight('kodama',null,'gaseousform');
  assert.equal(kodama.tiles[3].unit.mhp,10);
  const hit=fight('minotaur','lifestealer',null);
  assert.ok(!hit.battle.lines.some(x=>x.includes('설욕')));
  const ixtol=fight('ixtol',null,'gaseousform');
  assert.ok(ixtol.battle.won);assert.equal(ixtol.tiles[3].unit.st,C.cards[id('ixtol')].st+10);
  const reflected=fight('ixtol',null,'countershield');
  assert.equal(reflected.battle.strikes[0].effect,'reflect');assert.equal(reflected.battle.won,false);
  assert.ok(!reflected.battle.lines.some(x=>x.includes('설욕')));
  const survives=fight('ixtol',null,'countershield',10);
  assert.equal(survives.battle.strikes[0].effect,'reflect');assert.ok(survives.battle.won);
  const zero=fight('ixtol',null,'gaseousform',0);
  assert.ok(!zero.battle.lines.some(x=>x.includes('설욕')));
  const shade=fight('shadefolk',null,'gaseousform',null,s=>{
    Object.assign(s.tiles[8],{owner:1,type:1,unit:{id:id('minotaur'),hp:40}});
  });
  assert.equal(shade.battle.attackST,20,'Shadefolk counts creature element across all owners, independent of land element');
  assert.deepEqual(shade.players.map(p=>p.cash),[1276,644]);

  const cat=fight('catoblepas',null,'gaseousform',null,s=>{s.tiles[3].level=4;});
  assert.equal(cat.tiles[3].level,3);
  const floor=fight('catoblepas',null,'gaseousform');
  assert.equal(floor.tiles[3].level,1);
  const poison=fight('catoblepas',null,null);
  assert.ok(poison.battle.lines.some(line=>line.includes('독')));
  assert.equal(poison.battle.lines.some(line=>line.includes('설욕')),false);

  for(const [unit,gear] of [['raksas',null],['minotaur','soulcorrupter']]){
    const s=fight(unit,gear,'gaseousform',null,state=>{
      state.players[1].symbols=[1,3,17,9];
      state.players[0].symbols=[0,2,1,0];
    });
    assert.deepEqual(s.players.map(p=>p.symbols),[[0,2,6,0],[1,3,12,9]]);
  }
  const plainRaksas=fight('raksas',null,null,null,s=>{s.players[1].symbols=[0,20,0,0];});
  assert.ok(plainRaksas.battle.won);
  assert.deepEqual(plainRaksas.players[1].symbols,[0,20,0,0],'2012 victory does not activate the PS2 Raksas effect');
  const hands=fight('minotaur','mindripper','gaseousform',null,s=>{
    s.players[1].hand.push(id('goblin'),id('minotaur'),id('wallofice'));
  });
  assert.equal(hands.players[1].hand.length,1);
  assert.ok(hands.battle.lines.some(line=>line.includes('손패 2장 파괴')));
  const crown=fight('minotaur','powercrown','gaseousform');
  assert.deepEqual(crown.battle.startHP,[80,40]);
  assert.equal(crown.tiles[3].unit.id,id('greatfossil'));
  assert.equal(C.toll(crown,crown.tiles[3]),0);
  assert.ok(C.play(crown,['continue']));
  assert.deepEqual(crown.players.map(p=>p.cash),[940,920]);
  const reflectCrown=fight('minotaur','powercrown','countershield');
  assert.ok(reflectCrown.battle.noToll);
  assert.equal(reflectCrown.battle.strikes[0].effect,'reflect');
  const crownStats=fight('minotaur','powercrown','battleaxe');
  assert.deepEqual(crownStats.battle.startHP,[80,40],'HP uses base ST before the opposing weapon bonus');
  const protectedCrown=fight('minotaur','powercrown',null,null,s=>{
    s.tiles[3].unit={id:id('thief'),hp:30};
  });
  assert.equal(protectedCrown.battle.startHP[0],60);
  const fossil=fight('minotaur','battleaxe',null,null,s=>{
    s.tiles[3].unit={id:id('greatfossil'),hp:30};
  });
  assert.equal(fossil.tiles[3].unit.id,id('tyrannosaurus'));
  assert.equal(fossil.tiles[3].unit.hp,60);
  assert.equal(fossil.battle.won,false);
  assert.ok(C.toll(fossil,fossil.tiles[3])>0);

  function command(name){
    const s=C.start(2,2,0,intro);
    s.phase='land';s.players[0].cash=1000;Object.assign(s.tiles[8],{owner:0,unit:{id:id(name),hp:C.cards[id(name)].hp}});
    return s;
  }
  const bug=command('metalbug');
  Object.assign(bug.tiles[3],{owner:1,unit:{id:id('minotaur'),hp:39}});
  Object.assign(bug.tiles[4],{owner:1,unit:{id:id('minotaur'),hp:40}});
  Object.assign(bug.tiles[5],{owner:1,unit:{id:id('minotaur'),hp:39,enchant:'landprotection'}});
  assert.ok(C.play(bug,['ability',8]));
  assert.deepEqual(C.choices(bug).filter(([kind])=>kind==='abilityLand'),[['abilityLand',3]]);
  assert.ok(C.play(bug,['abilityLand',3]));
  assert.deepEqual([bug.players[0].cash,bug.tiles[8].owner,bug.tiles[3].owner],[920,-1,-1]);
  const sakuya=command('sakuya');
  Object.assign(sakuya.tiles[3],{type:0,level:3,owner:0,unit:{id:id('goblin'),hp:30}});
  Object.assign(sakuya.tiles[4],{type:0,level:4,owner:0,unit:{id:id('goblin'),hp:30}});
  Object.assign(sakuya.tiles[5],{type:0,level:1,owner:1,unit:{id:id('goblin'),hp:30}});
  assert.ok(C.play(sakuya,['ability',8]));
  assert.ok(!C.choices(sakuya).some(([kind,i])=>kind==='abilityLand'&&[4,5].includes(i)));
  assert.ok(C.play(sakuya,['abilityLand',3]));
  assert.deepEqual([sakuya.players[0].cash,sakuya.tiles[3].type],[880,2]);
  const heat=command('heatimp');
  heat.players[1].symbols=[5,20,0,0];
  assert.ok(C.play(heat,['ability',8]));
  assert.ok(C.play(heat,['abilityPlayer',1]));
  assert.deepEqual([heat.players[0].cash,heat.tiles[8].owner,heat.players[1].symbols[1]],[950,-1,12]);
  const barometz=command('barometz');
  barometz.players[0].lap=2;
  assert.ok(C.play(barometz,['ability',8]));
  assert.equal(barometz.players[0].cash,1090);
  function landAbility(name,cost,verify,prepare,owner=1){
    const s=command(name);
    Object.assign(s.tiles[3],{owner,unit:{id:id('minotaur'),hp:30}});
    prepare?.(s);
    assert.equal(C.territoryAbilityCost(C.cards[id(name)]),cost);
    assert.ok(C.play(s,['ability',8]));
    assert.ok(C.play(s,['abilityLand',3]));
    assert.equal(s.players[0].cash,1000-cost);
    verify(s);
  }
  landAbility('archer',20,s=>assert.equal(s.tiles[3].unit.hp,20));
  landAbility('healer',10,s=>assert.equal(s.tiles[3].unit.hp,40),null,0);
  landAbility('fanatic',50,s=>assert.deepEqual([s.tiles[3].unit.hp,s.tiles[8].unit.hp],[10,10]));
  landAbility('archbishop',30,s=>assert.equal(s.tiles[3].unit.enchant,undefined),s=>{s.tiles[3].unit.enchant='landprotection';},0);
  landAbility('domovikha',80,s=>assert.equal(s.tiles[3].unit.enchant,'landprotection'),null,0);
  landAbility('domovoi',30,s=>assert.equal(s.tiles[3].unit.enchant,'phantasm'),null,0);
  landAbility('hyde',50,s=>assert.equal(s.tiles[3].unit.enchant,'paralysis'));
  landAbility('spittingcobra',10,s=>assert.ok(s.tiles[3].unit.poisoned));

  const growth=command('algasphere');
  Object.assign(growth.tiles[8].unit,{hp:45,mhp:90});
  assert.ok(C.play(growth,['ability',8]));
  assert.deepEqual([growth.players[0].cash,growth.tiles[8].unit.hp,growth.tiles[8].unit.mhp],[940,55,100]);
  const totem=command('goldentotem');
  assert.ok(C.play(totem,['totem',8]));
  assert.deepEqual([totem.players[0].cash,totem.tiles[8].owner],[1200,-1]);
  const doll=command('dancingdoll');
  doll.prices=[10,30,56,80];
  assert.ok(C.play(doll,['ability',8]));
  assert.deepEqual(doll.prices,[8,24,44,64]);
  const banshee=command('banshee');
  Object.assign(banshee.tiles[3],{owner:1,unit:{id:id('minotaur'),hp:40}});
  assert.ok(C.play(banshee,['ability',8]));
  assert.deepEqual([banshee.tiles[8].unit.hp,banshee.tiles[3].unit.hp],[30,30]);
  const cleanse=command('sharazad');
  cleanse.players[0].status='slow';cleanse.players[1].status='haste';
  assert.ok(C.play(cleanse,['ability',8]));
  assert.ok(cleanse.players.every(p=>!p.status));

  for(const [name,field,value] of [['clockworkowl','chooseDirection',true],['holyllama','word',6]]){
    const s=command(name);
    assert.ok(C.play(s,['ability',8]));
    assert.ok(C.play(s,['abilityPlayer',1]));
    assert.equal(s.players[1][field],value);
  }
  const witch=command('witch');
  witch.players[1].cash=200;
  witch.players[1].hand=[id('goblin'),id('battleaxe'),id('countershield')];
  assert.ok(C.play(witch,['ability',8]));
  assert.ok(C.play(witch,['abilityPlayer',1]));
  assert.deepEqual(witch.players.map(p=>p.cash),[1030,140]);
  const worm=command('bookworm');
  worm.players[1].hand=[id('goblin'),id('battleaxe')];
  assert.ok(C.play(worm,['ability',8]));
  assert.ok(C.play(worm,['abilityPlayer',1]));
  assert.equal(worm.phase,'bookWorm');
  assert.ok(C.play(worm,['wormDiscard',1]));
  assert.ok(!worm.players[1].hand.includes(id('battleaxe')));
  const fate=command('fate');
  fate.players[0].hand=[];fate.players[0].book=[id('goblin')];
  assert.ok(C.play(fate,['ability',8]));
  assert.deepEqual([fate.players[0].cash,fate.players[0].hand],[960,[id('goblin')]]);
  const fateDefeated=fight('minotaur','battleaxe',null,null,s=>{
    s.tiles[3].unit={id:id('fate'),hp:40};s.players[1].book=[id('goblin')];
  });
  assert.deepEqual(fateDefeated.players[1].hand,[id('goblin')]);

  const necromancer=command('necromancer');
  assert.ok(!C.choices(necromancer).some(([kind])=>kind==='ability'));
  necromancer.lastDestroyed=id('minotaur');necromancer.destroyedCount=2;
  assert.ok(C.play(necromancer,['ability',8]));
  assert.deepEqual([necromancer.players[0].cash,necromancer.players[0].hand.at(-1),necromancer.lastDestroyed,necromancer.destroyedCount],[970,id('minotaur'),id('minotaur'),2]);
  const reviveFossil=fight('minotaur','battleaxe',null,null,s=>{
    s.tiles[3].unit={id:id('greatfossil'),hp:30};s.lastDestroyed=id('goblin');
  });
  assert.equal(reviveFossil.lastDestroyed,id('goblin'),'battle revival keeps the prior grave target');
  landAbility('mystic',30,s=>assert.deepEqual([s.tiles[3].unit.hp,s.tiles[3].unit.mhp],[34,100]),s=>{s.tiles[3].unit.mhp=96;},0);
  const savedRandom=Math.random;
  for(const value of [.69,.7]){
    try{
      Math.random=()=>value;
      const instant=fight('mystic',null,null,null,s=>{s.tiles[3].unit={id:id('tyrannosaurus'),hp:60,st:0};});
      assert.equal(instant.battle.won,value<.7);
    }finally{Math.random=savedRandom;}
  }
  for(const [source,spawn,cost] of [['goobaqueen','gooba',20],['conjurer','baal',80]]){
    const s=command(source);
    assert.ok(C.play(s,['ability',8]));assert.ok(C.play(s,['abilityLand',3]));
    assert.deepEqual([s.players[0].cash,s.tiles[3].owner,s.tiles[3].unit.id,s.tiles[8].owner],[1000-cost,0,id(spawn),source==='conjurer'?-1:0]);
  }
  assert.ok(C.cards[id('gooba')].generatedOnly);
  for(const name of ['necromancer','conjurer']){
    const scroll=fight(name,'windcutter',null);
    assert.ok(scroll.battle.lines.some(line=>line.includes('45 피해')));
  }

  const sleipnir=()=>{
    const s=command('sleipnir');
    Object.assign(s.tiles[7],{type:0,owner:0,unit:{id:id('minotaur'),hp:40}});
    Object.assign(s.tiles[5],{type:1,owner:1,unit:{id:id('goblin'),hp:30}});
    Object.assign(s.tiles[19],{type:3,owner:0,unit:{id:id('wallofice'),hp:40}});
    assert.ok(C.play(s,['ability',8]));
    assert.ok(!C.choices(s).some(([,i])=>i===19));
    assert.ok(C.play(s,['abilityLand',7]));
    assert.deepEqual([s.phase,s.players[0].cash],['teleMove',940]);
    assert.ok([5,6].every(i=>C.choices(s).some(([,n])=>n===i)));
    assert.ok(!C.choices(s).some(([,i])=>[7,8,19].includes(i)));
    return s;
  };
  const relocate=sleipnir();
  assert.ok(C.play(relocate,['teleTo',6]));
  assert.deepEqual([relocate.turn,relocate.tiles[7].owner,relocate.tiles[6].owner,relocate.territoryMove],[1,-1,0,undefined]);
  const invade=JSON.parse(JSON.stringify(sleipnir()));
  assert.ok(C.play(invade,['teleTo',5]));
  assert.deepEqual([invade.phase,invade.battle.from,C.actor(invade)],['attack',7,0]);
  assert.ok(C.play(invade,['bare']));assert.equal(C.actor(invade),1);
  assert.ok(C.play(invade,['bare']));assert.ok(invade.battle.won);
  assert.ok(C.play(invade,['continue']));
  assert.deepEqual([invade.phase,invade.turn,invade.tiles[5].owner,invade.tiles[7].owner,invade.players[0].cash],['spell',1,0,-1,940]);
  const grail=fight('minotaur',null,'holygrail');
  assert.deepEqual([grail.players[1].cash,grail.battle.strikes[0].effect],[780,'block']);
  const grailScroll=fight('minotaur','nuclearfusion','holygrail');
  assert.deepEqual([grailScroll.players[1].cash,grailScroll.battle.strikes[0].effect],[900,'block']);
  const grailDebt=fight('minotaur',null,'holygrail',null,s=>{s.players[1].cash=100;});
  assert.ok(C.play(grailDebt,['continue']));
  assert.deepEqual([grailDebt.phase,C.actor(grailDebt)],['sell',1]);
  const orb=fight('minotaur','blackorb','countershield');
  assert.ok(orb.battle.won);
  assert.equal(orb.battle.strikes[0].effect,'hit');

  const spike=fight('catoblepas',null,'spikedshield');
  assert.deepEqual(spike.battle.strikes[0].hp,[35,25]);
  assert.equal(spike.battle.strikes[0].notes.some(line=>line.includes('설욕')),false);
  assert.equal(fight('minotaur',null,'knightsshield').battle.strikes[0].effect,'block');
  assert.equal(fight('goblin','battleaxe','knightsshield').battle.strikes[0].effect,'hit');
  assert.equal(fight('goblin',null,'fireshield').battle.strikes[0].effect,'block');
  assert.equal(fight('nightmare',null,'smoketorch').battle.strikes[0].effect,'block');
  assert.equal(fight('minotaur','nuclearfusion','magicshield').battle.strikes[0].effect,'block');
  assert.equal(fight('minotaur','nuclearfusion','magussmirror').battle.strikes[0].effect,'reflect');

  for(const [unit,damage] of [['minotaur',45],['goblin',30]]){
    const halo=fight(unit,'tearinghalo',null);
    assert.ok(halo.battle.strikes[0].notes.some(line=>line.includes(damage+' 피해')));
  }
  const stone=fight('minotaur','stonehail',null,null,s=>{s.tiles[3].unit={id:id('harpy'),hp:30};});
  assert.ok(stone.battle.strikes.find(hit=>hit.side===0).notes.some(line=>line.includes('45 피해')));
  const vorpal=fight('goblin','vorpalsword',null);
  assert.ok(vorpal.battle.strikes[0].notes.some(line=>line.includes('75 피해')));
  const prism=fight('goblin','prismaticwand',null);
  assert.deepEqual([prism.battle.attackST,prism.battle.startHP[0]],[60,70]);
  const gremlin=fight('gremlin',null,'countershield');
  assert.equal(gremlin.battle.strikes[0].effect,'hit');
  const protectedOrb=fight('minotaur','blackorb',null,null,s=>{s.tiles[3].unit={id:id('thief'),hp:40};});
  assert.ok(protectedOrb.battle.won,'Thief cannot steal Black Orb');
  const samples=[];
  const worker=createContext({URLSearchParams,location:{search:'?edition=3ds'},postMessage:data=>samples.push(data)});
  worker.self=worker;
  worker.importScripts=(...paths)=>paths.forEach(file=>runInContext(readFileSync(resolve(__dirname,'../dist',file),'utf8'),worker,{filename:file}));
  worker.importScripts('cept-simulate.js');
  runInContext(`self.onmessage({data:{
    count:2,humans:1,target:0,map:'3ds-original-bend',player:Cepter.presets.intro,opponent:Cepter.presets.fire,
    aiLevel:3,alliance:'duel',roundLimit:20,suddenDeath:false
  }})`,worker);
  assert.equal(samples.at(-1).done,true);
  assert.deepEqual([...samples.at(-1).finished],[160,160]);
  console.log('2012 3DS catalog and map archive, nine AI finishes, dice, alliance lap/talisman income and territory commands, all nine Revenge cards, all 27 territory abilities, defense/scroll equipment and 320 seat-rotation samples OK');
}
