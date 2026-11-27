const assert=require('node:assert/strict');
const ps2=require('../dist/cept-engine');
const describeSpell=require('../dist/cept-spell-text');
const describeItem=require('../dist/cept-item-text');
for(const edition of ['ps2','dc','ps1','saturn','saga','revolt','begins']){
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
  if(find('reincarnation'))assert.equal(describeSpell(C,find('reincarnation')).includes('한 장 더'),['revolt','begins'].includes(edition));
  const items=C.cards.filter(c=>!c.unlisted&&c.kind==='item');
  for(const card of items){
    const summary=describeItem(C,card);
    if(card.catalogOnly)assert.equal(summary,undefined,edition+' '+card.name+' is catalog-only');
    else assert.match(summary||'',/[가-힣]/,edition+' '+card.name+' should have a Korean effect');
  }
  console.log(edition,spells.filter(c=>!c.catalogOnly).length,'spell and',items.filter(c=>!c.catalogOnly).length,'item summaries are in Korean');
}
let seed=89231;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const [edition,count,mapCount] of [['dc',459,39],['ps1',361,36],['saturn',361,10],['saga',487,17],['revolt',489,34],['begins',400,15]]){
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
    assert.deepEqual(Object.keys(C.presets),['intro','fire','stronghold']);
    assert.equal(new Set(Object.values(C.presets).map(deck=>[...deck].sort((a,b)=>a-b).join(','))).size,3);
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
  function fight(attacker,defender,terrain='무속성',gear=null,setup=null){
    const s=newMatch();
    unit(s,1,defender,1,terrain);
    s.players[0].pos=1;s.players[0].cash=500;
    s.phase='attack';s.battle={at:1,inv:id(attacker),atkItem:null,defItem:null};
    if(setup)setup(s);
    if(gear){
      s.players[0].hand=[id(gear)];
      assert.ok(C.play(s,['equip',0]));
    }else assert.ok(C.play(s,['bare']));
    assert.ok(C.play(s,['bare']));
    return s;
  }
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
  console.log('Saga dual elements, terrain wards, Prismatic Wand, battle traits and territory abilities OK');

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
  assert.ok(C.choices(door).some(c=>c.join('/')===C.ai(door).join('/')));
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
