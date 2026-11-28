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
for(const [edition,count,mapCount] of [['dc',459,39],['ps1',361,37],['saturn',361,11],['saga',487,19],['revolt',489,41],['begins',400,18]]){
  const modern=['saga','revolt','begins'].includes(edition);
  const C=ps2.createEdition(edition),catalog=C.cards.filter(c=>!c.unlisted);
  assert.equal(catalog.length,count);
  assert.equal(Object.keys(C.maps).length,mapCount);
  const savedMaps={saga:{'saga-11':'chariot','saga-13':'the-speckled-band'},revolt:{'revolt-1':'battle-wagon','revolt-34':'yin-yang-flat'},begins:{'begins-10':'fortune-alley','begins-11':'holy-hammer','begins-15':'x'}};
  for(const [id,slug] of Object.entries(savedMaps[edition]||{}))assert.equal(C.maps[id].slug,slug);
  for(const book of Object.values(C.presets)){
    assert.equal(book.length,edition==='begins'?40:50);
    assert.ok(C.validBook(book));
  }
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
    const standardPresets=Object.entries(C.presets).filter(([name])=>!name.startsWith(edition+'-'));
    assert.deepEqual(standardPresets.map(([name])=>name),['intro','fire','stronghold',...(edition==='saga'?['sagaStarterWater','sagaStarterFire','sagaRilaraPlunder','sagaRilaraRobbery','sagaGottliebKill','sagaGottliebSlaves','sagaBorivalFire','sagaZenethDragon','sagaTicomunKill','sagaTicomunChallenge','sagaRilaraExploit','sagaBorivalHellFire','sagaRilaraConspire','sagaRilaraFierce','sagaKoenigStar','sagaTraderMoney','sagaGuilderTwins','sagaImmediate','sagaAffinity']:edition==='begins'?['beginsStarterFireEarth','beginsStarterWaterAir','beginsVeramiSeaWind','beginsIsharaFirst','beginsGanzBeast','beginsGanzInstinct','beginsGanzGiantBeasts','beginsTindalosFreeWind','beginsNajaranMistral','beginsPopoloDragon','beginsSteamdrillPierce','beginsArtAssault','beginsTidalGuard']:edition==='revolt'?['revoltAliciaEntry','revoltGenSerious','revoltYumaFellowship','revoltYumaResolve','revoltYumaBonds','revoltSomniaSerenity','revoltTenetBelief','revoltTenetPraise','revoltAliciaFreedom','revoltTenetPoverty','revoltGoliganServant','revoltZenethPower','revoltYumaLove','revoltHypnaPetrify','revoltMoriAnnoying','revoltSomniaScripture','revoltMoriCrazy','revoltHypnaBewitch','revoltTerrormireFireClaw','revoltGoliganSuppression','revoltTerrormireFireStorm','revoltMemenLame','revoltZenethInvasion','revoltKranissResurrection']:[])]);
    assert.equal(new Set(standardPresets.map(([,deck])=>[...deck].sort((a,b)=>a-b).join(','))).size,standardPresets.length);
    for(const [name,deck] of Object.entries(C.presets)){
      assert.ok(deck.every(id=>!C.cards[id].unlisted));
      const expectedKinds=name==='beginsVeramiSeaWind'?['creature','spell']:name==='beginsSteamdrillPierce'?['creature','item']:['creature','item','spell'];
      if(!name.startsWith(edition+'-')){
        assert.deepEqual(new Set(deck.map(id=>C.cards[id].kind)),new Set(expectedKinds));
      }
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

  const atCap=scenario(C,'windofhope');
  atCap.players[0].hand.push(...Array(9).fill(card(C,'manna')));
  const remaining=atCap.players[0].book.length;
  cast(C,atCap);
  assert.equal(atCap.players[0].hand.length,10);
  assert.equal(atCap.players[0].book.length,remaining-1);
  atCap.phase='land';
  assert.ok(C.play(atCap,['pass']));
  for(let n=0;n<4;n++)assert.ok(C.play(atCap,['discard',0]));
  assert.equal(atCap.turn,1);
  assert.equal(atCap.players[0].hand.length,6);
  for(const effect of ['exile','holybanishment'])for(const size of [9,10]){
    const routed=scenario(C,effect);
    const foe=routed.players[1],phoenix=card(C,'phoenix');
    foe.hand=Array(size).fill(card(C,'manna'));
    Object.assign(routed.tiles[1],{owner:1,type:1,unit:{id:phoenix,hp:30,enchant:'disease'}});
    cast(C,routed);
    assert.ok(C.play(routed,['targetLand',1]));
    assert.equal(foe.hand.length,10);
    assert.equal(foe.hand.includes(phoenix),size===9);
    assert.equal(routed.lastDestroyed===phoenix,size===10);
    assert.equal(routed.tiles[1].unit,null);
  }

  const fatBody=scenario(C,'fatbody');
  place(C,fatBody,1,0,0,74);
  Object.assign(fatBody.tiles[1].unit,{mhp:90,st:35});
  cast(C,fatBody);
  assert.ok(C.play(fatBody,['targetLand',1]));
  assert.deepEqual([fatBody.tiles[1].unit.mhp,fatBody.tiles[1].unit.hp,fatBody.tiles[1].unit.st],[100,84,15]);

  for(const [name,type] of [['wyvern',3],['dryad',2],['breezespirit',1],['breezespirit',3]]){
    const flight=C.start(4,4,5000,'revolt-original-lantern-market');
    const from=1,destination=15,occupied=14,unit=card(C,name);
    Object.assign(flight.tiles[from],{owner:0,type:(type+1)%4,unit:{id:unit,hp:C.cards[unit].hp}});
    Object.assign(flight.tiles[destination],{type,area:1,base:200});
    Object.assign(flight.tiles[occupied],{owner:1,type,unit:{id:card(C,'fighter'),hp:40}});
    Object.assign(flight,{phase:'land',visited:[from],aiLevel:2});
    flight.players[0].pos=from;
    assert.ok(!C.board(flight).links[from].includes(destination));
    assert.ok(!C.choices(flight).some(a=>a.join('/')===['transfer',from,occupied].join('/')));
    flight.tiles[from].unit.enchant='paralysis';
    assert.ok(!C.choices(flight).some(a=>a.join('/')===['transfer',from,destination].join('/')));
    delete flight.tiles[from].unit.enchant;
    Object.assign(flight.players[0],{cash:0,hand:[],ai:true});
    assert.deepEqual(C.ai(flight),['transfer',from,destination]);
    assert.ok(C.play(flight,['transfer',from,destination]));
    assert.equal(flight.tiles[destination].unit?.id,unit);
    assert.equal(flight.tiles[destination].unit?.fatigued,true);
  }
  const raid=C.start(4,4,5000,'revolt-original-lantern-market',undefined,undefined,2,'teams');
  const placeUnit=(at,name,type,owner)=>{
    const id=card(C,name);
    Object.assign(raid.tiles[at],{owner,type,unit:{id,hp:C.cards[id].hp}});
  };
  const ally=raid.teams.findIndex((team,seat)=>seat>0&&team===raid.teams[0]);
  const enemy=raid.teams.findIndex(team=>team!==raid.teams[0]);
  placeUnit(1,'thunderspawn',3,0);
  placeUnit(6,'fighter',1,0);
  placeUnit(8,'fighter',1,0);
  placeUnit(14,'blueogre',1,enemy);
  placeUnit(15,'goblin',2,enemy);
  placeUnit(16,'goblin',2,ally);
  Object.assign(raid,{phase:'land',visited:[1]});
  Object.assign(raid.players[0],{pos:1,hand:[],cash:0,ai:true});
  assert.ok(!C.board(raid).links[1].includes(15));
  assert.ok(!C.choices(raid).some(a=>a[0]==='transfer'&&a[1]===1&&[14,16].includes(a[2])));
  raid.tiles[1].unit.enchant='paralysis';
  assert.ok(!C.choices(raid).some(a=>a[0]==='transfer'&&a[1]===1&&a[2]===15));
  delete raid.tiles[1].unit.enchant;
  assert.deepEqual(C.ai(raid),['transfer',1,15]);
  assert.ok(C.play(raid,['transfer',1,15]));
  assert.ok(C.play(raid,['bare'])&&C.play(raid,['bare']));
  assert.deepEqual([raid.battle.attackST,raid.battle.won,raid.tiles[15].owner],[50,true,0]);
  assert.equal(raid.tiles[1].unit,null);
  assert.equal(raid.tiles[15].unit.fatigued,true);

  const growth=passedItem=>{
    const match=C.start(4,4,5000,'revolt-original-lantern-market',undefined,undefined,2,'teams');
    const caster=match.players[0],ally=match.teams.findIndex((team,seat)=>seat>0&&team===match.teams[0]);
    const foe=match.teams.findIndex(team=>team!==match.teams[0]);
    const spell=card(C,'massgrowth'),sacrifice=card(C,passedItem?'mace':'manna'),other=card(C,passedItem?'manna':'mace');
    caster.hand=[sacrifice,spell,other];caster.cash=300;caster.ai=true;
    const fighter=card(C,'fighter');
    for(const [at,owner,hp,mhp,enchant] of [[1,0,90,98],[2,ally,40,40],[5,foe,40,40],[6,0,30,50,'phantasm']]){
      Object.assign(match.tiles[at],{owner,unit:{id:fighter,hp,mhp,enchant}});
    }
    assert.ok(C.play(match,['cast',1]));
    assert.equal(match.phase,'sacrifice');
    assert.equal(caster.cash,300);
    assert.ok(!C.play(match,['sacrifice',1]));
    const saved=JSON.parse(JSON.stringify(match));
    assert.deepEqual(C.ai(saved),['sacrifice',passedItem?0:2]);
    assert.ok(C.play(saved,['sacrifice',0]));
    assert.equal(saved.phase,'roll');
    assert.deepEqual(saved.players[0].hand,[other]);
    assert.equal(saved.players[0].cash,270);
    assert.deepEqual([1,2,5,6].map(at=>saved.tiles[at].unit.mhp),passedItem?[100,40,40,50]:[100,45,45,50]);
    assert.equal(saved.tiles[1].unit.hp,92);
    assert.equal(saved.mapEffect.label.includes('합성'),passedItem);
  };
  growth(false);growth(true);
  const geyser=(tribute,damage)=>{
    const match=C.start(4,4,5000,'revolt-original-lantern-market',undefined,undefined,2,'teams');
    const caster=match.players[0],ally=match.teams.findIndex((team,seat)=>seat>0&&team===match.teams[0]);
    const foe=match.teams.findIndex(team=>team!==match.teams[0]);
    const spell=card(C,'shininggeyser'),item=card(C,'mace'),instant=card(C,tribute);
    caster.cash=300;caster.hand=[item,spell,instant];caster.ai=true;
    const fighter=card(C,'fighter');
    for(const [at,owner,hp,enchant] of [[1,0,40],[2,ally,40],[5,foe,40],[6,foe,40,'landprotection'],[8,foe,40,'phantasm']]){
      Object.assign(match.tiles[at],{owner,unit:{id:fighter,hp,enchant}});
    }
    const recommendation=C.ai(match);
    assert.deepEqual([recommendation[0],caster.hand[recommendation[1]]],['cast',spell]);
    assert.ok(C.play(match,['cast',1]));
    assert.ok(!C.play(match,['sacrifice',1]));
    if(damage===40)assert.deepEqual(C.ai(match),['sacrifice',2]);
    assert.ok(C.play(match,['sacrifice',2]));
    assert.equal(match.phase,'spellTarget');
    assert.equal(caster.cash,200);
    assert.deepEqual(caster.hand,[item]);
    assert.equal(match.mapEffect.label.includes('합성'),damage===40);
    const saved=JSON.parse(JSON.stringify(match));
    assert.deepEqual(C.choices(saved),[['targetLand',5],['targetLand',8]]);
    assert.equal(C.spellHP(saved,saved.tiles[5],saved.spellEffect),40-damage);
    assert.equal(C.spellHP(saved,saved.tiles[8],saved.spellEffect),40);
    assert.deepEqual(C.ai(saved),['targetLand',5]);
    assert.ok(C.play(saved,['targetLand',5]));
    assert.equal(saved.tiles[5].unit?.hp??0,40-damage);
    assert.equal(saved.tiles[5].owner,damage===40?-1:foe);
    assert.equal(saved.mapEffect.label,'−'+damage+' HP'+(damage===40?' · 격파':''));
    assert.ok(C.play(match,['targetLand',8]));
    assert.equal(match.tiles[8].unit.hp,40);
    assert.equal(match.mapEffect.label,'피해 없음');
  };
  geyser('mace',30);geyser('magicbolt',40);geyser('shininggeyser',40);

  const blaze=scenario(C,'blazesplash');
  place(C,blaze,1,0,1,50);place(C,blaze,2,1,0,30);place(C,blaze,5,1,2,50);
  blaze.players[0].ai=true;blaze.aiLevel=2;
  cast(C,blaze);
  assert.deepEqual(C.choices(blaze),[['targetLand',1],['targetLand',2]]);
  assert.deepEqual(C.ai(blaze),['targetLand',2]);
  assert.ok(C.play(blaze,['targetLand',2]));
  assert.equal(blaze.tiles[2].owner,-1);
  assert.deepEqual([blaze.tiles[1].unit.hp,blaze.tiles[5].unit.hp],[50,50]);

  const penalize=scenario(C,'penalize');
  const dragon=C.evo.encode(C.evo.fresh(),0),fighter=card(C,'fighter');
  for(const [at,owner,id,enchant] of [[1,0,dragon,'vitality'],[2,1,dragon,'landprotection'],[5,1,fighter,'disease']])
    Object.assign(penalize.tiles[at],{owner,unit:{id,hp:30,enchant}});
  cast(C,penalize);
  assert.deepEqual([1,2,5].map(at=>penalize.tiles[at].unit.enchant),['paralysis','paralysis','disease']);

  const ward=scenario(C,'magicbolt');
  Object.assign(ward.tiles[1],{owner:1,unit:{id:card(C,'halfling'),hp:30}});
  Object.assign(ward.tiles[2],{owner:1,unit:{id:card(C,'creepingcoin'),hp:20}});
  cast(C,ward);
  assert.ok(!C.choices(ward).some(a=>a[0]==='targetLand'&&a[1]===1));
  const balance=ward.players[1].cash;
  assert.ok(C.play(ward,['targetLand',2]));
  assert.equal(ward.players[1].cash,balance+100);
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
  assert.equal(C.battleCombos.length,27);
  for(const [index,recipe] of C.battleCombos.entries()){
    const book=C.practiceBook(index);
    assert.ok(C.validBook(book),recipe.hint);
    assert.ok(C.combo.matches(recipe.groups,book.map(card=>C.combo.key(C.cards[card]))),recipe.hint);
  }
  const sourceBooks=require('../dist/cept-saga-player-books');
  assert.equal(new Set(sourceBooks.map(([, ,source])=>source)).size,169);
  assert.equal(sourceBooks.length,186);
  assert.equal(sourceBooks.filter(([, , ,counts])=>Object.values(counts).reduce((a,b)=>a+b,0)===50).length,184);
  const allIds=new Map(C.cards.flatMap((c,i)=>c.unlisted?[]:[[C.combo.key(c),i]]));
  for(const [,name,source,counts,variant] of sourceBooks){
    const deck=Object.entries(counts).flatMap(([key,count])=>Array(count).fill(allIds.get(key)));
    assert.ok(deck.every(Number.isInteger),name);
    const preset=C.presets['saga-'+source+variant];
    assert.equal(!!preset,C.validBook(deck),name);
    if(preset)assert.deepEqual(preset,deck,name);
  }
  assert.deepEqual(sourceBooks.filter(([, ,source])=>source.startsWith('817-')).map(([, , ,book])=>book.paralyzer),[3,2]);
  assert.deepEqual(sourceBooks.filter(([, ,source])=>source.startsWith('209-')).map(([, , ,book])=>[book.wordofrecall||0,book.windofhope||0]),[[4,0],[0,4]]);
  assert.ok(Object.keys(C.presets).filter(key=>key.startsWith('saga-')).length>=13);
  function sagaCast(spell,setup){
    const s=C.start(2,2,8000,'saga-original-crosswind'),p=s.players[0];
    p.cash=600;p.hand=[id(spell),id('fighter')];s.phase='spell';
    if(setup)setup(s);
    assert.ok(C.play(s,['cast',0]),spell);
    return s;
  }
  const trade=sagaCast('trade',s=>{
    unit(s,1,'goblin',0,0,3);
    unit(s,2,'dwarf',0,2,2);
    unit(s,3,'fighter',1,0,2);
    unit(s,4,'greenogre',1,2,2);
    s.tiles[4].unit.enchant='landprotection';
    s.tiles[3].unit.enchant='fog';
  });
  assert.deepEqual(C.choices(trade),[['targetLand',2]]);
  assert.ok(C.play(trade,['targetLand',2]));
  const savedTrade=JSON.parse(JSON.stringify(trade));
  assert.deepEqual(C.choices(savedTrade),[['targetLand',3]]);
  assert.ok(!C.play(savedTrade,['targetLand',4]));
  assert.ok(C.play(savedTrade,['targetLand',3]));
  assert.deepEqual([savedTrade.tradeFrom,savedTrade.phase,savedTrade.players[0].cash],[undefined,'roll',500]);
  assert.deepEqual([2,3].map(at=>{
    const {owner,type,level,unit}=savedTrade.tiles[at];
    return [owner,type,level,unit.id,unit.enchant];
  }),[[1,2,2,id('dwarf'),undefined],[0,0,2,id('fighter'),'fog']]);
  const teamTrade=C.start(4,4,8000,'saga-original-crosswind',undefined,undefined,0,'teams');
  const ally=teamTrade.teams.findIndex((team,i)=>i!==0&&team===teamTrade.teams[0]);
  unit(teamTrade,1,'fighter',0,0,2);
  unit(teamTrade,2,'dwarf',ally,2,2);
  teamTrade.phase='spell';Object.assign(teamTrade.players[0],{cash:500,hand:[id('trade')]});
  assert.ok(C.play(teamTrade,['cast',0]));
  assert.deepEqual(C.choices(teamTrade),[['fizzle']]);
  const dry=sagaCast('drought',s=>{
    unit(s,2,'dwarf',0,2,3);
    unit(s,3,'goblin',1,2,3);
  });
  assert.ok(C.play(dry,['targetPlayer',0]));
  assert.deepEqual([dry.players[0].status,dry.players[0].enchantDeadline],['sagadrought',6]);
  dry.players[0].pos=2;dry.phase='land';
  assert.ok(!C.choices(dry).some(([action])=>action==='level'));
  assert.ok(C.choices(dry).some(([action])=>action==='element'));
  dry.players[1].hand=[id('desolation')];dry.players[1].cash=800;dry.turn=1;dry.phase='spell';
  assert.ok(C.play(dry,['cast',0]));
  assert.deepEqual(dry.tiles.slice(2,4).map(t=>t.level),[3,2]);
  const floating=sagaCast('float');
  assert.ok(C.play(floating,['targetPlayer',0]));
  assert.equal(floating.players[0].enchantDeadline,4);
  assert.ok(C.play(floating,['roll']));
  assert.equal(floating.die,5);
  assert.equal(floating.players[0].status,'sagafloat');
  const innocence=sagaCast('innocence');
  assert.ok(C.play(innocence,['targetPlayer',0]));
  unit(innocence,2,'dwarf',1,2,3);
  innocence.players[0].pos=2;innocence.phase='land';
  assert.ok(!C.choices(innocence).some(([action])=>action==='invade'));
  const balances=innocence.players.map(p=>p.cash);
  assert.ok(C.play(innocence,['pay']));
  assert.deepEqual(innocence.players.map(p=>p.cash),balances);
  for(const [value,form] of [[0,'goblin'],[.99,'dwarf']]){
    const evolve=C.start(2,2,8000,'saga-original-crosswind');
    unit(evolve,2,'quicksilver',0,1,3);
    unit(evolve,4,'goblin',1,0,1,1);
    unit(evolve,5,'dwarf',1,2,1,1);
    for(const at of [4,5])Object.assign(evolve.tiles[at].unit,{mhp:80,st:5});
    evolve.phase='land';evolve.players[0].pos=2;evolve.players[0].cash=100;
    const random=Math.random;try{Math.random=()=>value;assert.ok(C.play(evolve,['ability',2]));}finally{Math.random=random;}
    assert.deepEqual(evolve.tiles[2].unit,{id:id(form),hp:C.cards[id(form)].hp});
    assert.deepEqual([evolve.players[0].cash,evolve.tiles[2].level],[40,3]);
  }
  console.log('Saga Trade, Drought, Float, Innocence and Quicksilver checked for targeting, team play and saved decisions');
  const song=sagaCast('hunterssong');
  assert.ok(C.play(song,['targetPlayer',1]));
  assert.deepEqual([song.players[1].status,song.players[1].enchantDeadline],['hunterssong',8]);
  const reward=fight('tyrannosaurus','goblin','무속성',null,s=>{s.players[0].status='hunterssong';});
  assert.equal(reward.players[0].cash,700);
  assert.match(reward.battle.lines.join(' '),/헌터스 송.*200G/);
  const noReward=fight('fighter','wallofice','무속성',null,s=>{s.players[0].status='hunterssong';});
  assert.equal(noReward.players[0].cash,500);
  const trespass=sagaCast('trespass'),sagaMap=C.board(trespass);
  assert.deepEqual([trespass.players[0].status,trespass.players[0].enchantDeadline],['trespass',4]);
  const home=sagaMap.castles[0],from=sagaMap.links[home][0];
  const walker=trespass.players[1],prior=trespass.players[0].cash;
  Object.assign(walker,{cash:500,pos:from,previous:null,flags:[...sagaMap.checkpoints]});
  Object.assign(trespass,{phase:'fork',turn:1,die:1,remaining:1});
  const entering=C.choices(trespass).find(action=>action[0]==='route'&&action[1]===home);
  assert.ok(entering&&C.play(trespass,entering));
  assert.ok(walker.cash>500);
  assert.equal(trespass.players[0].cash-prior,walker.cash-500);
  const replace=sagaCast('replace',s=>{
    unit(s,2,'goblin',1,2,3);
    s.players[1].hand=[id('manna'),id('dwarf')];
  });
  assert.ok(C.play(replace,['targetLand',2]));
  const room=require('../dist/cept-room-state');
  assert.deepEqual(room.view(C,replace,0).choices,[['replaceCard',1,id('dwarf')]]);
  assert.deepEqual(room.view(C,replace,1).choices,[]);
  assert.deepEqual(room.view(C,replace,0).game.players[1].hand,[]);
  assert.ok(C.play(replace,['replaceCard',1,id('dwarf')]));
  assert.deepEqual([replace.tiles[2].owner,replace.tiles[2].level,replace.tiles[2].unit.id],[1,3,id('dwarf')]);
  assert.deepEqual(replace.players[1].hand,[id('manna'),id('goblin')]);
  const spartoi=sagaCast('spartoi');
  assert.equal(spartoi.phase,'sacrifice');
  const discard=C.choices(spartoi).find(action=>action[0]==='sacrifice');
  assert.ok(discard&&C.play(spartoi,discard));
  assert.ok(spartoi.tiles.some(t=>t.owner===0&&t.unit.id===id('skeleton')));
  const necromancy=C.start(2,2,8000,'saga-original-crosswind'),necromancer=necromancy.players[0];
  unit(necromancy,2,'necromancer',0,2);
  Object.assign(necromancer,{cash:80,hand:[],pos:2});necromancy.phase='land';
  assert.ok(!C.choices(necromancy).some(([action])=>action==='ability'));
  necromancy.lastDestroyed=id('goblin');
  assert.ok(C.play(necromancy,['ability',2]));
  assert.deepEqual([necromancer.cash,necromancer.hand],[50,[id('goblin')]]);
  assert.match(fight('necromancer','dwarf','무속성','firestone').battle.strikes[0].notes.join(' '),/45 피해/);
  console.log('Saga 169 source articles, 184 complete recipes, private Replace, Spartoi sacrifice, Trespass, Hunter and Necromancer verified');
  const hunt=C.start(4,4,8000,'saga-original-crosswind',undefined,undefined,0,'teams');
  const allySeat=hunt.teams.findIndex((team,i)=>i!==0&&team===hunt.teams[0]);
  const enemySeat=hunt.teams.findIndex(team=>team!==hunt.teams[0]);
  unit(hunt,2,'tengu',0,3);unit(hunt,5,'goblin',enemySeat,3);
  unit(hunt,6,'goblin',allySeat,3);unit(hunt,7,'goblin',enemySeat,0);
  unit(hunt,8,'goblin',enemySeat,3);hunt.tiles[8].area=hunt.tiles[2].area+1;
  hunt.phase='land';Object.assign(hunt.players[0],{pos:2,cash:1000});
  assert.ok(!C.board(hunt).links[2].includes(5));
  const moves=C.choices(hunt).filter(([action,from,to])=>action==='transfer'&&from===2&&[5,6,7,8].includes(to));
  assert.deepEqual(moves,[['transfer',2,5]]);
  hunt.tiles[2].unit.enchant='paralysis';
  assert.ok(!C.choices(hunt).some(([action,from,to])=>action==='transfer'&&from===2&&to===5));
  delete hunt.tiles[2].unit.enchant;
  assert.ok(C.play(hunt,['transfer',2,5]));
  assert.deepEqual([hunt.phase,hunt.battle.from,hunt.battle.at],['attack',2,5]);
  assert.ok(C.play(hunt,['bare'])&&C.play(hunt,['bare']));
  assert.equal(hunt.battle.strikes[0].side,0);
  assert.equal(hunt.battle.noToll,true);
  for(const [name,terrain] of [['wyvern',3],['blynx',2]]){
    const remote=C.start(2,2,8000,'saga-original-crosswind');
    unit(remote,2,name,0,3);
    remote.tiles[5].type=remote.tiles[6].type=terrain;remote.tiles[6].area=remote.tiles[2].area+1;
    remote.tiles[7].type=0;
    remote.phase='land';remote.players[0].pos=2;
    assert.ok(C.choices(remote).some(([action,from,to])=>action==='transfer'&&from===2&&to===5));
    assert.ok(!C.choices(remote).some(([action,from,to])=>action==='transfer'&&from===2&&to===6));
    assert.equal(C.choices(remote).some(([action,from,to])=>action==='transfer'&&from===2&&to===7),name==='blynx');
  }
  const mimic=fight('doppelganger','dwarf','무속성');
  assert.equal(mimic.battle.forms[0],id('dwarf'));
  assert.equal(mimic.players[0].hand.includes(id('doppelganger')),true);
  for(const [hunter,prey,threshold] of [['saint','fighter',.8],['yeti','crimsonvine',.6],['dhampir','crimsonvine',.6],['angostura','gremlin',.8]]){
    for(const rate of [threshold-.01,threshold]){
      const random=Math.random;
      try{
        Math.random=()=>rate;
        const setup=s=>{s.tiles[1].unit.hp=75;};
        const battle=hunter==='angostura'?fight(prey,hunter,'무속성',null,s=>{
          unit(s,8,prey,0,3,80);s.battle.from=8;
          Object.assign(s.tiles[1].unit,{hp:100,mhp:100});
        }):fight(hunter,prey,'무속성',null,setup);
        assert.equal(battle.battle.strikes.some(strike=>strike.notes.includes('즉사')),rate<threshold,hunter);
      }finally{Math.random=random;}
    }
  }
  const barrow=fight('barrowwight','dwarf','무속성');
  assert.equal(barrow.tiles[1].unit.enchant,'sleep');
  assert.equal(C.toll(barrow,barrow.tiles[1]),0);
  const lowRank=fight('avenger','dwarf','무속성',null,s=>{s.players[1].cash=5000;});
  const highRank=fight('avenger','dwarf','무속성',null,s=>{s.players[1].cash=100;});
  assert.equal(lowRank.battle.attackST-highRank.battle.attackST,10);
  assert.equal(lowRank.battle.startHP[0]-highRank.battle.startHP[0],10);
  console.log('Saga Tengu, Wyvern and Blynx regional movement, attack thresholds, Avenger ranks and copying checked');
  function fromTerritory(name){
    const s=C.start(2,2,8000,'saga-original-crosswind');
    unit(s,2,name,0,2);
    Object.assign(s.players[0],{pos:2,cash:600,hand:[]});s.phase='land';
    return s;
  }
  const herald=fromTerritory('heraldspirit');
  unit(herald,6,'dwarf',0,2);
  assert.ok(!C.choices(herald).some(([action,at])=>action==='level'&&at===6));
  assert.ok(C.play(herald,['ability',2]));
  assert.deepEqual([herald.players[0].status,herald.players[0].enchantDeadline,herald.players[0].cash],['enlightenment',4,550]);
  herald.turn=0;herald.round=2;herald.phase='land';herald.players[0].pos=2;
  assert.ok(C.choices(herald).some(([action,at])=>action==='level'&&at===6));
  const swamp=fromTerritory('swampspawn');
  assert.ok(C.play(swamp,['ability',2])&&C.play(swamp,['abilityPlayer',1]));
  assert.equal(swamp.players[1].word,0);
  const attackDragon=fromTerritory('armoreddragon');
  unit(attackDragon,4,'fighter',1,'무속성');unit(attackDragon,5,'redogre',1,0);
  assert.ok(C.play(attackDragon,['ability',2]));
  assert.ok(!C.choices(attackDragon).some(([action,at])=>action==='abilityLand'&&at===5));
  assert.ok(C.play(attackDragon,['abilityLand',4]));
  assert.equal(attackDragon.tiles[4].unit.hp,10);
  const spores=fromTerritory('venomouspore');
  unit(spores,4,'dwarf',1,2);unit(spores,5,'blueogre',1,1);
  spores.tiles[4].unit.enchant='landprotection';spores.tiles[5].area=1;
  assert.ok(C.play(spores,['ability',2])&&C.play(spores,['abilityLand',4]));
  assert.ok(spores.tiles[2].unit.poisoned&&spores.tiles[4].unit.poisoned&&!spores.tiles[5].unit.poisoned);
  const princess=fromTerritory('swordprincess');
  assert.ok(C.play(princess,['ability',2]));
  assert.equal(princess.tiles[2].unit.id,id('armedprincess'));
  assert.equal(C.spellHP(princess,princess.tiles[2],'bolt'),C.cards[id('armedprincess')].hp);
  const possession=fromTerritory('possession');
  unit(possession,4,'goblin',1,0);unit(possession,5,'blueogre',1,1,2);
  assert.ok(C.play(possession,['ability',2]));
  assert.deepEqual(C.choices(possession),[['abilityLand',4]]);
  assert.ok(C.play(possession,['abilityLand',4]));
  assert.deepEqual([possession.tiles[2].owner,possession.tiles[4].owner,possession.tiles[4].unit.id],[-1,0,id('goblin')]);
  const bane=fromTerritory('lordofbane');
  bane.players[1].cash=300;bane.players[1].symbols[0]=13;
  assert.ok(C.play(bane,['ability',2])&&C.play(bane,['abilityPlayer',1]));
  assert.equal(bane.players[1].cash,235);
  const bone=fromTerritory('bonegolem');
  unit(bone,4,'skeleton',1,'무속성');
  assert.ok(C.play(bone,['ability',2])&&C.play(bone,['abilityLand',4]));
  assert.equal(bone.tiles[4].unit.id,id('bonegolem'));
  const waterLand=fromTerritory('ahuizotl');
  unit(waterLand,4,'goblin',0,0);
  assert.ok(C.play(waterLand,['ability',2])&&C.play(waterLand,['abilityLand',4]));
  assert.equal(waterLand.tiles[4].type,1);
  const clear=fromTerritory('nobleshaman');
  unit(clear,4,'goblin',1,0);clear.tiles[4].unit.enchant='landprotection';
  assert.ok(C.play(clear,['ability',2]));
  assert.equal(clear.tiles[4].unit.enchant,undefined);
  const redcap=fight('redcap','dwarf','무속성',null,s=>{
    unit(s,4,'goblin',1,0);unit(s,5,'goblin',0,1);
  });
  assert.equal(redcap.battle.startHP[0],40);
  const goblin=fight('goblin','dwarf','무속성',null,s=>unit(s,4,'redcap',1,0));
  assert.equal(goblin.battle.startHP[0],50);
  const rahab=fight('tyrannosaurus','rahab','무속성');
  assert.equal(rahab.battle.strikes[0].effect,'block');
  assert.equal(fight('fighter','rahab','무속성').battle.strikes[0].effect,'hit');
  console.log('Saga new territory abilities, area poison, land seizure, evolution, ward clearing and Goblin boosts checked');
  const dragons=['armoreddragon','volcanicdragon','deepseadragon','hardrockdragon','lightningdragon'];
  for(const [i,name] of dragons.entries()){
    const egg=fromTerritory('dragonsegg');
    const random=Math.random;
    try{Math.random=()=>(i+.4)/dragons.length;assert.ok(C.play(egg,['ability',2]));}finally{Math.random=random;}
    assert.deepEqual([egg.players[0].cash,egg.tiles[2].unit.id],[500,id(name)]);
  }
  for(const [before,after] of [['dragonewt','dragonlord'],['mistwing','aquahorn'],['aquahorn','mistwing'],['spriggan','grendel']]){
    const s=fromTerritory(before);
    assert.ok(C.play(s,['ability',2]));
    assert.equal(s.tiles[2].unit.id,id(after));
  }
  for(const [dragon,prey,immune] of [['hardrockdragon','crimsonvine','blueogre'],['lightningdragon','crimsonvine','redogre']]){
    const s=fromTerritory(dragon);
    unit(s,4,prey,1,0);unit(s,5,immune,1,0);
    assert.ok(C.play(s,['ability',2]));
    assert.ok(!C.choices(s).some(([action,at])=>action==='abilityLand'&&at===5));
    assert.ok(C.play(s,['abilityLand',4]));
    assert.equal(s.tiles[4].unit.hp,C.cards[id(prey)].hp-30);
  }
  for(const name of ['volcanicdragon','deepseadragon']){
    const naturally=fight(name,'dwarf',2);
    assert.equal(naturally.battle.attackST,C.cards[id(name)].st);
    assert.match(naturally.battle.strikes[0].notes.join(' '),/지형 보너스 관통/);
    const equipped=fight(name,'dwarf',2,'forceanklet');
    assert.ok(equipped.battle.strikes.every(hit=>!hit.notes.includes('지형 보너스 관통')));
  }
  const ponder=fight('tengu','dwarf',2,'nuclearfusion');
  assert.match(ponder.battle.strikes[0].notes.join(' '),/75 피해/);
  assert.equal(ponder.battle.strikes[0].side,0);
  const recurring=fight('tengu','dwarf',2,'soulray');
  assert.match(recurring.battle.strikes[0].notes.join(' '),/45 피해/);
  assert.ok(recurring.players[0].hand.includes(id('soulray')));
  const reversion=fight('dragonlord','dwarf');
  assert.equal(reversion.tiles[1].unit.id,id('dragonewt'));
  const blockedReversion=fight('dragonlord','dwarf','무속성',null,s=>unit(s,8,'basaltidol',0,'무속성'));
  assert.equal(blockedReversion.tiles[1].unit.id,id('dragonlord'));
  for(const [creature,support,form] of [['groundgear','skygear','androgear'],['skygear','groundgear','androgear'],['androgear','beastgear','gearion']]){
    const fusion=fight(creature,'goblin','무속성',support);
    assert.equal(fusion.battle.forms[0],id(form));
    assert.equal(fusion.tiles[1].unit.id,id(form));
    assert.equal(fusion.battle.attackST,C.cards[id(form)].st);
  }
  for(const [fossil,form] of [['greatfossil','tyrannosaurus'],['littlefossil','giantrat']]){
    const fossilBattle=fight('tyrannosaurus',fossil);
    assert.equal(fossilBattle.tiles[1].unit.id,id(form));
    assert.equal(fossilBattle.battle.won,false);
  }
  const tao=fight('taotieh','goblin','무속성','longsword');
  assert.equal(tao.tiles[1].unit.st,C.cards[id('taotieh')].st+10);
  assert.equal(tao.tiles[1].unit.mhp,C.cards[id('taotieh')].hp+10);
  const pulgasari=fight('pulgasari','dwarf','무속성',null,s=>{s.tiles[1].unit.st=0;},'chainmail');
  assert.ok(pulgasari.players[0].hand.includes(id('pulgasari')));
  assert.match(pulgasari.battle.lines.join(' '),/기본 ST와 최대 HP 증가/);
  console.log('Saga dragon evolutions, natural scrolls, gear fusion, fossil revival and battle growth verified');
  for(const win of [true,false]){
    const remote=sagaCast('intrusion',s=>{
      s.players[0].hand=[id('intrusion'),id('leshy'),id('brontides'),id('mace')];s.players[0].pos=1;
      s.players[1].hand=[];
      unit(s,5,win?'giantrat':'dwarf',1,'무속성',3);
      unit(s,6,'goblin',1,3);s.tiles[6].unit.enchant='landprotection';
      unit(s,7,'goblin',1,3);s.tiles[7].unit.enchant='peace';
    });
    assert.equal(remote.players[0].cash,420);
    assert.deepEqual(C.choices(remote),[['targetLand',5]]);
    assert.ok(C.play(remote,['targetLand',5]));
    assert.deepEqual(C.choices(remote),[['intrusionCard',0,id('leshy')]]);
    const loaded=structuredClone(remote);
    assert.deepEqual(room.view(C,loaded,1).choices,[]);
    assert.deepEqual(room.view(C,loaded,1).game.players[0].hand,[]);
    assert.ok(C.play(loaded,['intrusionCard',0,id('leshy')]));
    assert.equal(loaded.players[0].cash,420);
    assert.equal(loaded.players[0].pos,1);
    if(win)assert.ok(C.play(loaded,['equip',1]));else assert.ok(C.play(loaded,['bare']));
    assert.equal(loaded.players[0].cash,win?420-C.cards[id('mace')].cost:420);
    assert.ok(C.play(loaded,['bare']));
    assert.equal(loaded.battle.won,win);
    assert.equal(loaded.battle.noToll,true);
    assert.ok(C.play(loaded,['continue']));
    assert.equal(loaded.phase,'roll');
    assert.equal(loaded.turn,0);
    assert.equal(loaded.players[0].pos,1);
  }
  const immediateRaid=sagaCast('intrusion',s=>{
    s.players[0].hand=[id('intrusion'),id('tokebi')];
    unit(s,5,'giantrat',1,'무속성');
  });
  assert.ok(C.play(immediateRaid,['targetLand',5]));
  assert.ok(C.play(immediateRaid,['intrusionCard',0,id('tokebi')]));
  assert.ok(C.play(immediateRaid,['bare'])&&C.play(immediateRaid,['bare']));
  assert.ok(C.play(immediateRaid,['continue']));
  assert.deepEqual([immediateRaid.phase,immediateRaid.immediateAt],['land',5]);
  assert.ok(C.play(immediateRaid,['ability',5])&&C.play(immediateRaid,['abilityLand',5]));
  assert.deepEqual([immediateRaid.phase,immediateRaid.turn,immediateRaid.tiles[5].owner],['roll',0,-1]);
  for(const power of ['panic','extermination','removeCurse','fortune','love','strut','magicEra']){
    const chosen=sagaCast('zeromn',s=>{
      unit(s,4,'dwarf',0,2);unit(s,5,'fighter',1,2,2);
      Object.assign(s.tiles[4].unit,{hp:32,enchant:'senility'});
      Object.assign(s.tiles[5].unit,{hp:25,enchant:'senility'});
      s.players[1].cash=1500;s.prices=s.prices.map(()=>40);
    });
    assert.equal(C.choices(chosen).length,7);
    assert.equal(chosen.players[0].cash,500);
    const restored=JSON.parse(JSON.stringify(chosen));
    assert.ok(C.play(restored,['zeromnPower',power]));
    assert.equal(restored.phase,'roll');
    if(power==='panic')assert.ok(restored.prices.every(n=>n===20));
    if(power==='extermination')assert.deepEqual(restored.tiles.slice(4,6).map(t=>t.unit.hp),[12,5]);
    if(power==='removeCurse')assert.deepEqual(restored.tiles.slice(4,6).map(t=>t.unit.enchant),[undefined,'senility']);
    if(power==='fortune')assert.equal(restored.players[0].cash,900);
    if(power==='love')assert.deepEqual(restored.tiles.slice(4,6).map(t=>t.unit.hp),[50,25]);
    if(power==='strut'){
      assert.equal(restored.players[0].enchantDeadline,6);
      assert.equal(C.owedToll(restored,restored.tiles[5],0),0);
    }
    if(power==='magicEra'){
      assert.equal(restored.players[0].enchantDeadline,6);
      for(const name of ['mace','tengu','trade'])assert.equal(C.price(restored.players[0],C.cards[id(name)],restored),0);
      for(let step=1;step<=6;step++){
        restored.phase='land';restored.players[restored.turn].pos=0;
        assert.ok(C.play(restored,['pass']));
        assert.equal(restored.players[0].status,step<6?'sagaMagicEra':undefined);
      }
      assert.equal(C.price(restored.players[0],C.cards[id('tengu')],restored),110);
    }
  }
  console.log('Saga Intrusion paid once, remote attack and Immediate resumed the roll; all seven Zeromn powers checked');
  const queen=fromTerritory('hivequeen');
  queen.players[0].hand=Array(6).fill(id('goblin'));
  assert.ok(!C.choices(queen).some(([action])=>action==='ability'));
  queen.players[0].hand.pop();
  assert.ok(C.play(queen,['ability',2]));
  assert.deepEqual([queen.players[0].cash,queen.players[0].hand.at(-1)],[580,id('hiveworker')]);
  const workers=fight('hiveworker','dwarf','무속성',null,s=>{
    unit(s,4,'hiveworker',0,0);unit(s,5,'hiveworker',1,1);
  });
  assert.deepEqual([workers.battle.attackST,workers.battle.startHP[0]],[40,40]);
  const nil=fromTerritory('nil');
  unit(nil,3,'dwarf',1,0,1,31);
  unit(nil,6,'fighter',0,1,1,25);
  assert.ok(C.play(nil,['ability',2]));
  assert.deepEqual([nil.players[0].cash,nil.tiles[2].unit,nil.tiles[3].unit.hp,nil.tiles[6].unit.hp],[500,null,6,5]);
  const peluda=fromTerritory('peluda');
  unit(peluda,1,'flammefleur',1,2);
  unit(peluda,3,'redogre',1,0);
  unit(peluda,6,'dwarf',0,1);
  assert.ok(C.play(peluda,['ability',2]));
  assert.deepEqual([1,2,3,6].map(at=>peluda.tiles[at].unit.hp),[30,30,40,40]);
  const assassin=fromTerritory('assassin');
  unit(assassin,3,'dwarf',1,0,1,30);
  unit(assassin,6,'dwarf',1,1,1,31);
  assert.ok(C.play(assassin,['ability',2]));
  assert.deepEqual(C.choices(assassin),[['abilityLand',3]]);
  assert.ok(C.play(assassin,['abilityLand',3]));
  assert.deepEqual([assassin.tiles[2].unit,assassin.tiles[3].unit,assassin.players[0].hand.at(-1)],[null,null,id('assassin')]);
  const sleipnir=fromTerritory('sleipnir');
  unit(sleipnir,3,'goblin',0,0,2,21);
  assert.ok(C.play(sleipnir,['ability',2])&&C.play(sleipnir,['abilityLand',3]));
  assert.deepEqual(C.choices(sleipnir),[['teleTo',1]]);
  assert.ok(C.play(sleipnir,['teleTo',1]));
  assert.deepEqual([sleipnir.players[0].cash,sleipnir.tiles[3].unit,sleipnir.tiles[1].unit.hp],[540,null,21]);
  const gizmo=C.start(4,4,8000,'saga-original-crosswind');
  unit(gizmo,2,'cloudgizmo',0,2);
  Object.assign(gizmo.players[0],{cash:500,hand:[],pos:2});
  Object.assign(gizmo.players[1],{hand:[id('goblin'),id('trade')],book:[id('manna'),id('dwarf')]});
  gizmo.phase='land';
  assert.ok(C.play(gizmo,['ability',2])&&C.play(gizmo,['abilityPlayer',1]));
  for(const seat of [0,1,2,3]){
    assert.deepEqual(room.view(C,gizmo,seat).game.players[1].hand,seat<2?gizmo.players[1].hand:[]);
    assert.deepEqual(room.view(C,gizmo,seat).choices,seat===0?[['wormDiscard',0],['wormDiscard',1]]:[]);
    assert.equal(room.view(C,gizmo,seat).game.players[1].book,undefined);
  }
  assert.ok(C.play(gizmo,['wormDiscard',1]));
  assert.deepEqual([gizmo.players[0].cash,gizmo.players[1].hand],[480,[id('goblin'),id('dwarf'),id('manna')]]);
  for(const [attacker,defender] of [['fighter','flyingpuffer'],['flyingpuffer','goblin']]){
    const result=fight(attacker,defender,'무속성',null,s=>{if(defender==='goblin')s.tiles[1].unit.hp=10;});
    assert.equal(result.tiles[1].unit,null);
    assert.equal(result.battle.won,false);
  }
  const priorRandom=Math.random;
  try{
    Math.random=()=>0;
    const nilBattle=fight('nil','dwarf','무속성',null,s=>{
      Object.assign(s.tiles[1].unit,{st:0,hp:100,mhp:100});
    });
    assert.deepEqual([nilBattle.battle.won,nilBattle.players[0].cash],[true,400]);
    for(const full of [false,true]){
      const cherub=fight('cherub','dwarf','무속성',null,s=>{s.players[1].hand=full?Array(6).fill(id('goblin')):[];});
      assert.equal(cherub.players[1].hand.includes(id('dwarf')),!full);
      assert.equal(cherub.tiles[1].unit.id,id('cherub'));
    }
    const unnameable=fight('unnameable','goblin','무속성',null,s=>{
      Object.assign(s.tiles[1].unit,{hp:100,mhp:100,st:0});
      Object.assign(s.players[1],{hand:[id('goblin'),id('fighter')],book:[id('dwarf'),id('goblin')]});
      s.players[0].book=[id('goblin')];
    });
    assert.deepEqual([unnameable.battle.won,unnameable.players[1].hand,unnameable.players[1].book,unnameable.players[0].book],
      [true,[id('fighter')],[id('dwarf')],[id('goblin')]]);
  }finally{Math.random=priorRandom;}
  console.log('Saga ten new creatures: hive, board damage, private Cloud Gizmo redraw, two-link Sleipnir and battle triggers checked');
  const disaster=sagaCast('disaster',s=>{
    unit(s,2,'goblin',0,2,1,39);s.tiles[2].unit.mhp=60;
    unit(s,3,'dwarf',1,0,1,41);s.tiles[3].unit.mhp=59;
    unit(s,6,'fighter',1,1,1,39);Object.assign(s.tiles[6].unit,{mhp:60,enchant:'phantasm'});
    unit(s,8,'clayidol',1,3);
  });
  assert.deepEqual([2,3,6].map(at=>disaster.tiles[at].unit.hp),[19,41,39]);
  const asylum=sagaCast('holyasylum',s=>unit(s,2,'dwarf',0,2,3,25));
  assert.ok(C.play(asylum,['targetLand',2]));
  function followSagaSpell(s,spell,seat){
    s.turn=seat;s.phase='spell';s.players[seat].hand=[id(spell),id('goblin')];
    assert.ok(C.play(s,['cast',0]),spell);
  }
  followSagaSpell(asylum,'locust',1);
  assert.deepEqual(C.choices(asylum),[['fizzle']]);
  followSagaSpell(asylum,'magicbolt',1);
  assert.ok(C.play(asylum,['targetLand',2]));
  assert.equal(asylum.tiles[2].unit.hp,25);
  asylum.turn=0;asylum.players[0].pos=2;asylum.phase='land';
  assert.ok(C.choices(asylum).some(([action,at])=>action==='level'&&at===2));
  const hold=sagaCast('holdcurse',s=>{
    unit(s,2,'dwarf',1,2);s.tiles[2].unit.enchant='peace';
    unit(s,3,'fighter',0,0);s.tiles[3].unit.enchant='fog';
    unit(s,6,'dwarf',1,1);
  });
  assert.ok(C.play(hold,['targetPlayer',1]));
  assert.equal(hold.players[1].enchantDeadline,16);
  followSagaSpell(hold,'holyasylum',0);
  assert.deepEqual(C.choices(hold),[['targetLand',3],['targetLand',6]]);
  followSagaSpell(hold,'massphantasm',0);
  assert.ok(C.play(hold,['comboArea',hold.tiles[2].area]));
  assert.equal(hold.tiles[2].unit.enchant,'phantasm');
  const lunatic=sagaCast('lunaticlight',s=>{
    unit(s,2,'dwarf',1,2,1,42);s.tiles[2].unit.st=37;
  });
  assert.equal(lunatic.phase,'sacrifice');
  assert.ok(C.play(lunatic,C.choices(lunatic)[0])&&C.play(lunatic,['targetLand',2]));
  assert.deepEqual(lunatic.tiles[2].unit,{id:id('dwarf'),st:42,hp:37,mhp:37});
  const revoltSpell=sagaCast('revolt',s=>{
    unit(s,2,'goblin',0,2,1,15);s.tiles[2].unit.poisoned=true;
    unit(s,3,'goblin',1,0,1,15);s.tiles[3].unit.enchant='holyasylum';
    unit(s,6,'goblin',1,1,1,15);
  });
  assert.deepEqual([2,3,6].map(at=>[revoltSpell.tiles[at].unit.hp,revoltSpell.tiles[at].unit.mhp]),[[25,40],[15,undefined],[15,undefined]]);
  let otherArea;
  const tide=sagaCast('timetide',s=>{
    otherArea=s.tiles.findIndex(t=>t.area!==s.tiles[2].area&&typeof t.type==='number');
    assert.ok(otherArea>=0);
    for(const at of [2,3,otherArea]){
      unit(s,at,'dwarf',at===2?0:1,s.tiles[at].type,1,22);
      Object.assign(s.tiles[at].unit,{st:60,mhp:65,enchant:at===3?'holyasylum':'disease'});
    }
  });
  assert.ok(C.choices(tide).some(([action,area])=>action==='comboArea'&&area===tide.tiles[otherArea].area));
  assert.ok(C.play(tide,['comboArea',tide.tiles[2].area]));
  assert.deepEqual(tide.tiles[2].unit,{id:id('dwarf'),hp:50,enchant:'disease'});
  assert.deepEqual([3,otherArea].map(at=>tide.tiles[at].unit.hp),[22,22]);
  console.log('Saga Disaster HP threshold, Holy Asylum, Hold Curse single-target immunity, Lunatic Light, Revolt and Time Tide checked');
  const conspiracy=sagaCast('conspiracy',s=>{
    unit(s,2,'goblin',0,2);unit(s,3,'colossus',1,0);
  });
  const conspirator=conspiracy.players[0],goblinCard=C.cards[id('goblin')],colossusCard=C.cards[id('colossus')];
  assert.equal(conspirator.status,'conspiracy');
  assert.equal(C.price(conspirator,goblinCard,conspiracy),0);
  assert.equal(C.price(conspirator,goblinCard,conspiracy,false),goblinCard.cost);
  assert.equal(C.price(conspirator,colossusCard,conspiracy),colossusCard.cost);
  conspirator.cash=0;conspirator.hand=[id('goblin')];conspirator.pos=1;conspiracy.phase='land';
  assert.ok(C.play(conspiracy,['summon',0]));
  assert.deepEqual([conspirator.cash,conspiracy.tiles[1].unit.id],[0,id('goblin')]);
  conspiracy.turn=0;conspiracy.phase='roll';
  Object.assign(conspirator,{pos:1,previous:2,word:1,dir:-1});
  assert.ok(C.play(conspiracy,['roll']));
  assert.deepEqual([conspirator.pos,conspirator.status],[0,undefined]);
  assert.equal(C.price(conspirator,goblinCard,conspiracy),goblinCard.cost);
  const forfeit=sagaCast('forfeit',s=>{
    const q=s.players[1];q.cash=400;q.symbols[1]=3;q.symbols[5]=7;s.prices[5]=29;
  });
  assert.ok(C.play(forfeit,C.choices(forfeit)[0]));
  assert.deepEqual(C.choices(forfeit),[['targetPlayer',1]]);
  assert.ok(C.play(forfeit,['targetPlayer',1]));
  assert.deepEqual(C.choices(forfeit),[['forfeitSymbol',1],['forfeitSymbol',5]]);
  const resumedForfeit=structuredClone(forfeit);
  assert.ok(!C.play(resumedForfeit,['forfeitSymbol',0]));
  assert.ok(C.play(resumedForfeit,['forfeitSymbol',5]));
  assert.deepEqual([resumedForfeit.players[1].symbols[1],resumedForfeit.players[1].symbols[5],resumedForfeit.players[1].cash,resumedForfeit.prices[5],resumedForfeit.phase],[3,0,603,29,'roll']);
  try{
    Math.random=()=>0;
    const shifted=fight('dwarf','doppelganger','무속성','blasterray');
    assert.equal(shifted.battle.won,true);
    assert.equal(shifted.tiles[1].owner,0);
    assert.equal(shifted.tiles.filter(t=>t.owner===1&&t.unit?.id===id('dwarf')).length,1);
    const shielded=fight('dwarf','doppelganger','무속성','blasterray',null,'smoketorch');
    assert.equal(shielded.battle.won,false);
    assert.equal(shielded.tiles[1].unit.id,id('doppelganger'));
    const reflectedRay=fight('dwarf','doppelganger','무속성','blasterray',null,'livingmirror');
    assert.equal(reflectedRay.battle.won,false);
    assert.equal(reflectedRay.tiles.filter(t=>t.owner===0&&t.unit?.id===id('dwarf')).length,1);
    const blockedMap=fight('dwarf','goblin','무속성','blasterray',s=>{
      for(const [at,t] of s.tiles.entries())if(at!==1&&C.combo.territoryType(t.type))unit(s,at,'fighter',0,t.type);
    });
    assert.equal(blockedMap.battle.won,true);
    assert.ok(blockedMap.battle.lines.some(line=>line.includes('빈 영지가 없어 격파')));
    Math.random=()=>.5;
    const missedRay=fight('dwarf','goblin','무속성','blasterray');
    assert.equal(missedRay.battle.won,false);
    assert.ok(missedRay.battle.lines.some(line=>line.includes('이동 실패')));
  }finally{Math.random=priorRandom;}
  console.log('Saga Conspiracy paid only actual summons, Forfeit preserved other region, Blaster Ray retained temporary form and respected scroll wards');
  for(const [spell,target] of [['mesozoicsong',0],['sinkingsong',1]]){
    const s=sagaCast(spell);
    assert.ok(C.play(s,['targetPlayer',target]));
    assert.deepEqual([s.players[target].status,s.players[target].enchantDeadline],[spell,6]);
    for(let n=1;n<=6;n++){
      s.phase='land';s.players[s.turn].pos=0;
      assert.ok(C.play(s,['pass']));
      assert.equal(s.players[target].status,n<6?spell:undefined);
    }
  }
  const meso=fight('gremlin','dwarf','무속성',null,s=>{s.players[0].status='mesozoicsong';},'smoketorch');
  assert.deepEqual([meso.battle.attackST,meso.battle.startHP[0],meso.battle.finalForms[0],meso.tiles[1].unit.id],
    [50,60,id('tyrannosaurus'),id('gremlin')]);
  const mesoSupport=fight('sage','dwarf','무속성','fighter',s=>{s.players[0].status='mesozoicsong';});
  assert.equal(mesoSupport.battle.attackST,50+C.cards[id('fighter')].st);
  assert.equal(mesoSupport.battle.startHP[0],60+C.cards[id('fighter')].hp);
  const sinking=fight('hellhound','blueogre','무속성',null,s=>{s.players[0].status='sinkingsong';});
  assert.match(sinking.battle.strikes[0].notes.join(' '),new RegExp(Math.floor(C.cards[id('hellhound')].st/4)+' 피해'));
  const paralyzedSong=fight('goblin','dwarf','무속성',null,s=>{
    s.players[1].status='toughsong';s.tiles[1].unit.enchant='paralysis';
  });
  assert.equal(paralyzedSong.battle.startHP[1],50);
  const paralyzedMeso=fight('goblin','dwarf','무속성',null,s=>{
    s.players[1].status='mesozoicsong';s.tiles[1].unit.enchant='paralysis';
  });
  assert.equal(paralyzedMeso.battle.finalForms[1],id('dwarf'));
  console.log('Saga protection songs expire, stack reductions, preserve pre-transformation item effects and support, and respect paralysis');
  const permittedForms=original=>C.cards.flatMap((card,j)=>j!==id(original)&&card.kind==='creature'&&!card.unlisted&&
    !card.catalogOnly&&!card.generatedOnly&&['N','S','R'].includes(card.catalog.rarity)?[j]:[]);
  try{
    for(const rng of [0,.999999]){
      Math.random=()=>rng;
      const expected=original=>permittedForms(original).at(rng===0?0:-1);
      const shifter=fromTerritory('shapeshifter');
      shifter.tiles[2].level=3;
      assert.ok(C.play(shifter,['ability',2]));
      assert.deepEqual([shifter.players[0].cash,shifter.tiles[2].owner,shifter.tiles[2].level,shifter.tiles[2].unit.id],
        [550,0,3,expected('shapeshifter')]);
      const polymorph=sagaCast('polymorph',s=>{unit(s,2,'colossus',1,2,3,11);});
      assert.ok(C.play(polymorph,C.choices(polymorph)[0])&&C.play(polymorph,['targetLand',2]));
      assert.deepEqual([polymorph.tiles[2].owner,polymorph.tiles[2].level,polymorph.tiles[2].unit.id],
        [1,3,expected('colossus')]);
      const baldanders=fight('baldanders','goblin');
      assert.equal(baldanders.battle.finalForms[0],expected('baldanders'));
      const ring=fight('dwarf','goblin','무속성','proteanring');
      assert.equal(ring.battle.finalForms[0],expected('dwarf'));
    }
  }finally{Math.random=priorRandom;}
  console.log('Saga map and battle transformations select a different card from exactly N, S and R ranks');
  const liquid=sagaCast('liquidform',s=>unit(s,2,'dwarf',1,2));
  const preLiquidBook=liquid.players[0].book.slice();
  assert.ok(C.play(liquid,['targetLand',2]));
  assert.deepEqual(liquid.players[0].hand,[id('fighter')]);
  assert.deepEqual(liquid.players[0].book,preLiquidBook);
  assert.equal(liquid.tiles[2].unit.enchant,'liquidform');
  try{
    const oppositeRolls=()=>{
      let calls=0;
      Math.random=()=>calls++%2?.99999:0;
    };
    const robe=fight('dwarf','goblin','무속성','spectresrobe',oppositeRolls);
    assert.deepEqual([robe.battle.attackST,robe.battle.startHP[0]],[40,120]);
    const rolledForm=fight('fighter','dwarf','무속성',null,s=>{
      s.tiles[1].unit.enchant='liquidform';oppositeRolls();
    });
    assert.deepEqual([rolledForm.battle.defendST,rolledForm.battle.startHP[1]],[10,70]);
  }finally{Math.random=priorRandom;}
  for(const [before,after] of [['goblin','wonderwall'],['redogre','creepingflame'],['blueogre','wallofice'],['dwarf','wallofstone'],['yellowogre','tornado']]){
    const wall=sagaCast('walltransform',s=>{
      unit(s,2,before,1,3,3,9);
      unit(s,3,'fontaciel',1,1);
    });
    assert.deepEqual(C.choices(wall),[['targetLand',2]]);
    assert.ok(C.play(wall,['targetLand',2]));
    assert.deepEqual([wall.tiles[2].unit.id,wall.tiles[2].unit.hp,wall.tiles[2].owner,wall.tiles[2].level],
      [id(after),C.cards[id(after)].hp,1,3]);
  }
  for(const full of [false,true]){
    const fear=sagaCast('fear',s=>{
      unit(s,2,'goblin',1,2,3,25);s.tiles[2].unit.enchant='landprotection';
      unit(s,3,'dwarf',1,0,1,9);
      s.players[1].hand=full?Array(6).fill(id('manna')):[];
    });
    assert.deepEqual(C.choices(fear),[['targetPlayer',1]]);
    assert.ok(C.play(fear,['targetPlayer',1]));
    assert.deepEqual([fear.tiles[2].unit,fear.tiles[3].unit.id,fear.players[1].hand.includes(id('goblin'))],[null,id('dwarf'),!full]);
    if(full)assert.equal(fear.lastDestroyed,id('goblin'));
  }
  const fearTie=sagaCast('fear',s=>{unit(s,2,'goblin',1,2);unit(s,3,'goblin',1,0);});
  assert.deepEqual(C.choices(fearTie),[['fizzle']]);
  assert.equal(C.cards.filter(card=>!card.unlisted&&card.catalogOnly).length,0);
  console.log('Saga 487 implementations, separate ST/HP rolls, five wall forms and unique minimum Fear return checked');
  const boosts=fight('fighter','dwarf','무속성',null,s=>{
    unit(s,4,'ares',1,0);unit(s,5,'poseidon',0,1);
  });
  assert.deepEqual([boosts.battle.attackST,boosts.battle.startHP[1]],[70,70]);
  const paralyzedBoost=fight('fighter','dwarf','무속성',null,s=>{
    unit(s,4,'ares',1,0);unit(s,5,'poseidon',0,1);
    for(const at of [4,5])s.tiles[at].unit.enchant='paralysis';
  });
  assert.deepEqual([paralyzedBoost.battle.attackST,paralyzedBoost.battle.startHP[1]],[50,50]);
  const mask=fight('fighter','dwarf','무속성',null,null,'angrymask');
  assert.deepEqual(mask.battle.finalHP,[0,10]);
  assert.match(mask.battle.lines.join(' '),/상대 기본 HP에 40 피해/);
  const basaltShield=fight('fighter','dwarf','무속성',null,s=>{
    unit(s,4,'basaltidol',1,'무속성');unit(s,5,'opalidol',0,'무속성');
    Object.assign(s.tiles[1].unit,{enchant:'senility',st:0,hp:65,mhp:65});
  },'angrymask');
  assert.deepEqual(basaltShield.battle.finalHP,[40,15]);
  const basaltChoker=fight('fighter','dwarf','무속성','deathchoker',s=>unit(s,4,'basaltidol',1,'무속성'));
  assert.equal(basaltChoker.battle.attackST,70);
  assert.equal(basaltChoker.battle.won,true);
  const branch=fight('brancharmy','fighter','무속성',null,s=>{
    unit(s,4,'dwarf',1,2);unit(s,5,'crimsonvine',0,0);
  });
  assert.equal(branch.battle.attackST,C.cards[id('brancharmy')].st+10+C.battleGround(branch,branch.battle).attack);
  const branchLand=C.start(2,2,8000,'saga-original-crosswind');
  unit(branchLand,2,'brancharmy',0,2);
  Object.assign(branchLand.players[0],{pos:2,cash:80});branchLand.phase='land';
  assert.ok(C.play(branchLand,['ability',2]));
  assert.deepEqual([branchLand.tiles[2].unit.id,branchLand.players[0].cash],[id('mudman'),30]);
  const draws=fight('triton','goblin','무속성','longsword',s=>{s.players[0].book=[id('manna')];});
  assert.ok(draws.players[0].hand.includes(id('manna')));
  const granite=sagaCast('capture',s=>{
    unit(s,4,'graniteidol',1,'무속성');
    s.players[1].hand=[id('mace')];
  });
  assert.deepEqual(C.choices(granite),[['fizzle']]);
  const openGranite=sagaCast('drought',s=>unit(s,4,'graniteidol',1,'무속성'));
  assert.ok(C.choices(openGranite).some(([kind,seat])=>kind==='targetPlayer'&&seat===1));
  const reflection=sagaCast('reflection',s=>unit(s,4,'dwarf',0,2));
  assert.ok(C.play(reflection,['targetLand',4]));
  assert.equal(reflection.tiles[4].unit.enchant,'reflection');
  const reflectSetup=s=>{s.tiles[1].unit.enchant='reflection';};
  const physical=fight('fighter','dwarf','무속성',null,reflectSetup);
  assert.equal(physical.battle.strikes[0].effect,'reflect');
  assert.deepEqual(physical.battle.finalHP,[0,50]);
  const scrollAttack=fight('fighter','dwarf','무속성','firestone',reflectSetup);
  assert.equal(scrollAttack.battle.strikes[0].effect,'hit');
  const selective=sagaCast('selection',s=>{
    unit(s,2,'dwarf',0,2);
    unit(s,3,'necromancer',1,2);
    unit(s,4,'quicksilver',0,1);
    s.tiles[3].unit.enchant='landprotection';
  });
  assert.deepEqual(selective.tiles.slice(2,5).map(t=>t.unit.hp),[50,10,10]);
  const wheel=C.start(4,4,8000,'saga-original-crosswind',undefined,undefined,0,'teams');
  const foe=wheel.teams.findIndex(team=>team!==wheel.teams[0]);
  wheel.players.forEach((p,i)=>{p.cash=i===0?600:i===foe?200:wheel.teams[i]===wheel.teams[0]?1000:1;});
  wheel.players[0].hand=[id('rouetsoleil'),id('fighter')];wheel.phase='spell';
  const baseCost=C.cards[id('rouetsoleil')].cost;
  assert.ok(C.play(wheel,['cast',0]));
  assert.ok(C.play(wheel,['sacrifice',1]));
  assert.deepEqual([wheel.players[0].cash,wheel.players[foe].cash],[700-baseCost,100]);
  console.log('Saga global combat boosts, Basalt and Granite, in-battle item effects, Selection and Roulette checked');
  const claw=fight('centaur','fighter','무속성','livingclaw',s=>{s.tiles[1].unit.hp=70;});
  assert.equal(claw.battle.strikes[0].side,0);
  assert.deepEqual([claw.battle.strikes.length,claw.tiles[1].unit.enchant],[1,'paralysis']);
  const rapier=fight('fighter','goblin','무속성',null,null,'livingrapier');
  assert.equal(rapier.battle.strikes[0].side,1);
  assert.equal(rapier.battle.defendST,40);
  const mirrored=fight('fighter','gascloud',0,'firestone',null,'livingmirror');
  assert.equal(mirrored.battle.strikes[0].effect,'reflect');
  const scroll=fight('gremlin','blueogre',1,'livingscroll',null,'chainmail');
  assert.equal(scroll.battle.attackST,20);
  assert.match(scroll.battle.strikes[0].notes.join(' '),/지형 보너스 관통.*20 피해/);
  const supported=fight('bandit','fighter','무속성','deathscythe',s=>{
    s.players[1].cash=500;s.tiles[1].unit.hp=100;
  });
  assert.equal(supported.battle.attackST,90);
  assert.equal(supported.players[1].cash,320);
  const pudding=fight('bloodypudding','fighter','무속성','behemoth',s=>{
    const source=4;
    unit(s,source,'bloodypudding',0,1,1,60);
    s.tiles[source].unit.mhp=60;s.battle.from=source;s.battle.invHP=60;
  });
  assert.equal(pudding.tiles[1].unit.mhp,100);
  for(const name of ['cockatrice','medusa']){
    const ram=fight(name,'fighter','무속성','batteringram',s=>{s.tiles[1].unit.hp=100;});
    assert.ok(ram.battle.won);
    assert.match(ram.battle.strikes[0].notes.join(' '),/변신.*즉사/);
  }
  const hare=fight('lunatichare','fighter','무속성','abyssaltome',s=>{s.tiles[1].unit.hp=100;});
  assert.ok(hare.battle.won);
  assert.equal(hare.tiles[1].unit.id,id('statue'));
  const declining=fight('raksas','blueogre','무속성','godlesspike',s=>{
    s.players[1].symbols=[2,6,21,0];s.prices=[13,58,45,26];
  });
  assert.ok(declining.battle.won);
  assert.deepEqual(declining.players[1].symbols,[2,6,15,0]);
  assert.deepEqual(declining.prices,[13,29,45,26]);
  const reaper=newMatch();
  Object.assign(reaper.players[0],{pos:2,cash:300});unit(reaper,2,'deathscythe',0,0);
  reaper.phase='land';
  assert.ok(C.play(reaper,['ability',2]));
  assert.deepEqual([reaper.players[0].cash,reaper.tiles[2].unit.id],[250,id('mummy')]);

  const coalFight=fight('coaloid','fighter','무속성',null,s=>{
    unit(s,8,'hellpyron',1,0);unit(s,9,'hellpyron',1,0);
    unit(s,10,'minotaur',0,0);unit(s,11,'minotaur',0,0);
  });
  assert.equal(coalFight.battle.attackST,60,'boost does not stack and fire land bonus is personal');
  assert.equal(coalFight.battle.startHP[0],50);
  assert.equal(fight('hellpyron','minotaur','무속성').battle.attackST,70,'active fighter cannot provide its own boost');
  assert.equal(fight('crimsonvine','fighter','무속성',null,s=>unit(s,8,'hellpyron',1,0)).battle.attackST,40);
  assert.equal(fight('minotaur','fighter','무속성',null,s=>{
    unit(s,8,'hellpyron',1,0);s.tiles[8].unit.enchant='paralysis';
  }).battle.attackST,40);
  const regularRevenant=fight('revenant','dwarf','무속성');
  assert.equal(regularRevenant.battle.attackST,20);
  assert.equal(regularRevenant.tiles[1].unit.enchant,'paralysis');
  const disguised=fight('revenant','fighter','무속성',null,s=>{s.tiles[1].unit.enchant='fog';});
  assert.equal(disguised.battle.attackST,40);
  assert.equal(disguised.battle.forms[0],id('vampire'));
  assert.equal(disguised.tiles[1].unit.id,id('revenant'));
  assert.equal(disguised.tiles[1].unit.hp,50);
  const vampire=fight('goblin','vampire',2,null,s=>{s.tiles[1].unit.hp=10;});
  assert.equal(vampire.battle.strikes[0].side,1);
  assert.equal(vampire.tiles[1].unit.hp,40,'Vampire heals from a successful normal hit');
  assert.equal(fight('fighter','sylph','무속성').battle.strikes[0].effect,'block');
  assert.equal(fight('goblin','sylph','무속성').battle.strikes[0].effect,'hit');
  assert.equal(fight('fighter','sylph','무속성','freezingwind').battle.strikes[0].effect,'hit');
  const windGathering=fight('fighter','garuda',3,null,s=>{
    unit(s,8,'frostbeast',0,1);unit(s,9,'pegasus',1,3);
    unit(s,10,'goblin',0,3);
  }).battle;
  assert.equal(windGathering.defendST,30,'counts wind creatures including dual elements and the defender');
  assert.equal(windGathering.startHP[1],40);
  const gemoid=fight('fighter','gemoid','무속성');
  assert.equal(gemoid.battle.won,true,'map HP immunity permits battle damage');
  const spudDefeat=fight('fighter','spudfolk','무속성',null,s=>{
    s.players[1].cash=500;unit(s,8,'crimsonvine',0,2);unit(s,9,'redogre',1,0);
    unit(s,10,'goblin',0,0);
  });
  assert.equal(spudDefeat.battle.won,true);
  assert.equal(spudDefeat.players[1].cash,520);
  const previousRandom=Math.random;
  try{
    for(const [chance,hp] of [[.1,30],[.9,60]]){
      Math.random=()=>chance;
      assert.equal(fight('pangolin','dwarf','무속성').battle.startHP[0],hp);
    }
  }finally{Math.random=previousRandom;}
  const spines=fight('fighter','spinyagama','무속성').battle;
  assert.deepEqual(spines.strikes[0].hp,[20,10]);
  const bypass=fight('fighter','spinyagama','무속성','freezingwind').battle;
  assert.deepEqual(bypass.strikes[0].hp,[40,0]);
  const landBreaker=fight('fighter','seismodon','무속성','mace',s=>{s.tiles[1].level=3;});
  assert.equal(landBreaker.battle.won,true);assert.equal(landBreaker.tiles[1].level,2);
  assert.equal(fight('fighter','seismodon','무속성','mace').tiles[1].level,1);
  const boostPair=fight('crimsonvine','fighter','무속성',null,s=>{
    unit(s,8,'hellpyron',1,0);unit(s,9,'brontides',1,2);unit(s,10,'brontides',0,2);
  }).battle;
  assert.deepEqual([boostPair.attackST,boostPair.startHP[0]],[40,60]);
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
  for(const form of ['gearion','androgear','armedprincess','dragonlord','grassstrider']){
    assert.ok(C.cards[id(form)].generatedOnly,form);
    assert.ok(!C.validBook([id(form),...C.presets.sagaStarterWater.slice(1)]),form);
  }
  const resetHand=s=>{s.players[1].hand=[id('mace')];s.players[1].book=Array(7).fill(id('goblin'));};
  const blade=fight('fighter','dwarf','무속성','bladeofculdra',resetHand);
  assert.deepEqual(blade.players[1].hand,Array(6).fill(id('goblin')));
  assert.equal(blade.players[1].book.length,1);
  assert.equal(blade.battle.won,true);
  const blocked=fight('redogre','dwarf','무속성','bladeofculdra',resetHand,'fireshield');
  assert.equal(blocked.battle.strikes[0].effect,'block');
  assert.equal(blocked.players[1].book.length,7);
  const mosquito=fight('deathquito','dwarf','무속성',null,resetHand);
  assert.equal(mosquito.players[1].hand.length,0);
  const scarab=fight('fighter','goblin','무속성',null,null,'necroscarab');
  assert.equal(scarab.battle.won,false);
  assert.equal(scarab.tiles[1].unit.id,id('skeleton'));
  const poisonOnly=fight('goblin','dwarf','무속성','necroscarab',s=>{
    unit(s,8,'goblin',0,0,1,8);s.tiles[8].unit.poisoned=true;s.battle.from=8;
    s.tiles[1].unit.st=0;
  });
  assert.equal(poisonOnly.tiles[8].unit,null);
  const stone=fight('fighter','goblin','무속성',null,s=>{s.players[1].book=Array(6).fill(id('mace'));},'tombstone');
  assert.deepEqual(stone.players[1].hand,Array(6).fill(id('mace')));
  const seal=fight('fighter','goblin','무속성',null,null,'cursedseal');
  assert.equal(seal.tiles[1].unit.hp,20);
  const reflected=fight('fighter','goblin','무속성','necroscarab',null,'counteramulet');
  assert.deepEqual(reflected.battle.finalHP,[40,30]);
  const belt=fight('goblin','dwarf','무속성','metamorphosebelt',s=>{s.players[1].hand=[id('mace'),id('goblin')];});
  const strider=C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='grassstrider');
  assert.equal(belt.battle.forms[0],strider);
  assert.deepEqual([belt.battle.attackST,belt.battle.startHP[0],belt.battle.won],[60,40,true]);
  assert.equal(belt.tiles[1].unit.id,id('goblin'));
  assert.equal(id('grassstrider'),strider);
  assert.equal(C.validBook([strider,...C.presets.sagaStarterWater.slice(1)]),false);
  const defensiveBelt=fight('fighter','goblin','무속성',null,null,'metamorphosebelt');
  assert.equal(defensiveBelt.battle.strikes[0].side,1);
  assert.equal(defensiveBelt.tiles[1].unit.id,id('goblin'));
  for(const spell of ['bravesong','toughsong']){
    const buff=newMatch();
    const target=buff.players[1];
    buff.players[0].cash=500;buff.players[0].hand=[id(spell)];
    assert.ok(C.play(buff,['cast',0])&&C.play(buff,['targetPlayer',1]));
    assert.equal(target.status,spell);
    assert.equal(target.enchantDeadline,8);
    assert.equal(buff.players[0].status,undefined);
    const probe=()=>{
      return fight('goblin','dwarf','무속성',null,s=>{s.players[1].status=target.status;}).battle;
    };
    assert.equal(probe().defendST,spell==='bravesong'?50:30);
    assert.equal(probe().startHP[1],spell==='toughsong'?70:50);
    for(let step=1;step<=8;step++){
      buff.phase='land';buff.players[buff.turn].pos=0;
      assert.ok(C.play(buff,['pass']));
      assert.equal(target.status,step<8?spell:undefined);
    }
    assert.equal(probe().defendST,30);assert.equal(probe().startHP[1],50);
  }
  const ferryman=fight('fighter','charon','무속성',null,s=>{s.players[1].cash=200;});
  assert.equal(ferryman.battle.strikes[0].effect,'block');
  assert.equal(ferryman.players[1].cash,120);
  assert.equal(fight('fighter','charon','무속성','freezingwind').battle.won,true);
  assert.equal(fight('minotaur','salamander').battle.strikes[0].effect,'heal');
  assert.equal(fight('crimsonvine','salamander').battle.strikes[0].effect,'heal');
  assert.equal(fight('minotaur','salamander','무속성','firestone').battle.strikes[0].effect,'hit');
  for(const occupied of [false,true]){
    const s=C.start(2,2,5000,'saga-original-crosswind'),p=s.players[0];
    unit(s,3,'minotaur',0,0);
    if(occupied)unit(s,1,'goblin',1,0);
    p.cash=500;p.hand=[id('chariot')];
    assert.ok(C.play(s,['cast',0])&&C.play(s,['targetLand',3]));
    assert.deepEqual(C.choices(s),[['teleTo',1]]);
    assert.equal(p.book[0],id('chariot'));
    assert.ok(C.play(s,['teleTo',1]));
    if(occupied)assert.ok(C.play(s,['bare'])&&C.play(s,['bare'])&&C.play(s,['continue']));
    assert.equal(s.phase,'roll');
    assert.equal(s.tiles[1].owner,0);
    assert.equal(s.tiles[1].unit.id,id('minotaur'));
    assert.equal(s.tiles[3].owner,-1);
  }
  const award=fight('minotaur','gelatinouswall','무속성',null,s=>{s.players[1].cash=200;});
  assert.equal(award.battle.won,false);
  assert.equal(award.players[1].cash,400);
  const noAward=fight('minotaur','gelatinouswall','무속성','firestone',s=>{s.players[1].cash=200;});
  assert.equal(noAward.players[1].cash,200);
  const bookReturn=fight('centaur','goblin','무속성','mace',s=>{s.players[0].book=[id('goblin')];});
  assert.equal(bookReturn.players[0].book[0],id('mace'));
  const noReturn=fight('centaur','fighter','무속성','mace',s=>{s.players[0].book=[id('goblin')];},'counteramulet');
  assert.deepEqual(noReturn.players[0].book,[id('goblin')]);
  for(const [round,bonus] of [[19,0],[20,30]]){
    const gawain=fight('sirgawain','dwarf','무속성',null,s=>{s.round=round;}).battle;
    assert.deepEqual([gawain.attackST,gawain.startHP[0]],[40+bonus,30+bonus]);
  }
  const hag=fight('seahag','goblin',1);
  assert.equal(hag.battle.startHP[0],40);
  assert.equal(hag.tiles[1].unit.enchant,'greed');
  assert.equal(C.toll(hag,hag.tiles[1]),Math.floor(C.value(hag,hag.tiles[1])*.3));
  const opal=s=>unit(s,8,'opalidol',1,0);
  const regenerated=fight('fighter','dwarf','무속성',null,opal);
  assert.equal(regenerated.tiles[1].unit.hp,50);
  assert.equal(fight('fighter','dwarf','무속성','corrosiveknife').battle.won,false);
  assert.equal(fight('fighter','dwarf','무속성','corrosiveknife',opal).battle.won,true);
  assert.equal(fight('fighter','dwarf','무속성','corrosiveknife',s=>{
    opal(s);s.tiles[8].unit.enchant='paralysis';
  }).battle.won,false);
  const curse=fight('fighter','wallofice','무속성','doomneedle');
  assert.equal(curse.battle.won,false);
  assert.equal(curse.tiles[1].unit.enchant,'senility');
  assert.equal(fight('goblin','wallofice','무속성',null,s=>{s.tiles[1].unit={...curse.tiles[1].unit};}).battle.won,true);
  const choker=fight('goblin','dwarf',2,'deathchoker',s=>{s.tiles[1].level=2;});
  assert.deepEqual(choker.battle.finalHP,[0,0]);
  assert.equal(choker.tiles[1].owner,-1);
  assert.equal(fight('fighter','redogre',0,null,null,'neutralcloak').battle.startHP[1],60);
  assert.ok(!fight('goblin','tornado','무속성','boomerang').players[0].hand.includes(id('boomerang')));
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
  console.log('Saga dual elements, starter card battles, Creeping Flame movement, 32 additional items and 19 additional creatures OK');

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
  const recovery=newMatch(),runner=recovery.players[0];
  unit(recovery,5,'colossus',0,0,1,10);unit(recovery,6,'goblin',0,0,1,10);
  Object.assign(runner,{pos:map.links[0][0],previous:null,flags:map.checkpoints.slice()});
  Object.assign(recovery,{phase:'fork',remaining:1});
  assert.ok(C.play(recovery,['route',0]));
  assert.deepEqual([recovery.tiles[5].unit.hp,recovery.tiles[6].unit.hp],[10,16]);
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
  assert.equal(ordinary.destroyedCount??0,0,'title update excludes shrine defeats');
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
  const fight=(edition,attacker,defender,weapon,armor,prepare)=>{
    const C=edition==='ps2'?ps2:ps2.createEdition(edition);
    const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
    const atk=id(attacker),def=id(defender),w=weapon?id(weapon):-1,a=armor?id(armor):-1;
    assert.ok(atk>=0&&def>=0&&(!weapon||w>=0)&&(!armor||a>=0),[edition,attacker,defender,weapon,armor].join(' '));
    const s=C.start(2,2,5000,edition==='3ds'?'3ds-original-bend':edition+'-1');
    const at=1;
    Object.assign(s.tiles[at],{owner:1,type:'무속성',unit:{id:def,hp:C.cards[def].hp}});
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    if(w>=0)s.players[0].hand.push(w);
    if(a>=0)s.players[1].hand.push(a);
    prepare?.(s,id);
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
  const revolt=(w,a,attacker='fighter',defender='goblin',prepare)=>fight('revolt',attacker,defender,w,a,prepare);
  const revoltedRam=revolt('batteringram',null,'goblin','wallofstone').s.battle;
  assert.equal(revoltedRam.attackST,50);
  assert.equal(revoltedRam.won,true);
  const cloud=revolt(null,null,'fighter','gascloud').s.battle;
  assert.equal(cloud.startHP[1]-cloud.strikes[0].hp[1],20);
  const vapor=revolt('tearinghalo',null,'fighter','gascloud').s.battle;
  assert.equal(vapor.startHP[1]-vapor.strikes[0].hp[1],30);
  const mirror=revolt('tearinghalo','magussmirror','fighter','fighter').s.battle;
  assert.equal(mirror.strikes[0].effect,'reflect');
  assert.equal(mirror.strikes[0].hp[0],10);
  assert.equal(revolt('tearinghalo','magicshield').s.battle.strikes[0].effect,'block');
  assert.match(revolt('tearinghalo',null,'ninja','fighter').s.battle.strikes[0].notes.join(' '),/45 피해/);
  const stone=revolt(null,'petrifystone','fighter','fighter').s.battle;
  assert.deepEqual([stone.startHP[1],stone.defendST],[80,0]);
  const prism=revolt('prismaticwand',null,'fighter','woodfolk').s.battle;
  assert.deepEqual([prism.attackST,prism.startHP[0]],[80,80]);
  const trojan=revolt('fighter',null,'trojanhorse','woodfolk',state=>{state.tiles[1].level=3;state.tiles[1].type=2;}).s.battle;
  assert.equal(trojan.landHP,30);assert.equal(trojan.won,true);
  const patron=revolt(null,null,'fighter','goblin',(state,card)=>{
    Object.assign(state.tiles[8],{owner:1,type:2,unit:{id:card('borgess'),hp:30}});
  }).s.battle;
  assert.deepEqual(patron.startHP,[60,50]);
  const revoltBooks={
    revoltAliciaEntry:'fighter:2 goblin:4 skeleton:4 statue:4 phlogiston:4 redogre:1 aqualing:2 blueogre:1 wallofice:2 greenogre:1 squirrine:2 wallofstone:2 blitzraven:4 yellowogre:1 chainmail:2 mace:2 growthbody:2 holyword1:2 holyword3:2 holyword6:2 manna:2 windofhope:2',
    revoltGenSerious:'skeleton:2 gascloud:3 gladiator:2 kingvaran:2 minotaur:3 phlogiston:3 blitzraven:2 cornfolk:3 griffon:2 spectre:2 yellowogre:3 battleaxe:4 chainmail:3 magmahammer:2 scalearmor:3 growthbody:2 holyword1:2 holyword6:3 magicbolt:2 shatter:2',
    revoltYumaFellowship:'fighter:2 goblin:4 statue:4 amazon:4 aqualing:2 lizardman:3 wallofice:2 greenogre:3 squirrine:3 wallofstone:2 chainmail:3 longsword:2 mace:3 sparkball:1 fly:3 holyword6:3 manna:3 windofhope:3',
    revoltYumaResolve:'fighter:3 amazon:2 aqualing:3 gianteel:2 lizardman:3 wallofice:2 greenogre:2 rocktroll:2 squirrine:3 wallofstone:3 woodfolk:3 buckler:2 longsword:2 scalearmor:3 sparkball:2 stormspear:2 fly:2 holyword6:3 manna:2 shatter:2 windofhope:2',
    revoltYumaBonds:'ninja:2 amazon:2 gianteel:2 kingtortoise:1 lizardman:3 scylla:2 wallofice:2 dryad:3 greattusker:2 greenogre:2 squirrine:2 woodfolk:3 bindingwhip:2 scalearmor:2 sparkball:2 trident:2 wondercharm:2 blackout:2 earthshift:1 fatbody:2 fly:2 gift:2 holyword6:2 shatter:2 watershift:1',
    revoltSomniaSerenity:'borgess:4 creepingcoin:2 halfling:1 steamgear:1 trojanhorse:2 aqualing:2 blueogre:2 gelatinouswall:3 kingtortoise:2 megalodon:2 undine:4 yeti:2 forceanklet:2 ringofthesuccubus:2 stormshield:2 stormspear:2 trident:2 fly:2 foresight:2 freezecyclone:1 holyword3:2 reincarnation:3 squeeze:2 watershift:1',
    revoltTenetBelief:'giantnautilus:2 kaiserpenguin:2 triton:2 wallofice:2 gargoyle:2 sage:2 squirrine:2 wallofstone:2 breezespirit:2 cornfolk:2 knight:2 tornado:2 angelcape:4 goldenhammer:1 mace:2 magicshield:3 tearinghalo:1 escape:2 holybanishment:1 holyword3:2 liquidform:1 prophecy:2 purify:2 quintessence:2 rayoflaw:1 spiritwalk:2',
    revoltTenetPraise:'giantnautilus:2 hellgrammite:2 kaiserpenguin:2 triton:2 gargoyle:2 mummy:2 rocktroll:2 sage:2 breezespirit:2 knight:2 thunderspawn:2 tornado:2 angelcape:2 diamondarmor:2 goldenhammer:2 tearinghalo:2 trident:2 barrier:2 escape:2 fly:2 holybanishment:2 prophecy:2 purify:1 quintessence:2 rayoflaw:1 spiritwalk:2',
    revoltAliciaFreedom:'halfling:2 wonderwall:2 caitsith:2 firebeak:1 kingvaran:2 phoenix:1 amphibianwarrior:2 blueogre:2 gelatinouswall:1 kaiserpenguin:1 cactuswall:2 cockatrice:1 greattusker:1 woodfolk:2 centaur:2 gremlin:1 thunderspawn:1 yellowogre:2 battleaxe:2 drilllance:2 eaglerapier:2 platemail:2 spikedshield:2 wondercharm:2 drainmagic:2 foresight:2 holyword6:2 quintessence:1 relief:2 spartoi:1',
    revoltTenetPoverty:'gianteel:2 kingtortoise:2 triton:3 greattusker:3 woodfolk:3 caladrius:2 centaur:3 dhampir:2 knight:2 wyvern:2 armet:3 sparkball:2 spectresrobe:3 swordofpluck:4 blackout:1 escape:2 holybanishment:2 relief:2 speedpenalty:2 spiritwalk:2 wasteworld:3',
    revoltGoliganServant:'caitsith:2 domovikha:1 kingvaran:2 phoenix:2 redogre:2 giantnautilus:2 kingtortoise:2 lizardman:2 triton:2 breezespirit:2 centaur:2 knight:2 serpentfly:2 tornado:2 battleaxe:2 catapult:2 spectresrobe:2 spikedshield:2 trident:2 growthbody:2 pacifism:2 relief:2 speedpenalty:2 wasteworld:3 windofhope:2',
    revoltZenethPower:'baal:2 firedrake:2 phoenix:2 gianteel:2 lizardman:2 yeti:2 gargoyle:2 spittingcobra:2 woodfolk:2 centaur:2 gremlin:2 knight:2 angelcape:2 catapult:1 claymore:2 eaglerapier:2 platemail:2 trident:2 drainmagic:3 haste:3 insectswarm:1 magicbolt:4 relief:2 shatter:2',
    revoltYumaLove:'decoy:2 apsaras:3 fate:2 lilith:3 scylla:2 wallofice:2 dryad:3 dwarvenminer:2 grimalkin:2 sage:3 sakuya:2 chillingblast:2 neutralcloak:2 ragdoll:4 shadowblaze:2 sparkball:2 bindingmist:2 fatbody:4 holyword6:2 vitality:2 windofhope:2',
    revoltHypnaPetrify:'cockatrice:3 dragonzombie:2 dryad:2 gargoyle:2 glowhorn:2 healer:2 mudman:3 rocktroll:2 screamer:2 spittingcobra:2 woodfolk:3 batteringram:3 gelatinousarmor:2 magmashield:2 shadowblaze:4 bindingmist:2 earthshift:2 exile:2 magicalleap:2 manna:2 senility:1 turntothewall:3',
    revoltMoriAnnoying:'amphibianwarrior:2 gelatinouswall:2 kawahime:2 triton:2 undine:2 yeti:2 elvenarcher:1 greatnimbus:2 madharlequin:2 rokh:2 spectre:3 witch:2 angrymask:2 battleaxe:2 bindingwhip:1 gelatinousarmor:2 shadowblaze:2 squidmantle:2 blackout:2 disease:2 holyword6:2 liquidform:2 magicbolt:1 remoteswitch:2 shatter:2 spartoi:2',
    revoltSomniaScripture:'ironmonger:2 aquahorn:2 fate:2 hellgrammite:2 odontotyrannus:2 triton:2 yeti:2 dhampir:2 greatnimbus:2 gremlin:2 rokh:2 serpentfly:2 thunderspawn:2 chillingblast:2 forceanklet:2 gremlinseye:2 squidmantle:2 stormspear:2 trident:2 drainmagic:2 gift:2 holybanishment:2 holyword6:2 quintessence:2 sigiloffloat:2',
    revoltMoriCrazy:'amphibianwarrior:2 aquahorn:2 odontotyrannus:2 undine:2 yeti:2 breezespirit:2 elvenarcher:2 pulgasari:2 rokh:2 spectre:2 witch:2 battleaxe:2 bindingwhip:1 shadowblaze:2 spectresrobe:2 stormshield:2 stormspear:2 blackout:2 chariot:2 disease:2 freezecyclone:1 holyword6:2 liquidform:2 remoteswitch:2 shatter:2 spartoi:2',
    revoltHypnaBewitch:'greatfossil:1 thief:3 cockatrice:4 dragonzombie:4 dryad:3 greattusker:1 greenogre:1 mudman:4 rocktroll:1 woodfolk:1 bindingwhip:4 gelatinousarmor:1 magmashield:3 petrifystone:2 shadowblaze:1 sparkball:2 bindingmist:1 earthshift:2 exile:1 magicalleap:4 manna:2 poisonmind:3 senility:1',
    revoltTerrormireFireClaw:'shadowgeist:2 chimera:2 conjurer:3 creepingflame:2 fay:2 firebeak:2 firedrake:4 kingvaran:2 minotaur:4 shieldmaiden:4 armet:2 burningrod:2 claymore:3 gremlinseye:2 magmashield:2 blazesplash:1 drainmagic:2 fireshift:3 gift:2 holyword8:2 magicbolt:2',
    revoltGoliganSuppression:'ironmonger:2 burnacle:2 caitsith:2 domovikha:1 lonebeast:2 shieldmaiden:2 amphibianwarrior:2 aquahorn:2 odontotyrannus:2 triton:2 breezespirit:2 centaur:2 knight:2 rokh:2 angelcape:2 diamondarmor:2 sparkball:2 trident:2 wondercharm:2 chaospanic:2 fly:2 manna:2 mistyworld:3 relief:2 windofhope:2',
    revoltTerrormireFireStorm:'shadowgeist:2 chimera:2 conjurer:3 firebeak:2 firedrake:3 hellpyron:1 kingvaran:2 lavakin:2 minotaur:3 shieldmaiden:3 burningrod:2 claymore:3 eaglerapier:1 gremlinseye:2 magmashield:2 wondercharm:2 blazesplash:1 burninghail:1 drainmagic:2 energyfield:2 fireshift:3 holyword8:2 magicbolt:2 shatter:2',
    revoltMemenLame:'fate:2 gelatinouswall:2 kaiserpenguin:2 kawahime:2 triton:2 undine:2 dragonzombie:2 healer:1 lichenoid:2 mummy:3 screamer:2 tigerweta:2 angrymask:2 battleaxe:2 bindingwhip:1 gelatinousarmor:2 shadowblaze:2 squidmantle:2 chaospanic:2 fatbody:2 holyword1:2 insectswarm:1 magicbolt:1 magicshelter:2 plague:1 senility:2 sigilofshrink:2',
    revoltZenethInvasion:'decoy:2 knighterrant:2 pyromancer:3 volcanicdragon:1 gianteel:2 kaiserpenguin:2 lilith:2 nessie:2 duskdweller:2 rocktroll:2 woodfolk:2 gremlin:2 knight:2 boomerang:2 dragonorb:2 murasame:2 platemail:2 soulray:2 sphereshield:2 drainmagic:2 haste:2 magicbolt:2 relief:2 shininggeyser:2 windofhope:2',
    revoltKranissResurrection:'ammon:2 deathscythe:2 firebeak:2 lonebeast:2 mushussu:2 shieldmaiden:2 cactuswall:2 dwarvenminer:2 gargoyle:2 glowhorn:2 greattusker:2 greenogre:2 pixie:2 angrymask:1 burningrod:2 diamondarmor:3 drilllance:2 magmashield:2 burninghail:1 earthshift:1 fireshift:1 haste:2 magicalleap:2 quintessence:1 reincarnation:1 remission:2 revival:1 squeeze:2'
  };
  const revoltCatalog=ps2.createEdition('revolt');
  for(const [name,entries] of Object.entries(revoltBooks)){
    const deck=revoltCatalog.presets[name];
    assert.ok(revoltCatalog.validBook(deck),name);
    const counts={};
    for(const index of deck){
      const slug=revoltCatalog.cards[index].catalog.path.split('/').pop();
      counts[slug]=(counts[slug]||0)+1;
    }
    assert.deepEqual(counts,Object.fromEntries(entries.split(' ').map(pair=>{
      const [slug,n]=pair.split(':');
      return [slug,Number(n)];
    })));
  }
  const archive=require('../dist/cept-revolt-book-archive.js');
  const bySlug=new Map(revoltCatalog.cards.flatMap((c,id)=>!c.unlisted&&c.catalog?[[revoltCatalog.combo.key(c),id]]:[]));
  assert.equal(archive.length,75);
  assert.equal(new Set(archive.map(([, ,source])=>source)).size,75);
  const uneven=[],ready=[];
  for(const [character,name,source,recipe] of archive){
    assert.match(source,/^\d+-[a-z-]+#[a-z0-9-]+$/);
    const original=Object.entries(recipe).flatMap(([slug,n])=>{
      assert.ok(bySlug.has(slug),slug);
      assert.ok(n>=1&&n<=4,slug);
      return Array(n).fill(bySlug.get(slug));
    });
    if(original.length!==50)uneven.push(original.length);
    if(revoltCatalog.validBook(original)){
      ready.push(character+' · '+name);
      const sorted=original.slice().sort((a,b)=>a-b).join(',');
      assert.ok(Object.values(revoltCatalog.presets).some(deck=>deck.slice().sort((a,b)=>a-b).join(',')===sorted),source);
    }
  }
  assert.deepEqual(uneven.sort(),[48,49,49,49,51,51,52]);
  assert.equal(ready.length,63);
  assert.equal(archive.filter(([, , ,recipe])=>recipe.livinghelmet).length,3);
  {
    const shot=mode=>revolt('battleaxe',null,'goblin',mode).s.battle.strikes[0].effect;
    assert.equal(shot('ghostship'),'block');
    assert.equal(shot('rahab'),'hit');
    assert.equal(revolt(null,null,'tiamat','rahab').s.battle.strikes[0].effect,'block');
    for(const [dragon,element] of [['tiamat',0],['bahamut',1],['jormungandr',2],['typhon',3]]){
      const battle=revolt(null,null,dragon,'goblin').s;
      assert.equal(battle.tiles[1].type,element,dragon);
      assert.equal(battle.tiles[1].unit.id,bySlug.get(dragon));
    }
    for(const [attacker,material,form] of [['groundgear','skygear','androgear'],['skygear','groundgear','androgear'],['androgear','beastgear','gearion']]){
      const fusion=revolt(material,null,attacker,'goblin').s;
      assert.equal(fusion.tiles[1].unit.id,bySlug.get(form));
      assert.ok(!revoltCatalog.validBook([...revoltCatalog.presets.intro.slice(1),bySlug.get(form)]));
    }
    const boosted=revolt(null,null,'redogre','goblin',(s,id)=>{
      Object.assign(s.tiles[8],{owner:1,type:2,unit:{id:id('brontides'),hp:60}});
      Object.assign(s.tiles[9],{owner:1,type:0,unit:{id:id('redcap'),hp:40}});
    }).s.battle;
    assert.deepEqual([boosted.startHP[0],boosted.defendST],[CForRevolt('redogre').hp+10,CForRevolt('goblin').st+20]);
    function CForRevolt(name){return revoltCatalog.cards[bySlug.get(name)];}
    const shield=revolt('battleaxe',null,'fighter','goblin',s=>{s.tiles[1].unit.enchant='metalform';}).s.battle;
    assert.equal(shield.strikes[0].effect,'block');
    const muted=revolt('battleaxe',null,'fighter','seabonze').s.battle;
    assert.equal(muted.attackST,CForRevolt('fighter').st);
    const python=revolt(null,null,'python','goblin',(s)=>{s.players[0].cash=900;s.tiles[1].unit.st=40;s.tiles[1].unit.hp=15;}).s;
    assert.ok(python.battle.lines.some(line=>line.includes('침략 보너스 100G')));
    const raging=revolt('battleaxe',null,'valkyria','goblin').s;
    assert.equal(raging.tiles[1].unit.st,CForRevolt('valkyria').st+10);
    const R=revoltCatalog;
    function revoltUnit(s,at,name,owner,type=2,level=1,hp=CForRevolt(name).hp){
      Object.assign(s.tiles[at],{owner,type,level,unit:{id:bySlug.get(name),hp}});
    }
    function revoltCast(spell,setup){
      const s=R.start(2,2,5000,'revolt-original-watchpost'),p=s.players[0];
      Object.assign(p,{cash:600,hand:[bySlug.get(spell),bySlug.get('redogre')]});
      if(setup)setup(s);
      assert.ok(R.play(s,['cast',0]),spell);
      if(s.phase==='sacrifice')assert.ok(R.play(s,R.choices(s)[0]),spell);
      return s;
    }
    const portal=revoltCast('formportal',s=>{s.players[0].pos=1;});
    assert.deepEqual([portal.players[0].pos,portal.phase],[0,'land']);
    const lair=revoltCast('goblinslair',s=>{s.players[0].pos=1;});
    assert.equal(lair.tiles[1].unit.id,bySlug.get('goblin'));
    assert.deepEqual(lair.players[0].hand,[bySlug.get('goblinslair')]);
    const discord=revoltCast('discord',s=>{
      revoltUnit(s,1,'greenogre',0);revoltUnit(s,2,'greenogre',1);revoltUnit(s,3,'redogre',1);
    });
    assert.deepEqual([1,2,3].map(at=>discord.tiles[at].unit.id),['goblin','goblin','redogre'].map(n=>bySlug.get(n)));
    const flux=revoltCast('fluxion',s=>{s.players[1].cash=900;});
    const postCast=flux.players[0].cash;
    assert.ok(R.play(flux,['targetPlayer',1]));
    assert.deepEqual([flux.players[0].cash,flux.players[1].cash],[postCast+270,630]);
    const impact=revoltCast('suddenimpact',s=>{
      revoltUnit(s,1,'goblin',1,2,4);revoltUnit(s,2,'goblin',1,3,5);
    });
    assert.deepEqual(R.choices(impact),[['targetLand',1]]);
    assert.ok(R.play(impact,['targetLand',1]));
    assert.deepEqual([impact.tiles[1].level,impact.tiles[2].level],[3,5]);
    const thunder=revoltCast('thunderclap',s=>{
      revoltUnit(s,1,'gargoyle',1);revoltUnit(s,2,'goblin',1);
    });
    assert.deepEqual(R.choices(thunder),[['targetLand',1]]);
    assert.ok(R.play(thunder,['targetLand',1]));
    assert.equal(thunder.tiles[1].unit.hp,20);
    const quiet=revoltCast('quietude',s=>{s.players[1].hand=[bySlug.get('magicbolt')];});
    assert.ok(quiet.players.every(p=>p.status==='quietude'));
    quiet.phase='land';quiet.players[0].pos=0;
    assert.ok(R.play(quiet,['pass']));
    assert.deepEqual(R.choices(quiet),[['roll']]);
    const purge=revoltCast('rayofpurge',s=>{
      s.players[1].hand=['vitality','plague','magicbolt'].map(n=>bySlug.get(n));
    });
    assert.deepEqual(purge.players[1].hand,[bySlug.get('magicbolt')]);
    const immobilize=revoltCast('immobilize',s=>{revoltUnit(s,1,'goblin',0);s.players[0].pos=1;});
    assert.equal(immobilize.tiles[1].unit.enchant,'immobilize');
    immobilize.phase='land';
    assert.ok(!R.choices(immobilize).some(([action,at])=>action==='transfer'&&at===1));
    const steal=revoltCast('theft',s=>{s.players[1].hand=[bySlug.get('manna'),bySlug.get('goblin')];});
    assert.ok(R.play(steal,['targetPlayer',1]));
    assert.deepEqual(R.choices(steal),[['stealCard',0,bySlug.get('manna')]]);
    assert.ok(R.play(steal,R.choices(steal)[0]));
    assert.deepEqual(steal.players[1].hand,[bySlug.get('goblin')]);
    function castSynthesis(spell,catalyst,setup){
      return revoltCast(spell,s=>{
        s.players[0].hand=[bySlug.get(spell),bySlug.get(catalyst)];
        setup(s);
      });
    }
    for(const [catalyst,level] of [['redogre',4],['asteroid',1]]){
      const asteroid=castSynthesis('asteroid',catalyst,s=>revoltUnit(s,1,'goblin',1,0,5));
      assert.ok(R.play(asteroid,['targetLand',1]));
      assert.equal(asteroid.tiles[1].level,level);
    }
    const dis=castSynthesis('diselement','redogre',s=>{
      revoltUnit(s,1,'redogre',0,0);
      revoltUnit(s,2,'greenogre',1,2);s.tiles[2].unit.fatigued=true;
      s.players[0].book=[bySlug.get('manna')];
    });
    assert.deepEqual([dis.tiles[1].unit.enchant,dis.tiles[2].unit.enchant,dis.players[0].hand],
      [undefined,'antielement',[bySlug.get('manna')]]);
    const growth=revoltCast('dominantgrowth',s=>revoltUnit(s,1,'goblin',0,0,1,22));
    assert.ok(R.play(growth,['targetLand',1]));
    growth.players[0].pos=1;growth.phase='land';
    assert.ok(R.play(growth,['level',1,2]));
    assert.deepEqual([growth.tiles[1].unit.hp,growth.tiles[1].unit.mhp],[42,50]);
    const erosion=castSynthesis('erosion','manna',s=>{
      const q=s.players[1];q.hand=['goblin','goblin','redogre'].map(n=>bySlug.get(n));
    });
    assert.deepEqual(erosion.players[1].hand,[bySlug.get('redogre')]);
    const growthIds=[1,2,3,6,7];
    const fixed=revoltCast('flatland',s=>{for(const at of growthIds)revoltUnit(s,at,'goblin',0,0,2);});
    assert.ok(growthIds.every(at=>fixed.tiles[at].level===3));
    const recycled=revoltCast('flatland');
    assert.ok(recycled.players[0].book.includes(bySlug.get('flatland')));
    const assembled=revoltCast('assemblecards',s=>{
      s.players[0].hand=['assemblecards','redogre','blueogre','greenogre','yellowogre'].map(n=>bySlug.get(n));
    });
    assert.equal(assembled.players[0].cash,1100-CForRevolt('assemblecards').cost);
    const line=revoltCast('longline',s=>{for(const at of [1,2,3,4])revoltUnit(s,at,'goblin',0);});
    assert.equal(line.players[0].cash,1100-CForRevolt('longline').cost);
    const army=revoltCast('tinyarmy',s=>{for(const at of growthIds)revoltUnit(s,at,'goblin',0);});
    assert.ok(growthIds.every(at=>army.tiles[at].unit.mhp===40&&army.tiles[at].unit.hp===40));
    assert.equal(army.players[0].cash,1100-CForRevolt('tinyarmy').cost);
    const tyranny=revoltCast('tyranny',s=>{revoltUnit(s,1,'goblin',0);revoltUnit(s,2,'gargoyle',1);});
    assert.deepEqual([tyranny.tiles[1].unit.enchant,tyranny.tiles[2].unit.enchant],['paralysis',undefined]);
    const morph=revoltCast('metamorphosis',s=>{
      const gear=bySlug.get('mace');
      s.players[0].book=[gear];s.players[1].hand=[bySlug.get('goblin'),gear];s.players[1].book=[gear,gear];
    });
    assert.ok(R.play(morph,['targetPlayer',1]));
    assert.deepEqual(R.choices(morph),[['metamorphCard',1,bySlug.get('mace')]]);
    assert.ok(R.play(morph,R.choices(morph)[0]));
    const word=bySlug.get('holyword6');
    assert.deepEqual([morph.players[0].book,morph.players[1].book,morph.players[1].hand],[[word],[word,word],[bySlug.get('goblin'),word]]);
    const sneak=revoltCast('sneakhand',s=>{s.players[1].hand=['mace','chainmail'].map(n=>bySlug.get(n));});
    assert.ok(R.play(sneak,['targetPlayer',1])&&R.play(sneak,R.choices(sneak)[0]));
    assert.deepEqual(sneak.players[1].hand,[bySlug.get('chainmail')]);
    const exchange=revoltCast('exchange',s=>{revoltUnit(s,1,'goblin',0,0,3);revoltUnit(s,2,'goblin',1);});
    assert.deepEqual(R.choices(exchange),[['targetLand',1]]);
    assert.ok(R.play(exchange,['targetLand',1])&&R.play(exchange,R.choices(exchange)[0]));
    assert.deepEqual([exchange.tiles[1].unit.id,exchange.tiles[1].level,exchange.players[0].hand],[bySlug.get('redogre'),3,[bySlug.get('goblin')]]);
    console.log('Revolt synthesis, growth, three hidden rewards, recycling, private selection and owned exchange checked');
    const force=revoltCast('lifeforce',s=>{s.players[0].book=[bySlug.get('goblin')];});
    assert.ok(R.play(force,['targetPlayer',0]));
    const empowered=force.players[0],beforeMagic=empowered.cash;
    for(const name of ['redogre','mace'])assert.equal(R.price(empowered,CForRevolt(name),force),0);
    force.phase='spell';empowered.hand=[bySlug.get('manna')];
    assert.ok(R.play(force,['cast',0]));
    assert.deepEqual([empowered.cash,empowered.status,empowered.hand],[beforeMagic,undefined,[]]);
    const vigorous=revoltCast('hyperactive',s=>{
      revoltUnit(s,1,'goblin',0,0);s.tiles[1].unit.fatigued=true;s.players[0].pos=1;
    });
    assert.ok(R.play(vigorous,['targetLand',1]));
    assert.equal(vigorous.tiles[1].unit.enchantDeadline,10);
    vigorous.phase='land';
    assert.ok(R.play(vigorous,['level',1,2]));
    assert.equal(vigorous.tiles[1].unit.fatigued,undefined);
    for(let tick=2;tick<=10;tick++){
      vigorous.phase='land';vigorous.players[vigorous.turn].pos=0;
      assert.ok(R.play(vigorous,['pass']));
      while(vigorous.phase==='discard')assert.ok(R.play(vigorous,['discard',0]));
      assert.equal(vigorous.tiles[1].unit.enchant,tick<10?'hyperactive':undefined);
    }
    const uniform=revoltCast('uniformity',s=>{
      revoltUnit(s,1,'goblin',1,0);
      revoltUnit(s,2,'goblin',1,1,5);
    });
    assert.ok(R.play(uniform,['targetPlayer',1]));
    assert.deepEqual([1,2].map(at=>R.owedToll(uniform,uniform.tiles[at],0)),[200,200]);
    uniform.tiles[1].unit.enchant='peace';
    assert.equal(R.owedToll(uniform,uniform.tiles[1],0),0);
    const ground=revoltCast('homeground',s=>{
      for(const [at,name,type] of [[1,'redogre',1],[2,'blueogre',2],[3,'greenogre',3],[6,'yellowogre',0]])revoltUnit(s,at,name,0,type);
      revoltUnit(s,7,'blueogre',1,0);
    });
    assert.deepEqual([1,2,3,6,7].map(at=>ground.tiles[at].type),[0,1,2,3,0]);
    for(const full of [false,true]){
      const wild=revoltCast('senseofwild',s=>{
        s.players[0].book=[bySlug.get('redogre')];
        if(full)for(const [at,tile] of s.tiles.entries())if(R.territoryType(tile.type))revoltUnit(s,at,'goblin',1,tile.type);
      });
      assert.equal(wild.players[0].hand.filter(id=>id===bySlug.get('redogre')).length,full?2:1);
      assert.equal(wild.tiles.filter(t=>t.owner===0&&t.unit.id===bySlug.get('redogre')).length,full?0:1);
    }
    const cluster=revoltCast('clusterburst',s=>{
      revoltUnit(s,1,'goblin',1,0);revoltUnit(s,2,'goblin',0,1);revoltUnit(s,3,'blueogre',1,1);
    });
    assert.deepEqual([1,2,3].map(at=>cluster.tiles[at].unit.hp),[10,10,CForRevolt('blueogre').hp]);
    const retreat=revoltCast('fear',s=>{
      revoltUnit(s,1,'goblin',1,0);revoltUnit(s,2,'blueogre',1,1);
      s.players[1].hand=Array(10).fill(bySlug.get('manna'));
    });
    assert.ok(R.play(retreat,['targetPlayer',1]));
    assert.deepEqual([retreat.tiles[1].unit,retreat.players[1].hand.length,retreat.lastDestroyed],[null,10,bySlug.get('goblin')]);
    const subsidence=castSynthesis('subsidence','subsidence',s=>{
      revoltUnit(s,1,'goblin',0,0,4);revoltUnit(s,2,'goblin',0,0,2);
      revoltUnit(s,3,'goblin',1,1,3);
    });
    assert.deepEqual([1,2,3].map(at=>subsidence.tiles[at].level),[3,2,2]);
    console.log('Revolt Life Force consumption, timed vigor, fixed tolls, layout conversion, wild draw, plurality, Fear and Subsidence checked');
    const bounty=revoltCast('bountyhunt',s=>{revoltUnit(s,1,'goblin',0);s.players[0].pos=1;});
    assert.ok(R.play(bounty,['targetLand',1]));
    bounty.phase='land';
    assert.ok(!R.choices(bounty).some(([kind,at])=>at===1&&['transfer','exchange'].includes(kind)));
    const claimBounty=revolt('mace',null,'redogre','goblin',s=>{s.tiles[1].unit.enchant='bountyhunt';}).s.battle;
    const withoutWeapon=revolt(null,null,'redogre','goblin',s=>{s.tiles[1].unit.enchant='bountyhunt';}).s.battle;
    assert.ok(claimBounty.lines.some(line=>line.includes('현상 수배 · 300G')));
    assert.ok(!withoutWeapon.lines.some(line=>line.includes('현상 수배')));
    const unlock=revoltCast('release');
    assert.equal(unlock.players[0].enchantDeadline,8);
    revoltUnit(unlock,1,'oldwillow',0,0);
    unlock.players[0].hand=[bySlug.get('mace')];
    unlock.phase='defend';unlock.turn=1;unlock.battle={at:1,inv:bySlug.get('goblin'),atkItem:null,defItem:null};
    assert.ok(R.choices(unlock).some(([kind])=>kind==='equip'));
    delete unlock.players[0].status;
    assert.deepEqual(R.choices(unlock),[['bare']]);
    const reveal=revoltCast('clairvoyance',s=>{
      s.players[1].hand=['thunderclap','redogre','windofhope'].map(n=>bySlug.get(n));
    });
    const beforeReveal=reveal.players[0].cash,drawing=reveal.players[1].hand.slice();
    assert.ok(R.play(reveal,['targetPlayer',1]));
    const engineRoom=require('../dist/cept-room-state');
    assert.deepEqual(engineRoom.view(R,reveal,0).game.clairvoyance.cards,drawing);
    assert.equal(engineRoom.view(R,reveal,1).game.clairvoyance,undefined);
    assert.deepEqual(engineRoom.view(R,reveal,1).choices,[]);
    assert.equal(reveal.players[0].cash,beforeReveal+Math.floor((CForRevolt('thunderclap').cost+CForRevolt('windofhope').cost)/2));
    assert.ok(R.play(reveal,R.choices(reveal)[0]));
    assert.equal(reveal.clairvoyance,undefined);
    const thrust=revoltCast('thrustblow',s=>{revoltUnit(s,1,'goblin',1);revoltUnit(s,16,'goblin',0);});
    assert.ok(R.play(thrust,['targetLand',1]));
    assert.deepEqual(R.choices(thrust),[['teleTo',2]]);
    assert.ok(R.play(thrust,['teleTo',2]));
    assert.deepEqual([thrust.phase,thrust.tiles[1].unit,thrust.tiles[2].owner],[ 'roll',null,1 ]);
    const outrage=revoltCast('outrage',s=>{
      revoltUnit(s,1,'redogre',1,0);revoltUnit(s,2,'goblin',0,0,1,5);revoltUnit(s,16,'goblin',1);
    });
    assert.ok(R.play(outrage,['targetLand',1]));
    assert.deepEqual(R.choices(outrage),[['teleTo',2]]);
    assert.ok(R.play(outrage,['teleTo',2]));
    assert.equal(R.actor(outrage),1);
    assert.ok(R.play(outrage,['bare']));
    assert.equal(R.actor(outrage),0);
    assert.ok(R.play(outrage,['bare'])&&R.play(outrage,['continue']));
    assert.deepEqual([outrage.phase,outrage.turn,outrage.tiles[2].owner],['roll',0,1]);
    const temptation=revoltCast('temptation',s=>{
      revoltUnit(s,1,'fate',1,1);
      s.tiles[1].unit.fatigued=true;s.players[0].book=[bySlug.get('manna')];
    });
    const afterPrice=temptation.players[0].cash;
    assert.ok(R.play(temptation,['targetLand',1]));
    assert.deepEqual([temptation.phase,temptation.players[0].cash,temptation.players[0].hand.at(-1),temptation.tiles[1].unit.fatigued],
      ['roll',afterPrice,bySlug.get('manna'),true]);
    assert.equal(R.cards.filter(card=>!card.unlisted&&card.kind==='spell'&&card.catalogOnly).length,0);
    console.log('All 133 Revolt spells have engine effects, including Bounty, Release, selective private reveals and forced transfers');
    const levers=revoltCast('asteroid',s=>{revoltUnit(s,1,'barong',1,2,3);});
    assert.deepEqual(R.choices(levers),[['fizzle']]);
    const alchemy=revoltCast('manna',s=>{revoltUnit(s,1,'archchemic',0);});
    assert.equal(R.elementCost(alchemy.tiles[1]),50);
    alchemy.tiles[1].unit.enchant='paralysis';
    assert.equal(R.elementCost(alchemy.tiles[1]),300);
    const armor=revolt(null,'chainmail','redogre','aquaduke').s.battle;
    assert.equal(armor.strikes[0].effect,'block');
    const sludge=revolt(null,'catapult','redogre','sludgetitan',s=>{s.tiles[1].unit.hp--;}).s.battle;
    assert.ok(sludge.lines.some(line=>line.includes('최대 HP 상태가 아니어서 파괴')));
    const shock=revolt(null,null,'shocker','blueogre').s;
    assert.equal(shock.tiles[1].unit.fatigued,true);
    const growthWithDuke=revolt('mace',null,'flameduke','goblin').s;
    assert.ok(growthWithDuke.players[0].book.includes(bySlug.get('mace')));
    const duchess=revolt(null,'petrifystone','sylvanduchess','blueogre').s.battle;
    assert.ok(duchess.lines.some(line=>line.includes('파괴')));
    const tracer=revolt(null,null,'nebiros','goblin',(s,id)=>{
      s.players[0].book=Array(5).fill(id('manna'));
    }).s;
    assert.equal(tracer.players[0].hand.length,5);
    const onHitRandom=Math.random;
    try{
      Math.random=()=>0;
      const slayer=revolt(null,null,'unnameable','goblin',(s,id)=>{
        Object.assign(s.tiles[1].unit,{st:0,hp:100,mhp:100});
        s.players[1].book=[id('redogre'),id('goblin')];
      }).s;
      assert.equal(slayer.battle.won,true);
      assert.deepEqual(slayer.players[1].book,[bySlug.get('redogre')]);
    }finally{Math.random=onHitRandom;}
    const normalMove=R.start(2,2,5000,'revolt-original-watchpost');
    revoltUnit(normalMove,1,'powdereater',0,3);
    normalMove.players[0].pos=1;normalMove.phase='land';
    assert.ok(R.play(normalMove,['transfer',1,2]));
    assert.equal(normalMove.tiles[1].owner,0);
    const forcedMove=revoltCast('thrustblow',s=>{revoltUnit(s,1,'powdereater',1,3);revoltUnit(s,16,'goblin',0);});
    assert.ok(R.play(forcedMove,['targetLand',1])&&R.play(forcedMove,['teleTo',2]));
    assert.equal(forcedMove.tiles[1].owner,-1);
    function actSecret(name,configure){
      const s=R.start(2,2,5000,'revolt-original-watchpost');
      revoltUnit(s,1,name,0,2);Object.assign(s.players[0],{pos:1,cash:500,hand:[]});
      if(configure)configure(s);
      assert.ok(R.play(s,['secretArt',1]),name);
      return s;
    }
    const clearAll=actSecret('sharazad',s=>{s.players[0].status='release';s.players[1].status='uniformity';});
    assert.ok(clearAll.players.every(p=>!p.status));
    const cursed=actSecret('nilvana',s=>{
      revoltUnit(s,2,'blueogre',1,1);s.tiles[2].unit.enchant='greed';
      revoltUnit(s,3,'greenogre',1,2);
    });
    assert.deepEqual([cursed.tiles[2].unit.hp,cursed.tiles[3].unit.hp],[CForRevolt('blueogre').hp-20,CForRevolt('greenogre').hp]);
    const mimic=actSecret('shapeshifter',s=>{revoltUnit(s,2,'goblin',1);s.tiles[1].level=3;});
    assert.ok(R.play(mimic,['secretLand',2]));
    assert.deepEqual([mimic.tiles[1].owner,mimic.tiles[1].level,mimic.tiles[1].unit.id],[0,3,bySlug.get('goblin')]);
    const stone=actSecret('stonejizo',s=>revoltUnit(s,2,'goblin',1,3,3));
    assert.ok(R.play(stone,['secretLand',2]));
    assert.deepEqual([stone.tiles[1].unit,stone.tiles[2].type,stone.tiles[2].level],[null,'복합',3]);
    const vanish=actSecret('aeroduchess',s=>revoltUnit(s,2,'greenogre',1,2,1,22));
    assert.ok(R.play(vanish,['secretLand',2]));
    assert.deepEqual([vanish.tiles[2].unit.hp,vanish.tiles[2].unit.mhp],[12,CForRevolt('greenogre').hp-10]);
    const handShift=actSecret('cloudgizmo',s=>{
      s.players[1].hand=[bySlug.get('mace'),bySlug.get('goblin')];s.players[1].book=[bySlug.get('manna')];
    });
    assert.ok(R.play(handShift,['secretPlayer',1]));
    assert.equal(engineRoom.view(R,handShift,0).choices.length,2);
    assert.deepEqual(engineRoom.view(R,handShift,1).choices,[]);
    assert.ok(R.play(handShift,['wormDiscard',0]));
    assert.deepEqual([handShift.phase,handShift.turn,handShift.players[0].cash,handShift.players[1].hand],['roll',0,480,[bySlug.get('goblin'),bySlug.get('manna')]]);
    for(const [name,next] of [['hippocampus','kelpie'],['swordprincess','armedprincess'],['sylph','garuda'],['brancharmy','mudman']]){
      const evolved=actSecret(name);
      assert.equal(evolved.tiles[1].unit.id,bySlug.get(next),name);
      assert.equal(evolved.phase,'roll');
    }
    const makara=actSecret('makara');
    assert.deepEqual([makara.tiles[1].type,makara.tiles[1].unit.fatigued],[1,undefined]);
    const glove=revolt('livingglove',null,'redogre','goblin',s=>{
      revoltUnit(s,2,'redogre',0,0);revoltUnit(s,3,'blueogre',0,1);
    }).s.battle;
    assert.equal(glove.attackST,CForRevolt('redogre').st+10);
    const bareGlove=revolt(null,null,'livingglove','redogre',s=>{
      revoltUnit(s,2,'redogre',0,0);revoltUnit(s,3,'blueogre',0,1);
    }).s.battle;
    assert.deepEqual([bareGlove.attackST,bareGlove.startHP[0]],[15,15]);
    const bomb=revolt(null,null,'redogre','livingbomb',s=>{s.tiles[1].unit.hp=20;s.tiles[1].unit.st=0;}).s;
    assert.deepEqual(bomb.battle.finalHP,[CForRevolt('redogre').hp,0],'destroyed bomb does not detonate');
    const explosion=revolt(null,'livingbomb','goblin','goblin',s=>{
      s.tiles[1].unit.hp=10;
      s.tiles[1].unit.mhp=10;
    }).s;
    assert.deepEqual(explosion.battle.finalHP,[0,0]);
    const amulet=revolt(null,'livingamulet','redogre','livingamulet').s;
    assert.equal(amulet.tiles[1].unit.id,bySlug.get('livingamulet'));
    const armed=revolt('mace',null,'redogre','livingamulet').s;
    assert.notEqual(armed.tiles[1].unit?.id,bySlug.get('livingamulet'));
    const hare=revolt(null,null,'lunatichare','statue').s;
    assert.equal(hare.battle.won,true);
    const spores=revolt(null,null,'goblin','mycoron').s;
    assert.equal(spores.tiles.filter(t=>t.owner===1&&t.unit?.id===bySlug.get('mycoron')).length,2);
    const pile=revolt(null,null,'goblin','mycoron',s=>{s.tiles[1].unit.hp=10;}).s;
    assert.equal(pile.tiles.filter(t=>t.owner===1&&t.unit?.id===bySlug.get('mycoron')).length,0);
    const bookAttack=actSecret('coatlicue',s=>{
      s.players[1].book=[bySlug.get('goblin'),bySlug.get('manna')];
      s.players[1].hand=[bySlug.get('mace')];
    });
    assert.ok(R.play(bookAttack,['secretPlayer',1]));
    assert.deepEqual([bookAttack.players[1].book,bookAttack.players[1].hand,bookAttack.players[0].cash],[[bySlug.get('goblin')],[bySlug.get('mace')],450]);
    const slowDie=actSecret('swampspawn');
    assert.ok(R.play(slowDie,['secretPlayer',0]));
    assert.deepEqual([slowDie.players[0].diceLimitRolls,slowDie.players[0].status],[1,'slow']);
    assert.ok(R.play(slowDie,['roll']));
    assert.ok(slowDie.die>=1&&slowDie.die<=3);
    assert.equal(slowDie.players[0].diceLimitRolls,undefined);
    for(const [name,material,st,hp] of [['deadwarlord','greenogre',60,60],['werebear','greenogre',50,50],['martialmonk','mace',60,40],['samhain','bindingmist',40,40]]){
      const id=bySlug.get(name),resource=bySlug.get(material);
      assert.deepEqual(R.synthesizedUnit(id,resource),{id,st,hp,mhp:hp},name);
      const summons=R.start(2,2,5000,'revolt-original-watchpost');
      Object.assign(summons.players[0],{pos:1,cash:500,hand:[resource,id]});
      summons.phase='land';summons.tiles[1].type=CForRevolt(name).element;
      assert.ok(R.play(summons,['summon',1])&&R.play(summons,['sacrifice',0]),name);
      assert.deepEqual(summons.tiles[1].unit,{id,st,hp,mhp:hp,...(CForRevolt(name).vigorous?{}:{fatigued:true})},name);
      assert.equal(summons.players[0].hand.length,0);
    }
    assert.equal(R.synthesizedUnit(bySlug.get('pyroculus'),bySlug.get('manna')).id,bySlug.get('hellpyron'));
    assert.equal(R.synthesizedUnit(bySlug.get('pyroculus'),bySlug.get('magicbolt')).id,bySlug.get('hellpyron'));
    assert.equal(R.synthesizedUnit(bySlug.get('scolopendra'),bySlug.get('blueogre')).id,bySlug.get('deepseadragon'));
    assert.equal(R.synthesizedUnit(bySlug.get('id'),bySlug.get('gargoyle')).id,bySlug.get('gargoyle'));
    assert.equal(R.synthesizedUnit(bySlug.get('id'),bySlug.get('mace')).id,bySlug.get('id'));
    const fusedInvasion=R.start(2,2,5000,'revolt-original-watchpost');
    Object.assign(fusedInvasion.players[0],{pos:1,cash:500,hand:[bySlug.get('martialmonk'),bySlug.get('mace')]});
    fusedInvasion.players[1].hand=[];
    revoltUnit(fusedInvasion,1,'goblin',1,2);
    revoltUnit(fusedInvasion,2,'deadwarlord',0,0);
    fusedInvasion.phase='land';
    assert.ok(R.play(fusedInvasion,['invade',0])&&R.play(fusedInvasion,['sacrifice',1]));
    assert.deepEqual([fusedInvasion.battle.invUnit.st,fusedInvasion.battle.invUnit.hp],[60,40]);
    assert.ok(R.play(fusedInvasion,['bare'])&&R.play(fusedInvasion,['bare']));
    assert.equal(fusedInvasion.battle.attackST,70);
    assert.deepEqual([fusedInvasion.tiles[1].unit.st,fusedInvasion.tiles[1].unit.mhp],[60,40]);
    const reaper=revolt(null,null,'samhain','redogre',s=>{s.tiles[1].unit.st=0;}).s;
    assert.equal(reaper.tiles[1].unit.mhp,CForRevolt('redogre').hp-CForRevolt('samhain').st);
    const carried=actSecret('sleipnir',s=>{
      revoltUnit(s,2,'blueogre',0,1);
      s.tiles[2].unit.fatigued=true;
    });
    assert.ok(R.play(carried,['secretLand',2]));
    assert.equal(carried.phase,'teleMove');
    assert.ok(R.play(carried,['teleTo',3]));
    assert.deepEqual([carried.phase,carried.players[0].cash,carried.tiles[2].unit,carried.tiles[3].unit.id],['roll',440,null,bySlug.get('blueogre')]);
    const leeched=actSecret('deathleech',s=>{
      revoltUnit(s,2,'blueogre',1,1,3,20);s.tiles[2].unit.fatigued=true;
      revoltUnit(s,3,'redogre',1,0,1,30);
    });
    assert.deepEqual(R.choices(leeched).filter(([k])=>k==='secretLand'),[['secretLand',2]]);
    assert.ok(R.play(leeched,['secretLand',2]));
    assert.deepEqual([leeched.tiles[1].unit,leeched.tiles[2].owner,leeched.tiles[2].level,leeched.tiles[2].unit.id],[null,0,3,bySlug.get('deathleech')]);
    const doom=actSecret('doomdevourer');
    assert.deepEqual([doom.players[0].cash,doom.tiles[1].unit.st,doom.tiles[1].unit.mhp],[560,20,20]);
    doom.players[0].word=3;
    assert.ok(R.play(doom,['roll']));
    assert.deepEqual([doom.tiles[1].unit.st,doom.tiles[1].unit.mhp],[30,30]);
    const lap=R.start(2,2,5000,'revolt-original-watchpost');
    revoltUnit(lap,5,'mosstitan',0,2,1,50);lap.tiles[5].unit.mhp=80;
    revoltUnit(lap,6,'mosstitan',0,2,1,30);
    Object.assign(lap.players[0],{pos:11,previous:10,dir:1,word:1,flags:[0,4]});
    lap.phase='roll';
    assert.ok(R.play(lap,['roll']));
    assert.deepEqual([lap.players[0].lap,lap.tiles[5].unit.mhp,lap.tiles[5].unit.hp,lap.tiles[6].unit.mhp,lap.tiles[6].unit.hp],[1,30,30,40,40]);
    const rune=actSecret('runeadept',s=>{
      s.players[0].hand=['magicbolt','manna','bindingmist','goblin'].map(n=>bySlug.get(n));
      revoltUnit(s,2,'blueogre',1,1,1,40);
    });
    assert.equal(rune.phase,'runeHand');
    assert.deepEqual(R.choices(rune),[['runeCard',0,bySlug.get('magicbolt')],['runeCard',1,bySlug.get('manna')]]);
    assert.ok(R.play(rune,R.choices(rune)[0])&&R.play(rune,['targetLand',2]));
    assert.deepEqual([rune.phase,rune.players[0].cash,rune.tiles[2].unit.hp,rune.players[0].hand.length],['roll',400,20,4]);
    const lemures=actSecret('lemures',s=>{
      s.players[1].hand=['shatter','goblin','mace'].map(n=>bySlug.get(n));
    });
    assert.ok(R.play(lemures,['secretPlayer',1]));
    const privateExchange=engineRoom.view(R,lemures,0),opponentExchange=engineRoom.view(R,lemures,1);
    assert.deepEqual(privateExchange.choices,[['lemuresCard',1,bySlug.get('goblin')]]);
    assert.deepEqual(privateExchange.game.players[1].hand,[]);
    assert.deepEqual(opponentExchange.choices,[]);
    assert.ok(R.play(lemures,privateExchange.choices[0]));
    assert.deepEqual([lemures.phase,lemures.players[0].cash,lemures.tiles[1].unit,lemures.players[0].hand,lemures.players[1].hand],
      ['roll',450,null,[bySlug.get('goblin')],['shatter','lemures','mace'].map(n=>bySlug.get(n))]);
    const spread=revoltCast('bindingmist',s=>{
      s.teams=[0,1,1,0];s.players.push(structuredClone(s.players[0]),structuredClone(s.players[1]));
      revoltUnit(s,1,'enchantress',1,3);
      revoltUnit(s,2,'blueogre',1,1);revoltUnit(s,3,'greenogre',2,2);
      revoltUnit(s,5,'redogre',0,0);revoltUnit(s,6,'goblin',3,0);
    });
    assert.ok(R.play(spread,['targetLand',1]));
    assert.deepEqual([1,2,3,5,6].map(at=>spread.tiles[at].unit.enchant),['paralysis','paralysis','paralysis',undefined,undefined]);
    assert.equal(spread.tiles[1].unit.fatigued,true);
    console.log('Revolt living equipment, secret moves, lap growth, synthesis, private hand exchange and alliance enchantment checked');



    console.log('Revolt book archive unlocked five decks, gear fusion, dragon land shifts, neutralization thresholds and eleven spells checked');
  }
  const helmet=revolt('livinghelmet','livingarmor','fighter','fighter').s.battle;
  assert.deepEqual([helmet.attackST,helmet.startHP[0],helmet.startHP[1]],[60,70,80]);
  const living=revolt(null,null,'livingarmor','fighter').s.battle;
  assert.equal(living.attackST,50);
  const deployed=(element,name,owner=0)=>(state,id)=>{
    Object.assign(state.tiles[8],{owner,type:element,unit:{id:id(name),hp:40}});
  };
  assert.equal(revolt(null,null,'rokh','fighter').s.battle.attackST,40);
  assert.equal(revolt(null,null,'rokh','fighter',deployed(1,'blueogre',1)).s.battle.attackST,70);
  {
    const fireBoost=revolt(null,null,'redogre','greenogre',deployed(0,'hellpyron')).s.battle;
    assert.deepEqual([fireBoost.attackST,fireBoost.defendST],[50,50]);
    assert.equal(revolt(null,null,'redogre','hellpyron').s.battle.attackST,40);
    const windBoost=revolt(null,null,'blueogre','yellowogre',deployed(3,'lordofbane')).s.battle;
    assert.deepEqual([windBoost.attackST,windBoost.defendST],[50,50]);
    const roundBonus=revolt(null,null,'lavakin','goblin',s=>{s.round=12;}).s.battle;
    assert.deepEqual([roundBonus.attackST,roundBonus.startHP[0]],[48,42]);
    const older=revolt(null,null,'lavakin','goblin',s=>{s.round=70;}).s.battle;
    assert.deepEqual([older.attackST,older.startHP[0]],[0,100]);
    const kirin=revolt(null,null,'kirin','goblin',deployed(1,'blueogre')).s.battle;
    assert.deepEqual([kirin.attackST,kirin.startHP[0]],[40,60]);
    const defenseBoost=revolt(null,null,'goblin','fighter',deployed(1,'otohime')).s.battle;
    assert.deepEqual(defenseBoost.startHP,[30,50]);
    const aging=revolt(null,null,'goblin','otohime',s=>{s.tiles[1].unit.st=10;}).s;
    assert.ok(aging.battle.lines.some(line=>line.includes('노쇠')));
    const shell=s=>{s.tiles[1].unit.enchant='magicshelter';s.tiles[1].unit.hp=80;s.tiles[1].unit.mhp=80;};
    assert.equal(revolt('batteringram',null,'goblin','fighter',shell).s.battle.won,true);
    const pyro=revolt(null,null,'goblin','pyromancer').s;
    assert.match(pyro.battle.lines.join(' '),/기본 ST 20/);
    assert.deepEqual([pyro.tiles[1].unit.st,pyro.tiles[1].unit.mhp,pyro.tiles[1].unit.hp],[20,30,30]);
    const pyroBlocked=revolt(null,'buckler','goblin','pyromancer').s;
    assert.equal(pyroBlocked.tiles[1].unit.mhp,undefined);
    const pyroScroll=revolt('sparkball',null,'goblin','pyromancer').s;
    assert.equal(pyroScroll.tiles[1].unit.mhp,undefined);
    const knightReflect=revolt(null,null,'fighter','knighterrant').s.battle;
    assert.equal(knightReflect.strikes[0].effect,'reflect');
    assert.deepEqual(knightReflect.strikes[0].hp,[20,30]);
    assert.equal(revolt('murasame',null,'fighter','knighterrant').s.battle.won,true);
    const armed=revolt('sparkball',null,'fighter','armedpaladin',(s,id)=>{
      Object.assign(s.tiles[8],{owner:1,type:2,unit:{id:id('greenogre'),hp:40}});
    }).s.battle;
    assert.equal(armed.strikes[0].effect,'block');
    assert.equal(armed.defendST,20);
    const fireEarth=revolt(null,null,'mushussu','greenogre',deployed(2,'woodfolk')).s.battle;
    assert.deepEqual([fireEarth.attackST,fireEarth.startHP[0]],[60,60]);
    assert.equal(fireEarth.won,true);
    const rooted=revolt(null,null,'goblin','fighter',s=>{
      s.tiles[1].unit.enchant='thornfetter';s.tiles[1].unit.hp=40;
    }).s;
    assert.equal(rooted.tiles[1].unit.hp,20);
    const handheldPyro=fight('3ds','goblin','pyromancer',null,null).s;
    assert.deepEqual([handheldPyro.tiles[1].unit.st,handheldPyro.tiles[1].unit.mhp],[20,30]);
    const barrier=s=>{s.tiles[1].unit.enchant='energyfield';};
    const ward=revolt(null,null,'fighter','goblin',barrier).s;
    assert.equal(ward.battle.strikes[0].effect,'block');
    assert.deepEqual(ward.players.map(q=>q.cash),[1100,900]);
    assert.equal(ward.tiles[1].unit.enchant,'energyfield');
    const scroll=revolt('sparkball',null,'fighter','goblin',barrier).s;
    assert.equal(scroll.battle.won,true);
    assert.deepEqual(scroll.players.map(q=>q.cash),[940,1000]);
    const pierced=revolt('murasame',null,'fighter','goblin',barrier).s;
    assert.equal(pierced.battle.won,true);
    const worldWard=revolt(null,null,'fighter','goblin',s=>{
      barrier(s);s.world={effect:'naturalworld',until:10};
    }).s;
    assert.equal(worldWard.battle.strikes[0].effect,'block');
    assert.deepEqual(worldWard.players.map(q=>q.cash),[1000,1000]);
  }
  const glow=revolt(null,null,'glowhorn','fighter',deployed(0,'redogre')).s.battle;
  assert.deepEqual([glow.attackST,glow.startHP[0]],[70,60]);
  assert.equal(revolt(null,null,'mudman','fighter',deployed(2,'woodfolk')).s.battle.startHP[0],45);
  const jester=(state,id)=>{
    Object.assign(state.tiles[8],{owner:0,type:3,unit:{id:id('madharlequin'),hp:40}});
    const at=ps2.createEdition('revolt').board(state).links[1].find(i=>i!==0&&i!==8);
    Object.assign(state.tiles[at],{owner:0,type:3,unit:{id:id('fighter'),hp:40}});
  };
  const cheered=revolt(null,null,'fighter','fighter',jester).s.battle;
  assert.deepEqual([cheered.attackST,cheered.startHP[0],cheered.defendST,cheered.startHP[1]],[60,60,40,40]);
  const silenced=revolt(null,null,'fighter','fighter',(state,id)=>{jester(state,id);state.tiles[8].unit.enchant='paralysis';}).s.battle;
  assert.deepEqual([silenced.attackST,silenced.startHP[0]],[40,40]);
  {
    for(const [i,{cards,hint}] of revoltCatalog.combo.revoltCombos.entries()){
      const book=revoltCatalog.practiceBook(i);
      assert.ok(revoltCatalog.validBook(book),hint);
      for(const slug of cards)assert.equal(book.filter(id=>id===bySlug.get(slug)).length,4,slug);
    }
    const guided=revoltCatalog.start(2,0,5000,'revolt-original-watchpost',revoltCatalog.practiceBook(0),undefined,3);
    const guidedHand=['mace','batteringram'].map(n=>bySlug.get(n));
    guided.players[0].hand=guidedHand;guided.players[0].cash=300;
    guided.players[1].hand=[];
    Object.assign(guided.tiles[3],{owner:1,type:0,level:3,unit:{id:bySlug.get('minotaur'),hp:80,mhp:80}});
    guided.phase='attack';
    guided.battle={at:3,inv:bySlug.get('cockatrice'),atkItem:null,defItem:null};
    assert.deepEqual(revoltCatalog.ai(guided),['equip',1]);
    assert.ok(revoltCatalog.play(guided,['equip',1])&&revoltCatalog.play(guided,['bare']));
    assert.ok(guided.battle.won);

    const ray=revolt('soulray','platemail','triton','goblin',(state,id)=>{
      state.players[0].book=[id('manna')];
    }).s;
    assert.equal(ray.battle.startHP[1]-ray.battle.strikes[0].hp[1],45);
    assert.ok(ray.players[0].hand.includes(bySlug.get('manna')));
    assert.ok(ray.players[0].hand.includes(bySlug.get('soulray')));
    assert.equal(revolt('sparkball','magussmirror','fighter','wonderwall').s.battle.strikes[0].effect,'reflect');
    assert.equal(revolt('longsword','buckler','goblin','caitsith').s.battle.strikes[0].effect,'block');
    const storm=revolt('stormcauser','platemail','sulfurousballoon','greattusker').s;
    assert.ok(storm.battle.lines.some(line=>line.includes('40')&&line.includes('HP')));
    assert.equal(storm.tiles[1].unit,null);
    const frost=revolt('chillingblast','platemail','tetrarm','minotaur',deployed(1,'blueogre')).s.battle;
    assert.equal(frost.strikes.filter(x=>x.side===0).length,2);
    const doubles=revolt('twinspike','platemail','tetrarm','minotaur').s.battle;
    assert.equal(doubles.finalForms[1],bySlug.get('tetrarm'));
    assert.equal(doubles.strikes.filter(x=>x.side===0).length,2);
    assert.ok(doubles.won);
    const garment=revolt('spectresrobe','diamondarmor','tetrarm','minotaur').s.battle;
    assert.ok(garment.attackST>=30&&garment.attackST<=90);
    assert.ok(garment.strikes.length>=2);
    const saint=revolt('twinspike','platemail','saint','minotaur').s.battle;
    assert.equal(saint.won,false);
    assert.equal(saint.finalForms[1],bySlug.get('saint'));
    assert.ok(revolt(null,'platemail','saint','fighter').s.battle.won);
    const drop=revolt('necroscarab',null,'sulfurousballoon','ninja').s;
    assert.ok(drop.battle.won);
    assert.equal(drop.tiles[1].unit.id,bySlug.get('skeleton'));
    const unfused=revolt(null,null,'sulfurousballoon','ninja').s;
    assert.equal(unfused.tiles[1].unit,null);
    const fossil=revolt(null,null,'fighter','greatfossil').s;
    assert.equal(fossil.tiles[1].unit.id,bySlug.get('tyrannosaurus'));
    assert.ok(!fossil.battle.won);
    const pierce=revolt('mace',null,'nightmare','woodfolk',state=>{Object.assign(state.tiles[1],{type:2,level:3});}).s.battle;
    assert.equal(pierce.landHP,30);
    assert.ok(pierce.won);
    const ness=revolt(null,null,'nessie','fighter',state=>{Object.assign(state.tiles[1],{type:1,level:3});}).s.battle;
    assert.equal(ness.startHP[0],70);
    const invader=revolt(null,null,'devastator','goblin',state=>{state.tiles[1].level=3;}).s;
    assert.equal(invader.tiles[1].level,2);
    const collected=revolt(null,null,'soulcollector','goblin',state=>{state.destroyedCount=9;}).s.battle;
    assert.equal(collected.attackST,65);
    const beast=revolt(null,'platemail','lonebeast','goblin',(state,id)=>{
      const adjacent=revoltCatalog.board(state).links[1].find(at=>at!==0);
      Object.assign(state.tiles[adjacent],{owner:0,unit:{id:id('goblin'),hp:30}});
    }).s.battle;
    assert.equal(beast.startHP[0],60);
    assert.equal(beast.startHP[1]-beast.strikes[0].hp[1],30);
    const titan=revolt(null,null,'rocktitan','goblin').s.tiles[1].unit;
    assert.deepEqual([titan.st,titan.mhp,titan.hp],[60,60,60]);
    const dusk=revolt(null,null,'duskdweller','goblin').s.tiles[1].unit;
    assert.deepEqual([dusk.st,dusk.mhp,dusk.hp],[50,50,50]);
    const samuraiRandom=Math.random;
    try{
      Math.random=()=>.4;
      assert.ok(revolt(null,'platemail','samurai','fighter').s.battle.won);
      assert.ok(!revolt(null,'platemail','samurai','goblin').s.battle.won);
      Math.random=()=>.8;
      assert.ok(!revolt(null,'platemail','samurai','fighter').s.battle.won);
    }finally{Math.random=samuraiRandom;}
  }
  const dino=revolt(null,null,'odontotyrannus','fighter',deployed(3,'yellowogre')).s.battle;
  assert.deepEqual([dino.attackST,dino.startHP[0]],[70,60]);
  const eating=revolt('mace','chainmail','pulgasari','fighter').s;
  const mace=revoltCatalog.cards[bySlug.get('mace')];
  assert.equal(eating.battle.attackST,60+mace.st);
  assert.equal(eating.tiles[1].unit.mhp,50);
  const noMeal=revolt('mace',null,'pulgasari','fighter').s;
  assert.equal(noMeal.tiles[1].unit.mhp,undefined);
  const aqua=revolt(null,null,'blueogre','aquahorn').s.battle;
  const mist=revolt(null,null,'redogre','mistwing').s.battle;
  assert.deepEqual([aqua.strikes[0].effect,mist.strikes[0].effect],['block','block']);
  const dealt=({s})=>s.battle.startHP[1]-s.battle.strikes[0].hp[1];
  assert.equal(revolt(null,null,'fighter','caitsith').s.battle.strikes[0].effect,'block');
  const armedGoblin=revolt('longsword',null,'goblin','caitsith').s.battle;
  assert.equal(armedGoblin.attackST,50);
  assert.equal(armedGoblin.strikes[0].effect,'hit');
  assert.equal(revolt(null,null,'amphibianwarrior','goblin',state=>{state.tiles[1].type=3;}).s.battle.attackST,60);
  assert.equal(revolt(null,null,'amphibianwarrior','goblin',state=>{state.tiles[1].type=2;}).s.battle.attackST,40);
  for(const level of [2,3]){
    const battle=revolt(null,null,'apsaras','fighter',state=>{state.tiles[1].level=level;}).s.battle;
    assert.equal(battle.strikes.find(strike=>strike.side===1)?.effect,level===3?'block':'hit');
  }
  const flaming=revolt(null,null,'firedrake','minotaur',(state,id)=>{
    Object.assign(state.tiles[8],{owner:0,type:0,unit:{id:id('minotaur'),hp:40}});
  }).s.battle;
  assert.equal(flaming.attackST,40);
  const turned=revolt(null,'platemail','cockatrice','minotaur').s;
  assert.equal(revoltCatalog.combo.key(revoltCatalog.cards[turned.tiles[1].unit.id]),'wallofstone');
  assert.equal(turned.tiles[1].unit.hp,revoltCatalog.cards[turned.tiles[1].unit.id].hp);
  assert.ok(revolt('batteringram','platemail','cockatrice','minotaur').s.battle.won);
  const stocked=(state,id)=>{state.players[0].hand=[id('manna'),id('shatter'),id('escape')];};
  assert.equal(revolt(null,null,'lilith','fighter',stocked).s.battle.attackST,30);
  assert.equal(revolt(null,null,'baal','goblin',stocked).s.players[0].hand.length,2);
  assert.equal(revolt(null,'eaglerapier','baal','greattusker',stocked).s.players[0].hand.length,3);
  assert.equal(dealt(revolt(null,'chainmail','phlogiston','fighter')),45);
  assert.equal(dealt(revolt(null,'chainmail','phlogiston','fighter',s=>{s.tiles[1].unit.mhp=50;})),30);
  assert.equal(revolt(null,null,'goblin','aqualing').s.battle.strikes[0].effect,'block');
  assert.equal(dealt(revolt('sparkball',null,'goblin','aqualing')),30);
  assert.equal(revolt('fighter',null,'squirrine','fighter').s.battle.attackST,60);
  assert.equal(revolt('longsword',null,'fighter','cornfolk').s.players[1].cash,1200);
  const lap2=s=>{s.players[0].lap=1;};
  assert.equal(revolt(null,null,'amazon','fighter',lap2).s.players[1].cash,940);
  assert.equal(revolt('mace',null,'amazon','fighter',lap2).s.players[1].cash,1000);
  for(const [item,unit] of [['magmahammer','redogre'],['magmahammer','greenogre'],['stormspear','blueogre'],['stormspear','yellowogre']]){
    const result=revolt(item,'diamondarmor',unit,'fighter');
    assert.equal(result.s.battle.attackST,60);
    assert.equal(dealt(result),90);
    assert.equal(dealt(revolt(item,'diamondarmor','fighter','fighter')),60);
  }
  for(const size of [9,10]){
    const hand=(state,id)=>{state.players[1].hand.push(...Array(size).fill(id('manna')));};
    const phoenix=revolt(null,null,'fighter','phoenix',hand);
    assert.equal(phoenix.s.players[1].hand.length,10);
    assert.equal(phoenix.s.players[1].hand.some(id=>phoenix.C.combo.key(phoenix.C.cards[id])==='phoenix'),size===9);
    const fate=revolt('longsword',null,'fighter','fate',hand);
    assert.equal(fate.s.players[1].hand.length,10);
    assert.equal(fate.s.players[1].book.length,size===9?45:46);
  }
  const boomerang=revolt('boomerang',null,'fighter','fighter',(state,id)=>{
    state.players[0].hand.push(...Array(9).fill(id('manna')));
  });
  assert.equal(boomerang.s.players[0].hand.length,10);
  assert.ok(boomerang.s.players[0].hand.includes(boomerang.w));
  console.log('Revolt ten-card cap, discard, draws, forced return and battle recycling OK');
  const centaur=revolt('boomerang',null,'centaur','fighter');
  assert.equal(centaur.s.players[0].book[0],centaur.w);
  assert.ok(!centaur.s.players[0].hand.includes(centaur.w));
  const lance=revolt('drilllance',null,'fighter','greenogre',state=>{
    Object.assign(state.tiles[1],{level:4,type:2});
  }).s;
  assert.equal(lance.battle.landHP,40);
  assert.ok(lance.battle.won);
  const binding=revolt('bindingwhip','diamondarmor','fighter','fighter').s;
  assert.equal(binding.battle.strikes.length,1);
  assert.match(binding.battle.lines.join(' '),/마비/);
  assert.equal(binding.tiles[1].unit.enchant,'paralysis');
  assert.equal(dealt(revolt(null,'wondercharm','fighter','fighter')),8);
  assert.equal(dealt(revolt('sparkball','wondercharm','fighter','fighter')),40);
  assert.equal(revolt(null,null,'wyvern','greattusker').s.battle.strikes[0].effect,'block');
  assert.equal(dealt(revolt('sling',null,'fighter','greattusker')),50);
  const scylla=revolt('bindingwhip','diamondarmor','fighter','scylla');
  assert.equal(scylla.s.battle.strikes.length,2);
  assert.equal(scylla.s.tiles[1].unit.enchant,undefined);
  assert.match(scylla.s.battle.lines.join(' '),/스킬라.*통행료 무효/);
  assert.doesNotMatch(revolt(null,null,'fighter','scylla').s.battle.lines.join(' '),/스킬라.*통행료 무효/);
  assert.equal(revolt(null,null,'blueogre','cactuswall').s.battle.startHP[1],100);
  assert.equal(revolt(null,null,'redogre','cactuswall').s.battle.startHP[1],50);
  assert.equal(revolt(null,null,'fighter','cactuswall').s.tiles[1].unit.hp,50);
  const neighbor=revolt(null,null,'tigerweta','fighter',(state,id)=>{
    const at=revoltCatalog.board(state).links[1].find(j=>typeof state.tiles[j].type==='number');
    Object.assign(state.tiles[at],{owner:0,unit:{id:id('fighter'),hp:40}});
  }).s.battle;
  assert.deepEqual([neighbor.attackST,neighbor.startHP[0]],[50,60]);
  const terrain=type=>state=>Object.assign(state.tiles[1],{type,level:3});
  for(const type of [0,1,2,3,'복합'])assert.equal(revolt(null,null,'fighter','halfling',terrain(type)).s.battle.landHP,30);
  assert.equal(revolt(null,null,'fighter','halfling',terrain('모프')).s.battle.landHP,0);
  const mummy=revolt('battleaxe',null,'fighter','mummy',s=>{s.players[1].lap=2;});
  assert.equal(mummy.s.players[1].cash,1120);
  assert.equal(revolt(null,null,'fighter','creepingcoin').s.players[1].cash,1100);
  assert.equal(revolt(null,null,'goblin','creepingcoin').s.players[1].cash,1100);
  assert.equal(revolt(null,null,'fighter','gelatinouswall').s.players[1].cash,1200);
  assert.equal(revolt('tearinghalo',null,'fighter','gelatinouswall').s.players[1].cash,1000);
  assert.equal(revolt(null,'stormshield','fighter','blueogre').s.battle.strikes[0].effect,'block');
  assert.equal(dealt(revolt('sparkball','stormshield','fighter','blueogre')),40);
  assert.equal(dealt(revolt(null,'stormshield','fighter','greenogre')),40);
  const moon=revolt('moonscimitar','diamondarmor','fighter','fighter');
  assert.equal(moon.s.tiles[1].unit.enchant,'sleep');
  assert.equal(moon.C.toll(moon.s,moon.s.tiles[1]),0);
  const force=revolt(null,'forceanklet','fighter','fighter',(state,id)=>state.players[1].hand.push(id('goblin'),id('manna')));
  assert.equal(force.s.battle.startHP[1],60);
  const undine=revolt(null,null,'blueogre','undine',(state,id)=>{
    Object.assign(state.tiles[8],{owner:1,type:1,unit:{id:id('aqualing'),hp:30}});
    Object.assign(state.tiles[9],{owner:1,type:1,unit:{id:id('aqualing'),hp:30}});
  }).s.battle;
  assert.equal(undine.startHP[1],40);
  assert.equal(undine.strikes[0].effect,'block');
  const random=Math.random;
  try{
    Math.random=()=>.59;
    assert.ok(revolt(null,null,'yeti','redogre').s.battle.won);
    Math.random=()=>.6;
    assert.ok(!revolt(null,null,'yeti','redogre').s.battle.won);
  }finally{Math.random=random;}
  const ring=revolt('batteringram','ringofthesuccubus','blueogre','goblin',s=>{s.tiles[1].unit.hp=40;});
  assert.equal(ring.s.battle.strikes[0].side,1);
  assert.match(ring.s.battle.strikes[0].notes.join(' '),/상대 기본 ST 0/);
  assert.match(ring.s.battle.strikes[1].notes.join(' '),/30 피해/);
  const scrollRing=revolt('sparkball','ringofthesuccubus','blueogre','goblin');
  assert.match(scrollRing.s.battle.strikes[1].notes.join(' '),/40 피해/);
  assert.equal(dealt(revolt(null,'diamondarmor','knight','greenogre')),75);
  assert.equal(dealt(revolt(null,'diamondarmor','knight','fighter')),50);
  const triton=revolt('sparkball',null,'triton','cactuswall');
  assert.equal(dealt(triton),60);
  assert.equal(triton.s.players[0].book.length,44);
  assert.equal(revolt(null,null,'triton','cactuswall').s.players[0].book.length,45);
  const filled=revolt('boomerang',null,'triton','cactuswall',(state,id)=>{
    state.players[0].hand.push(...Array(8).fill(id('manna')));
  }).s;
  assert.equal(filled.players[0].hand.length,10);
  assert.match(filled.battle.lines.join(' '),/손패가 가득 차 돌아갈 수 없음/);
  assert.equal(revolt(null,null,'greenogre','dhampir').s.battle.strikes[0].effect,'block');
  assert.equal(dealt(revolt('swordofpluck','diamondarmor','fighter','greenogre')),110);
  assert.equal(dealt(revolt('swordofpluck','diamondarmor','scylla','greenogre')),70);
  assert.equal(revolt(null,'angelcape','gremlin','fighter').s.battle.startHP[1],80);
  assert.equal(revolt(null,'chainmail','gremlin','fighter').s.battle.startHP[1],40);
  const revoltSpike=revolt(null,'spikedshield','fighter','fighter').s.battle;
  assert.deepEqual(revoltSpike.strikes[0].hp,[20,20]);
  assert.equal(dealt(revolt('sparkball','spikedshield','fighter','fighter')),40);
  assert.equal(revolt('goldenhammer','diamondarmor','fighter','fighter').s.players[0].cash,1150);
  assert.equal(revolt('goldenhammer',null,'fighter','fighter').s.players[0].cash,950);
  assert.equal(revolt(null,'magussmirror','kaiserpenguin','fighter').s.battle.startHP[1],40);
  assert.equal(revolt(null,'chainmail','kaiserpenguin','fighter').s.battle.startHP[1],70);
  assert.equal(revolt(null,'fighter','kaiserpenguin','squirrine').s.battle.startHP[1],30);
  assert.equal(revolt(null,'magussmirror','kaiserpenguin','sage').s.battle.startHP[1],50);
  assert.equal(revolt('tearinghalo',null,'fighter','kaiserpenguin').s.battle.attackST,30);
  const gargoyle=revolt(null,'mace','blueogre','gargoyle').s.battle;
  assert.equal(gargoyle.defendST,70);assert.equal(gargoyle.strikes[0].side,1);
  assert.equal(revolt('mace',null,'gargoyle','fighter').s.battle.attackST,50);
  assert.equal(dealt(revolt('sparkball','diamondarmor','sage','fighter')),60);
  const hatch=revolt(null,null,'fighter','hellgrammite');
  assert.equal(hatch.C.combo.key(hatch.C.cards[hatch.s.tiles[1].unit.id]),'serpentfly');
  assert.equal(hatch.s.tiles[1].unit.hp,30);
  assert.ok(!hatch.s.battle.won);
  assert.equal(revolt(null,null,'fighter','serpentfly',terrain(1)).s.battle.landHP,30);
  const thunder=revolt(null,null,'thunderspawn','fighter',(state,id)=>{
    for(const at of [6,8])Object.assign(state.tiles[at],{owner:0,type:1,unit:{id:id('fighter'),hp:40}});
  }).s.battle;
  assert.equal(thunder.attackST,50);
  assert.equal(revolt(null,'goldengoose','fighter','goblin').s.players[1].cash,1210);
  assert.equal(revolt(null,'tombstone','fighter','goblin').s.players[1].hand.length,6);
  const emptyBook=revolt(null,'tombstone','fighter','goblin',state=>{
    Object.assign(state.players[1],{template:[],book:[]});
  }).s;
  assert.equal(emptyBook.players[1].hand.length,0);
  const plow=revolt('silverplow','chainmail','fighter','goblin',state=>{
    state.tiles[1].type=2;state.tiles[1].level=3;
  }).s;
  assert.equal(plow.tiles[1].level,4);
  assert.match(plow.battle.lines.join(' '),/영지 Lv\.4/);
  const brokenPlow=revolt('silverplow','claymore','goblin','fighter',state=>{
    state.tiles[1].level=3;Object.assign(state.tiles[1].unit,{hp:70,mhp:70});
  }).s;
  assert.equal(brokenPlow.tiles[1].level,3);
  assert.match(revolt('vorpalsword','chainmail','fighter','fighter').s.battle.strikes[0].notes.join(' '),/105 피해/);
  assert.deepEqual(revolt('tonfa','chainmail','goblin','fighter').s.battle.strikes.map(v=>v.side),[0,0,1]);
  assert.equal(revolt('murasame',null,'fighter','decoy').s.battle.won,true);
  assert.equal(revolt('murasame','sphereshield','goblin','fighter').s.battle.strikes[0].effect,'hit');
  const sphere=revolt(null,'sphereshield','fighter','fighter').s.battle;
  assert.equal(sphere.defendST,0);
  assert.equal(sphere.strikes[0].effect,'block');
  assert.equal(revolt('sparkball','sphereshield').s.battle.strikes[0].effect,'hit');
  assert.equal(revolt(null,'mirrorhoplon','fighter','fighter').s.battle.strikes[0].effect,'reflect');
  assert.equal(revolt('mace','mirrorhoplon','fighter','fighter').s.battle.strikes[0].effect,'hit');
  assert.equal(revolt(null,'mirrorhoplon','minotaur','migoal').s.battle.strikes[0].effect,'block');
  assert.equal(revolt(null,'magmashield','fighter','redogre').s.battle.strikes[0].effect,'block');
  assert.equal(revolt(null,'magmashield','minotaur','blueogre').s.battle.strikes[0].effect,'hit');
  assert.equal(revolt(null,'neutralcloak','fighter','redogre',state=>{state.tiles[1].type=0;}).s.battle.landHP,0);
  const mantle=revolt('bindingwhip','squidmantle','fighter','fighter').s;
  assert.equal(mantle.tiles[1].unit.enchant,undefined);
  assert.deepEqual(mantle.battle.strikes.map(v=>v.side),[0,1]);
  assert.equal(revolt('longsword','reactivearmor','fighter','fighter').s.battle.attackST,40);
  assert.equal(revolt('sparkball','reactivearmor','fighter','fighter').s.battle.strikes[0].hp[1],30);
  assert.equal(revolt('gremlinseye','chainmail','fighter','fighter').s.battle.startHP[1],70);
  assert.equal(revolt('gremlinseye','magussmirror','fighter','fighter').s.battle.startHP[1],40);
  assert.equal(revolt('gremlinseye','angelcape','fighter','fighter').s.battle.startHP[1],80);
  for(const [gear,types] of [['magmaarmor',[0,2]],['stormarmor',[1,3]]]){
    const boosted=revolt(null,gear,'fighter','fighter',(state,id)=>{
      for(const [i,type] of types.entries())Object.assign(state.tiles[4+i],{type,owner:1,unit:{id:id('fighter'),hp:40}});
    }).s.battle;
    assert.equal(boosted.startHP[1],80);
    assert.equal(boosted.defendST,40);
  }
  const auraStrike=revolt('aurastrike','chainmail','fighter','redogre',state=>{
    state.tiles[1].type=0;state.tiles[1].level=3;
  }).s.battle;
  assert.equal(auraStrike.attackST,40);
  assert.match(auraStrike.strikes[0].notes.join(' '),/지형 보너스 관통.*40 피해/);
  for(const [gear,types,guard] of [['burningrod',[0,2,2],'blueogre'],['chillingblast',[1,3,3],'greenogre']]){
    const scroll=revolt(gear,'chainmail','fighter',guard,(state,id)=>{
      for(const [i,type] of types.entries())Object.assign(state.tiles[4+i],{type,owner:0,unit:{id:id('fighter'),hp:40}});
    }).s.battle;
    assert.equal(scroll.attackST,30);
    assert.match(scroll.strikes[0].notes.join(' '),/45 피해/);
  }
  console.log('Revolt 18 items tested across battle timing, pierce, ward priority, destruction, hand refill and territory effects');
  const angry=revolt('chainmail','angrymask','fighter','goblin').s;
  assert.equal(angry.battle.finalHP[0],0);
  assert.match(angry.battle.lines.join(' '),/상대 기본 HP에 40 피해/);
  const poisonedMask=revolt(null,'angrymask','fighter','goblin',state=>{
    Object.assign(state.tiles[1].unit,{hp:20,poisoned:true});
  }).s;
  assert.equal(poisonedMask.battle.won,true);
  assert.doesNotMatch(poisonedMask.battle.lines.join(' '),/상대 기본 HP에/);
  const portalKey=revolt('argentkey','chainmail','goblin','fighter').s;
  assert.equal(portalKey.tiles[1].owner,1);
  assert.ok(portalKey.tiles.some(t=>t.owner===0&&t.unit));
  assert.match(portalKey.battle.strikes[0].notes.join(' '),/빈 영지로 이동/);
  const noEscape=revolt('argentkey','chainmail','goblin','fighter',(s,id)=>{
    s.tiles.forEach((t,i)=>{
      if(i!==1&&(typeof t.type==='number'||['복합','무속성','모프'].includes(t.type)))Object.assign(t,{owner:1,unit:{id:id('fighter'),hp:40}});
    });
  }).s;
  assert.equal(noEscape.battle.finalHP[0],0);
  assert.match(noEscape.battle.strikes[0].notes.join(' '),/빈 영지가 없어 격파/);
  const heart=revolt('burningheart','longsword','goblin','redogre').s;
  assert.deepEqual(heart.battle.finalHP,[0,0]);
  assert.equal(heart.tiles[1].unit,null);
  const plasma=revolt('necroplasma',null,'fighter','goblin');
  assert.deepEqual([plasma.s.battle.attackST,plasma.s.battle.startHP[0]],[50,40]);
  for(const [id,form] of [[plasma.s.battle.forms[0],'skeleton'],[plasma.s.tiles[1].unit.id,'fighter']]){
    assert.equal(plasma.C.combo.key(plasma.C.cards[id]),form);
  }
  for(const [defender,form] of [['goblin','skeleton'],['hellgrammite','serpentfly']]){
    const scarab=revolt('longsword','necroscarab','fighter',defender);
    assert.equal(scarab.C.combo.key(scarab.C.cards[scarab.s.tiles[1].unit.id]),form);
  }
  assert.equal(revolt(null,'gelatinousarmor','fighter','goblin').s.players[1].cash,1150);
  assert.equal(revolt('sparkball','gelatinousarmor','fighter','goblin').s.players[1].cash,950);
  const napalm=revolt('napalmarrow','sphereshield','goblin','fighter').s;
  assert.equal(napalm.battle.won,true);
  assert.match(napalm.battle.strikes[0].notes.join(' '),/최대 HP −40/);
  const twin=revolt('twinspike','chainmail','fighter','skeleton');
  assert.equal(twin.C.combo.key(twin.C.cards[twin.s.tiles[1].unit.id]),'fighter');
  const populate=(slugs,seat=0)=>(s,id)=>{
    slugs.forEach((slug,i)=>Object.assign(s.tiles[4+i],{owner:seat,unit:{id:id(slug),hp:40}}));
  };
  assert.equal(revolt('clawofshade','chainmail','fighter','redogre',populate(['redogre','minotaur'])).s.battle.attackST,70);
  assert.equal(revolt('clawofshade','neutralcloak','fighter','redogre',populate(['redogre','fighter'])).s.battle.attackST,50);
  for(const [gear,guard,slugs] of [['magmaflail','blueogre',['redogre','greenogre']],['stormhalberd','greenogre',['blueogre','yellowogre']]]){
    const elemental=revolt(gear,'chainmail','fighter',guard,populate(slugs)).s.battle;
    assert.equal(elemental.attackST,50);
    assert.match(elemental.strikes[0].notes.join(' '),/75 피해/);
  }
  assert.match(revolt('shadowblaze','chainmail','fighter','goblin',populate(['goblin'],1)).s.battle.strikes[0].notes.join(' '),/60 피해/);
  assert.match(revolt('shadowblaze','chainmail','fighter','goblin',populate(['goblin'],0)).s.battle.strikes[0].notes.join(' '),/40 피해/);
  for(const [gear,opponent] of [['topazamulet','redogre'],['turquoiseamulet','blueogre']]){
    try{
      Math.random=()=>.59;
      assert.equal(revolt(gear,null,'goblin',opponent).s.battle.won,true);
      Math.random=()=>.6;
      assert.equal(revolt(gear,null,'goblin',opponent).s.battle.won,false);
    }finally{Math.random=random;}
    assert.equal(revolt(null,gear,opponent,'goblin').s.battle.strikes[0].effect,'block');
  }
  console.log('Revolt 14 more items tested in hit priority, temporary forms, weapon failure, defeat and regeneration');
  assert.equal(revolt(null,'ragdoll','fighter','goblin').s.battle.strikes[0].effect,'block');
  assert.equal(revolt(null,'ragdoll','fighter','fighter').s.battle.strikes[0].effect,'hit');
  assert.equal(revolt('sparkball','ragdoll','fighter','fighter').s.battle.strikes[0].effect,'block');
  const quiet=revolt('warlocksdisk','mirrorhoplon','goblin','redogre',s=>{
    Object.assign(s.tiles[1],{type:0,level:3});
  }).s.battle;
  assert.deepEqual([quiet.attackST,quiet.defendST,quiet.landHP,quiet.startHP[1],quiet.strikes[0].effect],[20,40,30,80,'hit']);
  assert.match(quiet.lines.join(' '),/워록 디스크/);
  const quietDragon=revolt('warlocksdisk',null,'goblin','volcanicdragon').s.battle;
  assert.equal(quietDragon.strikes[0].side,0);
  assert.equal(quietDragon.defendST,50);
  const saw=revolt('chainsaw','chainmail','fighter','redogre',(s,id)=>{
    for(const at of [1,4,5])Object.assign(s.tiles[at],{type:0,owner:1,unit:{id:id('redogre'),hp:50}});
  }).s.battle;
  assert.equal(saw.attackST,100);
  const returnedMail=revolt(null,'eternalmail','fighter','centaur',(s,id)=>{
    s.players[1].book=[id('fighter')];
  });
  assert.equal(returnedMail.s.players[1].book.filter(id=>id===returnedMail.a).length,1);
  const soul=revolt('soulray',null,'fighter','goblin');
  assert.ok(soul.s.players[0].hand.includes(soul.w));
  for(const [index,form] of ['volcanicdragon','deepseadragon','hardrockdragon','lightningdragon'].entries()){
    try{
      Math.random=()=>(index+.5)/4;
      const dragon=revolt('dragonorb',null,'fighter','goblin');
      assert.equal(dragon.C.combo.key(dragon.C.cards[dragon.s.battle.forms[0]]),form);
      assert.equal(dragon.C.combo.key(dragon.C.cards[dragon.s.tiles[1].unit.id]),'fighter');
    }finally{Math.random=random;}
  }
  const dragonScroll=revolt(null,null,'volcanicdragon','decoy').s.battle;
  assert.equal(dragonScroll.strikes[0].effect,'hit');
  assert.match(dragonScroll.strikes[0].notes.join(' '),/50 피해/);
  for(const [roll,expected] of [[.00001,50],[.9999,110]]){
    try{
      Math.random=()=>roll;
      const robe=revolt(null,'spectresrobe','fighter','fighter').s.battle;
      assert.deepEqual([robe.defendST,robe.startHP[1]],[expected,expected]);
    }finally{Math.random=random;}
  }
  try{
    let mixed=false;
    const robe=revolt(null,'spectresrobe','fighter','fighter',()=>{
      Math.random=()=>{mixed=!mixed;return mixed?0:.9999;};
    });
    assert.deepEqual([robe.s.battle.defendST,robe.s.battle.startHP[1]],[50,110]);
    const items=robe.C.cards.filter(c=>!c.unlisted&&c.kind==='item'&&c.catalog);
    assert.equal(items.length,75);
    assert.ok(items.every(c=>!c.catalogOnly));
  }finally{Math.random=random;}
  console.log('Revolt all 75 items enabled, including four dragons, recycling, independent robe rolls and Warlock Disk');
  console.log('Revolt exact AI books, terrain defenses, metamorphosis, item effects and Yeti threshold OK');
  const begins=(w,a,attacker='fighter',defender='goblin',prepare)=>fight('begins',attacker,defender,w,a,prepare);
  const lv3=type=>state=>Object.assign(state.tiles[1],{type,level:3});
  const leveller=begins(null,'chainmail','leveller','fighter',lv3(2)).s;
  assert.equal(leveller.tiles[1].level,2);
  assert.match(leveller.battle.lines.join(' '),/교전 영지 Lv\.2/);
  assert.equal(begins(null,'chainmail','leveller','fighter',lv3(3)).s.tiles[1].level,3);
  assert.equal(begins(null,'claymore','leveller','fighter',state=>{
    lv3(2)(state);
    Object.assign(state.tiles[1].unit,{hp:100,mhp:100});
  }).s.tiles[1].level,3);
  const nike=begins(null,null,'werewolf','nike',state=>{
    state.tiles[1].unit.hp=40;
    state.tiles[1].unit.mhp=40;
  }).s;
  assert.equal(nike.battle.strikes[0].side,1);
  const withWhip=begins('bindingwhip','chainmail','goblin','fighter').s;
  assert.equal(withWhip.tiles[1].unit.enchant,'paralysis');
  assert.equal(withWhip.battle.strikes.length,1);
  const blockedWhip=begins('bindingwhip','buckler','goblin','fighter').s;
  assert.equal(blockedWhip.battle.strikes[0].effect,'block');
  assert.equal(blockedWhip.tiles[1].unit.enchant,undefined);
  const wolf=begins(null,null,'werewolf','fighter');
  assert.equal(wolf.C.combo.key(wolf.C.cards[wolf.s.tiles[1].unit.id]),'wolf');
  assert.equal(wolf.s.tiles[1].unit.hp,40);
  const ram=begins('batteringram','chainmail','cockatrice','fighter').s;
  assert.ok(ram.battle.won);
  assert.match(ram.battle.strikes[0].notes.join(' '),/변신.*즉사/);
  const fusion=begins('dragonfly',null,'carbuncle','goblin');
  assert.equal(fusion.C.combo.key(fusion.C.cards[fusion.s.tiles[1].unit.id]),'carbunfly');
  const golem=begins(null,'chainmail','goblin','golem').s;
  assert.deepEqual([golem.tiles[1].unit.st,golem.tiles[1].unit.hp],[30,50]);
  const fossil=begins('longsword',null,'fighter','greatfossil');
  assert.equal(fossil.C.combo.key(fossil.C.cards[fossil.s.tiles[1].unit.id]),'tyrannosaurus');
  assert.equal(fossil.s.battle.won,false);
  assert.equal(begins(null,'chainmail','gremlin','fighter').s.battle.startHP[1],40);
  const drilling=begins('drilllance','chainmail','fighter','minotaur',lv3(0)).s.battle;
  assert.equal(drilling.landHP,30);
  assert.match(drilling.strikes[0].notes.join(' '),/지형 보너스 관통/);
  const drool=begins(null,'chainmail','drool','fighter',(s,id)=>{
    for(const t of s.tiles)if(t.owner===0){t.owner=-1;t.unit=null;}
    const adjacent=ps2.createEdition('begins').board(s).links[1];
    const distant=s.tiles.flatMap((t,at)=>typeof t.type==='number'&&at!==1&&!adjacent.includes(at)?[at]:[]).slice(0,3);
    assert.equal(distant.length,3);
    for(const at of distant)Object.assign(s.tiles[at],{type:1,owner:0,unit:{id:id('merfolk'),hp:40}});
  }).s.battle;
  assert.equal(drool.attackST,30);
  for(const [attacker,elementalGuard] of [['flameacolyte','pillarofflame'],['aquaacolyte','kingtortoise'],['terraacolyte','dwarf'],['aeroacolyte','griffon']]){
    const matched=begins(null,null,attacker,elementalGuard);
    assert.equal(matched.s.battle.attackST,30);
    assert.equal(matched.s.battle.startHP[1]-matched.s.battle.strikes[0].hp[1],Math.min(45,matched.s.battle.startHP[1]));
    assert.match(creatureText.describe(matched.C,matched.C.cards[matched.s.battle.forms[0]]),/금술.*30/);
  }
  const boosted=begins(null,null,'goblin','hornedchameleon',(state,card)=>{
    state.tiles[1].type=0;
    Object.assign(state.tiles[8],{owner:1,type:2,unit:{id:card('borgess'),hp:30}});
  }).s.battle;
  assert.deepEqual(boosted.startHP,[50,60]);
  assert.match(begins('airslasher',null,'fighter','griffon').s.battle.strikes[0].notes.join(' '),/105 피해/);
  assert.match(begins('flametongue',null,'fighter','kingtortoise').s.battle.strikes[0].notes.join(' '),/105 피해/);
  const flame=begins(null,null,'flamegoetia','fighter',(state,card)=>{state.players[1].book=[card('goblin')];}).s.battle;
  assert.equal(flame.attackST,40,'the inherent scroll damage is fixed');
  assert.equal(flame.startHP[0],60);
  const flameWeapon=begins('mace',null,'flamegoetia','fighter',(state,card)=>{state.players[1].book=[card('goblin')];}).s.battle;
  assert.equal(flameWeapon.attackST,80);
  const monarch=begins('mace',null,'fighter','abyssalmonarch',state=>{state.tiles[1].type=0;}).s.battle;
  assert.equal(monarch.attackST,40);assert.equal(monarch.startHP[1],60);
  const guardedMonarch=begins(null,'chainmail','abyssalmonarch','fighter').s.battle;
  assert.equal(guardedMonarch.startHP[1],70);assert.equal(guardedMonarch.attackST,50);
  const drains=begins(null,null,'bandit','fighter').s;
  assert.equal(drains.players[0].cash,1040);assert.equal(drains.players[1].cash,960);
  const suppressed=begins(null,null,'bandit','terragoetia').s;
  assert.equal(suppressed.players[0].cash,1000);assert.equal(suppressed.players[1].cash,1000);
  const itemStrike=begins('rathunter',null,'bandit','terragoetia').s;
  assert.equal(itemStrike.players[0].cash,950);assert.equal(itemStrike.players[1].cash,1000);
  assert.match(itemStrike.battle.lines.join(' '),/Giant Rat|자이언트 랫/);
  const normalArt=begins(null,null,'flameacolyte','fighter');
  const equippedArt=begins('mace','gaseousform','flameacolyte','fighter');
  assert.equal(normalArt.s.battle.strikes[0].hp[1],10);
  assert.equal(equippedArt.s.battle.strikes[0].effect,'block','equipping a weapon suppresses Forbidden Art');
  assert.equal(begins(null,'magicshield','aquaacolyte','fighter').s.battle.strikes[0].effect,'block');
  const goetia=begins(null,null,'fighter','aquagoetia');
  assert.equal(goetia.s.battle.strikes[0].hp[1],10);assert.equal(goetia.s.battle.defendST,40);
  assert.equal(begins(null,null,'fighter','gascloud').s.battle.strikes[0].hp[1],10);
  assert.equal(begins(null,null,'fighter','decoy').s.battle.strikes[0].effect,'reflect');
  assert.equal(begins('batteringram',null,'goblin','wallofstone').s.battle.won,true);
  const gremlin=begins('gremlinamulet','chainmail');
  assert.equal(gremlin.s.battle.startHP[1],30);
  const returning=begins('boomerang',null);
  assert.ok(returning.s.players[0].hand.includes(returning.w));
  const defeated=begins('boomerang','countershield');
  assert.equal(defeated.s.battle.finalHP[0],0);
  assert.ok(!defeated.s.players[0].hand.includes(defeated.w));
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
  assert.equal(eternal.players[1].book.filter(id=>id===a).length,1);
  const loser=begins('claymore','eternalmail');
  assert.equal(loser.s.battle.finalHP[1],0);
  assert.ok(!loser.s.players[1].book.includes(loser.a));
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
  const assault=approach(1,0);
  const enemySeat=assault.players.findIndex((_,i)=>!C.allied(assault,i,0));
  Object.assign(assault.tiles[3],{type:0,owner:enemySeat,unit:{id:goblin,hp:15}});
  assault.players[0].hand=[card('fighter'),gear];
  assert.ok(C.play(assault,['towerAim']));
  assert.ok(C.play(assault,['towerTo',3]));
  assert.deepEqual(C.ai(assault),['invade',0]);
  assert.ok(C.play(assault,C.ai(assault)));
  assert.deepEqual([assault.battle.at,assault.battle.tower],[3,true]);

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
  const C=ps2.createEdition('revolt'),mapId='revolt-original-lantern-market';
  const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.catalog?.path.endsWith('/'+name));
  const s=C.start(4,4,6000,mapId);
  const offers=['phlogiston','squirrine','magmahammer','windofhope'].map(id);
  assert.deepEqual(C.shopStock(s,3),offers);
  assert.deepEqual(C.shopStock(s,18),['aqualing','cornfolk','stormspear','manna'].map(id));
  assert.ok(offers.every(id=>C.shopCost(id)===20));
  function approach(at,steps=1){
    const state=JSON.parse(JSON.stringify(s));
    Object.assign(state,{phase:'fork',die:steps,rollSum:steps,remaining:steps});
    Object.assign(state.players[0],{pos:at-1,previous:at-2,hand:[],cash:20});
    assert.ok(C.play(state,['route',at]));
    return state;
  }
  assert.notEqual(approach(3,2).phase,'shop');
  assert.notEqual(approach(9,2).phase,'fortune');
  const buy=approach(3);
  assert.deepEqual(C.choices(buy),[...offers.map(id=>['buyCard',id]),['leaveShop']]);
  assert.ok(!C.play(buy,['buyCard',id('fighter')]));
  assert.ok(C.play(buy,['buyCard',offers[0]]));
  assert.deepEqual([buy.players[0].cash,buy.players[0].hand,buy.turn],[0,[offers[0]],1]);
  const capped=approach(3);
  capped.players[0].hand=Array(10).fill(id('fighter'));
  assert.deepEqual(C.choices(capped),[['leaveShop']]);
  capped.players[0].hand.pop();capped.players[0].cash=19;
  assert.deepEqual(C.choices(capped),[['leaveShop']]);
  const dusk=approach(3);
  dusk.players[0].hand=Array(9).fill(id('fighter'));
  assert.ok(C.play(dusk,['buyCard',offers[0]]));
  assert.equal(dusk.phase,'discard');
  assert.equal(dusk.players[0].hand.length,10);
  const oracle=approach(9);
  oracle.players[0].book=['aqualing','windofhope','cornfolk'].map(id);
  assert.deepEqual(C.choices(oracle),[['fortuneDraw','creature'],['fortuneDraw','spell']]);
  assert.ok(C.play(oracle,['fortuneDraw','spell']));
  assert.deepEqual([oracle.players[0].cash,oracle.players[0].hand[0],oracle.players[0].book.length,oracle.phase],[20,id('windofhope'),2,'land']);
  console.log('Revolt Lantern Market two four-card shops, flat fee, skipped passage, cap and fortune draw OK');

  const morph=C.start(4,4,6000,'revolt-original-lantern-morph');
  assert.equal(morph.tiles.filter(t=>t.type==='모프').length,15);
  for(const [at,card,expected] of [[1,'fighter','복합'],[2,'phlogiston',0],[5,'redogre',0]]){
    Object.assign(morph,{turn:0,phase:'land'});
    Object.assign(morph.players[0],{pos:at,cash:500,hand:[id(card)]});
    assert.ok(C.play(morph,['summon',0]));
    assert.equal(morph.tiles[at].type,expected);
  }
  assert.equal(C.chain(morph,morph.tiles[1]),1);
  assert.equal(C.chain(morph,morph.tiles[2]),2);
  Object.assign(morph,{turn:1,phase:'attack',battle:{at:2,inv:id('fighter'),atkItem:null,defItem:null}});
  assert.ok(C.play(morph,['bare'])&&C.play(morph,['bare']));
  assert.ok(morph.battle.won);
  assert.equal(morph.tiles[2].type,0);
  console.log('Revolt Full Morph first claim, neutral to Multi, chain and transfer persistence OK');
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

  const cobra=fixtures();
  place(cobra,1,0,'spittingcobra',40);
  place(cobra,2,1,'fate',40,{enchant:'vitality'});
  place(cobra,3,1,'grimalkin',30);
  assert.ok(C.play(cobra,['secretArt',1]));
  assert.ok(!C.choices(cobra).some(a=>a[0]==='secretLand'&&a[1]===3));
  assert.ok(C.play(cobra,['secretLand',2]));
  assert.deepEqual([cobra.players[0].cash,cobra.tiles[1].unit.fatigued,cobra.tiles[2].unit.poisoned,cobra.tiles[2].unit.enchant],[70,true,true,undefined]);

  const sakuya=fixtures();
  sakuya.players[0].cash=200;
  place(sakuya,1,0,'sakuya',30);
  place(sakuya,2,0,'woodfolk',30);
  place(sakuya,3,2,'woodfolk',30);
  place(sakuya,4,1,'minotaur',40);
  Object.assign(sakuya.tiles[1],{type:2});
  Object.assign(sakuya.tiles[2],{type:0,level:5});
  sakuya.tiles[3].type=sakuya.tiles[4].type=0;
  const locked=structuredClone(sakuya);
  locked.world={effect:'solidworld',until:4};
  assert.ok(!C.choices(locked).some(a=>a[0]==='secretArt'));
  assert.ok(C.play(sakuya,['secretArt',1]));
  assert.deepEqual(C.choices(sakuya),[['secretLand',2],['secretCancel']]);
  assert.ok(C.play(sakuya,['secretLand',2]));
  assert.deepEqual([sakuya.players[0].cash,sakuya.tiles[1].unit.fatigued,sakuya.tiles[2].type,sakuya.tiles[2].level],[80,true,2,5]);

  const penalty=fixtures();
  const mate=penalty.teams.findIndex((t,i)=>i>0&&t===penalty.teams[0]);
  for(const [i,p] of penalty.players.entries())Object.assign(p,{cash:500,lap:i===0?0:i===mate?4:2});
  penalty.players[0].hand=[card('speedpenalty')];
  const leader=structuredClone(penalty);
  leader.players[0].lap=4;
  assert.ok(C.play(leader,['cast',0]));
  assert.deepEqual(leader.players.map(p=>p.cash),[430,500,500,500]);
  assert.ok(C.play(penalty,['cast',0]));
  assert.equal(penalty.players[mate].cash,500);
  assert.deepEqual(penalty.players.map(p=>p.cash).sort((a,b)=>a-b),[300,500,500,630]);

  const bones=fixtures();
  bones.players[0].hand=['spartoi','manna'].map(card);
  const empty=1;
  bones.tiles[empty].type=2;
  for(const [i,t] of bones.tiles.entries())if(i!==empty&&C.territoryType(t.type))place(bones,i,1,'fighter',40);
  assert.ok(C.play(bones,['cast',0]));
  assert.equal(bones.phase,'sacrifice');
  assert.ok(C.play(bones,['sacrifice',1]));
  assert.deepEqual([bones.players[0].cash,bones.players[0].hand.length,bones.tiles[empty].owner,bones.tiles[empty].unit.id],[70,0,0,card('skeleton')]);

  const witch=fixtures();
  place(witch,2,0,'witch',30);
  witch.players[1].hand=['magicbolt','manna','fighter'].map(card);
  witch.players[2].hand=['manna','fly','escape'].map(card);
  witch.players[3].status='barrier';
  const mist=structuredClone(witch);mist.world={effect:'mistyworld',until:4};
  assert.ok(!C.choices(mist).some(a=>a[0]==='secretArt'));
  const riches=witch.players[1].cash;
  assert.ok(C.play(witch,['secretArt',2]));
  assert.deepEqual(C.choices(witch),[['secretPlayer',1],['secretCancel']]);
  assert.deepEqual(C.ai(witch),['secretPlayer',1]);
  assert.ok(!C.play(witch,['secretPlayer',2]));
  const resumed=JSON.parse(JSON.stringify(witch));
  assert.deepEqual(C.choices(resumed),C.choices(witch));
  assert.ok(C.play(resumed,['secretPlayer',1]));
  assert.deepEqual([resumed.phase,resumed.players[0].cash,resumed.players[1].cash,resumed.tiles[2].unit.fatigued,resumed.mapEffect.tile],['roll',150,riches-80,true,resumed.players[1].pos]);

  const leap=fixtures();
  Object.assign(leap.players[0],{pos:0,word:3,hand:[card('magicalleap')]});
  place(leap,2,0,'fighter',40,{fatigued:true});
  assert.ok(C.play(leap,['cast',0]));
  assert.ok(C.choices(leap).some(a=>a[0]==='targetLand'&&a[1]===4));
  assert.ok(C.choices(leap).some(a=>a[0]==='targetLand'&&a[1]===15));
  assert.ok(!C.choices(leap).some(a=>a[1]===0||a[1]===5));
  assert.equal(C.play(leap,['targetLand',5]),false);
  assert.ok(C.play(leap,['targetLand',4]));
  assert.deepEqual([leap.phase,leap.die,leap.players[0].pos,leap.players[0].dir,leap.players[0].word,leap.tiles[2].unit.fatigued],['land',0,4,0,3,undefined]);
  assert.deepEqual(leap.lastMove.path,[0,4]);

  const float=fixtures();
  float.players[0].hand=[card('sigiloffloat')];
  float.players[0].cash=200;
  place(float,1,0,'madharlequin',40);
  place(float,2,0,'healer',40);
  place(float,3,2,'goblin',30);
  assert.ok(C.play(float,['cast',0]));
  assert.deepEqual(C.choices(float),[['targetLand',1]]);
  assert.ok(C.play(float,['targetLand',1]));
  const floater=float.tiles[1].unit;
  assert.equal(C.secretArt(C.cards[floater.id],floater).cost,50);
  float.phase='spell';
  float.players[2].status='haunt';
  assert.ok(C.play(float,['secretArt',1]));
  assert.ok(C.play(float,['secretPlayer',2]));
  assert.deepEqual([float.phase,float.players[0].cash,float.players[2].word,float.players[2].status,floater.fatigued],['roll',110,5,undefined,undefined]);
  assert.equal(C.secretArt(C.cards[card('healer')],{enchant:'sigiloffloat'}).cost,10);

  const drain=fixtures();
  place(drain,1,0,'goblin',30,{enchant:'sigilofdrain'});
  drain.players[1].cash=457;
  assert.ok(C.play(drain,['secretArt',1]));
  assert.ok(!C.choices(drain).some(([kind,seat])=>kind==='secretPlayer'&&seat===2));
  assert.ok(C.play(drain,['secretPlayer',1]));
  assert.deepEqual([drain.players[0].cash,drain.players[1].cash],[125,412]);

  const form=fixtures();
  place(form,1,0,'aquahorn',22,{mhp:55,st:60});
  assert.ok(C.play(form,['secretArt',1]));
  assert.deepEqual([form.phase,form.players[0].cash,form.tiles[1].unit],['roll',70,{id:card('mistwing'),hp:40,fatigued:true}]);
  form.phase='spell';
  assert.ok(!C.choices(form).some(([k])=>k==='secretArt'));
  delete form.tiles[1].unit.fatigued;
  assert.ok(C.play(form,['secretArt',1]));
  assert.equal(form.tiles[1].unit.id,card('aquahorn'));

  const tools=fixtures();
  place(tools,1,0,'ironmonger',30);
  tools.players[0].hand=[];
  tools.players[0].book=['chainmail','manna','mace','fighter'].map(card);
  assert.ok(C.play(tools,['secretArt',1]));
  assert.deepEqual(tools.players[0].hand,[card('mace')]);
  assert.deepEqual(tools.players[0].book,['chainmail','manna','fighter'].map(card));

  const chariot=fixtures();
  chariot.players[0].hand=[card('chariot')];
  place(chariot,1,0,'woodfolk',30,{fatigued:true});
  assert.ok(C.play(chariot,['cast',0]));
  assert.ok(C.play(chariot,['targetLand',1]));
  assert.equal(chariot.phase,'teleMove');
  assert.ok(C.choices(chariot).some(([k,at])=>k==='teleTo'&&at===3));
  assert.ok(C.play(chariot,['teleTo',3]));
  assert.deepEqual([chariot.phase,chariot.tiles[1].owner,chariot.tiles[3].owner,chariot.tiles[3].unit.fatigued],['roll',-1,0,true]);
  assert.ok(chariot.players[0].book.includes(card('chariot')));

  {
    const poison=fixtures(),snapshot=require('../dist/cept-room-state.js').view;
    const [actor,enemy,ally]=poison.players;
    actor.hand=[card('poisonmind')];actor.book=[card('fly')];
    enemy.book=['fighter','manna','sparkball','chariot','goblin','holyword6','shatter'].map(card);
    const original=enemy.book.slice();
    assert.ok(C.play(poison,['cast',0]));
    assert.ok(!C.choices(poison).some(([kind,seat])=>kind==='targetPlayer'&&seat===2));
    ally.book=[card('goblin')];
    assert.ok(C.play(poison,['targetPlayer',1]));
    assert.equal(poison.phase,'mindseeker');
    assert.deepEqual(snapshot(C,poison,0).game.players[0].peek.ids,original.slice(-6).reverse());
    for(const seat of [1,2,3]){
      const view=snapshot(C,poison,seat);
      assert.equal(view.game.players[0].peek,undefined);
      assert.deepEqual(view.choices,[]);
    }
    const restored=JSON.parse(JSON.stringify(poison));
    assert.ok(C.play(restored,['eraseDraw',2]));
    assert.equal(restored.phase,'roll');
    assert.equal(restored.players[0].cash,80);
    assert.deepEqual(restored.players[0].hand,[card('fly')]);
    assert.equal(restored.players[0].peek,undefined);
    assert.deepEqual(restored.players[1].book,original.filter((_,i)=>i!==4));

    const trap=fixtures();
    trap.players[0].hand=[card('blasttrap')];trap.players[0].cash=530;
    place(trap,1,1,'goblin',30);
    assert.ok(C.play(trap,['cast',0])&&C.play(trap,['targetLand',1]));
    Object.assign(trap.players[0],{pos:0,previous:15});
    Object.assign(trap,{phase:'fork',remaining:2,die:2,rollSum:2});
    assert.ok(C.play(trap,['route',1]));
    assert.deepEqual([trap.players[0].pos,trap.players[0].cash,trap.tiles[1].unit.hp,trap.tiles[1].unit.enchant],[2,500,30,'blasttrap']);
    Object.assign(trap.players[0],{pos:0,previous:15});
    Object.assign(trap,{phase:'fork',remaining:1,die:1,rollSum:1});
    assert.ok(C.play(trap,['route',1]));
    assert.deepEqual([trap.players[0].pos,trap.players[0].cash,trap.tiles[1].unit.hp,trap.tiles[1].unit.enchant],[1,300,10,undefined]);
    assert.match(trap.shrineNotice,/200G.*20/);

    const demon=fixtures();
    place(demon,1,0,'conjurer',30);
    place(demon,2,1,'goblin',30);
    demon.tiles[3].type=0;
    assert.ok(C.play(demon,['secretArt',1]));
    assert.ok(!C.choices(demon).some(([kind,at])=>kind==='secretLand'&&at===2));
    assert.ok(C.play(demon,['secretLand',3]));
    assert.deepEqual([demon.tiles[1].unit,demon.tiles[3].unit.id,demon.players[0].cash],[null,card('baal'),20]);

    const queen=fixtures();
    place(queen,1,0,'goobaqueen',40);
    assert.ok(C.play(queen,['secretArt',1])&&C.play(queen,['secretLand',3]));
    assert.equal(queen.tiles[3].unit.id,card('gooba'));
    assert.ok(queen.tiles[1].unit.fatigued);
    assert.ok(C.cards[card('gooba')].generatedOnly);

    const hive=fixtures();
    place(hive,1,0,'hivequeen',40);
    hive.players[0].hand=[];
    assert.ok(C.play(hive,['secretArt',1]));
    assert.deepEqual(hive.players[0].hand,[card('hiveworker')]);

    const pharos=fixtures();
    place(pharos,2,0,'legendarypharos',24);
    const around=C.board(pharos).links[2];
    assert.ok(around.every(at=>!pharos.tiles[at].unit&&C.territoryType(pharos.tiles[at].type)));
    assert.ok(C.play(pharos,['secretArt',2]));
    assert.deepEqual(around.map(at=>pharos.tiles[at].unit.id),around.map(()=>card('statue')));
    assert.equal(pharos.tiles[2].unit.hp,24);
    assert.ok(C.cards[card('legendarypharos')].noLapHeal);
  }
  {
    const flame=fixtures();
    place(flame,2,0,'creepingflame',50);
    assert.ok(C.play(flame,['secretArt',2])&&C.play(flame,['secretLand',3]));
    assert.deepEqual([flame.phase,flame.tiles[2].owner,flame.tiles[3].owner,flame.tiles[3].unit.fatigued],['roll',-1,0,true]);
    const raid=fixtures();
    place(raid,2,0,'creepingflame',50);
    place(raid,3,1,'goblin',30);
    raid.players[0].hand=[];
    assert.deepEqual(C.ai(raid),['secretArt',2]);
    assert.ok(C.play(raid,['secretArt',2]));
    assert.deepEqual(C.ai(raid),['secretLand',3]);
    assert.ok(C.play(raid,['secretLand',3]));
    assert.deepEqual([raid.phase,raid.battle.from,raid.battle.at,raid.battle.teleport],['attack',2,3,true]);
    assert.ok(C.play(raid,['bare'])&&C.play(raid,['bare']));
    assert.ok(raid.battle.won);
    assert.ok(C.play(raid,['continue']));
    assert.equal(raid.phase,'roll');

    const chimera=fixtures();
    place(chimera,1,0,'chimera',30,{st:95});
    Object.assign(chimera.players[0],{pos:3,previous:2,dir:1,word:1,flags:[0,12]});
    chimera.phase='roll';
    assert.ok(C.play(chimera,['roll']));
    assert.deepEqual([chimera.players[0].lap,chimera.tiles[1].unit.hp,chimera.tiles[1].unit.st],[1,40,100]);

    const reverse=fixtures();
    reverse.players[0].hand=[card('chaospanic')];
    Object.assign(reverse.players[0],{pos:2,previous:1,dir:1});
    reverse.players[2].word=6;
    assert.ok(C.play(reverse,['cast',0]));
    assert.ok(reverse.players.every(p=>p.reverse&&p.word==null));
    reverse.players[0].word=1;
    assert.ok(C.play(reverse,['roll']));
    assert.deepEqual([reverse.players[0].pos,reverse.players[0].reverse,reverse.players[1].reverse],[1,undefined,true]);

    const plague=fixtures();
    place(plague,1,0,'goblin',30,{enchant:'vitality'});
    place(plague,3,1,'caitsith',30);
    plague.players[0].hand=[card('plague')];
    assert.ok(C.play(plague,['cast',0]));
    assert.ok(plague.tiles[1].unit.poisoned&&plague.tiles[3].unit.poisoned);
    assert.equal(plague.tiles[1].unit.enchant,undefined);

    const lich=fixtures();
    place(lich,1,0,'lichenoid',30);
    place(lich,2,0,'fighter',70,{mhp:95});
    place(lich,3,1,'amphibianwarrior',30);
    assert.ok(C.play(lich,['secretArt',1]));
    assert.ok(!C.choices(lich).some(([k,at])=>k==='secretLand'&&at===3));
    assert.ok(C.play(lich,['secretLand',2]));
    assert.deepEqual([lich.tiles[2].unit.hp,lich.tiles[2].unit.mhp],[75,100]);

    const commands=fixtures();
    const cfg=(name,hp,mhp)=>{
      place(commands,1,0,name,hp,{mhp});
      commands.tiles[1].type=0;commands.tiles[1].level=1;
      Object.assign(commands.players[0],{pos:1,cash:1400});
      commands.visited=[1];commands.phase='land';
    };
    cfg('earthspirit',50,90);
    assert.ok(C.play(commands,['level',1,3]));
    assert.deepEqual([commands.tiles[1].level,commands.tiles[1].unit.hp,commands.tiles[1].unit.mhp],[3,60,100]);
    cfg('dunetitan',17,18);
    commands.turn=0;
    assert.ok(C.play(commands,['element',1,3]));
    assert.deepEqual([commands.tiles[1].type,commands.tiles[1].unit.hp,commands.tiles[1].unit.mhp],[3,10,10]);

    const owl=fixtures();
    place(owl,1,0,'clockworkowl',20);
    assert.ok(C.play(owl,['secretArt',1])&&C.play(owl,['secretPlayer',2]));
    assert.ok(owl.players[2].chooseDirection);
    assert.equal(owl.players[0].cash,60);

    for(const cardInHand of ['goblin','shininggeyser']){
      const draw=fixtures();draw.players[0].cash=500;
      draw.players[0].hand=['philosophy',cardInHand].map(card);
      draw.players[0].book=['fighter','goblin','mace','chainmail'].map(card);
      assert.ok(C.play(draw,['cast',0]));
      assert.equal(draw.players[0].hand.length,cardInHand==='goblin'?3:4);
    }
    const vortex=fixtures();
    place(vortex,3,1,'goblin',30);
    vortex.players[0].hand=[card('vortex')];
    vortex.players[0].book=[card('manna')];
    assert.ok(C.play(vortex,['cast',0])&&C.play(vortex,['targetLand',3]));
    assert.deepEqual([vortex.tiles[3].unit.enchant,vortex.players[0].hand],[ 'vortex',[card('manna')] ]);
  }
  const field=fixtures();
  field.players[0].hand=[card('energyfield')];
  place(field,1,1,'goblin',30,{enchant:'poison'});
  assert.ok(C.play(field,['cast',0])&&C.play(field,['targetLand',1]));
  assert.equal(field.tiles[1].unit.enchant,'energyfield');
  assert.equal(field.players[0].cash,40);

  const destruction=fixtures();
  place(destruction,1,0,'hellpyron',60);
  destruction.destroyedCount=4;
  assert.ok(C.play(destruction,['secretArt',1]));
  assert.deepEqual([destruction.players[0].cash,destruction.destroyedCount,destruction.tiles[1].unit.fatigued],[190,0,true]);

  const balance=fixtures();
  place(balance,1,0,'lordofbane',60);
  place(balance,2,2,'fighter',40);
  place(balance,3,1,'goblin',30,{st:30,enchant:'landprotection'});
  place(balance,4,3,'goblin',30,{st:50});
  assert.ok(C.play(balance,['secretArt',1]));
  assert.deepEqual(balance.tiles.slice(1,5).map(t=>t.unit.st),[50,undefined,50,30]);
  assert.equal(balance.players[0].cash,40);

  {
    const shelter=fixtures();
    place(shelter,1,0,'creepingflame',50);
    place(shelter,3,1,'fighter',40);
    shelter.players[0].cash=300;
    shelter.players[0].hand=[card('magicshelter')];
    assert.ok(C.play(shelter,['cast',0])&&C.play(shelter,['targetLand',1]));
    assert.equal(shelter.tiles[1].unit.enchant,'magicshelter');
    shelter.phase='spell';shelter.turn=1;
    shelter.players[1].hand=[card('magicbolt')];shelter.players[1].cash=200;
    assert.ok(C.play(shelter,['cast',0]));
    assert.deepEqual(C.choices(shelter),[['fizzle']]);
    shelter.turn=0;shelter.phase='spell';
    assert.ok(!C.choices(shelter).some(([k])=>k==='secretArt'));
    shelter.phase='land';shelter.players[0].pos=1;
    assert.ok(!C.choices(shelter).some(([k])=>k==='transfer'));

    for(const discard of ['goblin','magicbolt']){
      const dull=fixtures();
      place(dull,1,1,'fighter',35);
      dull.players[0].hand=['debility',discard].map(card);
      dull.players[0].book=[card('fly')];
      assert.ok(C.play(dull,['cast',0])&&C.play(dull,['sacrifice',1])&&C.play(dull,['targetLand',1]));
      assert.equal(dull.tiles[1].unit.st,0);
      assert.equal(dull.tiles[1].unit.mhp,discard==='magicbolt'?20:undefined);
      assert.deepEqual(dull.players[0].hand,[card('fly')]);
    }
    const shrink=fixtures();
    shrink.players[0].cash=200;shrink.players[0].hand=[card('sigilofshrink')];
    place(shrink,1,0,'goblin',30);
    place(shrink,3,1,'fighter',10,{mhp:10});
    place(shrink,5,1,'fighter',30,{enchant:'phantasm'});
    assert.ok(C.play(shrink,['cast',0])&&C.play(shrink,['targetLand',1]));
    shrink.phase='spell';
    assert.ok(C.play(shrink,['secretArt',1]));
    assert.ok(!C.choices(shrink).some(([,at])=>at===5));
    assert.ok(C.play(shrink,['secretLand',3]));
    assert.deepEqual([shrink.players[0].cash,shrink.tiles[3].owner,shrink.destroyedCount],[110,-1,1]);

    const charging=fixtures(),target=charging.players[0];
    target.hand=[card('chargingstep')];
    assert.ok(C.play(charging,['cast',0])&&C.play(charging,['targetPlayer',0]));
    for(let remaining=1;remaining>=0;remaining--){
      charging.phase='roll';
      const cash=target.cash;
      assert.ok(C.play(charging,['roll']));
      assert.ok(charging.die>=2&&charging.die<=4);
      assert.equal(charging.mapEffect.faces.reduce((a,b)=>a+b),charging.die);
      assert.equal(target.hasteRolls,remaining);
      assert.equal(target.cash,cash+50);
    }
  }

  {
    for(const sacrifice of ['goblin','greenogre']){
      const summon=fixtures();
      summon.phase='land';summon.players[0].pos=1;
      summon.players[0].hand=[sacrifice,'knighterrant'].map(card);
      assert.ok(C.play(summon,['summon',1])&&C.play(JSON.parse(JSON.stringify(summon)),['sacrifice',0]));
      assert.ok(C.play(summon,['sacrifice',0]));
      assert.equal(summon.tiles[1].unit.id,card(sacrifice==='goblin'?'knighterrant':'armedpaladin'));
      assert.equal(summon.players[0].cash,40);
    }
    const invasion=fixtures();
    invasion.phase='land';invasion.players[0].pos=1;
    invasion.players[0].hand=['knighterrant','goblin','greenogre'].map(card);
    place(invasion,1,1,'goblin',60,{mhp:60});
    for(const at of [2,3,4,5,6,7])place(invasion,at,0,'redogre',40);
    assert.ok(C.play(invasion,['invade',0]));
    assert.deepEqual(C.ai(invasion),['sacrifice',2]);
    assert.ok(C.play(invasion,['sacrifice',2]));
    assert.equal(invasion.battle.inv,card('armedpaladin'));
    assert.ok(C.play(invasion,['bare'])&&C.play(invasion,['bare']));
    assert.ok(invasion.battle.won);
    assert.deepEqual([invasion.tiles[1].unit.id,invasion.players[0].cash],[card('armedpaladin'),40]);

    const exchange=fixtures();
    exchange.phase='land';exchange.players[0].pos=1;
    place(exchange,1,0,'goblin',30);
    exchange.players[0].hand=['greenogre','knighterrant'].map(card);
    assert.ok(C.play(exchange,['exchange',1,1])&&C.play(exchange,['sacrifice',0]));
    assert.equal(exchange.tiles[1].unit.id,card('armedpaladin'));
    assert.deepEqual(exchange.players[0].hand,[card('goblin')]);

    const sprout=fixtures();
    place(sprout,1,0,'sproutling',30);
    sprout.tiles[1].type=0;
    assert.ok(C.play(sprout,['secretArt',1]));
    assert.deepEqual([sprout.tiles[1].unit.id,sprout.tiles[1].unit.hp,sprout.players[0].cash],[card('oldwillow'),40,50]);
    const immobile=fixtures();
    place(immobile,1,0,'shankrubber',20);
    place(immobile,2,1,'goblin',30);
    assert.ok(C.play(immobile,['secretArt',1])&&C.play(immobile,['secretLand',2]));
    assert.equal(immobile.tiles[2].unit.enchant,'thornfetter');
  }

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
  const guard=C.cards.findIndex(c=>!c.unlisted&&C.combo.key(c)==='megalodon');
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
  const evening='saga-original-eveningstar',threeArea=C.start(4,4,8000,evening);
  const layout=C.board(threeArea);
  assert.deepEqual([layout.types.length,layout.areaCount,layout.forts.length,threeArea.prices.length],[42,3,3,12]);
  assert.deepEqual(layout.shrineKinds,{5:'light',15:'dark',28:'light'});
  assert.equal(new Set(layout.position.map(pair=>pair.join(','))).size,42);
  for(const [i,exits] of layout.links.entries())for(const j of exits){
    assert.equal(Math.abs(layout.position[i][0]-layout.position[j][0])+Math.abs(layout.position[i][1]-layout.position[j][1]),1);
  }
  const sameElement=[1,14,24];
  for(const at of sameElement)Object.assign(threeArea.tiles[at],{owner:0,unit:{id:id('minotaur'),hp:40}});
  for(const at of sameElement)assert.equal(C.chain(threeArea,threeArea.tiles[at]),1);
  const restoredMap=structuredClone(threeArea);
  assert.equal(C.board(restoredMap).areaCount,3);
  assert.deepEqual(sameElement.map(at=>restoredMap.tiles[at].area),[0,1,2]);
  for(const [spell,slot,choice] of [['capture',1,'mace'],['theft',2,'magicbolt']]){
    const s=C.start(4,4,5000,'saga-1',undefined,undefined,0,'teams');
    const viewRoom=require('../dist/cept-room-state').view;
    s.players[0].cash=500;s.players[0].hand=[id(spell)];
    s.players[1].hand=[id('goblin'),id('mace'),id('magicbolt')];
    s.players[2].hand=[id(choice)];s.players[3].hand=[id('goblin')];
    assert.ok(C.play(s,['cast',0]));
    assert.deepEqual(C.choices(s),[['targetPlayer',1]]);
    const shielded=structuredClone(s);shielded.players[1].antiMagic=true;
    assert.ok(C.play(shielded,['targetPlayer',1]));
    assert.equal(shielded.phase,'roll');
    assert.equal(shielded.players[1].hand.length,3);
    assert.ok(C.play(s,['targetPlayer',1]));
    const saved=structuredClone(s),action=['stealCard',slot,id(choice)];
    assert.deepEqual(C.choices(saved),[action]);
    assert.deepEqual(viewRoom(C,saved,0).game.players[1].hand,[]);
    assert.deepEqual(viewRoom(C,saved,0).choices,[action]);
    assert.deepEqual(viewRoom(C,saved,2).choices,[]);
    assert.deepEqual(viewRoom(C,saved,2).game.players[1].hand,[]);
    assert.equal(C.play(saved,['stealCard',0,id('goblin')]),false);
    assert.ok(C.play(saved,action));
    assert.deepEqual(saved.players[0].hand,[id(choice)]);
    assert.equal(saved.players[1].hand.length,2);
    assert.equal(saved.spellTarget,undefined);
    assert.deepEqual(viewRoom(C,saved,1).game.players[0].hand,[]);
  }
  const reportedSagaBooks={
    sagaRilaraPlunder:'bandit:4 fighter:2 goblin:4 thief:4 gascloud:2 redogre:2 blueogre:2 giantamoeba:2 dwarf:2 greenogre:2 harpy:2 yellowogre:2 chainmail:2 leatherarmor:2 longsword:3 mace:2 ringofthesuccubus:2 drainmagic:1 holyword1:2 holyword6:2 manna:2 slow:2',
    sagaRilaraRobbery:'fighter:4 giantrat:4 goblin:4 phlogiston:2 redogre:4 aqualing:2 blueogre:4 greenogre:4 squirrine:2 blitzraven:2 yellowogre:4 leatherarmor:2 mace:2 sling:2 haste:2 magicbolt:2 manna:2 slow:2',
    sagaGottliebKill:'thief:2 bia:3 fay:3 hellhound:2 peri:2 sharazad:3 cerberus:2 dryad:3 grimalkin:2 healer:3 sakuya:2 chainmail:2 bravesong:2 cleanse:1 crusherstorm:2 find:1 holyword0:1 holyword3:1 holyword6:1 illness:2 manna:2 shrink:2 silence:2 toughsong:2 upheaval:1 wildgrowth:1',
    sagaGottliebSlaves:'thief:2 bia:2 fay:3 hellhound:2 peri:2 sharazad:3 cerberus:2 dryad:3 grimalkin:3 healer:2 sakuya:2 chainmail:2 magmahammer:2 bravesong:2 cramp:1 crusherstorm:2 fog:2 holyword0:1 holyword3:2 holyword6:2 illness:2 manna:2 telegnosis:2 windofhope:2',
    sagaBorivalFire:'barbarian:2 bia:2 creepingflame:2 fay:2 firegiant:2 gascloud:2 lavawurm:2 minotaur:2 peri:2 phlogiston:2 phoenix:2 salamander:2 sorcerer:2 aurablade:2 chainmail:2 firestone:2 morningstar:2 stormcounter:2 chariot:2 haste:2 holyword1:2 hustle:2 influence:2 manna:2 mutation:2',
    sagaZenethDragon:'hornedchameleon:2 gascloud:2 golem:2 hellhound:2 salamander:2 charon:2 giantamoeba:2 lilith:2 stormgiant:2 griffon:2 soulcollector:2 spectre:2 catapult:2 claymore:3 counteramulet:2 platemail:3 antielement:2 antimagic:2 banishingray:2 insectswarm:2 magicbolt:3 manna:2 phantasm:2 tempest:1',
    sagaTicomunKill:'fighter:2 giantrat:2 goblin:2 deathquito:2 gelatinouswall:2 lilith:2 lizardman:2 seahag:2 centaur:3 harpy:3 pegasus:2 tornado:2 battleaxe:1 buckler:2 chainmail:2 leatherarmor:2 longsword:2 mace:1 sling:2 blackout:2 holyword6:2 holyword1:2 magicbolt:2 manna:2 pain:2',
    sagaTicomunChallenge:'deathquito:3 gelatinouswall:2 grendel:1 seahag:2 lizardman:2 stormgiant:2 centaur:2 harpy:2 knight:2 nightmare:2 pegasus:2 tornado:2 amethystring:1 berylring:1 buckler:2 chainmail:2 longsword:2 sling:2 stormspear:2 blackout:2 crusher:2 holyword6:2 holyword1:2 manna:2 pain:2 waste:2',
    sagaBorivalHellFire:'barbarian:2 burnacle:2 burningtitan:2 coaloid:4 creepingflame:2 firegiant:2 gascloud:2 hellpyron:1 helltic:2 kasha:2 peri:2 phlogiston:2 salamander:2 fireshield:2 firestone:2 gremlintooth:2 magmahammer:4 bravesong:2 burninghail:2 influence:1 magicbolt:2 mountainleap:2 upheaval:2 venomousboil:2',
    sagaRilaraConspire:'bandit:4 fighter:2 hornedchameleon:2 thief:2 golem:2 hellhound:2 phlogiston:1 amazon:3 bunyip:1 lamia:1 dwarf:2 squirrine:3 pegasus:2 succubus:1 witch:2 chainmail:2 kris:1 morningstar:2 ringofthesuccubus:2 sling:2 backward:2 drainmagic:2 feast:1 holyword8:2 manna:2 slow:2',
    sagaRilaraFierce:'bandit:4 thief:2 boggart:3 firegiant:2 gascloud:2 gladiator:1 minotaur:2 phlogiston:2 revenant:2 squirrine:2 vampire:1 wereboar:2 weretiger:2 wolverine:3 boomerang:2 catapult:2 gremlintooth:2 ringofthesuccubus:2 scalearmor:2 capture:1 drainmagic:2 fairylight:2 slow:2 theft:1 venomousboil:2',
    sagaKoenigStar:'fighter:2 gemoid:2 giantrat:4 goblin:4 skeleton:4 statue:2 gascloud:2 phoenix:2 aqualing:2 lizardman:2 dwarf:2 mummy:2 blitzraven:2 sylph:2 chainmail:2 leatherarmor:2 longsword:2 mace:2 haste:2 magicbolt:2 manna:2 slow:2',
    sagaTraderMoney:'barbarian:2 boggart:2 caitsith:2 coaloid:2 gascloud:2 gelatinouswall:2 hypnosloth:2 lichenoid:2 mummy:2 spudfolk:2 wolverine:2 witch:2 jackolantern:2 deathchoker:1 longbow:2 petrifystone:2 thehand:2 drainmagic:2 dreamterrain:1 echo:1 fairylight:1 feast:1 greed:2 incineration:1 landdrain:2 manna:2 refuge:2 squeeze:2',
    sagaGuilderTwins:'burningtitan:2 coaloid:2 golem:2 lavawurm:2 salamander:2 dragonzombie:2 gigantherium:2 pangolin:2 spinyagama:2 trenchwurm:2 crimsonvine:2 jackolantern:1 magmaavatar:1 firestone:2 magmaarmor:2 magmahammer:4 scalearmor:4 burninghail:2 forestleap:1 holyword0:2 holyword8:2 mountainleap:1 upheaval:2 venomousboil:2 wildgrowth:2',
    sagaRilaraExploit:'bandit:4 fighter:2 thief:2 boggart:2 hellhound:2 amazon:3 gelatinouswall:2 dwarf:2 squirrine:2 gremlin:1 succubus:1 witch:3 gremlintooth:1 kris:2 morningstar:2 ringofthesuccubus:3 scalearmor:2 vestment:2 capture:1 drainmagic:2 haste:2 landdrain:2 manna:2 slow:2 theft:1'
  };
  for(const [name,cards] of Object.entries(reportedSagaBooks)){
    assert.ok(C.validBook(C.presets[name]));
    const expected=Object.fromEntries(cards.split(' ').map(entry=>{const [slug,count]=entry.split(':');return [id(slug),Number(count)];}));
    const actual={};
    for(const index of C.presets[name])actual[index]=(actual[index]||0)+1;
    assert.deepEqual(actual,expected);
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
  console.log('Saga eight active map Idols: paralysis, summon costs, dice, territory commands, damage and regeneration OK');
  for(const [name,cost,prior,expected] of [
    ['archbishop',50,{enchant:'fog'},{enchant:undefined,hp:40}],
    ['domovoi',30,{poisoned:true},{enchant:'phantasm',poisoned:undefined}],
    ['hyde',50,{},{enchant:'paralysis'}],
    ['healer',20,{hp:7},{hp:37}],
    ['fortress',30,{},{hp:30}],
    ['helltic',60,{},{hp:20}],
    ['burnacle',50,{},{enchant:'fog'}]
  ]){
    const s=idolMatch(),p=s.players[0];
    place(s,2,name,0,0);place(s,3,'minotaur',1,0,3);
    Object.assign(s.tiles[3].unit,prior);Object.assign(p,{cash:500,pos:2});
    const toll=C.toll(s,s.tiles[3]);s.phase='land';
    assert.ok(C.play(s,['ability',2])&&C.play(s,['abilityLand',3]),name);
    assert.equal(p.cash,500-cost);
    for(const [field,value] of Object.entries(expected))assert.equal(s.tiles[3].unit[field],value,name);
    if(name==='burnacle')assert.equal(C.toll(s,s.tiles[3]),Math.floor(toll/2));
  }
  const spud=idolMatch();
  place(spud,2,'spudfolk',0,0);place(spud,3,'dwarf',1,2);place(spud,4,'crimsonvine',1,0);place(spud,5,'fighter',0,2);
  Object.assign(spud.players[0],{cash:500,pos:2});spud.phase='land';
  assert.ok(C.play(spud,['ability',2]));
  assert.equal(spud.players[0].cash,560,'counts all deployed earth creatures, independent of terrain and seat');
  const refuge=idolMatch();
  Object.assign(refuge.players[0],{cash:0,hand:[id('refuge')]});
  refuge.phase='spell';
  assert.ok(!C.choices(refuge).some(([k])=>k==='cast'));
  refuge.players[0].hand.push(id('goblin'));
  assert.ok(C.play(refuge,['cast',0]));assert.equal(refuge.phase,'sacrifice');
  const savedRefuge=structuredClone(refuge);
  assert.ok(C.play(savedRefuge,['sacrifice',1]));
  assert.equal(savedRefuge.players[0].cash,80);
  assert.deepEqual(savedRefuge.players[0].hand,[id('refuge')]);
  const gems=idolMatch();
  place(gems,3,'gemoid',1,0,4);gems.tiles[3].unit.hp=10;gems.phase='spell';
  Object.assign(gems.players[0],{cash:500,pos:2,hand:[id('magicbolt')]});
  assert.equal(C.toll(gems,gems.tiles[3]),0);
  assert.ok(C.play(gems,['cast',0])&&C.play(gems,['targetLand',3]));
  assert.equal(gems.tiles[3].unit.hp,10);
  const recoveryArt=idolMatch();
  place(recoveryArt,2,'healer',0,2);place(recoveryArt,3,'gemoid',0,0);
  recoveryArt.tiles[3].unit.hp=3;recoveryArt.phase='land';
  Object.assign(recoveryArt.players[0],{cash:500,pos:2});
  assert.ok(C.play(recoveryArt,['ability',2])&&C.play(recoveryArt,['abilityLand',3]));
  assert.equal(recoveryArt.tiles[3].unit.hp,3);

  const growth=idolMatch();
  place(growth,2,'sylph',0,3,3);Object.assign(growth.tiles[2].unit,{st:80,mhp:60,hp:3,enchant:'greed'});
  Object.assign(growth.players[0],{cash:500,pos:2});growth.phase='land';
  assert.ok(C.play(growth,['ability',2]));
  assert.deepEqual(growth.tiles[2].unit,{id:id('garuda'),hp:40});
  assert.equal(growth.tiles[2].level,3);
  assert.equal(growth.tiles[2].owner,0);
  assert.equal(growth.players[0].cash,400);
  const evolution=idolMatch();
  place(evolution,2,'spinyagama',0,2,3);
  Object.assign(evolution.players[0],{cash:500,pos:2});evolution.phase='land';
  assert.ok(C.play(evolution,['ability',2]));
  assert.deepEqual(evolution.tiles[2].unit,{id:id('seismodon'),hp:50});
  assert.equal(evolution.players[0].cash,420);
  Object.assign(evolution,{turn:0,phase:'land'});
  assert.ok(C.play(evolution,['ability',2]));
  assert.deepEqual(evolution.tiles[2].unit,{id:id('brontides'),hp:70});
  assert.equal(evolution.tiles[2].level,3);assert.equal(evolution.tiles[2].owner,0);
  assert.equal(evolution.players[0].cash,300);
  const spirit=idolMatch();
  const lamia=spirit.players[0];
  Object.assign(lamia,{cash:500,pos:2,hand:[id('lamia')]});
  spirit.phase='land';
  assert.ok(C.play(spirit,['summon',0]));
  assert.equal(spirit.tiles[2].unit.enchant,'spiritwalk');
  const sameArea=spirit.tiles[2].area;
  const destination=spirit.tiles.findIndex((v,j)=>v.owner<0&&v.area===sameArea&&typeof v.type==='number'&&!C.board(spirit).links[2].includes(j));
  const otherArea=spirit.tiles.findIndex(v=>v.owner<0&&v.area!==sameArea&&typeof v.type==='number');
  assert.ok(destination>=0&&otherArea>=0);
  Object.assign(spirit,{turn:0,phase:'land'});
  assert.ok(C.choices(spirit).some(([k,from,to])=>k==='transfer'&&from===2&&to===destination));
  assert.ok(!C.choices(spirit).some(([k,from,to])=>k==='transfer'&&from===2&&to===otherArea));
  assert.ok(C.play(spirit,['transfer',2,destination]));
  assert.equal(spirit.tiles[destination].unit.enchant,undefined);
  assert.equal(spirit.tiles[2].unit,null);

  const weaken=idolMatch();
  place(weaken,2,'lamia',0,1);
  place(weaken,3,'goblin',1,0);weaken.tiles[3].unit.st=12;
  place(weaken,4,'colossus',1,0);
  place(weaken,5,'goblin',1,0);weaken.tiles[5].unit.enchant='landprotection';
  Object.assign(weaken.players[0],{cash:500,pos:2});weaken.phase='land';
  assert.ok(C.play(weaken,['ability',2]));
  assert.ok(C.choices(weaken).some(([k,j])=>k==='abilityLand'&&j===3));
  assert.ok(!C.choices(weaken).some(([k,j])=>k==='abilityLand'&&(j===4||j===5)));
  assert.ok(C.play(weaken,['abilityLand',3]));
  assert.equal(weaken.tiles[3].unit.st,0);assert.equal(weaken.players[0].cash,460);
  const harvest=idolMatch(),pyron=harvest.players[0];
  place(harvest,2,'hellpyron',0,0);
  Object.assign(pyron,{cash:500,pos:2});
  harvest.phase='land';harvest.destroyedCount=3;harvest.lastDestroyed=id('goblin');
  assert.ok(C.play(harvest,['ability',2]));
  assert.equal(pyron.cash,620);assert.equal(harvest.destroyedCount,0);assert.equal(harvest.lastDestroyed,id('goblin'));

  const burn=idolMatch();
  place(burn,2,'helltic',0,0);place(burn,3,'coaloid',1,0);place(burn,4,'minotaur',1,0);place(burn,5,'minotaur',0,0);
  Object.assign(burn.players[0],{cash:500,pos:2});burn.tiles[3].unit.hp=20;burn.phase='land';
  const fireVictimCash=burn.players[1].cash;
  assert.ok(C.play(burn,['ability',2])&&C.play(burn,['abilityLand',3]));
  assert.equal(burn.players[1].cash,fireVictimCash+100);assert.equal(burn.tiles[3].unit,null);
  assert.equal(burn.destroyedCount,1);
  const bolt=idolMatch();
  place(bolt,3,'coaloid',1,0);bolt.tiles[3].unit.hp=20;bolt.phase='spell';
  Object.assign(bolt.players[0],{cash:500,hand:[id('magicbolt')]});
  const boltVictim=bolt.players[1].cash;
  assert.ok(C.play(bolt,['cast',0])&&C.play(bolt,['targetLand',3]));
  assert.equal(bolt.players[1].cash,boltVictim+50);
  const bookworm=idolMatch();
  place(bookworm,2,'bookworm',0,1);
  Object.assign(bookworm.players[0],{cash:500,pos:2});
  Object.assign(bookworm.players[1],{hand:[id('longsword')],book:[id('goblin')]});
  bookworm.phase='land';
  assert.ok(C.play(bookworm,['ability',2])&&C.play(bookworm,['abilityPlayer',1]));
  assert.deepEqual(C.choices(bookworm),[['wormDiscard',0]]);
  assert.ok(C.play(bookworm,['wormDiscard',0]));
  assert.ok(!bookworm.players[1].hand.includes(id('longsword')));
  assert.equal(bookworm.players[0].cash,460);

  const purify=idolMatch();
  place(purify,2,'sharazad',0,0);
  Object.assign(purify.players[0],{cash:500,pos:2,status:'silence'});
  Object.assign(purify.players[1],{antiMagic:true,word:8});
  purify.phase='land';
  assert.ok(C.play(purify,['ability',2]));
  assert.deepEqual([purify.players[0].status,purify.players[1].antiMagic,purify.players[1].word],[undefined,undefined,undefined]);

  const llama=idolMatch();
  place(llama,2,'holyllama',0,3);
  llama.tiles[8].type=3;
  Object.assign(llama.players[0],{cash:500,pos:2});
  llama.phase='land';
  assert.ok(C.choices(llama).some(([k,from,to])=>k==='transfer'&&from===2&&to===8));
  assert.ok(C.play(llama,['ability',2])&&C.play(llama,['abilityPlayer',1]));
  assert.equal(llama.players[1].word,6);
  console.log('Saga ten native territory creatures: damage, healing, fog, private hand destruction and fixed die OK');
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
  const totem=C.start(2,2,5000,'begins-1'),totemOwner=totem.players[0];
  Object.assign(totem.tiles[2],{owner:0,type:0,unit:{id:C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)==='goldentotem'),hp:30}});
  Object.assign(totemOwner,{cash:100,pos:2});totem.phase='land';
  assert.ok(C.play(totem,['totem',2]));
  assert.equal(totemOwner.cash,500);assert.equal(totem.tiles[2].unit,null);

  assert.ok(C.validBook(C.presets.beginsArtAssault)&&C.validBook(C.presets.beginsTidalGuard));
  const supportArt=C.start(2,2,5000,'begins-original-ford');
  const combatant=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  supportArt.phase='attack';
  supportArt.battle={at:2,inv:combatant('terragoetia')};
  Object.assign(supportArt.players[0],{cash:500,hand:['goblin','dwarf','gascloud','magicshield'].map(combatant)});
  Object.assign(supportArt.tiles[2],{owner:1,type:2,unit:{id:combatant('fighter'),hp:40}});
  assert.deepEqual(C.choices(supportArt).filter(([k])=>k==='equip').map(([,index])=>index),[0,1,3]);
  const current=C.presets.intro;
  assert.equal(C.cards.filter(c=>!c.unlisted&&!c.catalogOnly).length,400);
  const creature=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const goblin=creature('goblin'),fighter=creature('fighter');
  const archive=require('../dist/cept-begins-player-books');
  const listed=new Set(C.cards.filter(c=>!c.unlisted).map(C.combo.key));
  assert.equal(archive.length,37);
  const size=recipe=>Object.values(recipe).reduce((sum,n)=>sum+n,0);
  assert.deepEqual(archive.filter(([, , ,recipe])=>size(recipe)!==40).map(([, ,source,recipe])=>[source,size(recipe)]),[['1354-red-wind',39]]);
  assert.ok(archive.every(([, , ,recipe])=>Object.keys(recipe).every(name=>listed.has(name))));
  const playable=[];
  for(const [, ,source,recipe] of archive){
    const book=C.presets['begins-'+source];
    if(!book)continue;
    assert.ok(C.validBook(book));
    assert.deepEqual(book.toSorted((a,b)=>a-b),Object.entries(recipe).flatMap(([name,n])=>Array(n).fill(creature(name))).sort((a,b)=>a-b));
    playable.push(source);
  }
  assert.deepEqual(playable,['1339-infernal-vacation','1342-mothman-and-friends','1343-aggroaf','1344-kelpez','1345-budget-raging-river',
    '1347-power-surge','1348-esupports#main','1348-esupports#alternate','1349-willowisp#main','1349-willowisp#alternate','1350-meme-book',
    '1351-beginner-book-upgrades-rg','1352-beginner-book-upgrades-by','1353-full-steam-ahead','1355-multi-meow','1356-support-deck-for-chapter-15',
    '1357-decoys-1-3','1358-raging-river-v3','1359-brynhildr','1360-how-about-no-v01','1361-2v2-drain','1362-iksear','1363-bistair','1364-wabbit-woods-1-1','1365-terrair','1366-selenear','1367-resident-evil','1368-mothra','1369-spell-damage',
    '1372-bonzey-buddy','1373-magic-spells-to-activate-kudzu','1374-mosquito-water','1375-kamikaze','1376-lets-water-the-plants','1377-assassin-red','1378-little-wonders']);
  const alphaBeta=archive.find(([, ,source])=>source==='1360-how-about-no-v01')[3];
  assert.ok(alphaBeta.battlegearalpha>0&&alphaBeta.battlegearbeta>0);
  const recipes={
    beginsStarterFireEarth:'airslasher battleaxe chainmail:2 dragonfly:2 dwarf:2 fighter:2 flametongue fly gnome:2 holyword1:2 holyword6:2 kobold longsword magicbolt manna:2 minotaur:2 phoenix:2 pillarofflame:2 scalearmor:2 tigerbeetle wallofstone:2 windofhope:2 wolf:2 woodfolk:2',
    beginsStarterWaterAir:'battleaxe chainmail:2 cornfolk:2 fighter:2 fly giantamoeba:2 giantbat harpy:2 holyword1:2 holyword6:2 hurricane:2 icicle kingtortoise:2 lizardman:2 longsword magicbolt manna:2 merfolk rockbiter scalearmor:2 spectre:2 wallofice:2 windofhope:2 wolf:2',
    beginsVeramiSeaWind:'bandit:3 dwarf:2 fighter:3 fly:3 giantrat:3 holyword1:2 holyword3:2 holyword6:3 lizardman:2 megalodon:2 merfolk:2 pirate:4 sage:3 shatter:2 wallofice woodfolk:3',
    beginsIsharaFirst:'cornfolk:3 fly:2 giantbat:3 gnome:3 haste:2 holyword3:2 holyword6:2 leatherarmor:3 mace:3 manna:2 phoenixamulet:2 spear:2 spectre:3 tigerbeetle:3 wallofstone:3 windofhope:2',
    beginsGanzBeast:'blynx:3 carbuncle:3 cerberus:3 chainmail:2 earthshift:2 fly:2 greattusker:3 growthbody:2 haste:2 jackalope:3 lunatichare:2 massgrowth:2 morningstar:2 scalearmor towershield vitality:2 weakness windofhope:2 wolf:2',
    beginsGanzInstinct:'batteringram:2 carbuncle:2 catapult:2 coati:2 earthshift:2 fly:3 gigantherium:3 greattusker:3 grimalkin:4 growthbody:2 haste:3 jackalope:4 massgrowth sage:2 towershield werewolf:2 windofhope:2',
    beginsGanzGiantBeasts:'batteringram:2 catapult:2 coati:3 cockatrice:2 earthshield:2 earthshift:2 fly:2 gigantherium:3 greattusker:3 grimalkin:3 haste:2 jackalope:3 odradek:3 sage:3 werewolf:2 windofhope:3',
    beginsTindalosFreeWind:'airshift:2 armet:2 bindingmist:3 bindingwhip:2 centaur:3 firebeak giantamoeba:2 gianteel:2 gremlinamulet:2 holyword3:2 hornet:3 leveller:2 nike:2 phoenix:2 senility:2 sprite:2 swordofthefalcon:2 windshield:2 windofhope:2',
    beginsNajaranMistral:'airslasher buckler caitsith:2 dragon:2 elf:2 firebeak:2 fly:2 gremlin:2 harpy:2 haste:2 knight:2 longsword magicshield:2 minotaur:2 mutation pillarofflame:2 removecurse:2 shatter:2 towershield windcutter:2 windofhope:3 wyvern:2',
    beginsPopoloDragon:'armet:2 basilisk dragon:2 dragonzombie:3 firebolt:2 fireshift:3 glaive:2 greatfossil:3 hellhound:3 hornedchameleon:3 influence:2 kingvaran:3 manna:2 mountainleap:2 relief:3 stonehail:2 wallofstone:2',
    beginsSteamdrillPierce:'colossus:2 drilllance:3 drool:2 golem:3 goldengoose:3 kobold:2 lavawurm:2 lizardman:3 mace:4 merfolk:2 morningstar:4 spear:4 statue:2 steamgear:2 wonderwall:2'
  };
  for(const [name,recipe] of Object.entries(recipes)){
    const book=C.presets[name];
    assert.ok(C.validBook(book));
    const expected=recipe.split(' ').flatMap(entry=>{
      const [name,count=1]=entry.split(':');
      return Array(Number(count)).fill(creature(name));
    });
    assert.deepEqual(book.slice().sort((a,b)=>a-b),expected.sort((a,b)=>a-b));
  }

  const axe=creature('battleaxe'),phoenix=creature('phoenix'),gnome=creature('gnome'),ice=creature('wallofice');
  const pirate=creature('pirate'),sage=creature('sage'),vest=creature('chainmail'),amulet=creature('gremlinamulet');
  assert.equal(C.cards[axe].st,40);
  const creatures=C.start(2,2,5000,'begins-original-ford'),enemy=creatures.players[1];
  const land=creatures.tiles[2];Object.assign(land,{type:2,owner:1,level:3,unit:{id:gnome,hp:40}});
  const toll=C.toll(creatures,land);land.unit.id=creature('dwarf');
  assert.equal(toll,C.toll(creatures,land)*1.5);
  function duel(inv,def,invItem=null,defItem=null,hp=C.cards[def].hp,type=0){
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv,atkItem:null,defItem:null}});
    Object.assign(land,{unit:{id:def,hp,mhp:hp},owner:1,type,level:1});
    creatures.players[0].cash=200;enemy.cash=200;enemy.hand=defItem==null?[]:[defItem];
    creatures.players[0].hand=invItem==null?[]:[invItem];
    assert.ok(C.play(creatures,invItem==null?['bare']:['equip',0]));
    assert.ok(C.play(creatures,defItem==null?['bare']:['equip',0]));
    return creatures.battle;
  }
  const mindShock=creature('mindshock'),tome=creature('abyssaltome'),doomNeedle=creature('doomneedle'),coin=creature('coinofpiety');
  const asleep=duel(fighter,goblin,mindShock,null,80,1);
  assert.deepEqual([asleep.attackST,land.unit.enchant,C.toll(creatures,land)],[30,'sleep',0]);
  assert.equal(duel(fighter,goblin,mindShock,creature('magicshield'),80,1).strikes[0].effect,'block');
  assert.equal(land.unit.enchant,undefined);
  const statue=creature('statue');
  assert.deepEqual(duel(fighter,goblin,tome,null,90,1).finalForms,[statue,statue]);
  assert.deepEqual([land.unit.id,land.unit.hp],[statue,50]);
  assert.deepEqual(duel(fighter,goblin,tome,creature('gaseousform'),90,1).finalForms,[statue,goblin]);
  const doomed=duel(fighter,goblin,doomNeedle,null,90,1);
  assert.ok(!doomed.won&&land.unit.hp>0&&land.unit.enchant==='senility');
  Object.assign(creatures,{phase:'attack',battle:{at:2,inv:fighter,atkItem:null,defItem:null}});
  assert.ok(C.play(creatures,['bare'])&&C.play(creatures,['bare']));
  assert.ok(creatures.battle.won);
  creatures.players[0].symbols=[10,29,2,0];
  assert.ok(!duel(fighter,goblin,coin,null,90,1).won);
  assert.deepEqual(creatures.players[0].symbols,[10,31,2,0]);
  creatures.players[0].symbols=[0,0,0,0];
  assert.ok(duel(fighter,goblin,coin,null,30,1).won);
  assert.deepEqual(creatures.players[0].symbols,[0,0,0,0]);
  const son=creature('sonascetic'),gremlin=creature('gremlin'),decoy=creature('decoy');
  const copiedGremlin=duel(fighter,son,axe,gremlin,30,0);
  assert.equal(copiedGremlin.attackST,C.cards[fighter].st);
  const acolyte=creature('flameacolyte');
  assert.equal(duel(son,decoy,acolyte,null,90,1).strikes[0].effect,'reflect');
  const priorSonBook=creatures.players[0].book;
  creatures.players[0].book=[axe];
  const copiedTriton=duel(son,goblin,creature('triton'),null,80,1);
  assert.deepEqual(copiedTriton.startHP[0],70);
  assert.match(copiedTriton.lines.join(' '),/카드 1장 뽑기/);
  assert.ok(creatures.players[0].hand.includes(axe));
  creatures.players[0].book=priorSonBook;
  assert.equal(duel(son,gremlin,acolyte,null,70,1).attackST,0);

  const chanceBefore=Math.random,amber=creature('ambermosquito'),tyrant=creature('tyrannosaurus'),rat=creature('giantrat');
  const bald=creature('baldanders'),ring=creature('proteanring'),trapTool=creature('trapezon');
  try{
    Math.random=()=>.85;
    const amberCombat=duel(goblin,amber);
    assert.deepEqual([amberCombat.forms[1],land.unit.id,land.unit.hp],[tyrant,amber,40]);
    const amberSupport=duel(son,goblin,amber,null,80,1);
    assert.deepEqual([amberSupport.forms[0],amberSupport.attackST,amberSupport.startHP[0]],[tyrant,50,60]);
    assert.ok(creatures.players[0].hand.includes(son));
    Math.random=()=>.05;
    assert.equal(duel(goblin,amber).forms[1],rat);
    for(const value of [.001,.08,.16,.24,.32,.45,.5,.62,.78,.85,.95,.999]){
      Math.random=()=>value;
      const random=duel(goblin,bald).forms[1];
      assert.notEqual(random,bald);
      assert.notEqual(C.cards[random].catalog.rarity,'E');
      const ornament=duel(fighter,gremlin,ring,null,95,1);
      assert.notEqual(ornament.forms[0],fighter);
      assert.notEqual(C.cards[ornament.forms[0]].catalog.rarity,'E');
    }
    const transformed=duel(goblin,fighter,null,trapTool);
    assert.deepEqual([transformed.forms[1],transformed.defendST,transformed.startHP[1],land.unit.id],[creature('baal'),50,60,fighter]);
    assert.equal(transformed.strikes[0].side,1);
  }finally{Math.random=chanceBefore;}
  const frost=duel(fighter,ice,null,null);
  assert.deepEqual([frost.startHP[1],frost.won],[60,false]);
  const valkyrie=creature('valkyrie');
  assert.ok(duel(valkyrie,goblin).won);
  assert.equal(land.unit.st,C.cards[valkyrie].st+10);
  const priorTritonBook=enemy.book;
  enemy.book=[fighter];
  const gearDraw=duel(goblin,creature('triton'),null,creature('freeze'));
  assert.match(gearDraw.strikes.find(hit=>hit.side===1).notes.join(' '),/45 피해/);
  assert.deepEqual(enemy.hand,[fighter]);
  enemy.book=priorTritonBook;
  const waterLand=creatures.tiles[6],oldWater={...waterLand};
  Object.assign(waterLand,{owner:1,type:1,unit:{id:goblin,hp:30}});
  const undine=creature('undine');
  const nymph=duel(creature('merfolk'),undine,null,null,C.cards[undine].hp,1);
  assert.deepEqual([nymph.startHP[1],nymph.strikes[0].effect],[50,'block']);
  Object.assign(waterLand,oldWater);
  const fallen=duel(fighter,phoenix,axe,null);
  assert.ok(fallen.won&&enemy.hand.includes(phoenix));
  const guarded=duel(fighter,sage,amulet,vest);
  assert.equal(guarded.startHP[1],60);
  const amoeba=creature('giantamoeba'),cornfolk=creature('cornfolk'),minotaur=creature('minotaur'),dwarf=creature('dwarf');
  for(const attacker of [minotaur,dwarf]){
    const neutralized=duel(attacker,amoeba);
    assert.equal(neutralized.strikes[0].effect,'block');
    assert.equal(land.unit.hp,30);
  }
  const verifiedTraits='nightmare pushpull wereboar greenmold lavawurm stormgiant firegiant ninja elf knight gargoyle sprite statue gianteel hellhound roadrunner lilith sandman pegasus caitsith hydra manticore coati mudman anubias steamgear wonderwall firebeak trojanhorse gigantherium aspidochelone dragon hornet';
  for(const name of verifiedTraits.split(' '))assert.equal(C.cards[creature(name)].catalogOnly,false,name);
  const giant=creature('firegiant'),giantEel=creature('gianteel'),merfolk=creature('merfolk');
  const againstWater=duel(giant,merfolk,null,null,100);
  assert.equal(againstWater.startHP[1]-againstWater.strikes[0].hp[1],Math.floor(C.cards[giant].st*1.5));
  assert.equal(duel(creature('dwarf'),giantEel).strikes[0].effect,'block');
  const piercing=duel(creature('lavawurm'),merfolk,null,null,100,1);
  assert.equal(piercing.landHP,10);
  assert.match(piercing.strikes[0].notes.join(' '),/지형 보너스 관통/);
  const repeated=duel(creature('pushpull'),goblin,null,null,100);
  assert.deepEqual(repeated.strikes.slice(0,2).map(strike=>strike.side),[0,0]);
  const wereboar=creature('wereboar');
  assert.equal(duel(goblin,wereboar).defendST,C.cards[wereboar].st+30);
  assert.equal(duel(goblin,creature('gargoyle')).defendST,50);
  const knight=creature('knight'),hitPoints=defenderHP=>{
    const battle=duel(knight,goblin,null,creature('diamondarmor'),defenderHP);
    return battle.startHP[1]-battle.strikes[0].hp[1];
  };
  assert.equal(hitPoints(49),C.cards[knight].st);
  assert.equal(hitPoints(50),Math.floor(C.cards[knight].st*1.5));
  duel(goblin,creature('greenmold'));
  assert.equal(land.unit.hp,50);
  assert.equal(duel(fighter,creature('pegasus'),creature('freeze'),null,100).strikes.find(strike=>strike.side===0)?.effect,'block');

  const road=C.start(2,2,5000,'begins-original-ford'),runnerId=creature('roadrunner');
  Object.assign(road.tiles[6],{owner:0,unit:{id:runnerId,hp:30}});
  road.players[0].pos=6;road.phase='land';
  const distances=C.choices(road).filter(([kind,from])=>kind==='transfer'&&from===6).map(([, ,to])=>to);
  assert.ok(distances.includes(7)&&distances.includes(8));
  assert.ok(!distances.includes(9));

  const cursedRaid=C.start(2,2,5000,'begins-original-ford'),gigantherium=creature('gigantherium');
  Object.assign(cursedRaid.tiles[2],{owner:0,unit:{id:gigantherium,hp:60,enchant:'phantasm'}});
  Object.assign(cursedRaid.tiles[3],{owner:1,unit:{id:fighter,hp:40}});
  Object.assign(cursedRaid,{phase:'attack',battle:{at:3,inv:gigantherium,from:2}});
  assert.ok(C.play(cursedRaid,['bare'])&&C.play(cursedRaid,['bare']));
  assert.equal(cursedRaid.battle.startHP[0],40);

  const durable=C.start(2,2,5000,'begins-original-ford'),sandman=creature('sandman');
  Object.assign(durable.tiles[2],{owner:1,unit:{id:sandman,hp:20}});
  Object.assign(durable.tiles[3],{owner:1,unit:{id:fighter,hp:30}});
  Object.assign(durable.players[0],{cash:500,hand:[id('globalinsectswarm')]});
  assert.ok(C.play(durable,['cast',0]));
  assert.equal(durable.tiles[2].unit.hp,20);
  assert.equal(durable.tiles[3].unit.hp,10);

  const rituals=C.start(2,2,5000,'begins-original-ford'),dragon=creature('dragon');
  rituals.phase='land';Object.assign(rituals.players[0],{pos:2,cash:500,hand:[dragon]});
  Object.assign(rituals.tiles[6],{type:0,owner:0,unit:{id:goblin,hp:30}});
  assert.ok(!C.choices(rituals).some(([kind])=>kind==='summon'));
  Object.assign(rituals.tiles[7],{type:0,owner:0,unit:{id:goblin,hp:30}});
  assert.ok(C.choices(rituals).some(([kind])=>kind==='summon'));
  rituals.tiles[2].type=1;assert.ok(!C.choices(rituals).some(([kind])=>kind==='summon'));
  const gearAlpha=creature('battlegearalpha'),gearBeta=creature('battlegearbeta'),bundle=creature('bundlegear');
  assert.notEqual(gearAlpha,gearBeta);
  assert.ok(C.validBook([gearAlpha,gearBeta,...current.slice(2)]));
  assert.ok(!C.validBook([bundle,...current.slice(1)]));
  for(const [metal,otherHalf] of [[gearAlpha,gearBeta],[gearBeta,gearAlpha]]){
    const merged=duel(fighter,metal,creature('freeze'),otherHalf);
    assert.equal(merged.forms[1],bundle);
    assert.equal(merged.startHP[1],70);
    assert.equal(merged.strikes.find(strike=>strike.side===0)?.effect,'block');
    assert.equal(land.unit.id,bundle);
    assert.equal(land.unit.hp,70);
  }
  const jackalope=creature('jackalope'),humbaba=creature('humbaba'),hare=creature('lunatichare');
  assert.deepEqual(C.cards[humbaba].catalog.additionalCost.split(','),['G','+[]']);
  for(const spell of ['bolt','dreadblast','evilblast','globalinsectswarm']){
    const rebirth=C.start(2,2,5000,'begins-original-ford');
    Object.assign(rebirth.players[0],{hand:[id(spell)],cash:500});
    Object.assign(rebirth.tiles[3],{owner:1,type:0,unit:{id:jackalope,hp:20}});
    assert.ok(C.play(rebirth,['cast',0]));
    if(spell!=='globalinsectswarm'){
      assert.equal(C.spellRevival(rebirth,rebirth.tiles[3],spell),C.cards[humbaba].name);
      assert.ok(C.play(rebirth,['targetLand',3]));
      assert.match(rebirth.mapEffect.label,/부활/);
    }
    assert.deepEqual([rebirth.tiles[3].owner,rebirth.tiles[3].unit.id,rebirth.tiles[3].unit.hp,rebirth.destroyedCount],[1,humbaba,40,1]);
  }
  assert.ok(duel(fighter,jackalope).won);
  assert.equal(land.unit.id,fighter);

  const swap=duel(hare,fighter,null,creature('diamondarmor'),28);
  assert.ok(!swap.won);
  assert.deepEqual([land.unit.st,land.unit.hp,land.unit.mhp],[28,40,40]);
  const rings=duel(hare,fighter,creature('ringofthesuccubus'),creature('mace'),100);
  assert.ok(rings.won);
  assert.equal(rings.strikes[1].hp[0],10);
  const grail=duel(fighter,fighter,null,creature('holygrail'));
  assert.equal(grail.strikes[0].effect,'block');
  assert.equal(enemy.cash,-20);
  assert.equal(duel(fighter,fighter,creature('freeze'),creature('holygrail')).strikes[0].effect,'block');
  assert.equal(enemy.cash,100);
  const bracelet=duel(goblin,fighter,creature('powerbracelet'));
  assert.deepEqual([bracelet.attackST,bracelet.startHP[0]],[40,60]);
  assert.ok(duel(fighter,goblin,creature('gemoflife'),null,55).finalHP.every(value=>value===0));
  assert.equal(land.owner,-1);
  duel(goblin,fighter,creature('silverplow'));
  assert.equal(land.level,1);
  duel(goblin,fighter,null,creature('silverplow'));
  assert.equal(land.level,2);
  const symbol=land.area*4;
  creatures.prices[symbol]=10;
  duel(minotaur,goblin,creature('offeringdoll'),null,70,0);
  assert.deepEqual([creatures.battle.won,creatures.prices[symbol]],[false,13]);
  const mirror=duel(minotaur,fighter,creature('prismaticwand'));
  assert.deepEqual([mirror.attackST,mirror.startHP[0]],[80,80]);
  const smoke=duel(fighter,fighter,creature('freeze'),creature('smoketorch'));
  assert.equal(smoke.strikes[0].effect,'block');
  const stale=duel(fighter,fighter,creature('stinkbottle'),creature('powerbracelet'));
  assert.deepEqual(stale.startHP,[40,40]);
  assert.ok(creatures.players[0].book.includes(creature('stinkbottle')));
  const defendedKris=duel(fighter,fighter,creature('kris'),amulet);
  assert.equal(defendedKris.attackST,70);
  const tearing=duel(minotaur,goblin,creature('tearinghalo'));
  assert.match(tearing.strikes[0].notes.join(' '),/45 피해/);
  const vorpal=duel(goblin,fighter,creature('vorpalsword'));
  assert.match(vorpal.strikes[0].notes.join(' '),/75 피해/);
  const goose=creature('goldengoose');
  assert.ok(duel(fighter,goblin,null,goose).won);
  assert.equal(enemy.cash,410);
  const phoenixRelic=creature('phoenixamulet');
  assert.equal(C.cards[phoenixRelic].cost,0);
  assert.ok(duel(fighter,minotaur,axe,phoenixRelic).won);
  assert.deepEqual([enemy.cash,enemy.hand],[200+C.cards[minotaur].cost,[minotaur]]);
  assert.ok(!duel(goblin,minotaur,null,phoenixRelic).won);
  assert.deepEqual([enemy.cash,enemy.hand],[200,[]]);
  assert.ok(duel(fighter,cornfolk,amulet,phoenixRelic).won);
  assert.deepEqual([enemy.cash,enemy.hand],[400,[]]);

  const deployment=C.start(2,2,5000,'begins-original-ford');
  const placements={megalodon:[0,2,3],giantnautilus:[0],dragonzombie:[3],troll:[0,3],cerberus:[3],griffon:[2]};
  Object.assign(deployment.players[0],{pos:2,cash:500});
  Object.assign(deployment.tiles[6],{type:2,owner:0,unit:{id:fighter,hp:40}});
  deployment.phase='land';
  for(const [name,restricted] of Object.entries(placements)){
    deployment.players[0].hand=[creature(name)];
    for(const type of [0,1,2,3]){
      deployment.tiles[2].type=type;
      assert.equal(C.choices(deployment).some(([k])=>k==='summon'),!restricted.includes(type),name+' land '+type);
    }
  }
  const troll=creature('troll'),zombie=creature('zombie'),tusker=creature('greattusker');
  assert.ok(C.cards[troll].catalog.placement.includes('R')&&C.cards[troll].catalog.placement.includes('Y'));
  duel(goblin,troll);
  assert.equal(land.unit.hp,40);
  const rotting=duel(goblin,zombie,null,creature('diamondarmor'));
  assert.deepEqual([rotting.startHP[1],land.unit.hp],[110,30]);
  assert.match(rotting.lines.join(' '),/기본 HP 20 감소/);
  assert.equal(duel(creature('harpy'),tusker).strikes[0].effect,'block');
  assert.equal(duel(fighter,tusker).strikes[0].effect,'hit');

  const traveling=C.start(2,2,5000,'begins-original-ford'),blynx=creature('blynx');
  const distant=traveling.tiles.findIndex((t,j)=>j!==2&&!C.board(traveling).links[2].includes(j)&&C.territoryType(t.type));
  Object.assign(traveling.tiles[2],{owner:0,unit:{id:blynx,hp:20}});
  traveling.tiles[distant].area=1;
  traveling.players[0].pos=2;traveling.phase='land';
  const canLeap=()=>C.choices(traveling).some(([k,from,to])=>k==='transfer'&&from===2&&to===distant);
  assert.ok(canLeap());
  const protectedBlynx=structuredClone(traveling);
  Object.assign(protectedBlynx,{phase:'spell',turn:1});
  Object.assign(protectedBlynx.players[1],{cash:500,hand:[id('bolt')]});
  Object.assign(protectedBlynx.tiles[3],{owner:0,unit:{id:fighter,hp:40}});
  assert.ok(C.play(protectedBlynx,['cast',0]));
  assert.deepEqual(C.choices(protectedBlynx),[['targetLand',3]]);
  traveling.tiles[2].unit.enchant='paralysis';assert.ok(!canLeap());
  delete traveling.tiles[2].unit.enchant;
  assert.ok(C.play(traveling,['transfer',2,distant]));
  assert.deepEqual([traveling.tiles[2].unit,traveling.tiles[distant].unit.id],[null,blynx]);
  const cornBattle=duel(fighter,cornfolk);
  assert.ok(cornBattle.won);
  assert.equal(enemy.cash,400);
  const guardedEarth=C.start(2,2,6000,'begins-original-ford');
  const grimalkin=creature('grimalkin'),odradek=creature('odradek');
  Object.assign(guardedEarth.players[0],{hand:[id('bolt')],cash:500});
  Object.assign(guardedEarth.tiles[3],{owner:1,unit:{id:grimalkin,hp:30}});
  Object.assign(guardedEarth.tiles[4],{owner:1,unit:{id:odradek,hp:20}});
  Object.assign(guardedEarth.tiles[6],{owner:1,unit:{id:fighter,hp:40}});
  assert.ok(C.play(guardedEarth,['cast',0]));
  assert.deepEqual(C.choices(guardedEarth),[['targetLand',4],['targetLand',6]]);
  assert.ok(C.play(guardedEarth,['targetLand',4]));
  assert.equal(guardedEarth.tiles[4].unit.hp,20);
  for(const inv of [grimalkin,odradek]){
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv}});
    Object.assign(creatures.players[0],{hand:[fighter,creature('dwarf'),minotaur,creature('merfolk')],cash:500});
    assert.deepEqual(C.choices(creatures).filter(([kind])=>kind==='equip'),[['equip',0],['equip',1]]);
  }
  const ritual=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
  const sakuya=creature('sakuya'),dryad=creature('dryad');
  assert.equal(C.territoryAbilityCost(C.cards[sakuya]),120);
  Object.assign(ritual.tiles[2],{owner:0,type:2,unit:{id:sakuya,hp:C.cards[sakuya].hp}});
  Object.assign(ritual.tiles[6],{owner:0,type:0,level:4,unit:{id:fighter,hp:40}});
  Object.assign(ritual.tiles[7],{owner:2,type:0,level:4,unit:{id:fighter,hp:40}});
  Object.assign(ritual,{phase:'land',visited:[2]});
  Object.assign(ritual.players[0],{pos:2,cash:400});
  assert.ok(C.play(ritual,['ability',2]));
  assert.deepEqual(C.choices(ritual),[['abilityLand',6]]);
  assert.ok(C.play(ritual,['abilityLand',6]));
  assert.deepEqual([ritual.players[0].cash,ritual.tiles[6].type,ritual.tiles[7].type],[280,2,0]);

  const nymphMove=C.start(2,2,6000,'begins-original-ford');
  Object.assign(nymphMove.tiles[2],{type:2,owner:0,unit:{id:dryad,hp:C.cards[dryad].hp}});
  const distantEarth=nymphMove.tiles.findIndex((t,i)=>t.type===2&&i!==2&&!C.board(nymphMove).links[2].includes(i));
  assert.ok(distantEarth>=0);
  nymphMove.players[0].pos=2;nymphMove.phase='land';
  assert.ok(C.play(nymphMove,['transfer',2,distantEarth]));
  assert.equal(nymphMove.tiles[distantEarth].unit.id,dryad);

  const recalling=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
  Object.assign(recalling.players[0],{pos:6,flags:C.board(recalling).forts.slice(),hand:[creature('wordofrecall')]});
  recalling.players[1].pos=8;
  assert.ok(C.play(recalling,['cast',0]));
  assert.deepEqual([recalling.phase,recalling.die,recalling.players[0].pos,recalling.players[0].lap,recalling.players[1].pos],['land',0,0,1,8]);


  const trapBook=C.presets['begins-1344-kelpez'];
  const trapCards=['kelpie','oldwillow','gelatinouswall','baal','conjurer','willothewisp','fay','corrosiverobe','corrosivespear','angrymask','exchange','gift'];
  for(const name of trapCards)assert.ok(creature(name)>=0,name);
  assert.equal(trapBook.filter(card=>card===creature('kelpie')).length,4);
  assert.deepEqual([C.cards[creature('oldwillow')].catalog.additionalCost,C.cards[creature('baal')].catalog.additionalCost],['R,R','R,+[]']);
  function approachTrap(name,type,owner,enchant){
    const m=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
    const card=creature(name);
    Object.assign(m,{phase:'fork',die:3,remaining:3});
    Object.assign(m.players[0],{pos:6,previous:5});
    Object.assign(m.tiles[7],{owner,type,level:3,unit:{id:card,hp:C.cards[card].hp,...(enchant?{enchant}:{})}});
    assert.ok(C.play(m,['route',7]));
    return m;
  }
  for(const [name,element] of [['kelpie',1],['oldwillow',0]]){
    const forced=approachTrap(name,element,1);
    assert.deepEqual([forced.phase,forced.players[0].pos,forced.remaining],['land',7,0]);
    assert.ok(C.choices(forced).some(([kind])=>kind==='pay'));
    assert.equal(approachTrap(name,2,1).players[0].pos,8);
    assert.equal(approachTrap(name,element,2).players[0].pos,8);
    assert.equal(approachTrap(name,element,1,'paralysis').players[0].pos,8);
  }

  const gel=creature('gelatinouswall'),robe=creature('corrosiverobe'),spear=creature('corrosivespear');
  const corrosion=duel(fighter,gel,creature('battleaxe'),robe);
  assert.deepEqual([corrosion.attackST,corrosion.startHP[1],enemy.cash],[40,80,330]);
  assert.match(corrosion.lines.join(' '),/파괴/);
  const coated=duel(fighter,gel,spear,creature('chainmail'));
  assert.deepEqual([coated.attackST,coated.startHP[1]],[70,50]);
  const protectedArmor=duel(fighter,gel,spear,creature('vestment'));
  assert.equal(protectedArmor.startHP[1],80);
  const scrollLost=duel(fighter,gel,creature('freeze'),robe);
  assert.equal(scrollLost.attackST,40);
  const counterattack=duel(fighter,gel,null,creature('angrymask'));
  assert.equal(counterattack.finalHP[0],0);
  assert.equal(counterattack.won,false);

  const conjurer=creature('conjurer'),baal=creature('baal'),fay=creature('fay');
  const summoning=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
  Object.assign(summoning,{phase:'land'});
  Object.assign(summoning.players[0],{pos:2,cash:400});
  Object.assign(summoning.tiles[2],{owner:0,unit:{id:conjurer,hp:30}});
  assert.ok(C.play(summoning,['ability',2]));
  assert.ok(!C.choices(summoning).some(([,at])=>at===0||at===2));
  assert.ok(C.play(summoning,['abilityLand',7]));
  assert.deepEqual([summoning.tiles[2].unit,summoning.tiles[7].owner,summoning.tiles[7].unit.id,summoning.players[0].cash],[null,0,baal,320]);

  const discardBook=enemy.book,oldRandomBaal=Math.random;
  try{
    Math.random=()=>0;
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv:goblin,atkItem:null,defItem:null}});
    Object.assign(land,{type:2,owner:1,unit:{id:baal,hp:50}});
    enemy.hand=[fighter,goblin];
    assert.ok(C.play(creatures,['bare'])&&C.play(creatures,['bare']));
    assert.deepEqual(enemy.hand,[goblin]);
  }finally{Math.random=oldRandomBaal;enemy.book=discardBook;}

  const wisp=creature('willothewisp'),lure=C.start(2,2,6000,'begins-original-ford');
  Object.assign(lure,{phase:'attack',battle:{at:2,inv:wisp,atkItem:null,defItem:null}});
  Object.assign(lure.tiles[2],{type:2,owner:1,unit:{id:goblin,hp:30}});
  lure.players[0].cash=50;lure.players[1].cash=10;
  assert.ok(C.play(lure,['bare'])&&C.play(lure,['bare']));
  assert.deepEqual([lure.battle.strikes[0].side,lure.players[0].cash,lure.players[1].cash],[1,110,-50]);

  const buff=C.start(2,2,6000,'begins-original-ford');
  Object.assign(buff,{phase:'land'});
  Object.assign(buff.players[0],{pos:2,cash:500});
  Object.assign(buff.tiles[2],{owner:0,unit:{id:fay,hp:40}});
  Object.assign(buff.tiles[3],{owner:0,unit:{id:fighter,hp:40,st:90}});
  assert.ok(C.play(buff,['ability',2])&&C.play(buff,['abilityLand',3]));
  assert.deepEqual([buff.players[0].cash,buff.tiles[3].unit.st],[450,100]);

  const castExchange=C.start(4,4,6000,'begins-original-ford',trapBook,undefined,0,'teams');
  Object.assign(castExchange.players[0],{pos:0,cash:150,hand:[creature('exchange'),creature('kelpie'),fay]});
  Object.assign(castExchange.tiles[3],{type:1,owner:0,level:3,unit:{id:gel,hp:18,enchant:'poison'}});
  Object.assign(castExchange.tiles[7],{type:1,owner:2,unit:{id:goblin,hp:30}});
  assert.ok(C.play(castExchange,['cast',0]));
  assert.deepEqual(C.choices(castExchange),[['targetLand',3]]);
  assert.ok(C.play(castExchange,['targetLand',3]));
  assert.deepEqual(C.choices(castExchange),[['replaceCard',0,creature('kelpie')]]);
  const restoredSwap=JSON.parse(JSON.stringify(castExchange));
  assert.ok(C.play(restoredSwap,['replaceCard',0,creature('kelpie')]));
  assert.deepEqual([restoredSwap.players[0].cash,restoredSwap.tiles[3].unit,restoredSwap.tiles[3].level,restoredSwap.players[0].hand],
    [90,{id:creature('kelpie'),hp:30},3,[gel,fay]]);

  const gift=C.start(4,4,6000,'begins-original-ford');
  gift.players.forEach((q,i)=>{q.cash=200+i*200;});
  Object.assign(gift.players[0],{hand:[creature('gift')],book:[goblin,fighter,goblin,fighter,goblin]});
  assert.ok(C.play(gift,['cast',0]));
  assert.deepEqual([gift.players[0].cash,gift.players[0].hand,gift.players[0].book],[320,[goblin,fighter,goblin,fighter],[goblin]]);


  {
    const lords=['flamelord','dagon','darkmaster','beelzebub'].map(creature);
    const mercenary=creature('mastermonk'),ares=creature('ares'),quetz=creature('quetzalcoatl');
    const sealed=creature('voidorb'),deathquito=creature('deathquito'),yeti=creature('yeti');
    assert.equal(duel(mercenary,goblin).attackST,50);
    assert.equal(duel(mercenary,goblin,axe).startHP[0],50);
    assert.equal(duel(creature('minotaur'),yeti).strikes[0].effect,'block');
    assert.equal(duel(creature('nike'),fighter,null,sealed).strikes[0].side,0);
    assert.notEqual(land.unit?.enchant,'paralysis');
    const spare=creatures.tiles[4],beforeSpare={...spare};
    const supporting=creatures.tiles[5],beforeSupporting={...supporting};
    const species=['minotaur','merfolk','dwarf','harpy'];
    for(const [element,lord] of lords.entries()){
      const card=creature(species[element]);
      const cost=C.cards[lord].catalog.additionalCost.split(',');
      assert.deepEqual(cost,[...'RBGY'[element].repeat(2),'+[]']);
      Object.assign(spare,{owner:1,unit:{id:lord,hp:C.cards[lord].hp}});
      const blessed=duel(card,goblin);
      assert.deepEqual([blessed.attackST,blessed.startHP[0]],[C.cards[card].st+(element>=2?10:0),C.cards[card].hp+(element<2?10:0)]);
      spare.unit.enchant='paralysis';
      const unblessed=duel(card,goblin);
      assert.deepEqual([unblessed.attackST,unblessed.startHP[0]],[C.cards[card].st,C.cards[card].hp]);
      Object.assign(spare,beforeSpare);
      duel(lord,goblin);
      assert.equal(creatures.players[0].cash,100);
    }
    Object.assign(spare,{owner:1,unit:{id:ares,hp:60}});
    Object.assign(supporting,{owner:0,unit:{id:quetz,hp:50}});
    assert.equal(duel(mercenary,mercenary).attackST,80);
    Object.assign(spare,beforeSpare);
    assert.equal(duel(creature('garuda'),goblin).attackST,10);
    Object.assign(supporting,beforeSupporting);
    const reshaped=duel(creature('leviathan'),goblin,null,null,30,2);
    assert.ok(reshaped.won&&land.type===1);
    duel(fighter,creature('bloodypudding'),null,creature('colossus'),70);
    assert.equal(land.unit.mhp,100);

    function incoming(who,guardGear,extraCards){
      Object.assign(creatures,{phase:'attack',battle:{at:2,inv:who,atkItem:null,defItem:null}});
      Object.assign(land,{type:2,owner:1,unit:{id:fighter,hp:40}});
      enemy.cash=200;enemy.hand=extraCards.concat(guardGear==null?[]:[guardGear]);
      assert.ok(C.play(creatures,['bare'])&&C.play(creatures,guardGear==null?['bare']:['equip',extraCards.length]));
    }
    const oldFateBook=enemy.book;
    const randomDeathquito=Math.random;
    Math.random=()=>0;
    try{
      incoming(deathquito,null,[goblin,fighter]);
      assert.deepEqual(enemy.hand,[fighter]);
      incoming(deathquito,sealed,[goblin,fighter]);
      assert.deepEqual(enemy.hand,[goblin,fighter]);
    }finally{Math.random=randomDeathquito;}
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv:mercenary,atkItem:null,defItem:null}});
    Object.assign(land,{type:2,owner:1,unit:{id:creature('fate'),hp:40}});
    enemy.hand=Array(6).fill(goblin);enemy.book=[fighter];
    assert.ok(C.play(creatures,['bare'])&&C.play(creatures,['bare']));
    assert.deepEqual(enemy.hand,[...Array(6).fill(goblin),fighter]);
    enemy.book=oldFateBook;

    const classes=[
      ['bistair','minotaur','battleaxe'],['iksear','merfolk','chainmail'],
      ['selenear','dwarf','armet'],['terrair','harpy','freeze']
    ];
    for(const [spell,beast,gear] of classes){
      const god=creature(spell),ally=creature(beast),equipment=creature(gear);
      const bless=C.start(4,4,6000,'begins-original-ford');
      const worshipper=bless.players[0];
      assert.equal(C.copyLimit(C.cards[god]),1);
      Object.assign(worshipper,{hand:[god],book:[ally,goblin,equipment,fighter],cash:100});
      bless.players[1].peek={seat:0,ids:[fighter,equipment,goblin,ally]};
      assert.ok(C.play(bless,['cast',0]));
      assert.deepEqual([worshipper.cash,worshipper.hand,worshipper.book,bless.players[1].peek],[40,[equipment,ally],[goblin,fighter],undefined]);
      Object.assign(bless,{phase:'spell'});
      Object.assign(worshipper,{hand:[god],book:[goblin,equipment],cash:100});
      assert.ok(C.play(bless,['cast',0]));
      assert.deepEqual([worshipper.hand,worshipper.book],[[equipment],[goblin]]);
    }

    const aid=C.start(2,2,6000,'begins-original-ford');
    const alga=creature('algasphere'),healer=creature('healer');
    aid.phase='land';Object.assign(aid.players[0],{pos:2,cash:150});
    Object.assign(aid.tiles[2],{owner:0,unit:{id:alga,hp:30,mhp:90}});
    assert.ok(C.play(aid,['ability',2]));
    assert.deepEqual([aid.tiles[2].unit.hp,aid.tiles[2].unit.mhp,aid.players[0].cash],[40,100,90]);
    Object.assign(aid,{phase:'land',turn:0});aid.tiles[2].unit={id:healer,hp:20};
    Object.assign(aid.tiles[3],{owner:0,unit:{id:fighter,hp:10}});
    assert.ok(C.play(aid,['ability',2])&&C.play(aid,['abilityLand',3]));
    assert.deepEqual([aid.tiles[3].unit.hp,aid.players[0].cash],[40,80]);

    const theft=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
    const giftId=creature('gift');
    Object.assign(theft.players[0],{hand:[creature('theft')],cash:100});
    theft.players[1].hand=[goblin,giftId];theft.players[2].hand=[giftId];theft.players[3].hand=[fighter];
    assert.ok(C.play(theft,['cast',0]));
    assert.deepEqual(C.choices(theft),[['targetPlayer',1]]);
    assert.ok(C.play(theft,['targetPlayer',1]));
    assert.deepEqual(C.choices(theft),[['stealCard',1,giftId]]);
    const visible=require('../dist/cept-room-state').view(C,theft,0);
    assert.deepEqual([visible.game.players[1].hand,visible.choices],[[],[['stealCard',1,giftId]]]);
    assert.ok(C.play(theft,['stealCard',1,giftId]));
    assert.deepEqual([theft.players[0].hand,theft.players[1].hand],[[giftId],[goblin]]);
  }


  {
    assert.equal(C.battleCombos.length,10);
    for(const [i,{groups}] of C.battleCombos.entries()){
      const book=C.practiceBook(i);
      assert.ok(C.validBook(book));
      const names=book.map(id=>C.combo.key(C.cards[id]));
      assert.ok(C.combo.matches(groups,names));
    }
    const whip=creature('bindingwhip'),monk=creature('mastermonk');
    assert.equal(duel(monk,fighter,whip,null,100,2).strikes.length,1);
    assert.equal(land.unit?.enchant,'paralysis');
    const skeleton=creature('skeleton'),shield=creature('spikedshield');
    const reflection=duel(goblin,skeleton,null,shield,40,2);
    assert.match(reflection.lines.join(' '),/재생/);
    assert.deepEqual([reflection.strikes[0].hp[0],reflection.strikes[0].hp[1],land.unit.hp],[20,30,40]);
    const pegasus=creature('pegasus'),gas=creature('gaseousform'),scroll=creature('freeze');
    assert.equal(duel(fighter,pegasus,null,gas).strikes.find(hit=>hit.side===0).effect,'block');
    assert.equal(duel(fighter,pegasus,scroll,gas).strikes.find(hit=>hit.side===0).effect,'block');

    const bandit=creature('bandit'),executor=creature('executor'),tonfa=creature('tonfa');
    const hireling=duel(bandit,fighter,executor);
    assert.equal(hireling.attackST,90);
    assert.deepEqual([creatures.players[0].cash,enemy.cash],[340,20]);
    const repeat=duel(bandit,fighter,tonfa,null,100,2);
    assert.deepEqual(repeat.strikes.slice(0,2).map(hit=>hit.side),[0,0]);
    assert.equal(enemy.cash,120);
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv:bandit,atkItem:null,defItem:null}});
    Object.assign(land,{type:2,owner:1,unit:{id:fighter,hp:40}});
    Object.assign(creatures.players[0],{hand:[executor],cash:100});
    enemy.cash=10;
    assert.ok(C.play(creatures,['equip',0])&&C.play(creatures,['bare']));
    assert.deepEqual([creatures.players[0].cash,enemy.cash],[240,-170]);

    const cait=creature('caitsith'),buckler=creature('buckler');
    for(const foe of [fighter,goblin])assert.equal(duel(foe,cait,null,buckler).strikes[0].effect,'block');
    const priorStormBook=enemy.book;
    enemy.book=[fighter];
    const storm=creature('stormcauser'),recycleStorm=duel(goblin,creature('centaur'),null,storm);
    assert.deepEqual([recycleStorm.strikes[0].side,recycleStorm.defendST,recycleStorm.startHP[1]],[1,90,10]);
    assert.ok(enemy.book.includes(storm));
    enemy.book=priorStormBook;
    const ram=creature('batteringram');
    for(const transformer of ['medusa','cockatrice']){
      const hit=duel(creature(transformer),fighter,ram,null,100,2);
      assert.ok(hit.won);
      assert.match(hit.lines.join(' '),/변신.*즉사/);
    }
    const decoy=creature('decoy'),torch=creature('smoketorch'),grail=creature('holygrail');
    assert.equal(duel(fighter,decoy,null,torch,C.cards[decoy].hp,2).strikes[0].effect,'reflect');
    for(const guard of [torch,grail])assert.equal(duel(fighter,decoy,scroll,guard).strikes[0].effect,'block');
    const bigWall=duel(fighter,creature('gelatinouswall'),null,creature('diamondarmor'),50,2);
    assert.deepEqual([bigWall.startHP[1],enemy.cash],[110,340]);

    const printed=C.start(2,2,6000,'begins-original-ford');
    const player=printed.players[0],sprite=creature('sprite'),willow=creature('oldwillow');
    const dream=creature('dreamterrain');
    assert.equal(C.cards[dream].cost,70);
    assert.equal(C.cards[sprite].catalog.placement,'G');
    assert.equal(C.cards[willow].catalog.additionalCost,'R,R');
    Object.assign(player,{pos:3,cash:500,hand:[sprite,willow]});
    Object.assign(printed,{phase:'land'});
    printed.tiles[3].type=2;
    assert.ok(!C.choices(printed).some(([action])=>action==='summon'));
    printed.tiles[3].type=3;
    Object.assign(printed.tiles[6],{type:0,owner:0,unit:{id:goblin,hp:30}});
    assert.deepEqual(C.choices(printed).filter(([action])=>action==='summon'),[['summon',0]]);
    Object.assign(printed.tiles[7],{type:0,owner:0,unit:{id:goblin,hp:30}});
    assert.deepEqual(C.choices(printed).filter(([action])=>action==='summon'),[['summon',0],['summon',1]]);
    printed.phase='spell';player.hand=[dream];player.cash=69;
    assert.ok(!C.choices(printed).some(([action])=>action==='cast'));
    player.cash=70;
    assert.ok(C.play(printed,['cast',0]));
    assert.equal(player.cash,0);
  }


  {
    const added='archbishop cleric doppelganger samurai thief chimera domovikha domovoi salamander sharazad apsaras behemoth charon kraken madclown seabonze vodyanoi angostura giantspider goobaqueen vampire archer dhampir holyllama mothman myrmecoleo nue powdereater pulgasari succubus witch';
    for(const name of added.split(' '))assert.ok(creature(name)>=0,name);
    const wispBook=enemy.book,priorRandom=Math.random;
    try{
      const samurai=creature('samurai');
      Math.random=()=>.69;
      assert.ok(duel(samurai,fighter,null,null,100,2).won);
      Math.random=()=>.7;
      assert.equal(duel(samurai,fighter,null,null,100,2).won,false);
      assert.ok(duel(creature('cleric'),fighter,null,null,100,2).won);
      assert.ok(!duel(creature('cleric'),creature('dwarf'),null,null,100,2).won);
      assert.equal(duel(creature('doppelganger'),fighter,null,null,100,2).forms[0],fighter);
      const theft=duel(creature('thief'),fighter,null,axe,100,2);
      assert.deepEqual([theft.attackST,theft.defendST],[C.cards[creature('thief')].st+40,40]);
      const drained=duel(creature('succubus'),fighter,null,axe,100,2);
      assert.equal(land.unit.st,0);
      assert.match(drained.strikes.find(hit=>hit.side===1).notes.join(' '),/40 피해/);

      const giant=creature('behemoth');
      for(const [weapon,battleLoss] of [[null,false],[axe,true]]){
        Object.assign(creatures,{phase:'attack',battle:{at:2,inv:fighter,atkItem:null,defItem:null}});
        Object.assign(land,{owner:1,type:2,level:1,unit:{id:giant,hp:60}});
        creatures.players[0].cash=200;enemy.cash=200;
        creatures.players[0].hand=weapon==null?[]:[weapon];enemy.hand=[goblin,fighter];
        assert.ok(C.play(creatures,weapon==null?['bare']:['equip',0])&&C.play(creatures,['bare']));
        assert.equal(creatures.battle.won,battleLoss);
        assert.equal(enemy.hand.length,battleLoss?2:1);
      }
      const ferryman=duel(fighter,creature('charon'),null,null,30,2);
      assert.equal(ferryman.strikes[0].effect,'block');
      assert.equal(enemy.cash,120);
      assert.equal(duel(creature('minotaur'),creature('salamander'),null,null,40,2).strikes[0].effect,'heal');
      assert.equal(duel(fighter,creature('kraken'),null,null,50,2).strikes[0].effect,'block');
      assert.equal(duel(fighter,creature('seabonze'),axe,null,40,2).attackST,40);
      const hpBless=creatures.tiles[6],savedLand={...hpBless};
      Object.assign(hpBless,{type:0,owner:1,unit:{id:goblin,hp:30}});
      assert.equal(duel(fighter,creature('kraken'),null,null,50,2).startHP[1],30);
      hpBless.unit={id:creature('madclown'),hp:20};
      assert.equal(duel(goblin,fighter,null,null,40,2).startHP[1],50);
      hpBless.unit={id:creature('nue'),hp:50};
      assert.equal(duel(fighter,goblin,null,null,30,2).attackST,30);
      hpBless.unit={id:goblin,hp:30};
      assert.equal(duel(creature('mothman'),goblin,null,null,30,2).attackST,40);
      Object.assign(hpBless,savedLand);
      Math.random=()=>.79;
      assert.equal(duel(fighter,creature('vodyanoi'),null,null,40,1).finalHP[0],0);
      assert.equal(duel(goblin,creature('angostura'),null,null,70,2).finalHP[0],0);
      assert.equal(duel(creature('giantspider'),fighter,null,null,100,2).strikes.length,1);
      assert.equal(land.unit.enchant,'paralysis');
      const healed=duel(goblin,creature('vampire'),null,null,15,2);
      assert.ok(healed.finalHP[1]>15);
      assert.equal(duel(creature('dwarf'),creature('dhampir'),null,null,40,2).strikes[0].effect,'block');

      const myrmecoleo=creature('myrmecoleo');
      const revived=duel(fighter,myrmecoleo,axe,null,40,2);
      assert.equal(revived.finalForms[1],creature('dragonfly'));
      assert.equal(land.unit.id,creature('dragonfly'));
      duel(goblin,creature('pulgasari'),creature('mace'),vest,40,2);
      assert.equal(land.unit.mhp,50);

      const angel=creature('apsaras');
      for(const [level,expected] of [[2,'hit'],[3,'block']]){
        Object.assign(creatures,{phase:'attack',battle:{at:2,inv:goblin,atkItem:null,defItem:null}});
        Object.assign(land,{owner:1,type:1,level,unit:{id:angel,hp:30}});
        enemy.hand=[];
        assert.ok(C.play(creatures,['bare'])&&C.play(creatures,['bare']));
        assert.equal(creatures.battle.strikes[0].effect,expected);
      }
    }finally{Math.random=priorRandom;enemy.book=wispBook;}

    function command(unit){
      const s=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
      Object.assign(s.players[0],{pos:2,cash:300});
      Object.assign(s.tiles[2],{owner:0,unit:{id:creature(unit),hp:40}});
      s.phase='land';
      return s;
    }
    const lap=command('chimera');
    Object.assign(lap,{phase:'roll'});
    Object.assign(lap.players[0],{pos:1,previous:2,dir:1,word:1,flags:C.board(lap).forts.slice()});
    lap.tiles[2].unit.st=95;
    assert.ok(C.play(lap,['roll']));
    assert.deepEqual([lap.players[0].lap,lap.tiles[2].unit.st],[1,100]);
    const priest=command('archbishop');
    const blessed=priest.tiles[3];
    Object.assign(blessed,{owner:0,unit:{id:fighter,hp:40,enchant:'landprotection'}});
    assert.ok(C.play(priest,['ability',2])&&C.play(priest,['abilityLand',3]));
    assert.deepEqual([priest.players[0].cash,blessed.unit.enchant],[270,undefined]);
    for(const [unit,enchant,cost] of [['domovikha','landprotection',80],['domovoi','phantasm',30]]){
      const m=command(unit);
      Object.assign(m.tiles[3],{owner:0,unit:{id:fighter,hp:40}});
      assert.ok(C.play(m,['ability',2])&&C.play(m,['abilityLand',3]));
      assert.deepEqual([m.players[0].cash,m.tiles[3].unit.enchant],[300-cost,enchant]);
    }
    const ranged=command('archer');
    Object.assign(ranged.tiles[3],{owner:2,unit:{id:fighter,hp:35}});
    assert.ok(C.play(ranged,['ability',2])&&C.play(ranged,['abilityLand',3]));
    assert.deepEqual([ranged.players[0].cash,ranged.tiles[3].unit.hp],[280,25]);
    const gem=command('sharazad');
    gem.players[0].status='slow';gem.players[1].status='haste';
    assert.ok(C.play(gem,['ability',2]));
    assert.deepEqual([gem.players[0].cash,gem.players[0].status,gem.players[1].status],[270,undefined,undefined]);
    const queen=command('goobaqueen');
    assert.ok(C.play(queen,['ability',2])&&C.play(queen,['abilityLand',3]));
    assert.deepEqual([queen.tiles[3].owner,queen.tiles[3].unit.id,queen.players[0].cash],[0,creature('gooba'),280]);
    assert.equal(queen.tiles[2].unit.id,creature('goobaqueen'));
    const llama=command('holyllama');
    assert.ok(C.choices(llama).some(([kind,from,at])=>kind==='transfer'&&from===2&&at===15));
    assert.ok(C.play(llama,['ability',2])&&C.play(llama,['abilityPlayer',1]));
    assert.deepEqual([llama.players[0].cash,llama.players[1].word],[270,6]);
    const drain=command('witch');
    drain.players[1].hand=[goblin,axe,creature('gift')];
    drain.players[1].cash=100;
    assert.ok(C.play(drain,['ability',2])&&C.play(drain,['abilityPlayer',1]));
    assert.deepEqual([drain.players[0].cash,drain.players[1].cash],[330,40]);

    const split=command('powdereater'),powder=creature('powdereater');
    assert.ok(C.play(split,['transfer',2,3]));
    assert.deepEqual([split.tiles[2].unit.id,split.tiles[3].unit.id],[powder,powder]);
    const moveSpell=command('powdereater');
    Object.assign(moveSpell,{phase:'spell'});
    Object.assign(moveSpell.players[0],{hand:[creature('chariot')],pos:3});
    moveSpell.tiles[3].unit=moveSpell.tiles[2].unit;
    moveSpell.tiles[3].owner=0;moveSpell.tiles[2].owner=-1;moveSpell.tiles[2].unit=null;
    assert.ok(C.play(moveSpell,['cast',0])&&C.play(moveSpell,['targetLand',3])&&C.play(moveSpell,['teleTo',5]));
    assert.deepEqual([moveSpell.tiles[3].unit,moveSpell.tiles[5].unit.id],[null,powder]);
  }


  {
    const onyx=creature('onyx'),cap=creature('redcap'),globster=creature('paleglobster');
    const high=duel(onyx,fighter,null,null,40,2),low=duel(onyx,goblin,null,null,30,2);
    assert.match(high.strikes[0].notes.join(' '),/60 피해/);
    assert.match(low.strikes[0].notes.join(' '),/40 피해/);
    const warded=duel(fighter,onyx,creature('freeze'),null,40,2);
    assert.deepEqual([warded.landHP,warded.strikes[0].effect],[10,'block']);

    const stack=creatures.tiles[6],oldStack={...stack};
    Object.assign(stack,{owner:0,unit:{id:goblin,hp:30}});
    const goblins=duel(cap,goblin,null,null,30,2);
    assert.deepEqual([goblins.attackST,goblins.startHP[0]],[40,40]);
    stack.unit={id:cap,hp:30};
    assert.equal(duel(goblin,fighter).attackST,40);
    Object.assign(stack,oldStack);
    const scale=duel(fighter,globster,null,null,40,2);
    assert.deepEqual([scale.defendST,scale.startHP[1]],[30,50]);

    const cloak=creature('neutralcloak');
    const shift=duel(fighter,creature('minotaur'),null,cloak,40,0);
    assert.deepEqual([shift.landHP,shift.startHP[1]],[0,80]);
    const scarab=creature('necroscarab');
    const raised=duel(fighter,goblin,axe,scarab,30,2);
    assert.equal(raised.finalForms[1],creature('zombie'));
    assert.equal(land.unit.id,creature('zombie'));
    const relic=creature('migoalblessing');
    assert.match(duel(fighter,creature('merfolk'),relic,null,100,2).strikes[0].notes.join(' '),/90 피해/);
    assert.equal(duel(creature('minotaur'),fighter,null,relic,40,2).strikes[0].effect,'block');

    const barong=creature('barong');
    duel(fighter,barong,axe,null,50,2);
    assert.ok(enemy.hand.includes(barong));
    const guardian=C.start(2,2,6000,'begins-original-ford');
    Object.assign(guardian.players[0],{pos:2,cash:600,hand:[creature('watershift')]});
    Object.assign(guardian.tiles[2],{owner:0,type:2,level:3,unit:{id:barong,hp:50}});
    guardian.phase='land';
    assert.ok(C.choices(guardian).some(([action])=>action==='level'));
    assert.ok(!C.choices(guardian).some(([action])=>action==='element'));
    guardian.phase='spell';
    assert.ok(C.play(guardian,['cast',0]));
    assert.deepEqual(C.choices(guardian),[['fizzle']]);

    function casting(spell,sacrifice=false){
      const s=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
      Object.assign(s.players[0],{pos:2,cash:450,hand:sacrifice?[creature(spell),fay]:[creature(spell)]});
      return s;
    }
    function castSpell(s,sacrifice=false){
      assert.ok(C.play(s,['cast',0]));
      if(sacrifice){
        assert.equal(s.phase,'sacrifice');
        assert.ok(C.play(s,['sacrifice',1]));
      }
    }

    const race=casting('footrace');
    [470,400,300,200].forEach((cash,seat)=>{race.players[seat].cash=cash;});
    race.players[1].antiMagic=true;
    castSpell(race);
    assert.deepEqual(race.players.map(p=>[p.status,p.diceLimitRolls,p.antiMagic]),Array(4).fill(['footrace',2,undefined]));
    assert.ok(C.play(race,['roll']));
    assert.deepEqual([race.die,race.players[0].diceLimitRolls],[2,1]);
    race.phase='roll';race.turn=0;race.players[0].cash=100;race.fly=true;
    assert.ok(C.play(race,['roll']));
    assert.deepEqual([race.die,race.mapEffect.faces,race.players[0].status],[16,[8,8],undefined]);
    assert.deepEqual(race.players.slice(1).map(p=>p.diceLimitRolls),[2,2,2]);

    const grasp=casting('unholygrasp');
    grasp.prices=[15,24,59,7];
    grasp.players[0].symbols=[0,0,0,1];
    grasp.players[1].symbols=[8,2,9,0];grasp.players[1].cash=200;
    grasp.players[3].symbols=[18,0,0,0];
    castSpell(grasp);
    assert.deepEqual(C.choices(grasp),[['targetPlayer',0],['targetPlayer',1],['targetPlayer',3]]);
    assert.ok(C.play(grasp,['targetPlayer',1]));
    assert.deepEqual([grasp.players[0].cash,grasp.players[1].symbols,grasp.players[1].cash],[901,[8,2,0,0],200]);

    const forced=casting('telekinesis',true);
    const shark=creature('megalodon');
    Object.assign(forced.tiles[2],{owner:1,type:1,unit:{id:shark,hp:50,enchant:'immobilize'}});
    for(const at of C.board(forced).links[2])if(at!==3)forced.tiles[at].type=0;
    Object.assign(forced.tiles[3],{type:1});
    castSpell(forced,true);
    assert.ok(C.play(forced,['targetLand',2]));
    assert.deepEqual(C.choices(forced),[['teleTo',3]]);
    assert.ok(C.play(forced,['teleTo',3]));
    assert.deepEqual([forced.tiles[2].unit,forced.tiles[3].owner,forced.tiles[3].unit,forced.phase],[null,1,{id:shark,hp:50},'roll']);

    const roomView=require('../dist/cept-room-state').view;
    const smith=casting('blacksmith');
    smith.players[0].hand.push(fighter);
    smith.players[1].hand=[goblin,fay];
    smith.players[2].hand=[];
    castSpell(smith);
    assert.ok(C.choices(smith).some(([,seat])=>seat===0));
    assert.ok(!C.choices(smith).some(([,seat])=>seat===2));
    assert.ok(C.play(smith,['targetPlayer',1]));
    assert.deepEqual(roomView(C,smith,0).choices,[['forgeCard',0,goblin],['forgeCard',1,fay]]);
    assert.deepEqual(roomView(C,smith,0).game.players[1].hand,[]);
    assert.deepEqual(roomView(C,smith,1).choices,[]);
    assert.ok(C.play(smith,['forgeCard',1,fay]));
    assert.equal(smith.players[1].hand[0],goblin);
    assert.ok(['weapon','armor'].includes(C.cards[smith.players[1].hand[1]].category));

    const reform=casting('reform',true),wind=creature('windofhope'),manna=creature('manna');
    for(const [seat,q] of reform.players.entries()){if(seat!==0)q.hand=[goblin];q.hand.push(wind);q.book=[fay,wind,goblin,wind];}
    reform.players[0].peek={seat:1,ids:[wind,goblin]};
    reform.players[1].template=[wind,goblin];
    reform.players[1].hand.unshift(goblin);
    castSpell(reform,true);
    assert.ok(!C.choices(reform).some(([,seat])=>seat===2));
    assert.ok(C.play(reform,['targetPlayer',1]));
    assert.deepEqual(C.choices(reform),[['reformCard',reform.players[1].hand.indexOf(wind),wind]]);
    const reformAction=C.choices(reform)[0];
    assert.ok(C.play(reform,reformAction));
    assert.ok(reform.players.every(q=>!q.hand.includes(wind)&&q.hand.includes(manna)&&q.book.join() === [fay,manna,goblin,manna].join()));
    assert.deepEqual([reform.players[1].template,reform.players[0].peek],[[wind,goblin],undefined]);

    const poison=casting('poisonmind'),hidden=[axe,goblin,manna,wind,fay,fighter,barong];
    poison.players[1].book=hidden.slice();
    poison.players[0].peek={seat:1,ids:[barong,fighter]};
    castSpell(poison);
    assert.ok(C.play(poison,['targetPlayer',1]));
    assert.deepEqual(roomView(C,poison,0).choices.map(([, ,id])=>id),hidden.slice(1).reverse());
    assert.ok(poison.players.slice(1).every((_,index)=>roomView(C,poison,index+1).choices.length===0));
    assert.ok(poison.players.every((_,seat)=>!roomView(C,poison,seat).game.players[1].book));
    assert.ok(C.play(poison,['poisonBookCard',2,fay]));
    assert.deepEqual(poison.players[1].book,hidden.filter(id=>id!==fay));
    assert.equal(poison.players[0].peek,undefined);

    const discord=casting('discord',true);
    for(const [at,id,owner] of [[2,fighter,0],[3,fighter,1],[6,barong,2],[7,barong,3],[9,goblin,1]]){
      Object.assign(discord.tiles[at],{owner,level:3,unit:{id,hp:40,enchant:'fog'}});
    }
    castSpell(discord,true);
    const transformed=[2,3,6,7].filter(at=>discord.tiles[at].unit.id===goblin);
    assert.ok([[2,3],[6,7]].some(group=>group.join()===transformed.join()));
    assert.ok(transformed.every(at=>discord.tiles[at].level===3&&discord.tiles[at].unit.hp===30&&!discord.tiles[at].unit.enchant));

    const armor=casting('metalform');
    Object.assign(armor.tiles[3],{owner:1,type:1,unit:{id:goblin,hp:70,mhp:70}});
    castSpell(armor);
    assert.ok(C.play(armor,['targetLand',3]));
    assert.equal(armor.tiles[3].unit.enchant,'metalform');
    armor.players[1].hand=[vest,axe,creature('freeze')];armor.players[1].cash=500;
    Object.assign(armor,{phase:'attack',battle:{at:3,inv:fighter,atkItem:null,defItem:null}});
    assert.ok(C.play(armor,['bare']));
    assert.deepEqual(C.choices(armor),[['equip',1],['equip',2],['bare']]);
    assert.ok(C.play(armor,['bare']));
    assert.equal(armor.battle.strikes[0].effect,'block');
    armor.players[0].hand=[creature('freeze')];armor.players[0].cash=300;
    Object.assign(armor,{phase:'attack',battle:{at:3,inv:fighter,atkItem:null,defItem:null}});
    assert.ok(C.play(armor,['equip',0])&&C.play(armor,['bare']));
    assert.equal(armor.battle.strikes[0].effect,'hit');

    const temptation=casting('temptation');
    const borrowed=creature('conjurer'),totem=creature('goldentotem');
    Object.assign(temptation.tiles[3],{owner:1,type:1,unit:{id:borrowed,hp:30,enchant:'paralysis'}});
    Object.assign(temptation.tiles[6],{owner:1,type:1,unit:{id:totem,hp:20,enchant:'paralysis'}});
    castSpell(temptation);
    assert.ok(C.play(temptation,['targetLand',3]));
    assert.deepEqual([temptation.phase,temptation.turn,temptation.players[0].cash],['territoryTarget',0,380]);
    assert.ok(C.play(temptation,['abilityLand',7]));
    assert.deepEqual([temptation.phase,temptation.turn,temptation.players[0].cash,temptation.tiles[3].unit,temptation.tiles[7].owner,temptation.tiles[7].unit.id],['roll',0,380,null,0,creature('baal')]);
    temptation.players[0].hand=[creature('temptation')];temptation.phase='spell';
    castSpell(temptation);
    assert.ok(C.play(temptation,['targetLand',6]));
    assert.deepEqual([temptation.phase,temptation.turn,temptation.players[0].cash,temptation.tiles[6].unit],['roll',0,710,null]);

    const previousRandom=Math.random;
    try{
      for(const [roll,expected] of [[0,[5,5,4]],[.99,[5,4,4]]]){
        const subsidence=casting('subsidence',true);
        for(const [at,id,level] of [[3,barong,5],[6,goblin,5],[7,goblin,4]]){
          Object.assign(subsidence.tiles[at],{owner:1,type:1,level,unit:{id,hp:30}});
        }
        castSpell(subsidence,true);
        Math.random=()=>roll;
        assert.ok(C.play(subsidence,['targetPlayer',1]));
        assert.deepEqual([3,6,7].map(at=>subsidence.tiles[at].level),expected);
        if(roll>0)assert.deepEqual([subsidence.mapEffect.tile,subsidence.mapEffect.label],[6,'영지 레벨 −1']);
      }
    }finally{Math.random=previousRandom;}

    const pegasus=creature('pegasus'),yowie=creature('yowie'),printedPool=C.cards.flatMap((card,id)=>!card.unlisted&&card.kind==='creature'&&card.catalog.rarity!=='E'&&id!==pegasus?[id]:[]);
    assert.equal(printedPool.length,193);
    try{
      for(const type of [0,1,2,3]){
        const morph=casting('polymorph');
        Object.assign(morph.tiles[3],{owner:1,type,level:4,unit:{id:pegasus,hp:20,enchant:'paralysis'}});
        Object.assign(morph.tiles[6],{owner:1,type:1,level:3,unit:{id:pegasus,hp:30}});
        castSpell(morph);
        assert.ok(!C.choices(morph).some(([,at])=>at===6));
        Math.random=()=>(printedPool.indexOf(yowie)+.5)/printedPool.length;
        assert.ok(C.play(morph,['targetLand',3]));
        assert.deepEqual([morph.tiles[3].owner,morph.tiles[3].level,morph.tiles[3].type,morph.tiles[3].unit],[1,4,type,{id:yowie,hp:40}]);
      }
      for(let rate=5;rate<=25;rate++){
        const s=C.start(4,4,12000,'begins-original-ford');
        const p=s.players[0],owner=s.players[1];
        Object.assign(p,{pos:3,cash:1000,hand:[]});
        Object.assign(s.tiles[3],{owner:1,type:3,level:2,base:100,unit:{id:yowie,hp:40}});
        Object.assign(s,{phase:'land',visited:[]});
        const t=s.tiles[3],base=C.value(s,t)*.3,prior=owner.cash;
        assert.deepEqual(C.tollRange(s,t,0),[Math.floor(base*.5),Math.floor(base*2.5)]);
        assert.equal(C.owedToll(s,t),Math.floor(base*1.5));
        Math.random=()=>(rate-5+.5)/21;
        assert.ok(C.play(s,['pay']));
        assert.deepEqual([1000-p.cash,owner.cash-prior],[Math.floor(base*rate/10),Math.floor(base*rate/10)]);
        assert.equal(s.mapEffect.tile,3);
      }
      const frozen=casting('polymorph');
      Object.assign(frozen.tiles[3],{owner:1,type:3,level:2,unit:{id:yowie,hp:40,enchant:'paralysis'}});
      assert.equal(C.tollRange(frozen,frozen.tiles[3]),null);
    }finally{Math.random=previousRandom;}

    const havoc=casting('armageddon',true);
    [
      [3,barong,50,3],[6,fighter,40,4],[7,goblin,30,2],[9,globster,40,3]
    ].forEach(([at,id,hp,level])=>Object.assign(havoc.tiles[at],{owner:1,level,unit:{id,hp}}));
    castSpell(havoc,true);
    assert.deepEqual([3,6,7,9].map(at=>[havoc.tiles[at].unit.hp,havoc.tiles[at].level]),[[20,3],[10,3],[30,2],[40,3]]);
    assert.deepEqual(havoc.mapEffect.hits.map(({at,damage})=>[at,damage]),[[3,30],[6,30]]);
    const tempest=casting('tempest',true);
    Object.assign(tempest.tiles[3],{owner:1,unit:{id:goblin,hp:30,st:41}});
    Object.assign(tempest.tiles[6],{owner:1,unit:{id:fighter,hp:40,st:40}});
    castSpell(tempest,true);
    assert.deepEqual([tempest.tiles[3].unit.hp,tempest.tiles[6].unit.hp],[30,20]);
    const fear=casting('scarestorm',true);
    Object.assign(fear.tiles[3],{owner:1,unit:{id:goblin,hp:30,st:31}});
    Object.assign(fear.tiles[6],{owner:2,unit:{id:fighter,hp:40,st:30,enchant:'greed'}});
    castSpell(fear,true);
    assert.deepEqual([fear.tiles[3].unit.enchant,fear.tiles[6].unit.enchant],[undefined,'paralysis']);

    const fluids=casting('liquidform');
    fluids.players[0].book=[goblin];
    Object.assign(fluids.tiles[3],{owner:0,unit:{id:fighter,hp:40}});
    castSpell(fluids);
    assert.ok(C.play(fluids,['targetLand',3]));
    assert.deepEqual([fluids.players[0].hand,fluids.tiles[3].unit.enchant],[[goblin],'liquidform']);

    const loss=casting('disbelief');
    loss.players[0].symbols[0]=3;loss.players[1].symbols[2]=5;
    loss.players[1].cash=10;
    castSpell(loss);
    assert.deepEqual([loss.players[0].cash,loss.players[1].cash],[345,-15]);

    const aerial=casting('spiritwalk');
    Object.assign(aerial.tiles[2],{owner:0,unit:{id:fighter,hp:40}});
    castSpell(aerial);
    assert.ok(C.play(aerial,['targetLand',2]));
    aerial.phase='land';
    assert.ok(C.choices(aerial).some(([kind,from,to])=>kind==='transfer'&&from===2&&to===15));
    const shadow=casting('shadowleap',true);
    Object.assign(shadow.tiles[7],{owner:0,type:1,level:3,unit:{id:fighter,hp:40}});
    castSpell(shadow,true);
    const reachable=C.choices(shadow).map(([,at])=>at);
    for(const at of [1,3,7,13])assert.ok(reachable.includes(at));
    for(const at of [0,4,8,19])assert.ok(!reachable.includes(at));
    assert.ok(C.play(shadow,['targetLand',7]));
    assert.deepEqual([shadow.players[0].pos,shadow.die,shadow.phase,C.choices(shadow)],[7,0,'land',[['pass']]]);
  }


  {
    const avenger=creature('avenger');
    assert.equal(duel(avenger,goblin).attackST,50);
    const ghoul=duel(creature('taotieh'),goblin);
    assert.ok(ghoul.won);
    assert.deepEqual([land.unit.st,land.unit.hp,land.unit.mhp],[60,60,60]);
    assert.equal(duel(creature('juggernaut'),creature('wallofice'),null,null,60,2).finalHP[1],0);
    assert.ok(duel(creature('mattocktail'),goblin).won);
    assert.equal(land.level,2);
    assert.deepEqual(duel(fighter,creature('mandrake'),null,null,50,2).finalHP,[0,0]);
    assert.equal(duel(creature('deathworm'),creature('decoy'),null,null,30,2).strikes[0].effect,'hit');
    assert.equal(duel(creature('wendigo'),fighter,vest,null,100,2).won,false);
    assert.equal(land.unit.enchant,'fog');
    duel(creature('sphinx'),fighter,vest,null,100,2);
    assert.equal(land.unit.enchant,'sleep');
    const priorSymbols=enemy.symbols.slice();
    enemy.symbols[2]=10;
    assert.equal(duel(creature('camazotz'),fighter,null,null,40,2).attackST,60);
    assert.equal(enemy.symbols[2],7);
    enemy.symbols=priorSymbols;

    const originalArmy=creatures.tiles.map(t=>({...t}));
    for(const at of [5,6,7])Object.assign(creatures.tiles[at],{owner:1,type:0,unit:{id:goblin,hp:30}});
    assert.equal(duel(creature('nezha'),goblin,null,null,30,2).attackST,50);
    assert.ok(land.unit?.mhp===40);
    for(const at of [5,6])Object.assign(creatures.tiles[at],{owner:0,type:2,unit:{id:goblin,hp:30}});
    assert.equal(duel(creature('shamblingvine'),goblin,null,null,30,2).attackST,40);
    originalArmy.forEach((t,i)=>{if(i!==2)Object.assign(creatures.tiles[i],t);});
    const restored=duel(fighter,creature('kudzufolk'),axe,null,30,2);
    assert.equal(restored.finalForms[1],creature('greenmold'));
    assert.equal(land.unit.id,creature('greenmold'));
    for(const at of [5,6,7,9])Object.assign(creatures.tiles[at],{owner:1,type:0,unit:{id:goblin,hp:30}});
    assert.ok(duel(fighter,creature('kudzufolk'),axe,null,30,2).won);
    originalArmy.forEach((t,i)=>{if(i!==2)Object.assign(creatures.tiles[i],t);});
    const captured=duel(goblin,creature('amabie'),null,null,40,2);
    assert.ok(captured.won);
    assert.ok(creatures.tiles.some((t,at)=>at!==2&&t.type===1&&t.owner===1&&t.unit?.id===creature('amabie')));
    originalArmy.forEach((t,i)=>{if(i!==2)Object.assign(creatures.tiles[i],t);});
    duel(creature('otohime'),fighter,vest,null,100,2);
    assert.equal(land.unit.enchant,'senility');
    creatures.destroyedCount=4;
    assert.equal(duel(creature('doomreaper'),goblin).attackST,50);
    assert.equal(creatures.players[0].cash,300);

    function landCommand(name){
      const s=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
      Object.assign(s.players[0],{cash:300,pos:2});
      Object.assign(s.tiles[2],{owner:0,unit:{id:creature(name),hp:C.cards[creature(name)].hp}});
      Object.assign(s.tiles[3],{owner:2,unit:{id:fighter,hp:30}});
      s.phase='land';
      return s;
    }
    function aim(s,action=['abilityLand',3]){
      assert.ok(C.play(s,['ability',2]));
      assert.ok(C.play(s,action));
    }
    const beacon=landCommand('beacontower');
    for(const q of beacon.players)q.hand=[];
    Object.assign(beacon.tiles[7],{owner:0,type:1,unit:{id:fighter,hp:40}});
    assert.ok(!C.choices(beacon).some(([kind,at])=>kind==='level'&&at===7));
    assert.ok(C.play(beacon,['ability',2]));
    assert.deepEqual([beacon.players[0].cash,beacon.players[0].status],[250,'enlightenment']);
    for(let n=0;n<3;n++){beacon.phase='land';assert.ok(C.play(beacon,['pass']));}
    assert.equal(beacon.turn,0);beacon.phase='land';
    assert.ok(C.choices(beacon).some(([kind,at])=>kind==='level'&&at===7));
    assert.ok(C.play(beacon,['pass']));
    for(let n=0;n<3;n++){beacon.phase='land';assert.ok(C.play(beacon,['pass']));}
    assert.equal(beacon.turn,0);
    assert.equal(beacon.players[0].status,undefined);
    const am=landCommand('amabie');aim(am);
    assert.deepEqual([am.players[0].cash,am.tiles[3].unit.hp,am.tiles[3].unit.mhp],[260,40,50]);
    const shrunk=landCommand('sanguivore');aim(shrunk);
    assert.deepEqual([shrunk.players[0].cash,shrunk.tiles[3].unit.hp,shrunk.tiles[3].unit.mhp],[250,30,30]);
    const taxed=landCommand('burnacle');
    const lastToll=C.toll(taxed,taxed.tiles[3]);
    aim(taxed);
    assert.equal(C.toll(taxed,taxed.tiles[3]),Math.floor(lastToll/2));
    const blocked=landCommand('landurchin');aim(blocked);
    assert.equal(blocked.tiles[3].unit.enchant,'immobilize');

    const rooted=landCommand('fighter');
    Object.assign(rooted.tiles[3],{owner:1,unit:{id:creature('landurchin'),hp:50}});
    assert.ok(!C.choices(rooted).some(([k,from,to])=>k==='transfer'&&from===2&&to===3));
    rooted.tiles[3].unit.enchant='paralysis';
    assert.ok(C.choices(rooted).some(([k,from,to])=>k==='transfer'&&from===2&&to===3));
    const swamp=landCommand('swampspawn');aim(swamp,['abilityPlayer',1]);
    assert.deepEqual([swamp.players[0].cash,swamp.players[1].status,swamp.players[1].diceLimitRolls],[250,'slow',2]);

    const merge=landCommand('fighter');
    merge.phase='spell';
    Object.assign(merge.players[0],{hand:[creature('culdra')],cash:450});
    [100,200,300].forEach((cash,index)=>{merge.players[index+1].cash=cash;});
    merge.tiles[2].unit.hp=17;
    assert.ok(C.play(merge,['cast',0]));
    assert.ok(merge.players.every(p=>p.cash===242&&p.word===6));
    assert.equal(merge.tiles[2].unit.hp,40);
    merge.phase='spell';merge.players[0].hand=[creature('immobilize')];
    assert.ok(C.play(merge,['cast',0]));
    assert.ok(merge.tiles.filter(t=>t.unit).every(t=>t.unit.enchant==='immobilize'));
    merge.phase='land';
    assert.ok(!C.choices(merge).some(([kind])=>kind==='transfer'));

    for(const [roll,expectedCash,expectedHP] of [[1,150,20],[2,250,40]]){
      const trap=landCommand('fighter');
      Object.assign(trap.players[0],{pos:6,previous:5,dir:1,word:roll,cash:250});
      Object.assign(trap.tiles[7],{owner:1,type:1,unit:{id:fighter,hp:40,enchant:'blasttrap'}});
      trap.phase='roll';
      assert.ok(C.play(trap,['roll']));
      assert.deepEqual([trap.players[0].cash,trap.tiles[7].unit.hp],[expectedCash,expectedHP]);
      if(roll===1)assert.equal(trap.tiles[7].unit.enchant,undefined);
    }
  }

  const curse=C.start(2,2,6000,'begins-original-ford');
  const warded=curse.tiles[3],growing={id:fighter,hp:28,mhp:90};
  Object.assign(warded,{owner:0,unit:growing});
  function castHere(e,index=3){
    curse.phase='spell';Object.assign(curse.players[0],{hand:[id(e)],cash:500});
    assert.ok(C.play(curse,['cast',0])&&C.play(curse,['targetLand',index]));
  }
  castHere('mutation');
  assert.deepEqual([growing.hp,growing.mhp,growing.poisoned],[28,100,true]);
  castHere('removecurse');
  assert.equal(growing.poisoned,undefined);
  assert.ok(curse.players[0].book.includes(id('removecurse')));
  Object.assign(growing,{hp:28,mhp:75,enchant:'phantasm'});
  castHere('mutation');
  assert.deepEqual([growing.hp,growing.mhp,growing.poisoned,growing.enchant],[28,75,true,undefined]);
  for(const [type,form] of [[-1,'statue'],[0,'pillarofflame'],[1,'wallofice'],[2,'wallofstone'],[3,'hurricane']]){
    warded.unit={id:creature(type<0?'fighter':['minotaur','merfolk','troll','elf'][type]),hp:10};
    castHere('turntothewall');
    assert.deepEqual([warded.unit.id,warded.unit.hp],[creature(form),C.cards[creature(form)].hp]);
  }
  const cornSpell=C.start(2,2,6000,'begins-original-ford');
  Object.assign(cornSpell.players[0],{hand:[id('bolt')],cash:500});
  Object.assign(cornSpell.tiles[3],{owner:1,unit:{id:cornfolk,hp:20}});
  const cash=cornSpell.players[1].cash;
  assert.ok(C.play(cornSpell,['cast',0])&&C.play(cornSpell,['targetLand',3]));
  assert.equal(cornSpell.players[1].cash,cash+200);
  for(const [item,target,other] of [['icicle',minotaur,dwarf],['rockbiter',dwarf,minotaur]]){
    const weapon=creature(item);
    assert.equal(C.cards[weapon].cost,25);
    const matching=duel(goblin,target,weapon,null,100);
    const different=duel(goblin,other,weapon,null,100);
    assert.equal(matching.startHP[1]-matching.strikes[0].hp[1],75);
    assert.equal(different.startHP[1]-different.strikes[0].hp[1],50);
  }
  const flight=C.start(2,2,6000,'begins-original-ford');
  Object.assign(flight.players[0],{hand:[id('fly')],cash:500,word:1});
  assert.ok(C.play(flight,['cast',0])&&C.play(flight,['roll']));
  assert.deepEqual([flight.die,flight.mapEffect.faces,flight.players[0].word],[2,[1,1],undefined]);
  for(const [inv,supportColor] of [[pirate,'merfolk'],[sage,'dwarf']]){
    Object.assign(creatures,{phase:'attack',battle:{at:2,inv}});
    creatures.players[0].hand=[fighter,creature(supportColor),creature('wolf'),creature('gascloud')];
    assert.deepEqual(C.choices(creatures).filter(([kind])=>kind==='equip').map(([,at])=>at),[0,1,2]);
  }
  for(const [effect,face] of [['haste',5],['slow',1]]){
    const tempo=C.start(2,2,5000,'begins-original-ford'),target=tempo.players[1];
    Object.assign(tempo.players[0],{cash:500,hand:[id(effect)]});
    assert.ok(C.play(tempo,['cast',0])&&C.play(tempo,['targetPlayer',1]));
    assert.equal(target.diceLimitRolls,2);
    const random=Math.random;
    try{
      Math.random=()=>0;
      for(const remaining of [1,0]){
        Object.assign(tempo,{phase:'roll',turn:1,fly:remaining===1});
        Object.assign(target,{pos:0,previous:1,dir:1});
        assert.ok(C.play(tempo,['roll']));
        assert.deepEqual(tempo.mapEffect.faces,remaining?[face,face]:[face]);
        assert.equal(target.diceLimitRolls??0,remaining);
      }
    }finally{Math.random=random;}
    assert.equal(target.status,undefined);
  }
  const sealed=C.start(4,4,5000,'begins-original-ford',undefined,undefined,0,'teams');
  const sealedSeat=sealed.players[1];
  Object.assign(sealed.players[0],{cash:500,hand:[id('silence')]});
  assert.ok(C.play(sealed,['cast',0]));
  assert.deepEqual(C.choices(sealed).map(([,seat])=>seat),[1,3]);
  assert.ok(C.play(sealed,['targetPlayer',1]));
  assert.equal(sealedSeat.enchantDeadline,8);
  Object.assign(sealed,{turn:1,phase:'land'});
  Object.assign(sealedSeat,{pos:3,cash:500,hand:[fighter,creature('chainmail')]});
  Object.assign(sealed.tiles[2],{owner:1,unit:{id:pirate,hp:40}});
  assert.ok(!C.choices(sealed).some(([kind])=>kind==='summon'));
  sealedSeat.pos=2;
  assert.ok(!C.choices(sealed).some(([kind])=>kind==='exchange'));
  Object.assign(sealed,{phase:'attack',battle:{at:3,inv:pirate}});
  Object.assign(sealed.tiles[3],{owner:3,unit:{id:fighter,hp:40}});
  assert.deepEqual(C.choices(sealed),[['equip',1],['bare']]);
  sealed.turn=3;sealed.round=2;sealed.phase='land';sealed.players[3].pos=0;
  assert.ok(C.play(sealed,['pass']));
  assert.equal(sealedSeat.status,undefined);

  const triumphant=C.start(2,2,5000,'begins-original-ford'),runner=triumphant.players[0];
  Object.assign(runner,{cash:500,hand:[id('triumph')]});
  assert.ok(C.play(triumphant,['cast',0]));
  const passCastle=()=>{
    Object.assign(runner,{pos:1,previous:2,dir:1});
    Object.assign(triumphant,{phase:'roll',fixed:1});
    assert.ok(C.play(triumphant,['roll']));
    assert.equal(runner.pos,0);
  };
  passCastle();
  assert.deepEqual([runner.cash,runner.lap,runner.status],[480,0,undefined]);
  runner.hand=[id('triumph')];triumphant.phase='spell';assert.ok(C.play(triumphant,['cast',0]));
  runner.flags=C.board(triumphant).checkpoints.slice();passCastle();
  assert.deepEqual([runner.cash,runner.lap,runner.status],[720,1,undefined]);

  const color=C.start(2,2,5000,'begins-original-ford');
  Object.assign(color.players[0],{cash:500,hand:[id('colorfrombeyond')]});
  Object.assign(color.tiles[2],{owner:0,unit:{id:goblin,hp:20,enchant:'phantasm'}});
  Object.assign(color.tiles[3],{owner:1,unit:{id:fighter,st:55,hp:40,enchant:'landprotection'}});
  assert.ok(C.play(color,['cast',0]));
  assert.deepEqual([color.players[0].cash,color.tiles[2].unit.st,color.tiles[2].unit.hp,color.tiles[3].unit.st],[430,0,20,25]);
  const spectre=creature('spectre'),spectreMatch=C.start(2,2,5000,'begins-original-ford');
  Object.assign(spectreMatch,{phase:'attack',battle:{at:2,inv:spectre}});
  Object.assign(spectreMatch.tiles[2],{type:'무속성',owner:1,unit:{id:goblin,hp:30}});
  const spectreRolls=[38.5/61,54.5/61],randomStat=Math.random;
  try{
    Math.random=()=>spectreRolls.shift()??.5;
    assert.ok(C.play(spectreMatch,['bare'])&&C.play(spectreMatch,['bare']));
  }finally{Math.random=randomStat;}
  assert.deepEqual([spectreMatch.battle.attackST,spectreMatch.battle.startHP[0]],[48,64]);
  assert.deepEqual(spectreMatch.tiles[2].unit,{id:spectre,hp:30});
  const wards=C.start(2,2,5000,'begins-original-ford');
  const [mismatched,matched,shielded,first,support,both]=wards.tiles.flatMap((t,i)=>C.territoryType(t.type)?[i]:[]).slice(0,6);
  const spellUser=wards.players[0];
  const earthUnit=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.kind==='creature'&&c.element===2&&!c.spellWard&&!c.first&&!c.support);
  const firstUnit=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.first&&!c.support&&!c.spellWard);
  const supportUnit=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.support&&!c.first&&!c.spellWard);
  const bothUnit=C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&c.first&&c.support);
  assert.ok([earthUnit,firstUnit,supportUnit].every(i=>i>=0));
  for(const [at,owner,type,id,hp,enchant] of [
    [mismatched,1,0,goblin,30],[matched,1,2,earthUnit,40],[shielded,1,0,fighter,40,'landprotection'],
    [first,0,0,firstUnit,40],[support,1,0,supportUnit,20],[both,1,0,bothUnit>=0?bothUnit:firstUnit,40,'phantasm']
  ])Object.assign(wards.tiles[at],{owner,type,unit:{id,hp,enchant}});
  spellUser.cash=500;spellUser.hand=['dreadblast','deathmiasma','revoltphantasm','bolt'].map(id);
  assert.ok(C.play(wards,['cast',0]));
  assert.ok(C.choices(wards).some(a=>a[1]===mismatched));
  assert.ok(!C.choices(wards).some(a=>a[1]===matched||a[1]===shielded));
  assert.ok(C.play(wards,['targetLand',mismatched]));
  assert.equal(wards.tiles[mismatched].owner,-1);
  wards.phase='spell';assert.ok(C.play(wards,['cast',0]));
  assert.equal(wards.tiles[first].unit.hp,20);
  assert.equal(wards.tiles[support].unit,null);
  assert.equal(wards.tiles[both].unit.hp,40);
  assert.deepEqual(wards.mapEffect.hits.map(({at,damage,defeated})=>[at,damage,defeated]),[[first,20,false],[support,20,true]]);
  wards.phase='spell';assert.ok(C.play(wards,['cast',0]));
  assert.ok(wards.tiles.filter(t=>t.unit).every(t=>t.unit.enchant==='phantasm'));
  wards.phase='spell';assert.ok(C.play(wards,['cast',0])&&C.play(wards,['targetLand',shielded]));
  assert.equal(wards.tiles[shielded].unit.hp,40);

  const dream=C.start(2,2,5000,'begins-original-ford');
  const dreamCaster=dream.players[0],collector=dream.players[1];
  Object.assign(dreamCaster,{cash:500,hand:[id('dreamterrain')],pos:2});
  Object.assign(dream.tiles[2],{owner:1,level:3,unit:{id:fighter,hp:40}});
  assert.ok(C.play(dream,['cast',0]));
  assert.equal(dreamCaster.cash,430);
  assert.equal(dreamCaster.enchantDeadline,10);
  dream.phase='land';
  const levy=C.owedToll(dream,dream.tiles[2]),beforeLevy=dreamCaster.cash,beforeCollection=collector.cash;
  assert.ok(levy>0&&C.play(dream,['pay']));
  assert.deepEqual([dreamCaster.cash,collector.cash],[beforeLevy-levy+Math.floor(levy/2),beforeCollection+levy]);
  dream.turn=0;dream.phase='roll';
  Object.assign(dreamCaster,{pos:1,previous:2,dir:1,word:1});
  assert.ok(C.play(dream,['roll']));
  assert.equal(dreamCaster.pos,0);
  assert.equal(dreamCaster.dream,true,'Begins Dream Terrain survives passing through the castle');
  dream.turn=1;dream.round=5;dream.phase='land';
  assert.ok(C.play(dream,['pass']));
  assert.deepEqual([dream.round,dream.turn,dreamCaster.dream,dreamCaster.enchantDeadline],[6,0,undefined,undefined]);

  const ward=C.start(2,2,5000,'begins-original-ford');
  const [protectedSeat,caster]=ward.players;
  protectedSeat.cash=500;protectedSeat.hand=[id('antimagic')];
  caster.cash=500;caster.hand=[id('drainmagic'),id('drainmagic')];
  assert.ok(C.play(ward,['cast',0])&&C.play(ward,['targetPlayer',0]));
  assert.equal(protectedSeat.antiMagic,true);
  ward.phase='land';assert.ok(C.play(ward,['pass']));
  const balance=protectedSeat.cash;
  assert.ok(C.play(ward,['cast',0])&&C.play(ward,['targetPlayer',0]));
  assert.deepEqual([protectedSeat.cash,protectedSeat.antiMagic,ward.mapEffect.label],[balance,undefined,'안티 매직']);
  ward.phase='spell';assert.ok(C.play(ward,['cast',0])&&C.play(ward,['targetPlayer',0]));
  assert.equal(protectedSeat.cash,balance-Math.floor(balance*.3));

  for(const [effect,rounds] of [['telegnosis',1],['revelation',2]]){
    const command=C.start(2,2,5000,'begins-original-ford');
    const player=command.players[0],spell=id(effect),remote=10;
    command.players[1].hand=[];
    Object.assign(player,{cash:1000,pos:2,hand:[spell]});
    Object.assign(command.tiles[remote],{owner:0,unit:{id:fighter,hp:40}});
    const action=()=>C.choices(command).some(([k,at])=>k==='level'&&at===remote);
    command.phase='land';assert.equal(action(),false);
    command.phase='spell';
    const oldBook=player.book.slice(),random=Math.random;
    try{
      Math.random=()=>0;
      command.players[1].peek={seat:0,ids:oldBook.slice(-6).reverse()};
      assert.ok(C.play(command,['cast',0]));
    }finally{Math.random=random;}
    assert.equal(player.enchantDeadline,rounds*2);
    if(effect==='telegnosis'){
      oldBook.push(spell,oldBook.shift());
      assert.equal(command.players[1].peek,undefined);
    }
    assert.deepEqual(player.book,oldBook);
    for(let i=0;i<rounds;i++){
      command.phase='land';assert.ok(action()&&C.play(command,['pass']));
      command.phase='land';assert.ok(C.play(command,['pass']));
    }
    assert.equal(command.round,rounds+1);
    command.phase='land';assert.equal(action(),false);
  }

  const recycler=C.start(2,2,5000,'begins-original-ford'),recycled=recycler.players[0];
  const shortBook=[fighter,goblin,creature('wolf'),creature('merfolk')];
  const originalRandom=Math.random;
  const recyclingSpell=effect=>{
    Object.assign(recycler,{phase:'spell',turn:0});
    Object.assign(recycled,{cash:500,hand:[id(effect)],book:shortBook.slice()});
    recycler.players[1].peek={seat:0,ids:shortBook.slice().reverse()};
    assert.ok(C.play(recycler,['cast',0]));
  };
  const expectRecycle=e=>{
    assert.deepEqual(recycled.book,[...shortBook.slice(1),id(e),shortBook[0]]);
    assert.equal(recycler.players[1].peek,undefined);
  };
  Object.assign(recycler.tiles[2],{owner:0,unit:{id:goblin,hp:24,enchant:'weakness'}});
  Object.assign(recycler.tiles[3],{owner:0,unit:{id:fighter,hp:32,st:51}});
  try{
    Math.random=()=>0;
    recyclingSpell('camouflage');
    assert.ok(C.play(recycler,['targetLand',2]));
    assert.equal(recycler.tiles[2].unit.enchant,'camouflage');
    expectRecycle('camouflage');

    recyclingSpell('relief');
    assert.ok(C.play(recycler,['targetLand',2]));
    assert.equal(recycler.reliefFrom,2);
    assert.deepEqual(C.choices(recycler),[['targetLand',3]]);
    assert.ok(C.play(recycler,['targetLand',3]));
    assert.deepEqual(recycler.tiles[2].unit,{id:fighter,hp:32,st:51});
    assert.deepEqual(recycler.tiles[3].unit,{id:goblin,hp:24});
    expectRecycle('relief');

    recyclingSpell('chariot');
    assert.ok(C.play(recycler,['targetLand',3]));
    assert.ok(!C.choices(recycler).some(([,at])=>at===2));
    assert.ok(C.play(recycler,['teleTo',5]));
    assert.deepEqual([recycler.tiles[3].unit,recycler.tiles[5].unit,recycler.phase],[null,{id:goblin,hp:24},'roll']);
    expectRecycle('chariot');

    const centaur=creature('centaur');
    for(const gear of ['eternalmail','boomerang']){
      const item=creature(gear),before=enemy.book.slice();
      const battle=duel(goblin,centaur,null,item);
      assert.equal(battle.strikes[0].side,1);
      assert.deepEqual(enemy.book,[...before.slice(1),item,before[0]]);
      assert.ok(!enemy.hand.includes(item));
    }
  }finally{Math.random=originalRandom;}
  assert.equal(new Set(C.cards.filter(c=>!c.unlisted&&c.catalog).map(c=>c.catalog.path)).size,400);

  for(const [mapId,at,stock] of [
    ['begins-3',1,['longsword','chainmail','manna','holyword6']],
    ['begins-9',14,['skeleton','catapult','shatter','holyword6']]
  ]){
    const board=C.maps[mapId],approach=steps=>{
      const match=C.start(4,4,5000,mapId),player=match.players[0],pos=board.links[at][0];
      Object.assign(match,{phase:'fork',die:steps,remaining:steps});
      Object.assign(player,{pos,previous:board.links[pos].find(n=>n!==at),cash:100,hand:Array(6).fill(fighter)});
      assert.ok(C.play(match,['route',at]));
      return match;
    };
    const passing=approach(2);
    assert.equal(passing.players[0].pos,board.links[at][1]);
    assert.notEqual(passing.phase,'shop');
    const match=approach(1),player=match.players[0],offers=stock.map(creature);
    assert.ok(offers.every(i=>i>=0));
    assert.equal(match.phase,'shop');
    assert.deepEqual(C.shopStock(match),offers);
    assert.deepEqual(offers.map(C.shopCost),[20,20,20,20]);
    const replay=JSON.parse(JSON.stringify(match));
    const before=player.template.slice(),book=player.book.slice();
    assert.ok(C.play(match,['buyCard',offers[0]])&&C.play(replay,['buyCard',offers[0]]));
    assert.deepEqual(match.players[0],replay.players[0]);
    assert.deepEqual([player.cash,player.hand.length,player.hand[6],match.phase,match.discardReturn],[80,7,offers[0],'discard','endTurn']);
    assert.deepEqual(player.template,before);
    assert.deepEqual(player.book,book);
    assert.ok(!C.play(match,['buyCard',offers[1]]));
    assert.ok(C.play(match,['discard',0]));
    assert.deepEqual([match.turn,player.hand.length,player.hand[5]],[1,6,offers[0]]);
  }

  const overflow=C.start(2,2,5000,'begins-original-ford');
  const incoming=overflow.players[1],drawSpell=id('windofhope');
  Object.assign(incoming,{pos:2,hand:Array(6).fill(goblin),book:[drawSpell],cash:300});
  overflow.phase='land';assert.ok(C.play(overflow,['pass']));
  assert.deepEqual([overflow.turn,overflow.phase,incoming.hand.length],[1,'spell',7]);
  assert.ok(C.play(overflow,['cast',6]));
  assert.deepEqual([overflow.phase,incoming.hand.length],['roll',8]);
  overflow.phase='land';assert.ok(C.play(overflow,['pass']));
  assert.deepEqual([overflow.turn,overflow.phase,overflow.discardReturn],[1,'discard','endTurn']);
  assert.ok(C.play(overflow,['discard',7]));
  assert.equal(overflow.turn,1);
  assert.ok(C.play(overflow,['discard',6]));
  assert.deepEqual([overflow.turn,incoming.hand.length],[0,6]);

  const regeneration=C.start(2,2,5000,'begins-original-ford');
  regeneration.phase='attack';regeneration.battle={at:1,inv:goblin,atkItem:null,defItem:null};
  Object.assign(regeneration.tiles[1],{owner:1,unit:{id:creature('skeleton'),hp:31}});
  assert.ok(C.play(regeneration,['bare'])&&C.play(regeneration,['bare']));
  assert.equal(regeneration.tiles[1].unit.hp,40);
  assert.match(regeneration.battle.lines.join(' '),/재생/);

  const monarchId=creature('abyssalmonarch'),gooba=creature('gooba'),aero=creature('aerogoetia');
  assert.equal(C.copyLimit(C.cards[monarchId]),1);
  assert.ok(C.validBook([monarchId,gooba,...current.slice(2)]),'distinct Extra cards are independent');
  assert.ok(!C.validBook([monarchId,monarchId,...current.slice(2)]));
  assert.ok(C.validLegacyBook([monarchId,monarchId,...current.slice(2)]),'old drafts can be corrected');
  const air=C.start(4,4,5000,'begins-original-ford',undefined,undefined,0,'teams');
  air.phase='land';air.players[0].pos=2;air.players[0].cash=200;air.players[0].hand=[aero];
  Object.assign(air.tiles[6],{type:3,owner:0,unit:{id:creature('goblin'),hp:30}});
  assert.ok(!C.choices(air).some(([k])=>k==='summon'));
  Object.assign(air.tiles[7],{type:3,owner:0,unit:{id:creature('goblin'),hp:30}});
  assert.ok(C.choices(air).some(([k])=>k==='summon'));
  assert.ok(C.play(air,['summon',0]));
  Object.assign(air,{turn:0,phase:'land'});
  Object.assign(air.tiles[11],{type:3,owner:1,unit:{id:creature('goblin'),hp:30}});
  Object.assign(air.tiles[13],{type:3,owner:2,unit:{id:creature('goblin'),hp:30}});
  air.tiles[14].type=3;
  assert.ok(C.choices(air).some(([k,from,to])=>k==='transfer'&&from===2&&to===11));
  assert.ok(!C.choices(air).some(([k,from,to])=>k==='transfer'&&from===2&&[13,14].includes(to)));
  air.tiles[2].unit.enchant='paralysis';
  assert.ok(!C.choices(air).some(([k,from,to])=>k==='transfer'&&from===2&&to===11));
  delete air.tiles[2].unit.enchant;
  assert.ok(C.play(air,['transfer',2,11]));
  assert.ok(C.play(air,['bare'])&&C.play(air,['bare']));
  assert.equal(air.battle.won,true);assert.equal(air.tiles[11].unit.id,aero);
  const used=new Set(current);
  const old=[...current,...C.cards.flatMap((c,i)=>!c.unlisted&&!c.catalogOnly&&c.kind==='creature'&&!used.has(i)?[i]:[]).slice(0,10)];
  assert.equal(C.bookSize,40);assert.equal(old.length,50);
  assert.ok(!C.validBook(old)&&C.validLegacyBook(old));
  assert.throws(()=>C.start(2,2,5000,'begins-1',old),/대국 설정 오류/);
  const opening=C.start(2,2,5000,'begins-1');
  assert.deepEqual(opening.players.map(p=>[p.template.length,p.hand.length,p.book.length]),[[40,6,34],[40,5,35]]);
  assert.ok(!C.setOpeningBook(opening,1,old));assert.ok(C.setOpeningBook(opening,1,C.presets.fire));
  assert.equal(opening.players[1].book.length,35);
  const originalRoom=structuredClone(opening);
  delete originalRoom.openingHandSize;
  assert.ok(C.setOpeningBook(originalRoom,1,C.presets.fire));
  assert.equal(originalRoom.players[1].book.length,36);
  const savedOpening=structuredClone(opening);
  savedOpening.players[1].template=old;
  assert.ok(C.setOpeningBook(savedOpening,1,old));assert.equal(savedOpening.players[1].book.length,46);
  assert.ok(Object.values(C.maps).every(m=>m.die===8));
  const die=C.start(2,2,6000,'begins-original-ford'),random=Math.random;
  die.phase='roll';
  try{Math.random=()=>.999;assert.ok(C.play(die,['roll']));}finally{Math.random=random;}
  assert.deepEqual([die.die,die.mapEffect.faces,die.mapEffect.sides],[8,[8],8]);

  const shrineAt=20;
  function atBeginsShrine(){
    const state=C.start(4,4,8000,'begins-original-ford',undefined,undefined,0,'duel',25);
    C.configureMatch(state,{suddenDeath:true,recordReplay:true});
    Object.assign(state,{phase:'fork',remaining:1,die:1});
    Object.assign(state.players[0],{pos:C.board(state).links[shrineAt][0],previous:null});
    return state;
  }
  function stopAtShrine(state,index){
    try{
      let first=true;
      Math.random=()=>{if(!first)return 0;first=false;return (index+.5)/35;};
      assert.ok(C.play(state,['route',shrineAt]));
    }finally{Math.random=random;}
  }
  const shrineNames=new Set();
  for(let index=0;index<35;index++){
    const state=atBeginsShrine();
    stopAtShrine(state,index);
    assert.match(state.shrineNotice,/^성소 · .+ · .+/);
    shrineNames.add(state.shrineNotice.split(' · ')[1]);
  }
  assert.equal(shrineNames.size,35);
  const passingShrine=atBeginsShrine();
  passingShrine.remaining=2;
  assert.equal(C.routePreview(passingShrine,['route',shrineAt]).cashGain,0);
  stopAtShrine(passingShrine,3);
  assert.equal(passingShrine.shrineNotice,undefined);
  const reward=atBeginsShrine(),rewardCash=reward.players[0].cash;
  stopAtShrine(reward,3);
  assert.equal(reward.players[0].cash,rewardCash+200);
  assert.deepEqual([reward.roundLimit,reward.suddenDeath],[25,true]);
  const innerRevolt=atBeginsShrine();
  for(const [tile,slug] of [[2,'minotaur'],[3,'phoenix'],[6,'merfolk'],[7,'fighter']]){
    Object.assign(innerRevolt.tiles[tile],{owner:1,unit:{id:creature(slug),hp:20}});
  }
  stopAtShrine(innerRevolt,23);
  assert.deepEqual([2,3,6,7].map(at=>innerRevolt.tiles[at].unit.hp),[10,10,20,20]);
  assert.match(innerRevolt.shrineNotice,/내란.*화 크리처/);
  const poison=atBeginsShrine(),victim=poison.players[1],priorCash=victim.cash;
  for(const [tile,slug] of [[2,'jackalope'],[3,'cornfolk']]){
    Object.assign(poison.tiles[tile],{owner:1,unit:{id:creature(slug),hp:10}});
  }
  stopAtShrine(poison,22);
  assert.ok([2,3].every(at=>poison.tiles[at].unit===null));
  assert.equal(victim.cash,priorCash);
  const speed=atBeginsShrine();
  stopAtShrine(speed,7);
  assert.equal(speed.players[0].diceLimitRolls,1);
  const groupSpeed=atBeginsShrine();
  stopAtShrine(groupSpeed,8);
  assert.ok(groupSpeed.players.every(p=>p.word===8));
  const shield=atBeginsShrine();
  stopAtShrine(shield,10);
  assert.equal(shield.players[0].status,'barrier');
  const hope=atBeginsShrine(),handSize=hope.players[0].hand.length;
  stopAtShrine(hope,26);
  assert.equal(hope.players[0].hand.length,handSize+2);
  const signatures=atBeginsShrine();
  stopAtShrine(signatures,29);
  assert.deepEqual(signatures.players[0].flags,C.board(signatures).checkpoints);
  const sleeping=atBeginsShrine();
  for(const at of [2,3,6])Object.assign(sleeping.tiles[at],{owner:1,unit:{id:fighter,hp:40}});
  const sleepingOwner=sleeping.players[1];
  stopAtShrine(sleeping,30);
  assert.equal(sleepingOwner.status,'blackout');
  assert.equal(C.toll(sleeping,sleeping.tiles[2]),0);
  const stolen=atBeginsShrine();
  Object.assign(stolen.players[3],{cash:1000,hand:[fighter,id('manna')]});
  stopAtShrine(stolen,31);
  assert.deepEqual(stolen.players[3].hand,[fighter]);
  assert.doesNotMatch(stolen.shrineNotice,/마나/);
  const rise=atBeginsShrine();
  rise.players[3].cash=0;
  Object.assign(rise.tiles[2],{owner:3,level:1,unit:{id:fighter,hp:40}});
  assert.ok(rise.players.slice(0,3).every((_,i)=>C.total(rise,i)>C.total(rise,3)));
  stopAtShrine(rise,32);
  assert.equal(rise.tiles[2].level,2);
  const boom=atBeginsShrine();
  stopAtShrine(boom,33);
  assert.equal(boom.tiles.filter(t=>t.level===3&&t.owner<0).length,1);
  const escaped=atBeginsShrine();
  stopAtShrine(escaped,34);
  assert.ok(C.board(escaped).links[shrineAt].includes(escaped.players[0].pos));
  assert.match(escaped.shrineNotice,/빈 영지로 이동/);
  const blocked=atBeginsShrine();
  for(const t of blocked.tiles)if(C.territoryType(t.type))Object.assign(t,{owner:1,unit:{id:fighter,hp:40}});
  stopAtShrine(blocked,34);
  assert.equal(blocked.players[0].pos,shrineAt);
  assert.match(blocked.shrineNotice,/빈 영지 없음/);
  for(const [slug,element] of [['escape',null],['mountainleap',0],['lakeleap',1],['forestleap',2],['plainleap',3]]){
    const jump=C.start(2,2,6000,'begins-original-ford');
    const p=jump.players[0],near=C.board(jump).links[0][0];
    Object.assign(p,{cash:500,hand:[id(slug)]});
    if(element!=null)jump.tiles[near].type=element;
    try{Math.random=()=>0;assert.ok(C.play(jump,['cast',0]));}finally{Math.random=random;}
    assert.equal(p.pos,near);
    assert.equal(jump.phase,'land');
    assert.ok(!C.choices(jump).some(([kind])=>kind==='roll'));
  }
  console.log('Begins 35 shrine events, stop-only activation, immunity, private cards and five nearest-land spells OK');

  for(const seats of [2,4]){
    const lap=C.start(seats,seats,6000,'begins-original-ford'),player=lap.players[0];
    Object.assign(player,{pos:1,previous:2,dir:1,cash:500,flags:C.board(lap).checkpoints.slice(),word:1});
    Object.assign(lap.tiles[3],{owner:0,unit:{id:fighter,hp:11}});
    Object.assign(lap.tiles[6],{owner:0,unit:{id:fighter,hp:21}});
    lap.phase='roll';
    assert.ok(C.play(lap,['roll']));
    assert.equal(player.pos,0);assert.equal(player.lap,1);assert.deepEqual(player.flags,[]);
    const lands=lap.tiles.filter(t=>t.owner===0).length;
    assert.equal(player.cash,700+lands*(seats===2?60:80));
    assert.equal(lap.tiles[3].unit.hp,21);
    assert.equal(lap.tiles[6].unit.hp,31);
  }
  const fort=C.start(2,2,6000,'begins-1'),board=C.board(fort);
  const duplicate=board.forts.find(at=>board.forts.filter(i=>fort.tiles[i].type===fort.tiles[at].type).length>1);
  const sister=board.forts.find(at=>at!==duplicate&&fort.tiles[at].type===fort.tiles[duplicate]?.type);
  assert.ok(duplicate!=null&&sister!=null);
  for(const at of [duplicate,sister]){
    const pos=board.links[at][0];
    Object.assign(fort,{phase:'fork',die:1,remaining:1});
    Object.assign(fort.players[0],{pos,previous:board.links[pos].find(n=>n!==at)});
    assert.ok(C.play(fort,['route',at]));
    assert.equal(fort.players[0].cash,400);
  }

  const economy=C.start(4,4,6000,'begins-original-ford'),buyer=economy.players[0];
  const lands=economy.tiles.filter(t=>typeof t.type==='number').slice(0,5);
  for(const tile of lands)Object.assign(tile,{owner:0,type:2,base:100,unit:{id:fighter,hp:40}});
  for(let n=1;n<=5;n++){
    lands.slice(n).forEach(t=>t.owner=-1);
    lands.slice(0,n).forEach(t=>t.owner=0);
    assert.equal(C.chainRate(economy,lands[0]),[1,1.5,2,2.5,3][n-1]);
  }
  lands[0].level=4;assert.equal(C.toll(economy,lands[0]),1200);
  lands[0].level=5;assert.equal(C.toll(economy,lands[0]),2880);
  assert.equal(C.debtSaleValue(economy,lands[0]),3840);

  economy.phase='temple';buyer.cash=2000;buyer.symbols[0]=48;
  assert.ok(!C.play(economy,['buySymbol',0,3]));
  assert.ok(C.play(economy,['buySymbol',0,2]));
  assert.deepEqual([buyer.symbols[0],buyer.cash],[50,1980]);
  economy.phase='temple';assert.ok(!C.choices(economy).some(([kind,e])=>kind==='buySymbol'&&e===0));

  const prices=C.start(2,2,6000,'begins-original-ford'),priceBuyer=prices.players[0];
  Object.assign(prices.tiles[3],{owner:0,type:2,base:100,unit:{id:fighter,hp:40}});
  priceBuyer.cash=2000;priceBuyer.hand=[id('fireshift')];
  assert.ok(C.play(prices,['cast',0])&&C.play(prices,['targetLand',3]));
  assert.deepEqual(prices.prices,[11,10,9,10]);
  prices.phase='land';prices.prices[0]=98;
  assert.ok(C.play(prices,['level',3,5]));
  assert.equal(prices.prices[0],99);

  const morph=C.start(4,4,0,'begins-original-ford-morph');
  morph.phase='land';morph.players[0].pos=2;morph.players[0].hand=[goblin];
  assert.ok(C.play(morph,['summon',0]));
  assert.equal(morph.tiles[2].type,'복합');
  morph.phase='land';morph.players[1].pos=6;morph.players[1].hand=[creature('merfolk')];
  assert.ok(C.play(morph,['summon',0]));
  assert.deepEqual([morph.tiles[6].type,morph.tiles[6].owner],[1,1]);
  const conversion=C.start(2,2,6000,'begins-original-ford-morph');
  const neutral=conversion.tiles[2];
  Object.assign(neutral,{type:'복합',level:4,owner:0,unit:{id:fighter,hp:40}});
  Object.assign(conversion.players[0],{pos:2,cash:200});
  conversion.phase='land';
  assert.equal(C.elementCost(neutral),100);
  assert.ok(C.play(conversion,['element',2,2]));
  assert.deepEqual([neutral.type,neutral.level,conversion.players[0].cash],[2,4,100]);
  assert.equal(C.elementCost(neutral),300);
  const alliedBoard=C.start(4,4,6000,'begins-original-ford',undefined,undefined,0,'teams');
  alliedBoard.phase='land';alliedBoard.visited=[2];
  Object.assign(alliedBoard.players[0],{pos:3,hand:[fighter]});
  Object.assign(alliedBoard.tiles[2],{owner:0,unit:{id:fighter,hp:40}});
  Object.assign(alliedBoard.tiles[3],{owner:2,unit:{id:fighter,hp:40}});
  assert.ok(!C.choices(alliedBoard).some(([kind,from,to])=>kind==='invade'||kind==='pay'||kind==='transfer'&&from===2&&to===3));
  alliedBoard.tiles[3].owner=1;
  assert.ok(C.choices(alliedBoard).some(([kind])=>kind==='invade'));
  console.log('Begins one 8-sided die, lap magic, fort bonus, recovery, chains, tolls, symbol limits, alliance movement and Morph passed');

  const trade=C.start(4,4,0,'begins-original-moontrade');
  const tradeBoard=C.board(trade);
  assert.equal(trade.target,8000);
  assert.equal(trade.tiles.length,36);
  assert.deepEqual(tradeBoard.checkpoints,[8,24]);
  assert.deepEqual(Object.keys(tradeBoard.cardShops),['2','30']);
  assert.equal(trade.tiles.filter(t=>t.type==='성소').length,2);
  assert.ok(tradeBoard.links[5].includes(32)&&tradeBoard.links[29].includes(35));
  for(const at of [2,30]){
    const [from]=tradeBoard.links[at];
    Object.assign(trade,{phase:'fork',remaining:1,turn:0});
    Object.assign(trade.players[0],{pos:from,previous:null});
    assert.ok(C.play(trade,['route',at]));
    assert.equal(trade.phase,'shop');
    assert.equal(C.choices(trade).filter(([kind])=>kind==='buyCard').length,4);
    assert.ok(C.play(trade,['leaveShop']));
  }
  const ford=C.start(4,4,0,'begins-original-ford');
  assert.equal(C.board(ford).name,'돌등 여울 · 창작 지도');
  assert.equal(ford.tiles.length,25);
  assert.equal(ford.target,6000);assert.equal(ford.players[0].cash,250);
  assert.deepEqual(C.board(ford).checkpoints,[4,12]);
  assert.deepEqual(C.board(ford).links[2].filter(j=>j!==1).sort((a,b)=>a-b),[3,18,22]);
  Object.assign(ford.players[0],{pos:1,previous:0,word:2,dir:1});
  ford.phase='roll';assert.ok(C.play(ford,['roll']));
  assert.equal(ford.phase,'fork');
  assert.ok(C.play(ford,['route',18]));
  assert.equal(ford.players[0].pos,18);assert.equal(ford.phase,'land');
  {
    const C=ps2.createEdition('begins');
    const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
    const open=name=>{
      const s=C.start(2,2,5000,'begins-original-ford');
      assert.ok(id(name)>=0,name);
      s.players.forEach(q=>{q.cash=1000;q.hand=[];});
      s.players[0].hand=[id(name)];return s;
    };
    const cast=(s,...target)=>{
      assert.ok(C.play(s,['cast',0]));
      if(s.phase==='sacrifice')assert.ok(C.play(s,['sacrifice',1]));
      if(target.length)assert.ok(C.play(s,target));
    };
    const mark=(s,at,level,owner=1)=>Object.assign(s.tiles[at],{owner,type:0,level,unit:{id:id('fighter'),hp:40}});
    const retreat=open('shrink');mark(retreat,1,1);
    retreat.tiles[1].unit.hp=28;
    assert.equal(C.spellHP(retreat,retreat.tiles[1],'shrink'),18);
    cast(retreat,'targetLand',1);
    assert.deepEqual([retreat.tiles[1].unit.st,retreat.tiles[1].unit.hp,retreat.tiles[1].unit.mhp],[30,18,30]);
    assert.match(retreat.mapEffect.label,/−10 HP/);
    const shielded=open('shrink');mark(shielded,1,1);
    shielded.tiles[1].unit.enchant='phantasm';
    cast(shielded,'targetLand',1);
    assert.deepEqual([shielded.tiles[1].unit.st,shielded.tiles[1].unit.hp],[30,40]);

    for(const together of [false,true]){
      const meteor=open('meteor');mark(meteor,1,5);
      if(together)mark(meteor,2,2);
      meteor.players[0].hand.push(id('goblin'));
      cast(meteor,'targetLand',1);
      assert.equal(meteor.tiles[1].level,together?3:1);
    }
    const blend=open('quintessence');mark(blend,1,4);mark(blend,2,5);
    assert.ok(C.play(blend,['cast',0]));
    assert.deepEqual(C.choices(blend),[['targetLand',1]]);
    assert.ok(C.play(blend,['targetLand',1]));
    assert.deepEqual([blend.tiles[1].type,blend.tiles[2].type],['복합',0]);
    const sacrifice=open('goblinslair');
    sacrifice.players[0].pos=1;sacrifice.players[0].hand.push(id('fighter'));
    cast(sacrifice);
    assert.deepEqual([sacrifice.tiles[1].unit.id,sacrifice.players[0].hand],[id('goblin'),[id('goblinslair')]]);
    const quiet=open('spartoi');quiet.players[0].hand.push(id('fighter'));cast(quiet);
    assert.equal(quiet.tiles.filter(t=>t.owner===0&&t.unit?.id===id('skeleton')).length,1);

    const tax=open('corruption');tax.players[1].symbols[0]=15;
    cast(tax,'targetPlayer',1);assert.equal(tax.players[1].cash,850);
    const grace=open('grace');grace.players[1].symbols[0]=20;
    cast(grace,'targetPlayer',1);
    assert.equal(grace.players[0].cash,1000-C.cards[id('grace')].cost+Math.floor(20*grace.prices[0]*.15));
    const fairies=open('fairylight');fairies.players[1].hand=Array(3).fill(id('goblin'));
    cast(fairies,'targetPlayer',1);fairies.phase='land';
    assert.ok(C.play(fairies,['pass']));assert.equal(fairies.players[1].cash,1030);

    const sands=open('quicksand');mark(sands,1,2);
    cast(sands,'targetLand',1);
    Object.assign(sands,{phase:'fork',die:3,remaining:3});
    assert.ok(C.play(sands,['route',1]));
    assert.deepEqual([sands.players[0].pos,sands.remaining,sands.tiles[1].unit.enchant],[1,0,undefined]);
  }
  console.log('Begins spells, 100 MHP cap, redraw, 80 percent land liquidation and original Ford routes OK');
}
for(const edition of ['dc','ps1','saturn']){
  const C=ps2.createEdition(edition),map=edition+'-1';
  const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const open=name=>{
    const s=C.start(2,2,5000,map);
    assert.ok(id(name)>=0,edition+' '+name);
    s.players.forEach(q=>{q.cash=400;q.hand=[];q.book=[id('goblin')];});
    s.players[0].hand=[id(name)];
    return s;
  };
  const cast=(s,k,x)=>{assert.ok(C.play(s,['cast',0]));if(k)assert.ok(C.play(s,[k,x]),edition+' '+k+' '+x);};
  const land=s=>s.tiles.flatMap((t,at)=>C.territoryType(t.type)?[at]:[]);
  const place=(s,at,owner,hp=30)=>Object.assign(s.tiles[at],{owner,unit:{id:id('goblin'),hp}});
  const barrier=open('barrier');cast(barrier,'targetPlayer',1);
  assert.equal(barrier.players[1].status,'barrier');
  assert.equal(barrier.players[1].enchantDeadline,2*({dc:5,ps1:6,saturn:3}[edition]));

  const chariot=open('chariot'),source=land(chariot).find(at=>C.board(chariot).links[at].some(n=>C.board(chariot).links[n].some(j=>j!==at&&land(chariot).includes(j))));
  place(chariot,source,0);
  cast(chariot,'targetLand',source);
  const [move,destination]=C.choices(chariot)[0];
  assert.ok(C.play(chariot,[move,destination]));
  assert.deepEqual([chariot.phase,chariot.tiles[source].owner,chariot.tiles[destination].unit.id],['roll',-1,id('goblin')]);
  assert.equal(chariot.players[0].book.includes(id('chariot')),edition==='dc');

  const damaged=open('lifestream'),[allyAt,opponentAt]=land(damaged);
  place(damaged,allyAt,0,10);place(damaged,opponentAt,1,10);
  cast(damaged);
  assert.deepEqual([damaged.tiles[allyAt].unit.hp,damaged.tiles[opponentAt].unit.hp],[30,10]);

  if(edition!=='saturn'){
    const punished=open('corruption');
    punished.players[1].symbols[0]=12;
    cast(punished,'targetPlayer',1);
    assert.equal(punished.players[1].cash,340);
  }
  if(edition==='dc'){
    const insight=open('foresight');
    const book=['goblin','minotaur','dwarf','wolf','fighter','magicbolt'].map(id);
    assert.ok(book.every(n=>n>=0));
    insight.players[0].book=book.slice();cast(insight);
    assert.deepEqual(C.choices(insight).map(([, ,card])=>card),book.slice(-4).reverse());
    assert.ok(!C.play(insight,['foresightCard',4,book[1]]));
    assert.ok(C.play(insight,['foresightCard',3,book[2]]));
    assert.deepEqual(insight.players[0].hand,[book[2]]);
  }else{
    const haste=open('haste');cast(haste,'targetPlayer',0);
    assert.equal(haste.players[0].enchantDeadline,6);
    assert.ok(C.play(haste,['roll']));
    assert.ok(haste.die>=6&&haste.die<=8);

    const growth=open('growthbody');
    place(growth,allyAt,0);place(growth,opponentAt,1);
    assert.ok(C.play(growth,['cast',0]));
    assert.deepEqual(C.choices(growth),[['targetLand',allyAt]]);
    assert.ok(C.play(growth,['targetLand',allyAt]));
    assert.deepEqual([growth.tiles[allyAt].unit.mhp,growth.tiles[opponentAt].unit.mhp],[40,undefined]);

    const released=open('landtransfer');
    place(released,allyAt,0);released.tiles[allyAt].level=3;
    const value=C.value(released,released.tiles[allyAt]);
    cast(released,'targetLand',allyAt);
    assert.deepEqual([released.players[0].cash,released.tiles[allyAt].owner,released.players[0].book],[390+value,-1,[id('goblin')]]);
  }
  if(edition==='dc'){
    function nativeSpell(name,prepare){
      const s=C.start(2,2,5000,map);
      Object.assign(s.players[0],{cash:600,hand:[id(name),id('manna')]});
      if(prepare)prepare(s);
      assert.ok(C.play(s,['cast',0]),name);
      if(s.phase==='sacrifice')assert.ok(C.play(s,['sacrifice',1]),name);
      return s;
    }
    const bind=nativeSpell('bind',s=>{s.players[1].cash=500;});
    assert.deepEqual(C.choices(bind),[['targetPlayer',0],['targetPlayer',1]]);
    assert.ok(C.play(bind,['targetPlayer',1]));
    assert.deepEqual([bind.players[1].cash,bind.players[1].status,bind.players[1].enchantDeadline],[500,'bind',2]);
    const rust=nativeSpell('rust',s=>{s.players[1].hand=['manna','battleaxe','chainmail','goblin'].map(id);});
    assert.ok(C.play(rust,['targetPlayer',1]));
    assert.deepEqual(rust.players[1].hand,['manna','goblin'].map(id));
    const phantasm=nativeSpell('phantasm',s=>{
      Object.assign(s.tiles[1],{type:0,owner:0,unit:{id:id('goblin'),hp:30}});
    });
    assert.ok(C.play(phantasm,['targetLand',1]));
    assert.equal(phantasm.tiles[1].unit.enchant,'phantasm');
    phantasm.turn=1;phantasm.phase='spell';phantasm.players[1].hand=[id('magicbolt')];
    cast(phantasm,'targetLand',1);
    assert.equal(phantasm.tiles[1].unit.hp,30);
    console.log('Dreamcast native Bind, Rust and Phantasm checks passed');
  }else{
    const rain=open('acidrain'),[plant,rock]=land(rain);
    rain.tiles[plant].owner=0;rain.tiles[plant].unit={id:id('woodfolk'),hp:30};
    rain.tiles[rock].owner=1;rain.tiles[rock].unit={id:id('wallofstone'),hp:60};
    cast(rain);assert.deepEqual([rain.tiles[plant].unit.hp,rain.tiles[rock].unit.hp],[10,60]);

    const marsh=edition+'-original-marsh-paths',storm=C.start(4,4,0,marsh,undefined,undefined,0,'teams');
    assert.deepEqual([C.board(storm).areaCount,storm.prices.length,storm.target],[2,8,6500]);
    const route=C.board(storm);
    assert.equal(new Set(route.position.map(String)).size,24);
    assert.ok(route.links.every((neighbors,i)=>neighbors.every(j=>Math.abs(route.position[i][0]-route.position[j][0])+Math.abs(route.position[i][1]-route.position[j][1])===1)));
    Object.assign(storm.players[0],{cash:400,hand:[id('icestorm')]});
    const [inside,outside,wrongElement]=[1,11,2];
    for(const at of [inside,outside,wrongElement])place(storm,at,1);
    for(const at of [inside,outside])storm.tiles[at].unit={id:id('minotaur'),hp:40,mhp:60};
    cast(storm,'comboArea',0);
    assert.deepEqual([inside,outside,wrongElement].map(at=>storm.tiles[at].unit.hp),[22,40,30]);
    assert.deepEqual(storm.mapEffect.hits,[{at:inside,damage:18,defeated:false}]);

    const pressure=C.start(2,2,0,marsh);
    pressure.players[0].cash=400;pressure.players[0].hand=[id('pressure')];pressure.prices=Array(8).fill(25);
    cast(pressure,'comboArea',0);
    assert.deepEqual(pressure.prices,[20,20,20,20,25,25,25,25]);
    const grace=open('grace');grace.players[0].symbols[0]=12;grace.prices[0]=10;
    cast(grace);assert.equal(grace.players[0].cash,402);
    const slow=open('slow');cast(slow,'targetPlayer',1);
    assert.equal(slow.players[1].enchantDeadline,6);
    console.log(edition,'native plant damage, elemental area damage, symbol area and timed dice checked');
  }
  console.log(edition,'native barrier, Chariot, healing, draw and economy effects passed');
}
{
  const C=ps2.createEdition('3ds'),archives=require('../dist/cept-edition-data-2012');
  const names=Object.keys(C.maps),intro='3ds-original-bend',shore='3ds-original-shore';
  const id=name=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const catalog=C.cards.filter(c=>!c.unlisted);
  assert.equal(catalog.length,487);
  assert.equal(new Set(catalog.map(c=>C.combo.key(c))).size,487);
  const playerBooks=require('../dist/cept-2012-player-books.js');
  assert.equal(playerBooks.length,6);
  const listed=new Set(catalog.map(C.combo.key));
  for(const [,name,source,recipe] of playerBooks){
    assert.match(source,/^\d+-c3ds-playerdecks-/);
    assert.equal(Object.values(recipe).reduce((sum,n)=>sum+n,0),50,name);
    assert.ok(Object.keys(recipe).every(slug=>listed.has(slug)),name);
    assert.ok(Object.values(recipe).every(n=>n>=1&&n<=4),name);
  }
  assert.equal(archives.maps.length,41);
  assert.deepEqual(archives.maps.find(m=>m.name==='Dunnan'),{name:'Dunnan',section:'story',goal:6000,die:6,areas:1,tiles:18,start:200,lap:200,forts:'S',fortBonus:100});
  assert.ok(catalog.every(c=>!c.editionArt));
  assert.equal(names.length,6);
  assert.ok(Object.values(C.presets).every(C.validBook));
  assert.equal(new Set(Object.values(C.presets).map(book=>book.join(','))).size,Object.keys(C.presets).length);
  const online=playerBooks.find(([, ,source])=>source==='956-c3ds-playerdecks-osf20130125');
  const onlineBook=C.presets['handheld-'+online[2]];
  assert.ok(C.validBook(onlineBook));
  assert.deepEqual([...onlineBook].sort(),Object.entries(online[3]).flatMap(([slug,n])=>Array(n).fill(id(slug))).sort());
  const starters={
    handheldStarterFireEarth:'cyclops:2 fighter:2 giantrat:1 wolf:2 dragonfly:2 gascloud:2 kobold:2 minotaur:2 pillarofflame:2 dwarf:2 pan:2 tigerbeetle:2 wallofstone:2 woodfolk:2 battleaxe:1 chainmail:2 flametongue:1 leatherarmor:1 longsword:1 mace:1 scalearmor:1 stonehail:1 fly:2 holyword1:2 holyword6:2 magicbolt:2 manna:3 shatter:2 windofhope:1',
    handheldStarterWaterAir:'cyclops:2 fighter:2 giantrat:1 wolf:2 giantamoeba:2 kingtortoise:2 lizardman:2 merfolk:2 wallofice:2 giantbat:2 harpy:2 hornet:2 hurricane:2 spectre:2 battleaxe:1 chainmail:2 leatherarmor:1 longsword:1 mace:1 scalearmor:1 icicle:1 windcutter:1 fly:2 holyword1:2 holyword6:2 magicbolt:2 manna:3 shatter:2 windofhope:1',
    handheldStarterFireAir:'cyclops:2 fighter:2 giantrat:1 wolf:2 dragonfly:2 gascloud:2 kobold:2 minotaur:2 pillarofflame:2 giantbat:2 harpy:2 hornet:2 hurricane:2 spectre:2 battleaxe:1 chainmail:2 leatherarmor:1 longsword:1 mace:1 scalearmor:1 firebolt:1 rockbiter:1 fly:2 holyword1:2 holyword6:2 magicbolt:2 manna:3 shatter:2 windofhope:1',
    handheldStarterWaterEarth:'cyclops:2 fighter:2 giantrat:1 wolf:2 giantamoeba:2 kingtortoise:2 lizardman:2 merfolk:2 wallofice:2 dwarf:2 pan:2 tigerbeetle:2 wallofstone:2 woodfolk:2 battleaxe:1 chainmail:2 leatherarmor:1 longsword:1 mace:1 scalearmor:1 airslasher:1 freeze:1 fly:2 holyword1:2 holyword6:2 magicbolt:2 manna:3 shatter:2 windofhope:1'
  };
  for(const [name,recipe] of Object.entries(starters)){
    const expected=Object.fromEntries(recipe.split(' ').map(row=>{const [k,n]=row.split(':');return [k,Number(n)];}));
    const deck=C.presets[name],counts={};
    assert.ok(C.validBook(deck),name);
    for(const card of deck){const slug=C.combo.key(C.cards[card]);counts[slug]=(counts[slug]||0)+1;}
    assert.deepEqual(counts,expected);
    assert.deepEqual(['creature','item','spell'].map(kind=>deck.filter(card=>C.cards[card].kind===kind).length),[27,9,14]);
  }
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
  for(const key of ['3ds-original-alder-pass','3ds-original-palm-canals','3ds-original-terraced-valleys']){
    const map=C.maps[key],connected=new Set([0]);
    assert.equal(new Set(map.position.map(String)).size,map.types.length);
    assert.equal(map.types.length,map.areas.length);
    for(const at of connected)for(const next of map.links[at]){
      const [r,c]=map.position[at],[nr,nc]=map.position[next];
      assert.equal(Math.abs(r-nr)+Math.abs(c-nc),1);
      connected.add(next);
    }
    assert.equal(connected.size,map.types.length);
  }
  const crossing=C.start(4,4,0,'3ds-original-palm-canals',undefined,undefined,3,'teams');
  assert.deepEqual([crossing.target,crossing.prices.length,C.board(crossing).forts],[8000,8,[9,15]]);
  Object.assign(crossing,{phase:'fork',die:2,remaining:2});
  Object.assign(crossing.players[0],{pos:3,previous:2});
  assert.deepEqual(new Set(C.choices(crossing).map(([,at])=>at)),new Set([4,24]));
  assert.ok(C.play(crossing,['route',24]));
  assert.deepEqual([crossing.phase,crossing.players[0].pos,crossing.tiles[12].area,crossing.lastMove.path],['land',12,1,[3,24,12]]);

  const valleys=C.start(4,4,0,'3ds-original-terraced-valleys',undefined,undefined,3,'teams');
  assert.deepEqual([valleys.target,valleys.prices.length,C.board(valleys).forts],[9000,12,[5,17,30]]);
  for(const [from,prior,bridge,dest,area] of [[4,3,36,23,1],[8,7,38,25,2]]){
    Object.assign(valleys,{phase:'fork',die:2,remaining:2,visited:[]});
    Object.assign(valleys.players[0],{pos:from,previous:prior});
    assert.ok(C.choices(valleys).some(([kind,at])=>kind==='route'&&at===bridge));
    assert.ok(C.play(valleys,['route',bridge]));
    assert.deepEqual([valleys.phase,valleys.players[0].pos,valleys.tiles[dest].area,valleys.lastMove.path],['land',dest,area,[from,bridge,dest]]);
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
  const asDefender=(name,extras={})=>s=>{
    const card=id(name);s.tiles[3].unit={id:card,hp:C.cards[card].hp,...extras};
  };
  const bracelet=fight('minotaur','powerbracelet',null,35,s=>{
    Object.assign(s.tiles[8].unit,{hp:10,mhp:50,enchant:'vitality'});
  });
  assert.deepEqual([bracelet.battle.attackST,bracelet.battle.startHP[0]],[90,120]);
  assert.equal(bracelet.players[0].cash,910);

  const camazotz=fight('camazotz',null,null,null,s=>{
    s.players[1].symbols=[2,20,4,10];
  });
  assert.equal(camazotz.battle.attackST,60);
  assert.deepEqual(camazotz.players[1].symbols,[2,14,4,10]);
  const noCamazotz=fight('camazotz',null,null,null,s=>{
    asDefender('tyrannosaurus',{st:0,enchant:'senility'})(s);s.players[1].symbols=[2,20,4,10];
  });
  assert.deepEqual(noCamazotz.players[1].symbols,[2,20,4,10]);
  const larvae=fight('minotaur','battleaxe',null,null,asDefender('myrmecoleo'));
  assert.equal(larvae.battle.strikes[0].side,0);
  assert.deepEqual([larvae.tiles[3].owner,larvae.tiles[3].unit.id,larvae.tiles[3].unit.hp],[1,id('dragonfly'),20]);
  for(const [type,level] of [[1,2],[3,3]]){
    const levelled=fight('leveller',null,null,null,s=>{
      s.tiles[3].type=type;s.tiles[3].level=3;asDefender('goblin',{st:0})(s);
    });
    assert.equal(levelled.tiles[3].level,level);
  }
  for(const [count,st] of [[4,60],[5,30]]){
    const titan=fight('burningtitan',null,null,null,s=>{
      for(const i of [1,5,6,8,9].slice(0,count))Object.assign(s.tiles[i],{owner:0,unit:{id:id('goblin'),hp:30}});
    });
    assert.equal(titan.battle.attackST,st);
  }
  const cratos=C.presets['handheld-914-c3ds-playerdecks-cratoslevel10'];
  assert.ok(C.validBook(cratos));
  assert.equal(cratos.filter(card=>card===id('camazotz')).length,4);

  const poisoned=fight('hornet',null,null,null,asDefender('tyrannosaurus',{st:0}));
  assert.ok(poisoned.battle.won&&poisoned.battle.lines.some(line=>line.includes('독 · 30 피해')));
  const drake=fight('firedrake',null,null,null,s=>{
    for(const at of [5,6])Object.assign(s.tiles[at],{owner:1,unit:{id:id('goblin'),hp:50,mhp:50}});
    s.tiles[5].unit.id=id('minotaur');
  });
  assert.equal(drake.battle.attackST,40);
  const general=fight('generalguan',null,null,null,s=>{
    for(const at of [5,6])Object.assign(s.tiles[at],{owner:1,unit:{id:id('goblin'),hp:50,mhp:50}});
  });
  assert.equal(general.battle.attackST,40);
  const golem=fight('goblin',null,null,null,asDefender('golem'));
  assert.deepEqual([golem.tiles[3].unit.st,golem.tiles[3].unit.hp],[30,30]);
  const flame=fight('flamelord','stonehail',null,null,asDefender('goblin'));
  assert.equal(flame.players[0].cash,880);
  assert.ok(flame.battle.strikes[0].notes.some(s=>s.includes('45 피해')));
  const haze=fight('minotaur',null,null,null,asDefender('gascloud'));
  assert.equal(haze.battle.strikes[0].hp[1],10);
  const hazeScroll=fight('minotaur','stonehail',null,null,asDefender('gascloud'));
  assert.equal(hazeScroll.battle.strikes[0].hp[1],0);

  const armor=fight('goblin',null,'shadowarmor');
  assert.equal(armor.battle.startHP[1],100);
  const ram=fight('goblin','batteringram',null,null,asDefender('wallofstone'));
  assert.ok(ram.battle.won&&ram.battle.lines.some(line=>line.includes('즉사')));
  const chameleon=fight('goblin',null,'chameleonarmor',null,s=>{s.tiles[3].level=3;});
  assert.equal(chameleon.battle.startHP[1],80);
  const dagger=fight('goblin','daggerofmite',null);
  assert.equal(dagger.battle.attackST,60);
  const firstEarth=fight('dwarf','earthamulet',null);
  assert.equal(firstEarth.battle.strikes[0].side,0);
  assert.match(firstEarth.battle.strikes[0].notes.join(' '),/60 피해/);

  const goose=fight('goblin','goldengoose',null);
  assert.equal(goose.players[0].cash,1210);
  assert.ok(goose.battle.lines.some(line=>line.includes('210G')));
  const gooseAI=C.start(2,2,5000,intro,undefined,undefined,3);
  Object.assign(gooseAI,{phase:'attack',battle:{at:3,inv:id('goblin'),atkItem:null,defItem:null}});
  Object.assign(gooseAI.tiles[3],{type:1,owner:1,unit:{id:id('minotaur'),hp:40}});
  Object.assign(gooseAI.players[0],{pos:3,ai:true,hand:[id('goldengoose')]});
  assert.deepEqual(C.ai(gooseAI),['equip',0]);
  gooseAI.players[0].hand=[id('phoenixamulet')];
  assert.deepEqual(C.ai(gooseAI),['equip',0]);
  const phoenix=fight('goblin','phoenixamulet',null);
  assert.equal(phoenix.players[0].cash,1000+C.cards[id('goblin')].cost);
  assert.deepEqual(phoenix.players[0].hand,[id('goblin')]);
  const heart=fight('minotaur','heartfibula',null,40,s=>{
    Object.assign(s.tiles[8].unit,{mhp:90,hp:90});asDefender('goblin')(s);
  });
  assert.deepEqual([heart.tiles[3].owner,heart.tiles[3].unit.mhp],[0,100]);
  const plow=fight('goblin','silverplow',null);
  assert.deepEqual([plow.battle.won,plow.tiles[3].level],[false,2]);
  const protectedLevel=fight('goblin','silverplow',null,null,asDefender('minotaur',{enchant:'drought'}));
  assert.equal(protectedLevel.tiles[3].level,1);
  const flowing=fight('merfolk','wateramulet',null,null,asDefender('goblin'));
  assert.equal(flowing.tiles[3].unit.st,C.cards[id('merfolk')].st+10);
  const breeze=fight('harpy','windamulet',null,null,asDefender('goblin'));
  assert.equal(breeze.tiles[3].unit.mhp,C.cards[id('harpy')].hp+10);
  const bindWhip=fight('goblin','bindingwhip',null,null,asDefender('minotaur',{hp:90,mhp:90}));
  assert.equal(bindWhip.battle.strikes.length,1);
  assert.equal(bindWhip.tiles[3].unit.enchant,'paralysis');
  const strikes=fight('goblin','tonfa',null);
  assert.deepEqual(strikes.battle.strikes.map(hit=>hit.side),[0,0]);
  assert.ok(strikes.battle.won);
  const blade=fight('minotaur','aurablade',null);
  assert.equal(blade.battle.attackST,80);
  const fireScroll=fight('minotaur','hellblaze',null,null,asDefender('goblin'));
  assert.ok(fireScroll.battle.strikes[0].notes.some(line=>line.includes('60 피해')));

  const offering=fight('minotaur','offeringdoll',null,null,s=>{
    asDefender('statue')(s);s.prices[s.tiles[3].area*4]=10;
  });
  assert.equal(offering.battle.won,false);
  assert.equal(offering.prices[offering.tiles[3].area*4],13);
  const coin=fight('minotaur','coinofpiety',null,null,s=>{asDefender('goblin')(s);s.tiles[3].type=2;});
  assert.equal(coin.players[0].symbols[coin.tiles[3].area*4+2],10);
  const rainbow=fight('minotaur','stonehail','rainbowpiece',null,asDefender('goblin',{enchant:'greed'}));
  assert.equal(rainbow.battle.strikes[0].effect,'block');
  assert.equal(rainbow.tiles[3].unit.enchant,undefined);
  assert.equal(C.copyLimit(C.cards[id('rainbowpiece')]),1);
  const boots=fight('minotaur',null,'wingedboots',null,asDefender('gremlin'));
  assert.equal(boots.battle.strikes[0].side,1);
  assert.ok(boots.players[1].book.includes(id('wingedboots')));

  const protectedOrb=fight('minotaur','blackorb',null,null,s=>{s.tiles[3].unit={id:id('thief'),hp:40};});
  assert.ok(protectedOrb.battle.won,'Thief cannot steal Black Orb');
  {
    const spells='acidrain avalanche backward banishingray bistair chariot corruption drought fairylight fog incineration locust phantasm revelation revival selenear simulacrum spartoi spiritwalk telegnosis torture triumph'.split(' ');
    assert.ok(spells.every(name=>id(name)>=0));
    const spell=name=>{
      const s=C.start(4,4,0,intro,undefined,undefined,2,'teams');
      s.players.forEach(p=>{p.cash=1000;p.hand=[];});
      s.players[0].hand=[id(name)];s.players[0].book=[id('fly')];
      return s;
    };
    const place=(s,at,name,owner,level=1)=>Object.assign(s.tiles[at],{type:0,owner,level,unit:{id:id(name),hp:C.cards[id(name)].hp}});
    const cast=(s,...action)=>assert.ok(C.play(s,['cast',0])&&(!action.length||C.play(s,action)));

    const targeted=spell('antimagic');
    cast(targeted,'targetPlayer',0);
    assert.equal(targeted.players[0].antiMagic,true);
    targeted.turn=1;targeted.phase='spell';targeted.players[1].hand=[id('drainmagic')];
    assert.ok(C.play(targeted,['cast',0])&&C.play(targeted,['targetPlayer',0]));
    assert.deepEqual([targeted.players[0].cash,targeted.players[0].antiMagic,targeted.phase],[950,undefined,'roll']);

    const bound=spell('bind');bound.players[0].hand.push(id('fly'));
    assert.ok(C.play(bound,['cast',0])&&C.play(bound,['sacrifice',1])&&C.play(bound,['targetPlayer',1]));
    assert.deepEqual([bound.players[1].cash,bound.players[1].status,bound.players[1].enchantDeadline],[1150,'bind',4]);

    const tolls=spell('uniformity');place(tolls,1,'minotaur',1,3);
    cast(tolls,'targetPlayer',1);
    assert.deepEqual([C.toll(tolls,tolls.tiles[1]),tolls.players[1].enchantDeadline],[200,12]);

    const voided=spell('lifeforce');
    cast(voided,'targetPlayer',0);
    assert.equal(C.price(voided.players[0],C.cards[id('minotaur')],voided),0);
    assert.equal(C.price(voided.players[0],C.cards[id('battleaxe')],voided,false),0);
    voided.phase='spell';voided.players[0].hand=[id('windofhope')];
    cast(voided);
    assert.deepEqual([voided.players[0].status,voided.players[0].hand,voided.players[0].book],[undefined,[],[id('fly')]]);

    const hidden=spell('invisibility');place(hidden,1,'minotaur',0);
    cast(hidden);assert.equal(hidden.players[0].enchantDeadline,24);
    hidden.turn=1;hidden.phase='spell';hidden.players[1].hand=[id('magicbolt')];cast(hidden);
    assert.deepEqual(C.choices(hidden),[['fizzle']]);
    hidden.turn=0;hidden.phase='spell';hidden.players[0].hand=[id('windofhope')];cast(hidden);
    assert.equal(hidden.players[0].invisible,true);

    const meteor=spell('meteor');meteor.players[0].hand.push(id('fly'));
    place(meteor,1,'minotaur',1,5);place(meteor,2,'minotaur',1,4);
    assert.ok(C.play(meteor,['cast',0])&&C.play(meteor,['sacrifice',1])&&C.play(meteor,['targetLand',1]));
    assert.deepEqual([meteor.tiles[1].level,meteor.tiles[2].level],[3,4]);

    const scourged=spell('scourge');scourged.players[0].hand.push(id('fly'));
    scourged.players[1].antiMagic=true;scourged.players[2].status='barrier';
    assert.ok(C.play(scourged,['cast',0])&&C.play(scourged,['sacrifice',1]));
    assert.deepEqual(scourged.players.map(p=>p.cash),[920,600,600,1000]);

    const mind=spell('poisonmind');mind.players[1].book=[id('manna'),id('goblin'),id('fly')];
    cast(mind,'targetPlayer',1);
    const roomView=require('../dist/cept-room-state').view;
    const seen=roomView(C,mind,0),other=roomView(C,mind,2);
    assert.deepEqual(seen.choices.map(x=>x[2]),[id('fly'),id('goblin'),id('manna')]);
    assert.deepEqual(other.choices,[]);assert.equal(other.game.players[1].book,undefined);
    assert.ok(C.play(mind,seen.choices[1]));assert.deepEqual(mind.players[1].book,[id('manna'),id('fly')]);

    const ether=spell('aetherflash');cast(ether);
    assert.ok(ether.players.every(p=>p.status==='aetherflash'&&p.enchantDeadline===24));
    const dragon=id('dragon');
    ether.phase='land';ether.players[0].pos=1;ether.players[0].hand=[dragon];
    assert.ok(C.play(ether,['summon',0]));
    assert.deepEqual([ether.tiles[1].unit.id,ether.players[0].cash],[dragon,860]);

    const shrineTrade=spell('pilgrim');
    const market=C.start(4,4,0,'3ds-original-market',undefined,undefined,2,'teams');
    market.players[0].cash=1000;market.players[0].hand=[id('pilgrim')];cast(market);
    assert.equal(market.phase,'temple');assert.ok(C.play(market,['buySymbol',0,1]));
    assert.deepEqual([market.phase,market.players[0].pos,market.players[0].symbols[0]],['roll',0,1]);
    cast(shrineTrade);assert.deepEqual(shrineTrade.players[0].hand,[id('fly')]);
    console.log('2012 3DS timed curses, sacrifice, hidden book choices, chained Meteor, alternate summoning costs and remote temple verified');

    const tournament=C.presets['handheld-943-c3ds-playerdecks-ajcc20124th'];
    assert.ok(C.validBook(tournament));assert.ok(tournament.includes(id('yowie')));
    const tollTest=spell('manna');place(tollTest,3,'yowie',1);
    const range=C.tollRange(tollTest,tollTest.tiles[3]);
    assert.deepEqual(range,[C.toll(tollTest,tollTest.tiles[3],5),C.toll(tollTest,tollTest.tiles[3],25)]);
    assert.ok(range[0]<range[1]);

    const guarded=spell('magicbolt');
    place(guarded,2,'clayidol',1);place(guarded,3,'minotaur',1);
    cast(guarded,'targetLand',3);assert.equal(guarded.tiles[3].unit.hp,30);
    const protectedPlayers=spell('drainmagic');place(protectedPlayers,2,'graniteidol',1);
    cast(protectedPlayers);assert.deepEqual(C.choices(protectedPlayers),[['fizzle']]);
    const premium=spell('manna');place(premium,2,'ivoryidol',1);
    const rare=C.cards[id('meteor')];
    assert.equal(C.price(premium.players[0],rare,premium),rare.cost*2);

    const equipment=spell('manna');
    place(equipment,2,'bronzeidol',1);place(equipment,3,'minotaur',1);
    equipment.players[0].hand=[id('goblin'),id('livingshield')];
    equipment.battle={at:3,inv:id('wizard'),atkItem:null,defItem:null};equipment.phase='attack';
    assert.deepEqual(C.choices(equipment),[['equip',1],['bare']]);
    assert.ok(C.play(equipment,['equip',1])&&C.play(equipment,['bare']));
    assert.equal(equipment.battle.startHP[0],60);

    const soul=fight('minotaur','soulblast',null,null,s=>{s.players[0].lap=2;});
    assert.ok(soul.battle.lines.some(line=>line.includes('120G 탈취')));
    assert.equal(soul.players[0].cash,1080);
    const mummy=fight('minotaur','battleaxe',null,null,asDefender('mummy'));
    assert.equal(mummy.players[1].cash,1040);
    const basalt=fight('minotaur','battleaxe',null,null,s=>{
      asDefender('mummy')(s);place(s,5,'basaltidol',1);
    });
    assert.equal(basalt.players[1].cash,1000);
    const hurricane=fight('minotaur',null,null,null,asDefender('hurricane'));
    assert.equal(hurricane.battle.strikes[0].side,1);
    const restoredFungus=fight('goblin',null,null,null,asDefender('fungonoid',{hp:36}));
    assert.deepEqual([restoredFungus.tiles[3].unit.mhp,restoredFungus.tiles[3].unit.hp],[50,50]);
    console.log('2012 3DS map Idols, restricted living equipment, lap rewards, scroll magic and regeneration checked');

    const bookPower=fight('peri',null,null,null,s=>{s.players[0].book=[id('fly'),id('goblin'),id('manna')];});
    assert.deepEqual([bookPower.battle.attackST,bookPower.battle.startHP[0]],[13,13]);

    const stolenHand=fight('remora',null,null,null,s=>{s.players[1].hand=[id('manna')];});
    assert.ok(stolenHand.battle.lines.some(line=>line.includes('상대 손패 한 장 파괴')));
    assert.deepEqual(stolenHand.players[1].hand,[]);
    const powerLimit=fight('valkyria','battleaxe',null,null,asDefender('goblin'));
    assert.equal(powerLimit.tiles[3].unit.st,C.cards[id('valkyria')].st+10);

    const regionalTengu=C.start(4,4,0,'3ds-original-terraced-valleys',undefined,undefined,0,'teams');
    place(regionalTengu,3,'tengu',0);place(regionalTengu,10,'goblin',1);place(regionalTengu,22,'goblin',1);
    for(const at of [3,10,22])regionalTengu.tiles[at].type=3;
    Object.assign(regionalTengu,{phase:'land'});
    Object.assign(regionalTengu.players[0],{pos:3,cash:600});
    const longRange=C.choices(regionalTengu).filter(([kind,from])=>kind==='transfer'&&from===3);
    assert.ok(longRange.some(([, ,to])=>to===10));
    assert.ok(!longRange.some(([, ,to])=>to===22));

    const randomBeforeBasilisk=Math.random;
    try{
      for(const [roll,won] of [[.39,true],[.4,false]]){
        Math.random=()=>roll;
        const hunt=fight('basilisk',null,null,null,s=>{asDefender('minotaur',{st:0})(s);s.tiles[3].level=3;});
        assert.equal(hunt.battle.won,won);
        assert.equal(hunt.tiles[3].level,2);
      }
    }finally{Math.random=randomBeforeBasilisk;}
    console.log('2012 3DS regional Tengu, private hand attack, Peri book scaling, Valkyria and Basilisk thresholds checked');

    const shifts=spell('turnover');
    for(const [at,st] of [[1,30],[2,40],[3,50],[5,80]]){place(shifts,at,'goblin',at%4);shifts.tiles[at].unit.st=st;}
    cast(shifts);
    assert.deepEqual([1,2,3,5].map(at=>shifts.tiles[at].unit.st),[50,40,30,60]);
    const benevolence=spell('charity');
    benevolence.players.forEach((q,seat)=>{q.cash=seat%2?2000:1000;});
    benevolence.players[0].book=[id('fly'),id('goblin'),id('minotaur'),id('wallofice')];
    cast(benevolence);
    assert.deepEqual([benevolence.players[0].cash,benevolence.players[0].hand],[950,[id('wallofice'),id('minotaur')]]);
    const cap=spell('mutation');place(cap,1,'goblin',0);
    Object.assign(cap.tiles[1].unit,{hp:70,mhp:90});
    cast(cap,'targetLand',1);
    assert.deepEqual([cap.tiles[1].unit.hp,cap.tiles[1].unit.mhp,cap.tiles[1].unit.poisoned],[80,100,true]);

    const landSale=spell('landtransfer');
    place(landSale,1,'goblin',0,3);place(landSale,2,'goblin',2,3);
    const value=C.value(landSale,landSale.tiles[1]);
    landSale.players[0].cash=150;
    assert.deepEqual(C.ai(landSale),['cast',0]);
    landSale.players[0].cash=1000;
    assert.ok(C.play(landSale,['cast',0]));
    assert.deepEqual(C.choices(landSale),[['targetLand',1]]);
    assert.ok(C.play(landSale,['targetLand',1]));
    assert.deepEqual([landSale.players[0].cash,landSale.tiles[1].owner,landSale.tiles[2].owner,landSale.players[0].book],[900+value,-1,2,[id('fly')]]);

    const dust=spell('chariot');place(dust,1,'powdereater',0);
    cast(dust,'targetLand',1);
    const destination=C.choices(dust)[0][1];assert.ok(C.play(dust,['teleTo',destination]));
    assert.deepEqual([dust.tiles[1].owner,dust.tiles[destination].unit.id],[-1,id('powdereater')]);
    const dustCommand=C.start(2,2,0,intro,undefined,undefined,2);
    dustCommand.phase='land';Object.assign(dustCommand.players[0],{pos:0,cash:0,ai:true});
    place(dustCommand,1,'powdereater',0);
    assert.equal(C.ai(dustCommand)[0],'transfer');
    assert.ok(C.play(dustCommand,['transfer',1,2]));
    assert.deepEqual([dustCommand.tiles[1].unit.id,dustCommand.tiles[2].unit.id],[id('powdereater'),id('powdereater')]);

    const healing=spell('cure');place(healing,1,'goblin',2);
    healing.tiles[1].unit.hp=12;
    cast(healing,'targetLand',1);
    assert.deepEqual([healing.players[0].cash,healing.tiles[1].unit.hp,healing.players[0].hand],[990,30,[id('fly')]]);

    for(const [name,extra,check] of [
      ['camouflage',{},u=>assert.equal(u.enchant,'camouflage')],
      ['removecurse',{enchant:'landprotection'},u=>assert.equal(u.enchant,undefined)]
    ]){
      const s=spell(name);place(s,1,'goblin',0);Object.assign(s.tiles[1].unit,extra);
      cast(s,'targetLand',1);check(s.tiles[1].unit);
      assert.ok(s.players[0].book.includes(id(name)));
    }
    const dispel=spell('dispelmagic');dispel.players[1].status='barrier';
    cast(dispel,'targetPlayer',1);
    assert.equal(dispel.players[1].status,undefined);
    assert.ok(dispel.players[0].book.includes(id('dispelmagic')));
    const weakness=spell('weakness');place(weakness,1,'minotaur',1);
    cast(weakness,'targetLand',1);
    assert.deepEqual([weakness.tiles[1].unit.st,weakness.players[0].hand],[0,[id('fly')]]);

    const exiled=spell('exile');place(exiled,1,'goblin',1);place(exiled,2,'dragon',1);
    for(const at of [1,2])exiled.tiles[at].unit.enchant='greed';
    assert.ok(C.play(exiled,['cast',0]));
    assert.deepEqual(C.choices(exiled),[['targetLand',1]]);
    assert.ok(C.play(exiled,['targetLand',1]));
    assert.deepEqual([exiled.tiles[1].owner,exiled.tiles[2].owner,exiled.players[1].hand],[-1,1,[id('goblin')]]);

    const grown=spell('massgrowth');place(grown,1,'goblin',0);place(grown,2,'minotaur',1);
    Object.assign(grown.tiles[1].unit,{hp:90,mhp:98});
    cast(grown);
    assert.deepEqual([grown.tiles[1].unit.hp,grown.tiles[1].unit.mhp,grown.tiles[2].unit.mhp],[92,100,45]);
    grown.phase='spell';grown.players[0].hand=[id('growthbody')];
    cast(grown,'targetLand',1);
    assert.equal(grown.tiles[1].unit.mhp,100);

    const shift=spell('quintessence');place(shift,1,'goblin',0,4);place(shift,2,'goblin',0,5);
    assert.ok(C.play(shift,['cast',0]));
    assert.deepEqual(C.choices(shift),[['targetLand',1]]);
    assert.ok(C.play(shift,['targetLand',1]));
    assert.deepEqual([shift.tiles[1].type,shift.tiles[2].type],['복합',0]);

    const punishment=spell('punisher');place(punishment,1,'goblin',0);place(punishment,2,'goblin',1);
    punishment.tiles[2].unit.enchant='disease';
    cast(punishment);
    assert.deepEqual([punishment.tiles[1].unit.hp,punishment.tiles[2].unit.hp],[30,10]);

    const acid=spell('acidrain');
    place(acid,1,'wallofice',1);place(acid,2,'goblin',3);
    cast(acid);
    assert.deepEqual([acid.tiles[1].unit.hp,acid.tiles[2].unit.hp],[10,30]);

    const snow=spell('avalanche');
    place(snow,1,'minotaur',1,5);place(snow,2,'minotaur',1,4);
    cast(snow);
    assert.deepEqual([snow.tiles[1].unit.hp,snow.tiles[2].unit.hp],[10,40]);

    const claim=spell('banishingray');
    place(claim,1,'goblin',1);place(claim,2,'minotaur',1);
    assert.ok(C.play(claim,['cast',0]));
    assert.deepEqual(C.choices(claim),[['targetLand',1]]);
    assert.ok(C.play(claim,['targetLand',1]));
    assert.equal(claim.tiles[1].owner,-1);

    const chariot=spell('chariot');
    place(chariot,1,'goblin',0);
    cast(chariot,'targetLand',1);
    assert.ok(chariot.players[0].book.includes(id('chariot')));
    const [at]=C.choices(chariot).flatMap(([kind,at])=>kind==='teleTo'&&chariot.tiles[at].owner<0?[at]:[]);
    assert.ok(C.board(chariot).links[1].some(v=>C.board(chariot).links[v].includes(at)));
    assert.ok(C.play(chariot,['teleTo',at]));
    assert.deepEqual([chariot.phase,chariot.tiles[1].owner,chariot.tiles[at].owner],['roll',-1,0]);

    for(const name of ['drought','fog']){
      const enchant=spell(name);
      place(enchant,1,'minotaur',1,3);
      const before=C.toll(enchant,enchant.tiles[1]);
      cast(enchant,'targetLand',1);
      assert.deepEqual(enchant.players[0].hand,[id('fly')]);
      assert.equal(enchant.tiles[1].unit.enchant,name);
      if(name==='fog')assert.equal(C.toll(enchant,enchant.tiles[1]),Math.floor(before/2));
    }
    const ashes=spell('incineration');ashes.destroyedCount=6;
    cast(ashes);
    assert.deepEqual([ashes.destroyedCount,ashes.players[0].cash],[0,1110]);

    const memory=spell('revival');memory.players[1].book=[];
    cast(memory,'targetPlayer',1);
    assert.deepEqual([...memory.players[1].book].sort(),[...memory.players[1].template].sort());

    const boost=spell('magicbooster');
    place(boost,1,'minotaur',0);
    boost.players[0].cash=250;
    const single=boost.players[0];
    const regular=C.levelCost(boost.tiles[1],3);
    assert.ok(regular>single.cash-60&&regular/2<=single.cash-60);
    cast(boost);
    assert.equal(single.status,'magicbooster');
    assert.equal(C.levelCost(boost.tiles[1],3,single),regular/2);
    assert.equal(C.levelCost(boost.tiles[1],3,boost.players[2]),regular);
    boost.phase='land';single.pos=1;
    assert.ok(C.play(boost,['level',1,3]));
    assert.equal(boost.tiles[1].level,3);
    assert.equal(single.cash,190-regular/2);
    assert.equal(single.status,undefined);

    const jack=spell('magicbolt');
    place(jack,1,'jackalope',1);jack.tiles[1].unit.hp=20;
    assert.match(C.spellRevival(jack,jack.tiles[1],'bolt'),/baba/i);
    cast(jack,'targetLand',1);
    assert.deepEqual([jack.tiles[1].unit.id,jack.tiles[1].unit.hp,jack.tiles[1].owner],[id('humbaba'),40,1]);
    assert.match(jack.mapEffect.label,/부활/);

    const loot=spell('theft');
    loot.players[1].hand=[id('manna'),id('fighter')];
    cast(loot,'targetPlayer',1);
    assert.equal(loot.phase,'stealCard');
    assert.ok(C.play(loot,C.choices(loot)[0]));
    assert.deepEqual(loot.players[0].hand,[id('manna')]);
    assert.deepEqual(loot.players[1].hand,[id('fighter')]);

    const scrollOnly=spell('antielement');
    place(scrollOnly,1,'minotaur',1,3);
    cast(scrollOnly,'targetLand',1);
    assert.equal(scrollOnly.tiles[1].unit.enchant,'antielement');
    assert.deepEqual(scrollOnly.players[0].hand,[id('fly')]);

    const quake=spell('earthshaker');
    quake.players[0].hand.push(id('manna'));
    place(quake,1,'goblin',1,3);place(quake,2,'minotaur',1,3);place(quake,3,'minotaur',1,3);
    quake.tiles[3].unit.enchant='drought';
    assert.ok(C.play(quake,['cast',0])&&C.play(quake,['sacrifice',1]));
    assert.deepEqual(quake.tiles.slice(1,4).map(t=>t.level),[3,2,3]);

    const permit=spell('permission');
    cast(permit);
    assert.deepEqual(permit.players[0].flags,C.board(permit).forts);
    const recall=spell('wordofrecall');
    recall.players[0].pos=6;
    recall.players[0].flags=C.board(recall).forts.slice();
    cast(recall);
    assert.deepEqual([recall.players[0].pos,recall.players[0].lap,recall.die,recall.phase],[0,1,0,'land']);

    const dream=spell('dreamterrain');
    cast(dream);
    assert.equal(dream.players[0].enchantDeadline,20);
    Object.assign(dream,{phase:'fork',remaining:1,die:1});
    Object.assign(dream.players[0],{pos:15,previous:14});
    assert.ok(C.play(dream,['route',0]));
    assert.equal(dream.players[0].dream,true);
    assert.equal(dream.players[0].enchantDeadline,20);

    const command=spell('telegnosis');
    place(command,2,'minotaur',0);
    cast(command);
    command.phase='land';
    assert.ok(C.choices(command).some(([kind,at])=>kind==='level'&&at===2));
    assert.ok(command.players[0].book.includes(id('telegnosis')));
  }
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
  console.log('2012 3DS six native-rule arenas, exact starter and archive decks, 18 AI finishes, alliance economy, spell thresholds, all nine Revenge cards, all 27 territory abilities and 320 seat-rotation samples OK');
}

for(const edition of ['dc','ps1','saturn']){
  const C=ps2.createEdition(edition);
  const id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const goblin=id('goblin'),fighter=id('fighter');
  const map=edition==='dc'?'dc-1':edition+'-original-marsh-paths';
  function setup(name){
    const s=C.start(4,4,5000,map,undefined,undefined,0,'teams');
    const at=s.tiles.flatMap((t,i)=>C.territoryType(t.type)?[i]:[]);
    const p=s.players[0],q=s.players[1];
    p.cash=q.cash=500;
    p.hand=[id(name)];
    p.book=Array(7).fill(fighter);
    return {s,at,p,q};
  }
  function cast(s,target,tribute=false){
    assert.ok(C.play(s,['cast',0]),edition+' cast '+C.combo.key(C.cards[s.players[0].hand[0]]));
    if(tribute)assert.ok(C.play(s,['sacrifice',1]));
    if(target)assert.ok(C.play(s,target),JSON.stringify(target));
  }
  function place(s,at,owner,card=goblin){
    const tile=s.tiles[at];
    Object.assign(tile,{owner,unit:{id:card,hp:C.cards[card].hp}});
    return tile;
  }

  {
    const {s,p}=setup('reincarnation');
    p.hand.push(goblin);
    cast(s);
    assert.deepEqual(p.hand,Array(6).fill(fighter));
    assert.deepEqual(p.book,[fighter]);
  }
  {
    const {s,p}=setup('raisedead');
    s.lastDestroyed=goblin;
    cast(s);
    assert.deepEqual(p.hand,[goblin]);
    assert.ok(!p.book.includes(id('raisedead')));
  }
  {
    const {s,at}=setup('sink');
    const target=place(s,at[0],1);
    target.type=0;
    target.level=5;
    cast(s,['targetLand',at[0]]);
    assert.deepEqual([target.type,target.level,target.owner],[1,5,1]);
  }
  if(edition==='dc'){
    {
      const {s,p,q}=setup('darkcraft');
      p.symbols[0]=6;
      q.symbols[1]=11;
      cast(s);
      assert.deepEqual([p.cash,q.cash,p.symbols[0],q.symbols[1]],[370,445,6,11]);
      assert.ok(p.book.includes(id('darkcraft')));
    }
    {
      const {s,p,q}=setup('grace');
      q.symbols[0]=13;s.prices[0]=40;
      cast(s,['targetPlayer',1]);
      assert.equal(p.cash,604);
    }
    {
      const {s}=setup('pressure');
      s.prices.fill(40);
      cast(s);
      assert.ok(s.prices.every(price=>price===32));
    }
    {
      const {s,at,p}=setup('meteor');
      const target=place(s,at[0],1);
      target.level=5;
      p.hand.push(fighter);
      cast(s,['targetLand',at[0]],true);
      assert.equal(target.level,1);
      assert.deepEqual(p.hand,[]);
    }
    {
      const {s,p,q}=setup('lifeforce');
      p.hand.push(fighter);
      const item=C.cards[id('chainmail')];
      assert.ok(item);
      const normal=C.price(q,item,s);
      cast(s,['targetPlayer',1],true);
      assert.deepEqual([q.status,q.enchantDeadline,C.price(q,item,s)],['lifeforce',12,Math.floor(normal/2)]);
    }
    {
      const {s,p,q}=setup('mistletoe');
      cast(s);
      assert.equal(p.enchantDeadline,8);
      s.turn=1;
      q.word=6;
      assert.ok(C.play(s,['roll']));
      assert.equal(p.cash,530);
    }
  }else{
    {
      const {s,at}=setup('weakness');
      const target=place(s,at[0],1,fighter);
      const st=C.cards[fighter].st;
      cast(s,['targetLand',at[0]]);
      assert.equal(target.unit.st,edition==='saturn'?Math.floor(st/2):0);
    }
    {
      const {s,at}=setup('barricade');
      const own=place(s,at[0],0),enemy=place(s,at[1],1);
      const other=place(s,at.find(i=>s.tiles[i].area!==own.area),0);
      const toll=C.toll(s,own);
      cast(s,['comboArea',own.area]);
      assert.equal(own.unit.expires,4);
      assert.equal(C.toll(s,own),Math.floor(toll*1.3));
      assert.equal(enemy.unit.enchant,undefined);
      assert.equal(other.unit.enchant,undefined);
    }
    {
      const {s,q}=setup('changeling');
      q.book=Array(6).fill(fighter);
      cast(s,['targetPlayer',1]);
      assert.equal(q.book.filter(card=>card===goblin).length,3);
    }
    {
      const {s,at}=setup('holyblight');
      const ghost=place(s,at[0],1,id('skeleton'));
      const mortal=place(s,at[1],0);
      cast(s);
      assert.equal(ghost.unit.hp,C.cards[ghost.unit.id].hp-20);
      assert.equal(mortal.unit.hp,C.cards[goblin].hp);
    }
    {
      const {s,q}=setup('silence');
      cast(s,['targetPlayer',1]);
      assert.equal(q.status,'silence');
      assert.equal(q.enchantDeadline,8);
    }
  }
}
console.log('Legacy spells honor original costs, source-edition values, land scope and book changes.');

for(const edition of ['dc','ps1','saturn']){
  const C=ps2.createEdition(edition);
  const id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const map=edition==='dc'?'dc-1':edition+'-original-marsh-paths';
  const goblin=id('goblin'),fighter=id('fighter'),manna=id('manna');
  function setup(name){
    const s=C.start(4,4,8000,map,undefined,undefined,0,'teams');
    s.players.forEach(q=>Object.assign(q,{cash:1000,hand:[],book:[fighter,goblin]}));
    const [p,q]=s.players;p.hand=[id(name)];
    assert.notEqual(p.hand[0],-1,edition+' '+name);
    return {s,p,q,lands:s.tiles.flatMap((t,i)=>C.territoryType(t.type)?[i]:[])};
  }
  function play(s,...action){assert.ok(C.play(s,action),edition+' '+JSON.stringify(action));}
  function place(s,at,owner,hp=C.cards[goblin].hp){
    return Object.assign(s.tiles[at],{owner,unit:{id:goblin,hp}});
  }

  {
    const {s,p,q}=setup('judgement');
    play(s,'cast',0);
    assert.deepEqual(C.choices(s),[['targetPlayer',1],['targetPlayer',3]]);
    const originalRandom=Math.random, roll=edition==='dc'?.7:edition==='ps1'?.76:.82;
    try{Math.random=()=>roll;play(s,'targetPlayer',1);}
    finally{Math.random=originalRandom;}
    if(edition==='saturn')assert.deepEqual([p.cash,q.cash],[920,200]);
    else assert.deepEqual([p.cash,q.cash],edition==='dc'?[180,1000]:[184,1000]);
  }
  {
    const {s,q}=setup('haunt');
    play(s,'cast',0);play(s,'targetPlayer',1);
    assert.ok(C.isComputer(s,1));assert.equal(q.enchantDeadline,8);
  }

  if(edition==='dc'){
    {
      const {s,p,q,lands}=setup('lightcraft');
      const a=place(s,lands[0],0,11),b=place(s,lands[1],1,18);
      b.unit.poisoned=true;q.hand=[fighter];
      p.hand.push(manna);
      play(s,'cast',0);
      assert.deepEqual([a.unit.enchant,b.unit.enchant,b.unit.poisoned],['phantasm','phantasm',undefined]);
      assert.deepEqual([a.unit.hp,b.unit.hp],[11,18]);
      assert.deepEqual([p.hand,q.hand],[[manna],[fighter]]);
      assert.ok(p.book.includes(id('lightcraft')));
      assert.equal(C.spellHP(s,b,'bolt'),18);
    }
    {
      const {s,p,q,lands}=setup('magicfountain');
      const a=place(s,lands[0],0);
      play(s,'cast',0);play(s,'targetLand',lands[0]);
      assert.equal(a.unit.enchant,'magicfountain');
      Object.assign(q,{pos:lands[0],word:0});
      s.turn=1;play(s,'roll');
      assert.equal(q.cash,1500);assert.equal(a.unit.enchant,undefined);
      s.turn=0;p.pos=lands[0];p.word=0;s.phase='roll';play(s,'roll');
      assert.equal(p.cash,980);
    }
    {
      const {s,p,q}=setup('mesmerize');
      p.hand.push(fighter);q.hand=[id('mesmerize'),manna,goblin];
      play(s,'cast',0);play(s,'sacrifice',1);play(s,'targetPlayer',1);
      assert.deepEqual(C.choices(s),[['mesmerCard',1,manna]]);
      play(s,'mesmerCard',1,manna);
      assert.deepEqual(q.hand,[id('mesmerize'),goblin]);
      assert.equal(p.cash,950);
    }
    {
      const {s,p,q,lands}=setup('aports');
      p.pos=lands[0];q.pos=lands[1];
      play(s,'cast',0);
      assert.equal(s.phase,'land');
      assert.ok(s.players.every(other=>other.pos===p.pos));
    }
  }else{
    {
      const {s,p,q}=setup('mindseeker');
      q.book=[fighter,goblin];s.players[2].peek={seat:1,ids:[goblin,fighter]};
      play(s,'cast',0);play(s,'targetPlayer',1);
      assert.deepEqual([p.hand,q.book,s.players[2].peek],[[goblin],[fighter],undefined]);
    }
    {
      const {s,p,q}=setup('swapspell');
      p.hand.push(fighter);q.hand=[goblin,manna];
      play(s,'cast',0);play(s,'targetPlayer',1);
      assert.deepEqual([p.hand,q.hand],[[goblin,manna],[fighter]]);
    }
    {
      const {s,p}=setup('magicdie');
      play(s,'cast',0);play(s,'targetPlayer',0);
      assert.equal(p.enchantDeadline,12);
      play(s,'roll');assert.ok(s.die===5||s.die===6);
    }
    {
      const {s,q,lands}=setup('unsummon');
      const a=place(s,lands[0],1);
      play(s,'cast',0);play(s,'targetLand',lands[0]);
      assert.deepEqual([a.owner,a.unit,q.hand,s.lastDestroyed],[-1,null,[goblin],undefined]);
    }
    if(edition==='ps1'){
      const {s,q}=setup('lifeforce'),item=C.cards[id('chainmail')];
      play(s,'cast',0);play(s,'targetPlayer',1);
      assert.equal(q.enchantDeadline,undefined);
      assert.equal(C.price(q,item,s),item.cost);
      assert.equal(C.price(q,C.cards[fighter],s),Math.floor(C.cards[fighter].cost/2));
    }else{
      const {s,lands}=setup('meteorstorm');
      lands.forEach(at=>{place(s,at,1);s.tiles[at].level=5;});
      play(s,'cast',0);
      assert.equal(lands.filter(at=>s.tiles[at].level===1).length,5);
    }
  }
}
console.log('Legacy spell variants checked for odds, movement, local effects, spell copying and hidden books.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),roomState=require('../dist/cept-room-state');
  const map=edition+'-original-marsh-paths';
  const id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const fresh=()=>C.start(4,4,12000,map,undefined,undefined,0,'teams');
  function act(s,...action){assert.ok(C.play(s,action),edition+' '+s.phase+' '+JSON.stringify(action));}
  function advanceTurn(s){
    const turn=s.turn;
    s.players[turn].word=0;
    if(s.phase==='discard')act(s,'discard',0);
    act(s,'roll');
    act(s,'pass');
  }
  {
    const s=fresh(),at=C.board(s).links.findIndex((links,i)=>C.territoryType(s.tiles[i].type)&&links.every(n=>C.territoryType(s.tiles[n].type)));
    const neighbors=C.board(s).links[at],far=s.tiles.findIndex((tile,i)=>C.territoryType(tile.type)&&i!==at&&!neighbors.includes(i));
    C.configureMatch(s,{recordReplay:true});
    [at,neighbors[0],far,far].forEach((pos,i)=>Object.assign(s.players[i],{pos,cash:1000,hand:[],book:Array(12).fill(id('fighter'))}));
    s.players[0].hand=[id('timebomb')];
    act(s,'cast',0);
    assert.equal(C.timeBombRounds(s,s.tiles[at]),3);
    assert.equal(roomState.view(C,s,2).game.tiles[at].timeBombUntil,12);
    assert.equal(s.replay.steps.at(-1).tiles.find(([i])=>i===at)[1][8],12);
    const restored=JSON.parse(JSON.stringify(s));
    for(let index=0;index<11;index++)advanceTurn(restored);
    assert.equal(C.timeBombRounds(restored,restored.tiles[at]),1);
    assert.deepEqual(restored.players.map(q=>q.cash),[980,1000,1000,1000]);
    advanceTurn(restored);
    assert.deepEqual(restored.players.map(q=>q.cash),[490,500,1000,1000]);
    assert.equal(restored.tiles[at].timeBombUntil,undefined);
    assert.equal(restored.replay.steps.at(-1).effect[0],at);
    assert.match(restored.log[0],/시한폭탄 폭발/);
    assert.equal(restored.replay.steps.at(-1).tiles.find(([i])=>i===at)[1].length,8);
    const replayCheck=createContext({C,replay:restored.replay,el:()=>({}),btn:()=>({}),$:()=>({append(){}})});
    runInContext(readFileSync(resolve(__dirname,'../dist/cept-replay-view.js'),'utf8'),replayCheck);
    assert.ok(runInContext('validateReplay(replay)',replayCheck));
    const oldReplay=structuredClone(restored.replay);
    for(const frame of oldReplay.steps)for(const [,row] of frame.tiles)row.length=8;
    replayCheck.replay=oldReplay;
    assert.ok(runInContext('validateReplay(replay)',replayCheck));

    s.turn=1;s.phase='spell';s.players[1].hand=[id('removecurse')];
    act(s,'cast',0);act(s,'targetLand',at);
    assert.equal(s.tiles[at].timeBombUntil,undefined);
  }
  {
    const s=fresh();
    [1200,900,900,600].forEach((cash,i)=>Object.assign(s.players[i],{cash,lap:i,hand:[]}));
    s.players[0].hand=[id('balance')];act(s,'cast',0);
    assert.deepEqual(s.players.map(q=>q.cash),[1210,1020,1080,1080]);
  }
  if(edition==='saturn'){
    {
      const s=fresh(),[p,q]=s.players;
      s.players.forEach(other=>{other.hand=[];});
      p.hand=[id('alchemy')];q.hand=[id('fighter')];
      act(s,'cast',0);
      assert.deepEqual([p.hand,q.hand],[[id('fighter')],[id('fighter')]]);
    }
    {
      const s=fresh(),[p,q]=s.players,prior=q.pos,host=p.pos;
      p.cash=1000;p.hand=[id('dimensiondoor')];
      act(s,'cast',0);
      assert.deepEqual(C.choices(s),[['targetPlayer',1],['targetPlayer',3]]);
      act(s,'targetPlayer',1);
      assert.notEqual(q.pos,prior);assert.equal(p.pos,host);
      assert.equal(s.phase,'land');
    }
  }
  function firstStrike(attacker,defender,attackItem,defendItem){
    const s=fresh(),at=s.tiles.findIndex(t=>C.territoryType(t.type)),card=id(defender);
    Object.assign(s.tiles[at],{owner:1,type:'무속성',unit:{id:card,hp:C.cards[card].hp}});
    s.phase='attack';s.battle={at,inv:id(attacker),atkItem:null,defItem:null};s.players[0].pos=at;
    s.players[0].hand=attackItem?[id(attackItem)]:[];s.players[1].hand=defendItem?[id(defendItem)]:[];
    s.players[0].cash=s.players[1].cash=1000;
    if(attackItem)act(s,'equip',0);else act(s,'bare');
    if(defendItem)act(s,'equip',0);else act(s,'bare');
    return s.battle.strikes[0];
  }
  assert.equal(firstStrike('dwarf','goblin',null,'earthshield').effect,'block');
  assert.equal(firstStrike('fighter','dwarf',null,'earthshield').effect,'hit');
  assert.equal(firstStrike('dragon','goblin',null,'dragonshield').effect,'block');
  assert.equal(firstStrike('fighter','goblin',null,'dragonshield').effect,'hit');
  assert.match(firstStrike('fighter','goblin','hellblaze',null).notes.join(' '),/60 피해/);
  assert.match(firstStrike('fighter','wolf','hellblaze',null).notes.join(' '),/40 피해/);
  assert.equal(firstStrike('fighter','goblin','hellblaze','magicshield').effect,'block');
}
console.log('Legacy delayed curses, simultaneous ranking, random card copy, relocation and native gear battle effects checked.');

{
  const C=ps2.createEdition('dc');
  const id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const open=()=>C.start(4,4,12000,'dc-1',undefined,undefined,0,'teams');
  const act=(s,...action)=>assert.ok(C.play(s,action),JSON.stringify(action));
  const gear=(s,seat,name)=>{s.players[seat].hand=name?[id(name)]:[];};
  function place(s,at,name,owner=1){
    const card=id(name);
    assert.ok(card>=0,name);
    return Object.assign(s.tiles[at],{type:'무속성',owner,unit:{id:card,hp:C.cards[card].hp}});
  }
  function fight(attack,defender,attackItem,defendItem,setup=()=>{}){
    const s=open();
    const at=s.tiles.findIndex(t=>C.territoryType(t.type));
    const t=place(s,at,defender);
    s.players.forEach(q=>{q.cash=1000;q.hand=[];q.book=[id('fighter')];});
    s.players[0].pos=at;
    s.phase='attack';s.battle={at,inv:id(attack),atkItem:null,defItem:null};
    gear(s,0,attackItem);gear(s,1,defendItem);
    setup(s,t);
    for(const item of [attackItem,defendItem])act(s,...(item?['equip',0]:['bare']));
    assert.equal(s.phase,'result');return s;
  }
  const first=s=>s.battle.strikes[0];
  const fighter=C.cards[id('fighter')];
  assert.ok(first(fight('fighter','goblin','aurablade',null)).notes.some(line=>line.includes(fighter.st+fighter.hp+' 피해')));
  assert.equal(fight('fighter','goblin',null,'chameleonarmor',(_,t)=>{t.level=4;}).battle.startHP[1],80);
  assert.equal(fight('fighter','goblin',null,'shadowarmor',(_,t)=>{t.level=3;}).battle.startHP[1],70);
  assert.equal(first(fight('fighter','goblin','nuclearfusion','magicshield')).effect,'block');
  const mirror=fight('fighter','goblin','nuclearfusion','magussmirror');
  assert.equal(mirror.battle.startHP[1],50);assert.equal(first(mirror).effect,'reflect');
  const grail=fight('fighter','goblin',null,'holygrail');
  assert.equal(first(grail).effect,'block');
  assert.equal(grail.players[1].cash,1000-C.cards[id('holygrail')].cost-2*C.cards[id('fighter')].st);
  assert.equal(first(fight('fighter','goblin','nuclearfusion','holygrail')).effect,'hit');
  const stink=fight('fighter','goblin','stinkbottle','holygrail');
  assert.equal(first(stink).effect,'block');
  assert.ok(stink.players[0].book.includes(id('stinkbottle')));
  const boots=fight('fighter','goblin',null,'wingedboots',s=>{s.players[0].peek={seat:1,ids:[id('fighter')]};});
  assert.equal(first(boots).side,1);
  assert.ok(boots.players[1].book.includes(id('wingedboots')));
  assert.equal(boots.players[0].peek,undefined);
  const ram=fight('fighter','wallofstone','batteringram',null,(_,t)=>{t.unit.hp=100;t.unit.mhp=100;});
  assert.ok(first(ram).notes.some(line=>line.includes('즉사')));
  const wind=fight('harpy','goblin','windamulet',null,(_,t)=>{t.unit.hp=10;});
  assert.equal(wind.tiles[wind.battle.at].unit.mhp,undefined);
  const heart=fight('fighter','goblin','heartfibula',null,(_,t)=>{t.unit.hp=10;});
  assert.equal(heart.tiles[heart.battle.at].unit.mhp,C.cards[id('fighter')].hp+20);
  const coin=fight('fighter','goblin','coinofpiety',null,(_,t)=>{t.type=2;t.unit.hp=10;});
  assert.equal(coin.players[0].symbols[coin.tiles[coin.battle.at].area*4+2],10);
  assert.ok(C.validBook(C.presets.legacyControl));
  assert.equal(C.presets.legacyControl.filter(n=>C.cards[n].effect==='dcWallTransform').length,2);
  for(const [target,form] of [['fighter','statue'],['minotaur','pillarofflame'],['lizardman','wallofice'],['dwarf','wallofstone'],['harpy','hurricane']]){
    const s=open(),at=s.tiles.findIndex(t=>C.territoryType(t.type)),tile=place(s,at,target);
    Object.assign(tile.unit,{hp:5,mhp:90,st:70,enchant:'peace',caster:1});
    s.players[0].cash=1000;s.players[0].hand=[id('walltransform')];
    act(s,'cast',0);act(s,'targetLand',at);
    assert.deepEqual(tile.unit,{id:id(form),hp:C.cards[id(form)].hp,enchant:'peace',caster:1});
    assert.equal(tile.owner,1);
  }
}
for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const fight=(weapon,enemyItem,life=40)=>{
    const s=C.start(2,2,5000,edition+'-original-marsh-paths'),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    Object.assign(s.tiles[at],{type:'무속성',owner:1,unit:{id:id('fighter'),hp:life}});
    s.phase='attack';s.battle={at,inv:id('fighter'),invHP:10,atkItem:null,defItem:null};
    s.players.forEach(q=>{q.cash=1000;q.hand=[];});
    s.players[0].hand=[id(weapon)];if(enemyItem)s.players[1].hand=[id(enemyItem)];
    assert.ok(C.play(s,['equip',0]));
    assert.ok(C.play(s,enemyItem?['equip',0]:['bare']));
    return s.battle;
  };
  assert.equal(fight('handbomb','magicshield').strikes[0].effect,'block');
  assert.equal(fight('heavyhalberd',null).strikes[0].side,1);
  assert.equal(fight('heavyhalberd',null).attackST,C.cards[id('fighter')].st+(edition==='ps1'?50:0));
  const pot=fight('potofsouls',null,5);
  assert.equal(pot.finalHP[0],C.cards[id('fighter')].hp);
}
console.log('Dreamcast item effects and five Wall Transform forms, plus first-edition scroll tool, regeneration and heavy weapon checked.');

{
  const C=ps2.createEdition('dc'),roomState=require('../dist/cept-room-state');
  const id=n=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const fresh=()=>C.start(4,4,12000,'dc-1',C.presets.legacyFusion,C.presets.legacyFusion,0,'teams');
  const act=(s,...action)=>assert.ok(C.play(s,action),s.phase+' '+JSON.stringify(action));
  function unit(s,at,name,owner=0){
    const card=C.cards[id(name)];
    assert.ok(card,name);
    return Object.assign(s.tiles[at],{owner,type:'무속성',unit:{id:id(name),hp:card.hp}});
  }
  const alpha=id('battlegearalpha'),beta=id('battlegearbeta'),bundle=id('bundlegear');
  assert.ok(C.validBook(C.presets.legacyFusion));
  assert.equal(C.presets.legacyFusion.filter(card=>card===alpha).length,2);
  assert.equal(C.presets.legacyFusion.filter(card=>card===beta).length,2);
  assert.ok(C.cards[bundle].generatedOnly);
  for(const [base,support] of [[alpha,beta],[beta,alpha]]){
    const s=fresh(),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    unit(s,at,'goblin',1);
    s.players[0].pos=at;s.players[0].cash=1000;
    s.players[0].hand=[support];s.players[1].hand=[];
    s.phase='attack';s.battle={at,inv:base,atkItem:null,defItem:null};
    act(s,'equip',0);act(s,'bare');
    assert.equal(s.battle.finalForms[0],bundle);
    assert.equal(s.tiles[at].owner,0);
    assert.equal(s.tiles[at].unit.id,bundle);
    assert.deepEqual(s.players[0].hand,[]);
  }
  function command(name){
    const s=fresh(),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    unit(s,at,name);s.players[0].pos=at;s.phase='land';s.players[0].cash=1000;
    act(s,'ability',at);
    return {s,at};
  }
  {
    const {s}=command('fate');
    const expected=[id('fighter'),id('goblin'),id('dwarf')];
    s.players[1].book=[id('wolf'),...expected.slice().reverse()];
    const old=s.players[0].hand.slice();
    act(s,'abilityPlayer',1);
    assert.equal(s.players[0].cash,990);
    assert.deepEqual(s.players[0].hand,old);
    assert.deepEqual(roomState.view(C,s,0).game.players[0].peek,{seat:1,ids:expected,source:'fate'});
    assert.equal(roomState.view(C,s,1).game.players[0].peek,undefined);
    assert.equal(roomState.view(C,s,0).game.players[1].book,undefined);
    assert.deepEqual(C.choices(s),[['fatePeekDone']]);
    assert.equal(s.turn,0);
    act(s,'fatePeekDone');
    assert.equal(s.turn,1);
  }
  {
    const {s}=command('bookworm');
    s.players[1].hand=[id('fighter'),id('goblin')];
    s.players[1].book=[id('dwarf')];
    const random=Math.random;
    try{Math.random=()=>.75;act(s,'abilityPlayer',1);}
    finally{Math.random=random;}
    assert.equal(s.players[0].cash,970);
    assert.deepEqual(s.players[1].hand,[id('fighter'),id('dwarf')]);
    assert.equal(roomState.view(C,s,0).game.players[1].hand.length,0);
  }
  {
    const {s}=command('witch');
    s.players[1].cash=1000;
    s.players[1].hand=[id('grace'),id('magicshield'),id('goblin')];
    act(s,'abilityPlayer',1);
    assert.deepEqual(s.players.slice(0,2).map(q=>q.cash),[970,960]);
  }
  {
    const {s,at}=command('heatimp');
    s.players[1].symbols[0]=10;s.players[1].symbols[1]=7;
    act(s,'abilityPlayer',1);
    assert.deepEqual(s.players[1].symbols.slice(0,2),[7,7]);
    assert.equal(s.tiles[at].unit,null);
  }
  {
    const s=fresh(),[at,idol]=s.tiles.flatMap((t,i)=>C.territoryType(t.type)?[i]:[]);
    const target=unit(s,at,'goblin',1);
    unit(s,idol,'clayidol',3);
    assert.equal(C.spellHP(s,target,'bolt'),target.unit.hp-10);
    unit(s,at,'fate');unit(s,idol,'ebonyidol',3);
    s.players[0].pos=at;s.phase='land';
    assert.ok(!C.choices(s).some(([action])=>action==='ability'));
  }
  {
    const s=fresh(),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    unit(s,at,'goblin',1);
    s.players[0].pos=at;s.players[0].book=[id('fighter')];
    s.players[1].book=Array(4).fill(id('fighter'));
    s.phase='attack';s.battle={at,inv:id('larvae'),atkItem:null,defItem:null};
    act(s,'bare');act(s,'bare');
    assert.equal(s.battle.attackST,C.cards[id('larvae')].st+20);
  }
}
console.log('Dreamcast fusion, idolatry, native book size, private previews, hand destruction and region economy passed.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),id=name=>C.cards.findIndex(c=>c.catalog&&!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===name);
  const run=({weapon,armor,attacker='fighter',guard='fighter',initialHP=40,guardHP=40,guardST,terrain=0,level=1,roll=.1}={})=>{
    const s=C.start(2,2,5000,edition+'-original-marsh-paths');
    const at=s.tiles.findIndex(t=>C.territoryType(t.type)),tile=s.tiles[at];
    Object.assign(tile,{type:terrain,owner:1,level,unit:{id:id(guard),hp:guardHP,...(guardST==null?{}:{st:guardST})}});
    s.phase='attack';s.battle={at,inv:id(attacker),invHP:initialHP,atkItem:null,defItem:null};
    s.players.forEach(q=>{q.cash=1000;q.hand=[];q.book=[];});
    if(weapon)s.players[0].hand=[id(weapon)];
    if(armor)s.players[1].hand=[id(armor)];
    const originalRandom=Math.random;
    try{
      Math.random=()=>roll;
      assert.ok(C.play(s,weapon?['equip',0]:['bare']));
      assert.ok(C.play(s,armor?['equip',0]:['bare']));
    }finally{Math.random=originalRandom;}
    return {s,tile,result:s.battle,symbol:tile.area*4+terrain};
  };
  assert.ok(C.validBook(C.presets.legacyGear));
  for(const gear of ['ringofthesuccubus','holygrail','soulblast','magicbelt','tigerrobe']){
    assert.ok(C.presets.legacyGear.includes(id(gear)),edition+' preset: '+gear);
  }
  const grail=run({armor:'holygrail'});
  assert.equal(grail.result.strikes[0].effect,'block');
  assert.equal(grail.s.players[1].cash,1000-C.cards[id('holygrail')].cost-2*C.cards[id('fighter')].st);
  const drain=run({weapon:'soulblast',armor:'holygrail'});
  assert.equal(drain.result.strikes[0].effect,'hit');
  assert.equal(drain.s.players[0].cash,1000-C.cards[id('soulblast')].cost+30);
  assert.equal(drain.s.players[1].cash,1000-C.cards[id('holygrail')].cost-30);
  const cuffs=run({weapon:'soulblast',armor:'handcuffs'});
  assert.equal(cuffs.result.strikes[0].effect,'reflect');
  assert.equal(cuffs.result.defendST,0);
  assert.equal(cuffs.result.finalHP[0],10);
  const ring=run({weapon:'ringofthesuccubus',attacker:'goblin',initialHP:30,guardST:41});
  assert.equal(ring.tile.unit.st,20);
  assert.equal(ring.result.finalHP[0],10);
  assert.equal(run({armor:'ringofthesuccubus'}).result.strikes[0].side,0);
  assert.equal(run({armor:'ringofthevampire',attacker:'goblin',guardHP:35}).tile.unit.hp,40);
  const coin=run({weapon:'coinofpiety',guardHP:10,terrain:2});
  assert.equal(coin.s.players[0].symbols[coin.symbol],10);
  const trophy=run({weapon:'offeringdoll',attacker:'minotaur',guardHP:10});
  assert.equal(trophy.s.prices[trophy.symbol],Math.floor(C.start(2,2,5000,edition+'-original-marsh-paths').prices[trophy.symbol]*1.2));
  const neutral=run({weapon:'neutralamulet',attacker:'minotaur',guardHP:10});
  assert.equal(neutral.tile.unit.id,id('minotaur'));
  assert.ok(!neutral.s.players[0].book.includes(id('neutralamulet')));
  const terrair=run({weapon:'terrair',guard:'kingtortoise',guardHP:50,terrain:1,level:5});
  assert.equal(terrair.result.attackST,C.cards[id('fighter')].st+40);
  assert.match(terrair.result.lines.join(' '),/즉사/);
  assert.match(run({weapon:'evileyeball',attacker:'goblin',roll:.79}).result.lines.join(' '),/즉사/);
  assert.doesNotMatch(run({weapon:'evileyeball',attacker:'goblin',roll:.8}).result.lines.join(' '),/즉사/);
  assert.match(run({weapon:'holysymbol',attacker:'goblin',guard:'skeleton',guardHP:30,roll:.79}).result.lines.join(' '),/즉사/);
  assert.doesNotMatch(run({weapon:'holysymbol',roll:.1}).result.lines.join(' '),/즉사/);
  const lightning=run({weapon:'lightningbolt',roll:.65});
  assert.equal(lightning.result.won,edition==='saturn');
  assert.equal(run({weapon:'lightningbolt',armor:'magicshield'}).result.strikes[0].effect,'block');
  assert.equal(run({weapon:'lightningbolt',armor:'handcuffs'}).result.finalHP[0],0);
  assert.equal(run({weapon:'sleep'}).tile.unit.enchant,'sleep');
  assert.equal(run({weapon:'tigerrobe'}).result.attackST,Math.max(0,C.cards[id('fighter')].st-20));
  assert.equal(run({weapon:'tigerrobe',armor:'leatherarmor'}).result.attackST,C.cards[id('fighter')].st+40);
  const belt=run({weapon:'magicbelt',guardHP:10});
  assert.equal(belt.result.won,true);
  assert.equal(belt.tile.unit.st,C.cards[id('fighter')].st-(edition==='ps1'?20:10));
}
console.log('PS1 and Saturn battle gear, spell reflection, probability thresholds, tally and legal deck checked.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const map=edition+'-original-marsh-paths';
  const run=({attacker='fighter',guard='fighter',weapon,armor,level=1,terrain=0,life,enchant,others=[]}={})=>{
    const s=C.start(2,2,5000,map),land=s.tiles.flatMap((v,i)=>C.territoryType(v.type)?[i]:[]),at=land[0];
    const tile=s.tiles[at],inv=id(attacker),def=id(guard);
    assert.ok(inv>=0&&def>=0);
    Object.assign(tile,{type:terrain,level,owner:1,unit:{id:def,hp:life??C.cards[def].hp,...(enchant?{enchant}:{})}});
    const nonadjacent=land.filter(i=>i!==at&&!C.board(s).links[at].includes(i));
    for(let i=0;i<others.length;i++){
      const [owner,type]=others[i];
      Object.assign(s.tiles[nonadjacent[i]],{owner,type,unit:{id:id('goblin'),hp:30}});
    }
    s.phase='attack';s.battle={at,inv,atkItem:null,defItem:null};
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    if(weapon)s.players[0].hand=[id(weapon)];
    if(armor)s.players[1].hand=[id(armor)];
    assert.ok(C.play(s,weapon?['equip',0]:['bare']));
    assert.ok(C.play(s,armor?['equip',0]:['bare']));
    return {s,tile,b:s.battle};
  };
  assert.ok(C.validBook(C.presets.legacyGuard));
  assert.equal(run({guard:'unseenstalker'}).b.strikes[0].effect,'block');
  assert.equal(run({guard:'unseenstalker',weapon:'firebolt'}).b.strikes[0].effect,'hit');
  assert.equal(run({attacker:'giantbat',guard:'gianteel'}).b.strikes[0].effect,'block');
  assert.equal(run({guard:'gianteel'}).b.strikes[0].effect,'hit');
  const sand=run({guard:'sandman',weapon:'firebolt'});
  assert.equal(sand.b.strikes[0].effect,'block');
  const land=sand.s.tiles.findIndex((v,i)=>i!==sand.b.at&&C.territoryType(v.type));
  Object.assign(sand.s.tiles[land],{owner:1,unit:{id:id('goblin'),hp:30}});
  sand.s.phase='spell';sand.s.players[0].hand=[id('magicbolt')];
  assert.ok(C.play(sand.s,['cast',0]));
  assert.ok(C.choices(sand.s).some(([k,i])=>k==='targetLand'&&i===land));
  assert.ok(!C.choices(sand.s).some(([k,i])=>k==='targetLand'&&i===sand.b.at));
  for(const attacker of ['wizard','mage','druid']){
    const scroll=run({attacker,guard:'unseenstalker',weapon:'firebolt'});
    assert.match(scroll.b.strikes[0].notes.join(' '),/45 피해/);
    assert.equal(run({attacker,guard:'unseenstalker',weapon:'wolf'}).b.attackST,C.cards[id('wolf')].st);
  }
  assert.equal(run({guard:'ooze'}).b.strikes[0].hp[1],20);
  assert.equal(run({attacker:'crustacea',guard:'kingtortoise',terrain:1,level:3}).b.strikes[0].hp[1],30);
  assert.equal(run({attacker:'firedrake'}).b.attackST,C.cards[id('firedrake')].st+20);
  assert.equal(run({guard:'firedrake'}).b.defendST,C.cards[id('firedrake')].st);
  assert.equal(run({attacker:'sabreclaw'}).b.attackST,C.cards[id('sabreclaw')].st+20);
  assert.equal(run({guard:'charybdis',level:4,terrain:1}).b.defendST,80);
  const kraken=run({guard:'kraken',terrain:1,others:[[0,0],[0,0],[1,0]]});
  assert.equal(kraken.b.defendST,30);
  assert.equal(kraken.b.strikes[0].effect,'block');
  assert.equal(run({guard:'simurgh',terrain:3,level:2,others:[[1,3]]}).b.startHP[1],60);
  assert.equal(run({attacker:'dullahan',others:[[0,3],[0,3],[1,3]]}).b.attackST,40);
  assert.equal(run({attacker:'mothman',others:[[0,'무속성'],[1,'무속성']]}).b.attackST,C.cards[id('mothman')].st+10);
  const fungus=run({guard:'deadlyfungus',attacker:'goblin',terrain:2});
  assert.equal(fungus.tile.unit.mhp,50);
  assert.equal(run({attacker:'paladin',guard:'skeleton'}).b.strikes[0].notes.some(v=>v.includes('75 피해')),true);
  assert.equal(run({attacker:'giantslug',guard:'woodfolk'}).b.strikes[0].side,1);
  assert.equal(run({attacker:'giantslug',guard:'woodfolk'}).b.strikes[1].notes.some(v=>v.includes('45 피해')),true);
  const toll=run({guard:'selenear',terrain:2});
  const nativeToll=C.toll(toll.s,toll.tile);
  toll.tile.unit.id=id('fighter');
  assert.equal(nativeToll,Math.floor(C.toll(toll.s,toll.tile)*1.5));
  assert.equal(run({guard:'siren'}).b.strikes.find(v=>v.side===0).effect,'block');
  assert.equal(run({guard:'siren',enchant:'paralysis'}).b.strikes[0].effect,'hit');
  assert.equal(run({guard:'deadlyfungus',attacker:'goblin',terrain:2,enchant:'paralysis'}).tile.unit.mhp,undefined);
  assert.equal(run({attacker:'dragonoid',weapon:'wolf'}).b.attackST,50);
  const gargoyle=run({attacker:'gargoyle',guard:'goblin',life:10});
  assert.equal(gargoyle.b.attackST,C.cards[id('gargoyle')].st);
  assert.equal(gargoyle.tile.unit.st,50);
  for(const guard of ['salamander','icesalamander']){
    assert.equal(run({attacker:'minotaur',guard,life:25}).b.strikes[0].effect,'heal');
    assert.equal(run({guard,life:25}).b.strikes[0].effect,'hit');
  }
  for(const guard of ['vampire','chupacabra','drainroper']){
    const drain=run({attacker:'goblin',guard,life:25});
    assert.ok(drain.b.finalHP[1]>5);
    assert.ok(drain.tile.unit.hp>5);
  }
  for(const attacker of ['shade','succubus']){
    const drained=run({attacker,guard:'paladin',terrain:2,level:3});
    assert.equal(drained.tile.unit.st,25);
  }
}
console.log('PS1 and Saturn creature wards, races, permanent stats, scaling, tolls and support checked.');

{
  const C=ps2.createEdition('ps1'),map=C.maps['ps1-2'];
  const id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const fresh=()=>C.start(4,4,7000,'ps1-2');
  const w=map.types.findIndex((type,i)=>type===1&&map.areas[i]===0);
  const e=map.types.findIndex((type,i)=>type===1&&map.areas[i]===1);
  const dst=map.types.findIndex((type,i)=>type===2&&map.areas[i]===1);
  const guard={id:id('fighter'),hp:40},needsWater=id('charybdis');
  const s=fresh(),p=s.players[0];
  assert.equal(s.layoutRevision,2);
  assert.equal(s.prices.length,8);
  assert.ok(s.players.every(p=>p.symbols.length===8));
  assert.equal(C.board({mapId:'ps1-2',layoutRevision:1}).areaCount,1);
  assert.equal(C.board(s).areaCount,2);
  for(const [i,neighbors] of map.links.entries())if(i!==0)for(const other of neighbors){
    if(other!==0)assert.equal(map.areas[i],map.areas[other]);
  }
  Object.assign(p,{pos:dst,hand:[needsWater],cash:1000});s.phase='land';
  Object.assign(s.tiles[w],{owner:0,unit:{...guard}});
  const allowed=(key,...args)=>C.choices(s).some(a=>a.length===args.length+1&&a[0]===key&&args.every((x,j)=>a[j+1]===x));
  assert.equal(allowed('summon',0),false);
  // A separate region never contributes to a chain or to a summoning requirement.
  Object.assign(s.tiles[e],{owner:0,unit:{...guard}});
  assert.equal(C.chain(s,s.tiles[w]),1);assert.equal(C.chain(s,s.tiles[e]),1);
  assert.equal(allowed('summon',0),true);
  Object.assign(s.tiles[e],{owner:-1,unit:null});
  Object.assign(s.tiles[dst],{owner:1,unit:{...guard}});
  assert.equal(allowed('invade',0),false);
  Object.assign(s.tiles[e],{owner:0,unit:{...guard}});
  assert.equal(allowed('invade',0),true);
  Object.assign(s.tiles[dst],{owner:0,unit:{...guard}});
  assert.equal(allowed('exchange',dst,0),true);
  Object.assign(s.tiles[e],{owner:-1,unit:null});
  assert.equal(allowed('exchange',dst,0),false);
  // A saved match with the old area layout may still resume.
  s.layoutRevision=1;s.prices=s.prices.slice(0,4);
  for(const p of s.players)p.symbols=p.symbols.slice(0,4);
  for(const t of s.tiles)t.area=0;
  assert.equal(allowed('exchange',dst,0),true);
  const movement=fresh(),walker=movement.players[0],fort=map.forts[0],from=map.links[fort][0];
  Object.assign(walker,{pos:from,previous:map.links[from].find(i=>i!==fort),dir:1,cash:500,word:1});
  movement.phase='roll';
  assert.ok(C.play(movement,['roll']));
  assert.equal(walker.pos,fort);
  assert.equal(walker.cash,500);
  assert.deepEqual(walker.flags,[fort]);
  assert.match(movement.log[0],/요새 통과/);
  const flight=fresh(),flier=flight.players[0];
  Object.assign(flier,{cash:500,hand:[id('fly')],status:'haste',word:6,enchantDeadline:99});
  const originalRandom=Math.random;
  try{
    Math.random=()=>0;
    assert.ok(C.play(flight,['cast',0]));
    assert.equal(flier.status,undefined);
    assert.equal(flier.word,undefined);
    assert.equal(flier.enchantDeadline,undefined);
    assert.ok(C.play(flight,['roll']));
    assert.deepEqual(flight.mapEffect.faces,[1,1]);
    assert.equal(flight.die,2);
  }finally{Math.random=originalRandom;}
  assert.match(describeSpell(C.cards[id('fly')].effect,C.cards[id('fly')],C),/주사위/);
}
console.log('PS1 Sneff dual-area ownership, old saves, summon/invasion/exchange, checkpoint cash and Fly checked.');

{
  const C=ps2.createEdition('ps1');
  const kelderId=Object.entries(C.maps).find(([,m])=>m.slug==='kelder')[0];
  const talioId=Object.entries(C.maps).find(([,m])=>m.slug==='talio')[0];
  const kelder=C.start(4,4,8000,kelderId),p=kelder.players[0];
  const map=C.board(kelder),earth=6,wind=7,temple=map.types.indexOf('신전');
  assert.equal(kelder.layoutRevision,2);
  assert.equal(C.board({mapId:kelderId,layoutRevision:1}).areaCount,1);
  assert.ok(kelder.players.every(q=>q.symbols.length===8));
  assert.deepEqual(kelder.prices.slice(earth),[1,1]);
  const northFort=map.types.indexOf('북쪽 요새');
  assert.equal(kelder.tiles[northFort].area,1);
  assert.equal(kelder.tiles[temple].area,0);
  assert.ok(kelder.tiles.filter(t=>t.area===1).every(t=>t.type!==2&&t.type!==3));
  const newMatch=C.start(2,2,8000,kelderId);
  kelder.prices[earth]=99;
  assert.equal(newMatch.prices[earth],1);
  kelder.prices[earth]=1;
  Object.assign(p,{pos:temple,cash:500});kelder.phase='temple';
  assert.ok(!C.play(kelder,['buySymbol',earth,101]));
  assert.ok(C.play(kelder,['buySymbol',earth,100]));
  assert.deepEqual([p.cash,p.symbols[earth],p.symbols[2]],[400,100,0]);
  kelder.phase='temple';
  assert.ok(C.play(kelder,['buySymbol',earth,100]));
  assert.deepEqual([p.cash,p.symbols[earth]],[300,200]);
  kelder.phase='temple';
  assert.ok(!C.play(kelder,['sellSymbol',earth,101]));
  assert.ok(C.play(kelder,['sellSymbol',earth,100]));
  assert.deepEqual([p.cash,p.symbols[earth],p.symbols[2],kelder.prices[wind]],[400,100,0,1]);
  for(const laps of [0,1,2]){
    const match=C.start(2,2,8000,talioId),map=C.board(match),walker=match.players[0],from=map.links[0][0];
    Object.assign(walker,{cash:500,pos:from,previous:map.links[from].find(n=>n!==0),dir:1,word:1,lap:laps,flags:map.checkpoints.slice()});
    match.phase='roll';assert.ok(C.play(match,['roll']));
    assert.deepEqual([walker.pos,walker.lap,walker.cash],[0,laps+1,1000+50*laps]);
  }
  const prior=ps2.start(2,2,8000,'market'),q=prior.players[0];
  q.cash=8000;q.pos=prior.tiles.findIndex(t=>t.type==='신전');prior.phase='temple';
  assert.ok(!ps2.choices(prior).some(([kind,,n])=>kind==='buySymbol'&&n>50));
}
console.log('PS1 Kelder north charms, repeat 100-card trades, legacy map and Talio lap scaling checked.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const run=({attacker='fighter',guard='fighter',weapon,armor,life,terrain=0,level=1,hand=[]}={})=>{
    const s=C.start(2,2,7000,edition+'-original-marsh-paths'),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    const tile=s.tiles[at],inv=id(attacker),def=id(guard);
    assert.ok(inv>=0&&def>=0);
    Object.assign(tile,{owner:1,type:terrain,level,unit:{id:def,hp:life??C.cards[def].hp}});
    s.phase='attack';s.battle={at,inv,atkItem:null,defItem:null};
    s.players.forEach(p=>{p.cash=1000;p.hand=[];p.book=[];});
    if(weapon)s.players[0].hand=[id(weapon)];
    s.players[1].hand=[...(armor?[id(armor)]:[]),...hand.map(id)];
    assert.ok(C.play(s,weapon?['equip',0]:['bare']));
    assert.ok(C.play(s,armor?['equip',0]:['bare']));
    return {s,tile,b:s.battle};
  };
  const bell=run({attacker:'goblin',guard:'goblin',weapon:'belloflaw',hand:['goblin','holygrail']});
  assert.deepEqual(bell.s.players[1].hand,[id('goblin')]);
  assert.ok(!bell.s.players[0].book.includes(id('belloflaw')));
  const deadBell=run({attacker:'goblin',weapon:'belloflaw',hand:['goblin','holygrail']});
  assert.deepEqual(deadBell.s.players[1].hand,[id('goblin'),id('holygrail')]);
  const torch=run({attacker:'goblin',armor:'queenstorch',life:20});
  assert.equal(torch.b.strikes[0].effect,'heal');
  assert.equal(torch.tile.unit.hp,40);
  assert.equal(run({attacker:'goblin',weapon:'elvencloak',armor:'queenstorch'}).b.strikes[0].effect,'hit');
  assert.equal(run({attacker:'skeleton',armor:'queenstorch'}).b.strikes[0].effect,'hit');
  const claw=run({attacker:'goblin',weapon:'goulsclaw'});
  assert.equal(claw.tile.unit.enchant,'paralysis');
  assert.equal(claw.b.strikes.length,1);
  assert.equal(run({attacker:'goblin',weapon:'goulsclaw',armor:'elvencloak'}).tile.unit.enchant,undefined);
  const pole=run({armor:'polestar'});
  assert.equal(pole.b.strikes[0].effect,'block');
  assert.equal(pole.tile.unit.hp,1);
  const scroll=run({weapon:'firebolt',armor:'polestar'});
  assert.equal(scroll.b.strikes[0].effect,'hit');
  assert.equal(scroll.tile.unit.hp,1);
  const recoil=run({weapon:'ripperknife',guard:'wallofice',terrain:1,level:5});
  assert.equal(recoil.b.attackST,80);
  assert.equal(recoil.b.strikes[0].hp[0],edition==='ps1'?16:20);
  assert.equal(run({weapon:'ripperknife',armor:'polestar'}).b.strikes[0].hp[0],40);
  const toxin=run({weapon:'bloodspoil'});
  assert.ok(toxin.tile.unit.poisoned);
  assert.equal(toxin.tile.unit.hp,20);
  assert.ok(!run({weapon:'bloodspoil',armor:'elvencloak'}).tile.unit.poisoned);
  assert.equal(run({weapon:'bloodspoil',armor:'magicshield'}).b.strikes[0].effect,'block');
  assert.equal(run({weapon:'bloodspoil',armor:'handcuffs'}).b.finalHP[0],20);
  const dragon=run({weapon:'bloodspoil',guard:'dragon',terrain:0,level:2});
  assert.equal(!!dragon.tile.unit.poisoned,edition==='ps1');
}
console.log('PS1 and Saturn race changes, absorption, paralysis, poison, recoil and post-battle gear checked.');

{
  const run=(edition,{attacker='goblin',guard='fighter',weapon,armor,otherHand=[],seed=.5}={})=>{
    const C=edition==='ps2'?ps2:ps2.createEdition(edition);
    const id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
    const s=C.start(2,2,5000),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    s.phase='attack';s.battle={at,inv:id(attacker),atkItem:null,defItem:null};
    Object.assign(s.tiles[at],{owner:1,type:'무속성',unit:{id:id(guard),hp:C.cards[id(guard)].hp}});
    for(const p of s.players){p.cash=1000;p.hand=[];p.book=[id('goblin'),id('fighter')];}
    if(weapon)s.players[0].hand=[id(weapon)];
    s.players[1].hand=[...(armor?[id(armor)]:[]),...otherHand.map(id)];
    s.players[0].peek={seat:1,ids:[id('fighter')]};
    s.players[1].peek={seat:0,ids:[id('fighter')]};
    const random=Math.random;
    try{
      Math.random=()=>seed;
      assert.ok(C.play(s,weapon?['equip',0]:['bare']));
      assert.ok(C.play(s,armor?['equip',0]:['bare']));
    }finally{Math.random=random;}
    assert.equal(s.phase,'result');return {s,id,C};
  };
  const late=run('dc',{weapon:'belloflaw',armor:'boomerang',otherHand:['goblin']});
  assert.deepEqual(late.s.players[1].hand,[late.id('goblin')]);
  assert.deepEqual(late.s.players[0].book,['goblin','belloflaw','fighter'].map(late.id));
  assert.equal(late.s.players[1].peek,undefined);
  assert.deepEqual(late.s.players[0].peek,{seat:1,ids:[late.id('fighter')]});
  const local=run('ps2',{weapon:'belloflaw',armor:'boomerang',otherHand:['goblin']});
  assert.deepEqual(local.s.players[1].hand,[local.id('boomerang')]);
  assert.deepEqual(local.s.players[0].book,['goblin','belloflaw','fighter'].map(local.id));
  for(const edition of ['ps2','dc']){
    for(const seed of [.01,.5,.99]){
      const {s,id}=run(edition,{attacker:edition==='ps2'?'centaur':'fighter',weapon:'neutralamulet',seed});
      const expected=[id('goblin'),id('fighter')];
      expected.splice(Math.floor(seed*3),0,id('neutralamulet'));
      assert.deepEqual(s.players[0].book,expected);
    }
  }
  const chaos=run('ps2',{weapon:'bellofchaos',armor:'mace',otherHand:['mace','goblin']});
  assert.deepEqual(chaos.s.players[1].hand,[chaos.id('goblin')]);
  assert.equal(chaos.s.battle.defendST,chaos.C.cards[chaos.id('fighter')].st+20);
  for(const edition of ['ps1','saturn']){
    const classic=run(edition,{armor:'wingedboots'});
    assert.equal(classic.s.battle.strikes[0].side,1);
    assert.ok(!classic.s.players[1].book.includes(classic.id('wingedboots')));
  }
  const portable=run('3ds',{attacker:'gremlin',armor:'wingedboots'});
  assert.equal(portable.s.battle.strikes[0].side,1);
  assert.deepEqual(portable.s.players[1].book,['goblin','wingedboots','fighter'].map(portable.id));
}
console.log('DC late hand removal, PS2 edition timing, book placement, first-edition boots, and 3DS gear ward checked.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const run=({attacker='fighter',guard='goblin',others=[],life,invHP,guardST,seed=.5}={})=>{
    const s=C.start(2,2,7000,edition+'-original-marsh-paths'),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    Object.assign(s.tiles[at],{owner:1,type:0,unit:{id:id(guard),hp:life??C.cards[id(guard)].hp,...(guardST==null?{}:{st:guardST})}});
    const available=s.tiles.flatMap((t,n)=>n!==at&&!C.board(s).links[at].includes(n)&&C.territoryType(t.type)?[n]:[]);
    for(const [i,[owner,creature]] of others.entries()){
      const card=C.cards[id(creature)];
      Object.assign(s.tiles[available[i]],{owner,unit:{id:id(creature),hp:card.hp}});
    }
    s.phase='attack';s.battle={at,inv:id(attacker),atkItem:null,defItem:null,invHP};
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    const random=Math.random;
    try{Math.random=()=>seed;assert.ok(C.play(s,['bare']));assert.ok(C.play(s,['bare']));}
    finally{Math.random=random;}
    return {s,b:s.battle,t:s.tiles[at]};
  };
  assert.ok(C.validBook(C.presets.legacyCourt));
  for(const creature of ['ambermosquito','doppelganger','flamelord','darkmaster'])assert.ok(C.presets.legacyCourt.includes(id(creature)));
  const copy=run({attacker:'doppelganger',guard:'goblin',life:5,invHP:3});
  assert.equal(copy.b.forms[0],id('goblin'));
  assert.equal(copy.b.startHP[0],C.cards[id('goblin')].hp);
  assert.deepEqual([copy.t.unit.id,copy.t.unit.hp],[id('doppelganger'),C.cards[id('doppelganger')].hp]);
  assert.equal(run({attacker:'ambermosquito',guard:'wallofstone',seed:.01}).b.forms[0],id('giantrat'));
  assert.equal(run({attacker:'ambermosquito',guard:'wallofstone',seed:.99}).b.forms[0],id('tyrannosaurus'));
  const baseline=run().b;
  const clown=run({others:[[0,'madclown'],[0,'madclown']]});
  assert.deepEqual(clown.b.startHP,[baseline.startHP[0]+10,baseline.startHP[1]]);
  const nue=run({others:[[1,'nue'],[1,'nue']]});
  assert.deepEqual([nue.b.attackST,nue.b.defendST],[baseline.attackST-10,baseline.defendST]);
  for(const [creature,lord] of [['minotaur','flamelord'],['marfolk','dagon'],['dwarf','darkmaster'],['harpy','beelzebub']]){
    const base=run({attacker:creature,guard:'wallofstone'});
    const aura=run({attacker:creature,guard:'wallofstone',others:[[1,lord]]});
    assert.equal(aura.b.attackST,base.b.attackST+10,lord);
    assert.deepEqual(aura.b.startHP,base.b.startHP);
    assert.equal(aura.s.players[1].cash,1000);
    const cost=run({guard:lord,life:1});
    assert.equal(cost.s.players[1].cash,edition==='ps1'?900:800);
  }
  const dragon=run({attacker:'dragon',guard:'wallofstone'}).b;
  const elder=run({attacker:'dragon',guard:'wallofstone',others:[[1,'elderdragon']]}).b;
  assert.equal(elder.attackST,dragon.attackST+10);
  assert.equal(run({guard:'elderdragon',life:1}).s.players[1].cash,900);
  const revived=run({guard:'myrmecoleo'});
  assert.equal(revived.t.unit.id,id('dragonfly'));
  assert.equal(revived.t.unit.hp,C.cards[id('dragonfly')].hp);
  const juggernaut=run({attacker:'juggernaut',guard:'wallofstone',guardST:40});
  assert.match(juggernaut.b.strikes[0].notes.join(' '),new RegExp(Math.floor(C.cards[id('juggernaut')].st*1.5)+' 피해'));
  const normal=run({attacker:'juggernaut',guard:'wallofstone',guardST:39});
  assert.match(normal.b.strikes[0].notes.join(' '),new RegExp(C.cards[id('juggernaut')].st+' 피해'));
  const lap=C.start(2,2,7000,edition+'-original-marsh-paths'),m=C.board(lap),p=lap.players[0],from=m.links[0][0];
  const sites=lap.tiles.flatMap((t,n)=>n!==from&&C.territoryType(t.type)?[n]:[]);
  Object.assign(lap.tiles[sites[0]],{owner:0,unit:{id:id('juggernaut'),hp:15}});
  Object.assign(lap.tiles[sites[1]],{owner:0,unit:{id:id('fighter'),hp:15}});
  Object.assign(p,{pos:from,previous:m.links[from].find(n=>n!==0),dir:1,word:1,flags:m.checkpoints.slice()});
  lap.phase='roll';assert.ok(C.play(lap,['roll']));
  assert.equal(p.lap,1);
  assert.deepEqual([lap.tiles[sites[0]].unit.hp,lap.tiles[sites[1]].unit.hp],[15,23]);
}
console.log('Classic transformations, revival, boost scope, lord battle fees, critical threshold and lap immunity checked.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),early=edition==='saturn';
  const id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const reflect=early?'hedgehog':'bandicoot',threshold=early?.3:.6;
  function fight({attacker='fighter',guard='goblin',guardUnit={},invHP,atkGear,seed=.5,hand=[],type=1}={}){
    const s=C.start(2,2,7000,edition+'-original-marsh-paths'),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    const t=s.tiles[at];
    Object.assign(t,{type,owner:1,unit:{id:id(guard),hp:C.cards[id(guard)].hp,...guardUnit}});
    s.phase='attack';s.battle={at,inv:id(attacker),invHP,atkItem:null,defItem:null};
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    s.players[0].hand=[...(atkGear?[id(atkGear)]:[]),...hand.map(id)];
    const random=Math.random;
    try{Math.random=()=>seed;assert.ok(C.play(s,atkGear?['equip',0]:['bare']));assert.ok(C.play(s,['bare']));}
    finally{Math.random=random;}
    return {s,b:s.battle,t};
  }
  assert.ok(C.validBook(C.presets.legacyEvolution));
  for(const creature of [reflect,'wraith','acheron','homunculus','mantrap','flamelord'])
    assert.ok(C.presets.legacyEvolution.includes(id(creature)),creature);
  const split=fight({guard:reflect});
  assert.deepEqual(split.b.strikes[0].hp,[20,10]);
  assert.match(split.b.strikes[0].notes.join(' '),/반사 20/);
  const paralyzed=fight({guard:reflect,guardUnit:{enchant:'paralysis'}});
  assert.deepEqual(paralyzed.b.strikes[0].hp,[40,0]);
  const scroll=fight({guard:reflect,atkGear:'nuclearfusion'});
  assert.deepEqual(scroll.b.strikes[0].hp,[40,0]);
  const first=fight({attacker:'wraith',seed:threshold-.01}).b;
  assert.deepEqual(first.finalHP,[early?30:0,0]);
  const second=fight({attacker:'wraith',seed:threshold}).b;
  assert.deepEqual(second.finalHP,[early?10:0,20]);
  assert.ok(fight({attacker:'wraith',guard:'wallofstone',seed:0}).b.finalHP[1]>0);
  const trap=fight({guard:'mantrap',type:2,seed:.59}).b;
  assert.equal(trap.finalHP[0],early?10:0);
  assert.ok(fight({guard:'mantrap',type:2,seed:.6}).b.finalHP[0]>0);
  const hand=['fighter','goblin','wallofstone'];
  const surviving=fight({guard:'acheron',hand,seed:.5});
  assert.deepEqual(surviving.s.players[0].hand.slice(0,2),['fighter','wallofstone'].map(id));
  assert.match(surviving.b.lines.join(' '),/상대 손패 한 장 파괴/);
  const defeated=fight({guard:'acheron',guardUnit:{hp:1},hand});
  assert.deepEqual(defeated.s.players[0].hand,hand.map(id));
  let progress={hp:30};
  for(let count=1;count<=3;count++){
    const evolved=fight({attacker:'goblin',guard:'homunculus',guardUnit:progress,type:0});
    progress=JSON.parse(JSON.stringify(evolved.t.unit));
    assert.equal(evolved.s.players[1].cash,1000);
    if(count<3)assert.deepEqual([progress.id,progress.battleCount],[id('homunculus'),count]);
    else assert.deepEqual([progress.id,progress.battleCount,progress.hp],[id('flamelord'),undefined,C.cards[id('flamelord')].hp]);
    progress.hp=C.cards[id('homunculus')].hp;
  }
  const dead=fight({guard:'homunculus',guardUnit:{hp:1,battleCount:2}});
  assert.equal(dead.b.finalForms[1],id('homunculus'));
  assert.equal(dead.b.finalHP[1],0);
}
console.log('First editions: split reflection, scroll bypass, race-specific kill rates, hand removal, and persistent evolution checked.');

for(const edition of ['ps1','saturn']){
  const C=ps2.createEdition(edition),saturn=edition==='saturn';
  const id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  function fight(attacker,guard,{type='무속성',level=1,seed=.5,atkGear,defGear,placed=false,guardUnit={}}={}){
    const s=C.start(2,2,7000,edition+'-original-marsh-paths'),at=s.tiles.findIndex(t=>C.territoryType(t.type));
    const t=s.tiles[at];
    Object.assign(t,{type,level,owner:1,unit:{id:id(guard),hp:C.cards[id(guard)].hp,...guardUnit}});
    const from=s.tiles.findIndex((tile,i)=>i!==at&&C.territoryType(tile.type));
    if(placed)Object.assign(s.tiles[from],{owner:0,unit:{id:id(attacker),hp:C.cards[id(attacker)].hp}});
    s.phase='attack';s.battle={at,inv:id(attacker),atkItem:null,defItem:null,...(placed?{from}:{})};
    s.players.forEach((p,i)=>{const gear=[atkGear,defGear][i];p.cash=1000;p.hand=gear?[id(gear)]:[];});
    const random=Math.random;
    try{
      Math.random=()=>seed;
      assert.ok(C.play(s,atkGear?['equip',0]:['bare']));
      assert.ok(C.play(s,defGear?['equip',0]:['bare']));
    }finally{Math.random=random;}
    return {s,b:s.battle,t};
  }
  assert.ok(C.validBook(C.presets.legacyTides));
  for(const c of ['cleric','berserker','seamonk','geophage','leviathan','nessie'])assert.ok(C.presets.legacyTides.includes(id(c)));
  for(const [attacker,guard,excluded,rate] of [
    ['cleric','dragonzombie','fighter',.6],['igneousfatui','fighter','dragonzombie',.8],
    ['giantcrawler','mantrap','dragonzombie',.6],['radon','minotaur','dragonzombie',.3],
    ['geophage','dragonzombie','fighter',.3]
  ]){
    const ability=fight(attacker,guard,{seed:rate-.01,guardUnit:{st:0,hp:60}});
    const misses=fight(attacker,guard,{seed:rate,guardUnit:{st:0,hp:60}});
    assert.match(ability.b.lines.join(' '),/즉사/,attacker);
    assert.doesNotMatch(misses.b.lines.join(' '),/즉사/,attacker);
    assert.doesNotMatch(fight(attacker,excluded,{seed:0,guardUnit:{st:0,hp:60}}).b.lines.join(' '),/즉사/,attacker);
  }
  const priest=fight('cleric','dragonzombie',{atkGear:'goblin',guardUnit:{st:0,hp:60},seed:1});
  assert.equal(priest.b.attackST,C.cards[id('cleric')].st+C.cards[id('goblin')].st);
  const delayed=fight('igneousfatui','fighter',{seed:1});
  assert.equal(delayed.b.strikes[0].side,1);
  const monk=fight('fighter','seamonk',{placed:true});
  assert.equal(monk.b.strikes[0].effect,'block');
  assert.equal(monk.s.tiles[monk.b.from].unit.enchant,'paralysis');
  const monkScroll=fight('seamonk','wallofstone',{atkGear:'nuclearfusion'});
  assert.match(monkScroll.b.strikes[0].notes.join(' '),/75 피해/);
  const baal=fight('goblin','baal');
  assert.equal(baal.b.strikes[0].side,1);
  assert.equal(baal.s.players[1].cash,saturn?800:900);
  assert.equal(fight('goblin','baal',{guardUnit:{hp:1,enchant:'paralysis'}}).s.players[1].cash,1000);
  const clone=fight('doppelganger','baal');
  assert.equal(clone.b.forms[0],id('baal'));
  assert.equal(clone.s.players[0].cash,saturn?800:900);
  const recoil=fight('berserker','wallofstone');
  assert.equal(recoil.b.strikes[0].hp[0],C.cards[id('berserker')].hp-(saturn?10:12));
  assert.match(recoil.b.lines.join(' '),/반동/);
  const decay=fight('goblin','zombie');
  assert.equal(decay.t.unit.hp,C.cards[id('zombie')].hp-C.cards[id('goblin')].st-(saturn?10:20));
  assert.equal(fight('goblin','zombie',{guardUnit:{hp:25}}).b.finalHP[1],0);
  const water=fight('fighter','nessie',{type:1,level:3});
  assert.equal(water.b.startHP[1],C.cards[id('nessie')].hp+water.b.landHP+15);
  const dry=fight('fighter','nessie',{type:2,level:3});
  assert.equal(dry.b.startHP[1],C.cards[id('nessie')].hp);
  assert.equal(fight('leviathan','goblin',{type:2}).t.type,1);
  assert.equal(fight('goblin','leviathan',{type:2}).t.type,2);
  assert.equal(fight('leviathan','wallofstone',{type:2}).t.type,2);
  if(saturn)assert.match(fight('giantrat','stranglevine').b.strikes.at(-1).notes.join(' '),/60 피해/);
}
console.log('PS1 and Saturn race and elemental instant kills, scrolls, battle cost, recoil, zombie decay and water terrain checked.');

{
  const C=ps2.createEdition('dc'),map=Object.keys(C.maps)[0];
  const id=n=>C.cards.findIndex(c=>!c.catalogOnly&&!c.unlisted&&C.combo.key(c)===n);
  const eligible=C.cards.flatMap((c,cardId)=>c.kind==='creature'&&!c.unlisted&&!c.catalogOnly&&!c.generatedOnly&&
    ['N','S','R'].includes(c.catalog?.rarity)?[cardId]:[]);
  const seedFor=(name,exclude)=>{const pool=eligible.filter(cardId=>cardId!==id(exclude));return (pool.indexOf(id(name))+.5)/pool.length;};
  function fixed(seed,play){
    const rand=Math.random;
    try{Math.random=()=>seed;play();}finally{Math.random=rand;}
  }
  function fixture(guard='goblin'){
    const s=C.start(2,2,7000,map),at=s.tiles.findIndex(t=>C.territoryType(t.type)),tile=s.tiles[at];
    Object.assign(tile,{owner:1,type:2,level:2,unit:{id:id(guard),hp:5}});
    s.players.forEach(p=>{p.cash=500;p.hand=[];});
    return {s,at,tile};
  }
  assert.ok(C.validBook(C.presets.legacyShape));
  for(const n of ['baldanders','proteanring','polymorph'])assert.ok(C.presets.legacyShape.includes(id(n)));
  function battle(attacker,guard,seed,ring=false){
    const {s,at,tile}=fixture(guard);
    s.phase='attack';s.battle={at,inv:id(attacker),invHP:3,atkItem:null,defItem:null};
    if(ring)s.players[0].hand=[id('proteanring')];
    fixed(seed,()=>{
      assert.ok(C.play(s,ring?['equip',0]:['bare']));
      assert.ok(C.play(s,['bare']));
    });
    return {s,tile,b:s.battle};
  }
  const shape=battle('baldanders','goblin',seedFor('tyrannosaurus'));
  assert.equal(shape.b.forms[0],id('tyrannosaurus'));
  assert.equal(shape.b.startHP[0],C.cards[id('tyrannosaurus')].hp);
  assert.deepEqual([shape.tile.owner,shape.tile.unit.id],[0,id('baldanders')]);
  const rolledSelf=battle('baldanders','goblin',seedFor('baldanders'));
  assert.equal(rolledSelf.b.forms[0],id('baldanders'));
  assert.equal(rolledSelf.b.lines.filter(l=>l.includes('변신')).length,1);
  const ring=battle('fighter','goblin',seedFor('tyrannosaurus','fighter'),true);
  assert.equal(ring.b.forms[0],id('tyrannosaurus'));
  assert.deepEqual([ring.s.players[0].cash,ring.tile.unit.id],[500,id('fighter')]);
  const shattered=battle('fighter','gremlin',seedFor('tyrannosaurus','fighter'),true);
  assert.equal(shattered.b.forms[0],id('fighter'));
  for(const seed of [0,.5,.999999]){
    const {s,at,tile}=fixture();
    s.phase='spell';tile.unit.enchant='poison';tile.unit.mhp=70;tile.unit.st=50;
    s.players[0].hand=[id('polymorph'),id('fighter'),id('wolf')];
    assert.ok(C.play(s,['cast',0]));
    assert.ok(C.play(s,['sacrifice',1]));
    assert.ok(C.choices(s).some(([k,x])=>k==='targetLand'&&x===at));
    fixed(seed,()=>assert.ok(C.play(s,['targetLand',at])));
    assert.equal(s.players[0].cash,420);
    assert.deepEqual(s.players[0].hand,[id('wolf')]);
    assert.ok(eligible.includes(tile.unit.id)&&tile.unit.id!==id('goblin'));
    assert.deepEqual(tile.unit,{id:tile.unit.id,hp:C.cards[tile.unit.id].hp});
    assert.equal(s.mapEffect.label,C.cards[tile.unit.id].name+' 변신');
    assert.deepEqual([tile.owner,tile.type,tile.level],[1,2,2]);
  }
  const warded=fixture('battlegearalpha');
  warded.s.phase='spell';warded.s.players[0].hand=[id('polymorph'),id('fighter')];
  const other=warded.s.tiles.findIndex((tile,i)=>i!==warded.at&&C.territoryType(tile.type));
  Object.assign(warded.s.tiles[other],{owner:1,unit:{id:id('goblin'),hp:30}});
  assert.ok(C.play(warded.s,['cast',0])&&C.play(warded.s,['sacrifice',1]));
  assert.ok(!C.choices(warded.s).some(([k,x])=>k==='targetLand'&&x===warded.at));
  assert.ok(C.choices(warded.s).some(([k,x])=>k==='targetLand'&&x===other));
}
console.log('Dreamcast Baldanders, Protean Ring and Polymorph: form selection, survival, item destruction, spell ward and sacrifice verified.');

{
  const C=ps2.createEdition('3ds'),map='3ds-original-bend';
  const id=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const start=()=>C.start(4,4,7000,map,C.presets.handheldFourElements,C.presets.handheldFourElements,1,'teams');
  const fields=s=>s.tiles.flatMap((t,n)=>C.territoryType(t.type)?[n]:[]);
  function cast(s,spell){
    const p=s.players[0];p.cash=500;p.hand=[id(spell)];s.phase='spell';
    assert.ok(C.play(s,['cast',0]));
    return p;
  }
  const build=(s,owner,at,type,key,level=3)=>Object.assign(s.tiles[at],{
    owner,type,level,unit:{id:id(key),hp:C.cards[id(key)].hp}
  });
  assert.ok(C.validBook(C.presets.handheldFourElements));
  const elements=['minotaur','gianteel','dwarf','harpy'];
  for(const fault of ['none','missing','low','allied','mismatch']){
    const s=start(),sites=fields(s);
    elements.forEach((key,e)=>build(s,0,sites[e],e,key));
    const last=s.tiles[sites[3]];
    if(fault==='missing'){last.owner=-1;last.unit=null;}
    if(fault==='low')last.level=2;
    if(fault==='allied')last.owner=s.teams.findIndex((team,seat)=>seat!==0&&team===s.teams[0]);
    if(fault==='mismatch')last.unit.id=id('goblin');
    assert.equal(cast(s,'soltis').cash,fault==='none'?1600:600);
    assert.equal(s.mapEffect.label,fault==='none'?'+1200G':'+200G');
    assert.equal(s.phase,'roll');
  }
  const forms=['statue','pillarofflame','wallofice','wallofstone','hurricane'];
  for(const [i,key] of ['goblin',...elements].entries()){
    const s=start(),at=fields(s)[0],tile=build(s,1,at,2,key,4);
    assert.equal(cast(s,'turntothewall').cash,420);
    assert.ok(C.play(s,['targetLand',at]));
    assert.deepEqual([tile.owner,tile.type,tile.level,tile.unit.id],[1,2,4,id(forms[i])]);
    assert.equal(s.mapEffect.label,C.cards[tile.unit.id].name+' 변신');
  }
  const random=Math.random;
  try{
    Math.random=()=>0;
    const s=start(),at=fields(s)[0],tile=build(s,1,at,2,'goblin',4);
    tile.unit.poisoned=true;
    assert.equal(cast(s,'polymorph').cash,420);
    assert.ok(C.play(s,['targetLand',at]));
    assert.notEqual(tile.unit.id,id('goblin'));
    assert.ok(['N','S','R'].includes(C.cards[tile.unit.id].catalog.rarity));
    assert.ok(!tile.unit.poisoned);
  }finally{Math.random=random;}
  function fight(a,d,{life,st,type=2,level=2,seed=1,round=8,atkGear}={}){
    const s=start(),at=fields(s)[0],tile=build(s,1,at,type,d,level);
    if(life!=null)tile.unit.hp=life;
    if(st!=null)tile.unit.st=st;
    s.round=round;s.phase='attack';s.battle={at,inv:id(a),atkItem:null,defItem:null};
    s.players.forEach(p=>{p.cash=1000;p.hand=[];});
    if(atkGear)s.players[0].hand=[id(atkGear)];
    try{
      Math.random=()=>seed;
      assert.ok(C.play(s,atkGear?['equip',0]:['bare']));assert.ok(C.play(s,['bare']));
    }finally{Math.random=random;}
    return {s,b:s.battle,tile};
  }
  assert.equal(fight('fighter','apsaras',{level:2}).b.strikes[0].effect,'hit');
  assert.equal(fight('fighter','apsaras',{level:3}).b.strikes[0].effect,'block');
  assert.equal(fight('fighter','apsaras',{level:3,atkGear:'nuclearfusion'}).b.strikes[0].effect,'hit');
  assert.equal(fight('goblin','nessie',{type:1,level:3}).b.startHP[1],100);
  assert.equal(fight('goblin','nessie',{type:2,level:3}).b.startHP[1],40);
  const transform=fight('baldanders','goblin',{seed:0});
  assert.notEqual(transform.b.forms[0],id('baldanders'));
  assert.ok(['N','S','R'].includes(C.cards[transform.b.forms[0]].catalog.rarity));
  const ring=fight('fighter','goblin',{seed:.5,atkGear:'proteanring'});
  assert.notEqual(ring.b.forms[0],id('fighter'));
  assert.ok(['N','S','R'].includes(C.cards[ring.b.forms[0]].catalog.rarity));
  const pec=fight('aspidochelone','goblin',{round:12}).b;
  assert.deepEqual([pec.attackST,pec.startHP[0]],[42,42]);
  assert.equal(fight('goblin','charon').s.players[1].cash,960);
  assert.equal(fight('goblin','sludgetitan',{life:59}).b.startHP[1],0);
  assert.equal(fight('goblin','sludgetitan').tile.unit.hp,60);
  assert.equal(fight('goblin','hydra',{type:0,life:45}).tile.unit.hp,25);
  assert.equal(fight('goblin','hydra',{type:2,life:45}).tile.unit.hp,50);
  assert.equal(fight('leviathan','goblin').tile.type,1);
  assert.equal(fight('fighter','kraken').b.strikes[0].effect,'block');
  assert.equal(fight('minotaur','yeti').b.strikes[0].effect,'block');
  assert.match(fight('yeti','minotaur',{seed:.59,type:0,level:3}).b.lines.join(' '),/즉사/);
  assert.equal(fight('goblin','vampire').b.strikes[0].side,1);
  assert.ok(fight('goblin','vampire').b.strikes[0].hp[1]>C.cards[id('vampire')].hp);
  assert.match(fight('cleric','fighter').b.lines.join(' '),/즉사/);
  assert.doesNotMatch(fight('cleric','gianteel').b.lines.join(' '),/즉사/);
  for(const [st,seed,trigger] of [[40,.699,true],[39,.699,false],[40,.7,false]]){
    const result=fight('samurai','wallofstone',{type:2,level:3,st,seed});
    assert.equal(result.b.lines.some(line=>line.includes('즉사')),trigger);
  }
}
console.log('2012 3DS Soltis ownership and four elements, five wall forms, randomized forms and battle rulings verified.');

{
  const C=ps2.createEdition('3ds'),map='3ds-original-bend';
  const id=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const start=()=>C.start(2,2,7000,map,C.presets.handheldFusion,C.presets.handheldFusion,1);
  const atFor=s=>s.tiles.findIndex(t=>C.territoryType(t.type));
  assert.ok(C.validBook(C.presets.handheldFusion));
  for(const n of ['bundlegear','carbunfly']){
    assert.ok(C.cards[id(n)].generatedOnly);
    assert.ok(!C.validBook([id(n),...C.presets.handheldFusion.slice(1)]));
  }
  function fight(a,d,{atkGear,defGear,type='무속성',level=1,guard={},invHP,extra,seed=.5}={}){
    const s=start(),at=atFor(s),tile=s.tiles[at],alt=s.tiles.findIndex((t,i)=>i!==at&&!C.board(s).links[at].includes(i)&&C.territoryType(t.type));
    Object.assign(tile,{type,level,owner:1,unit:{id:id(d),hp:C.cards[id(d)].hp,...guard}});
    if(extra)Object.assign(s.tiles[alt],{owner:1,unit:{id:id(extra[0]),hp:C.cards[id(extra[0])].hp,...extra[1]}});
    s.players.forEach((p,i)=>{p.hand=[atkGear,defGear][i]?[id([atkGear,defGear][i])]:[];p.cash=1000;});
    s.phase='attack';s.battle={at,inv:id(a),invHP,atkItem:null,defItem:null};
    const rand=Math.random;
    try{
      Math.random=()=>seed;
      assert.ok(C.play(s,atkGear?['equip',0]:['bare']));
      assert.ok(C.play(s,defGear?['equip',0]:['bare']));
    }finally{Math.random=rand;}
    return {s,at,tile,b:s.battle};
  }
  for(const [body,support] of [['battlegearalpha','battlegearbeta'],['battlegearbeta','battlegearalpha']]){
    const result=fight(body,'goblin',{atkGear:support});
    assert.deepEqual([result.b.forms[0],result.b.attackST,result.b.startHP[0]],[id('bundlegear'),70,70]);
    assert.deepEqual([result.tile.owner,result.tile.unit.id],[0,id('bundlegear')]);
    assert.deepEqual(result.s.players[0].hand,[]);
    const failed=fight(body,'gremlin',{atkGear:support});
    assert.equal(failed.b.forms[0],id(body));
  }
  const reflects=fight('fighter','battlegearbeta',{defGear:'battlegearalpha',guard:{enchant:'reflection',expires:4}});
  assert.equal(reflects.b.forms[1],id('bundlegear'));
  assert.equal(reflects.b.strikes[0].effect,'reflect');
  assert.deepEqual([reflects.tile.unit.id,reflects.tile.unit.enchant,reflects.tile.unit.expires],[id('bundlegear'),'reflection',4]);
  const protectedGear=fight('fighter','battlegearalpha',{atkGear:'nuclearfusion',defGear:'battlegearbeta'});
  assert.equal(protectedGear.b.strikes[0].effect,'block');
  const dragon=fight('fighter','carbuncle',{atkGear:'nuclearfusion',defGear:'dragonfly',invHP:80});
  assert.equal(dragon.b.forms[1],id('carbunfly'));
  assert.equal(dragon.b.strikes[0].side,1);
  assert.equal(dragon.b.strikes[1].effect,'reflect');
  const revived=fight('fighter','carbuncle',{atkGear:'longsword',defGear:'dragonfly',invHP:80});
  assert.equal(revived.b.forms[1],id('carbunfly'));
  assert.equal(revived.tile.unit.id,id('carbuncle'));
  const pudding=fight('goblin','bloodypudding',{defGear:'tyrannosaurus',guard:{mhp:90,hp:90,st:0}});
  assert.equal(pudding.tile.unit.mhp,100);
  assert.equal(pudding.tile.unit.hp,100);
  const terrain=fight('trojanhorse','dwarf',{atkGear:'fighter',type:2,level:3});
  assert.match(terrain.b.lines.join(' '),/지형 보너스 관통/);
  assert.equal(terrain.b.strikes[0].hp[1],10);
  assert.equal(fight('goblin','gelatinouswall').s.players[1].cash,1100);
  assert.equal(fight('fighter','gelatinouswall',{atkGear:'nuclearfusion',guard:{hp:100,mhp:100}}).s.players[1].cash,1000);
  assert.equal(fight('fighter','gelatinouswall',{atkGear:'longsword'}).s.players[1].cash,1000);
  const zombie=fight('goblin','zombie',{defGear:'scalearmor'});
  assert.equal(zombie.tile.unit.hp,30);
  const root=fight('chonchon','fighter',{type:2});
  assert.equal(root.b.strikes[0].side,0);
  assert.equal(root.tile.unit.enchant,'antielement');
  const rusty=fight('rustcrawler','fighter',{defGear:'longsword'});
  assert.equal(rusty.b.defendST,40);
  assert.equal(fight('rustcrawler','fighter',{atkGear:'mace',defGear:'longsword'}).b.defendST,70);
  assert.equal(fight('rustcrawler','fighter',{defGear:'wingedboots'}).b.strikes[0].side,1);
  const baseline=fight('fighter','goblin').b.attackST;
  assert.equal(fight('fighter','goblin',{extra:['nue']}).b.attackST,baseline-10);
  assert.equal(fight('fighter','goblin',{extra:['nue',{enchant:'paralysis'}]}).b.attackST,baseline);
  assert.equal(fight('lizardman','goblin',{extra:['quetzalcoatl']}).b.attackST,C.cards[id('lizardman')].st+10);
  assert.equal(fight('fighter','goblin',{atkGear:'wingedboots',extra:['quetzalcoatl']}).b.attackST,baseline);
  assert.equal(fight('fighter','gigantherium',{guard:{enchant:'greed'}}).b.startHP[1],40);
  assert.equal(fight('werewolf','wallofstone',{seed:.999}).tile.unit.id,id('wolf'));
  const gray=fight('littlegray','wallofstone',{seed:.1});
  assert.ok(gray.s.tiles.some((t,i)=>i!==gray.at&&t.owner===1&&t.unit?.id===id('wallofstone')));
  const leo=fight('fighter','leoknight',{extra:['goblin']});
  assert.deepEqual([leo.b.defendST,leo.b.startHP[1]],[0,20]);
}
console.log('2012 3DS support, fusion, generated forms, enchant inheritance, damage and equipment effects checked.');

{
  const C=ps2.createEdition('3ds'),map='3ds-original-bend';
  const id=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const start=()=>C.start(2,2,7000,map,C.presets.handheldSwarm,C.presets.handheldSwarm,2);
  const place=(s,at,owner,key,options={})=>Object.assign(s.tiles[at],{owner,unit:{id:id(key),hp:C.cards[id(key)].hp,...options}});
  assert.ok(C.validBook(C.presets.handheldSwarm));
  for(const n of ['redcap','mothman','dragonoid','paladin','goblinslair'])assert.ok(C.presets.handheldSwarm.includes(id(n)));
  function fight(a,d,{atkGear,defGear,type=2,level=1,guard={},invHP,extras=[],hands=[[],[]],books=[[],[]],seed=.5}={}){
    const s=start(),at=s.tiles.findIndex(t=>C.territoryType(t.type)),tile=s.tiles[at];
    Object.assign(tile,{type,level});place(s,at,1,d,guard);
    const sites=s.tiles.flatMap((t,i)=>i!==at&&!C.board(s).links[at].includes(i)&&C.territoryType(t.type)?[i]:[]);
    extras.forEach(([owner,key],i)=>place(s,sites[i],owner,key));
    s.players.forEach((p,i)=>{
      const gear=[atkGear,defGear][i];p.hand=(gear?[gear,...hands[i]]:hands[i]).map(id);p.book=books[i].map(id);p.cash=i===0?900:1000;
    });
    s.phase='attack';s.battle={at,inv:id(a),invHP,atkItem:null,defItem:null};
    const rand=Math.random;
    try{
      Math.random=()=>seed;
      assert.ok(C.play(s,atkGear?['equip',0]:['bare']));
      assert.ok(C.play(s,defGear?['equip',0]:['bare']));
    }finally{Math.random=rand;}
    return {s,at,tile,b:s.battle};
  }
  const twice=fight('cerberus','wallofstone',{type:2,level:3});
  assert.deepEqual(twice.b.strikes.slice(0,2).map(x=>x.side),[0,0]);
  assert.equal(fight('cockatrice','dwarf',{type:2,level:3}).tile.unit.id,id('wallofstone'));
  const erase=fight('deathgaze','goblin',{seed:.799,hands:[[],['goblin','fighter']],books:[[],['goblin','goblin','dwarf']]});
  assert.deepEqual(erase.s.players[1].hand,[id('fighter')]);assert.deepEqual(erase.s.players[1].book,[id('dwarf')]);
  const keep=fight('deathgaze','goblin',{seed:.8,hands:[[],['goblin']],books:[[],['goblin']]});
  assert.deepEqual(keep.s.players[1].hand,[id('goblin')]);assert.deepEqual(keep.s.players[1].book,[id('goblin')]);
  const self=fight('deathgaze','sludgetitan',{seed:0,guard:{hp:50},hands:[[],['sludgetitan']],books:[[],['sludgetitan']]});
  assert.deepEqual(self.s.players[1].book,[id('sludgetitan')]);
  assert.equal(fight('fighter','deathgaze',{atkGear:'nuclearfusion'}).b.strikes[0].effect,'block');
  const triumph=fight('taotieh','goblin');
  assert.deepEqual([triumph.tile.unit.st,triumph.tile.unit.mhp],[60,60]);
  assert.equal(fight('taotieh','sludgetitan',{guard:{hp:59}}).tile.unit.st,undefined);
  for(const [seed,wins] of [[.699,true],[.7,false]]){
    const instant=fight('igneousfatui','goblin',{seed,invHP:50});
    assert.equal(instant.b.strikes[0].side,1);
    assert.equal(instant.b.lines.some(line=>line.includes('즉사')),wins);
  }
  const fiend=fight('goblin','nightfiend',{type:3,level:3,guard:{st:22}});
  assert.equal(fiend.b.defendST,60);assert.equal(fiend.b.strikes[0].side,1);
  const paladin=fight('paladin','fighter',{invHP:30,guard:{hp:100,mhp:100}});
  assert.match(paladin.b.lines.join(' '),/즉사/);assert.equal(paladin.tile.unit.hp,50);
  assert.equal(fight('wendigo','fighter',{atkGear:'mace',guard:{hp:85,mhp:85}}).tile.unit.enchant,'fog');
  assert.ok(fight('sphinx','dwarf',{type:2,level:3}).tile.unit.confused);
  const earth=fight('fighter','dwarf',{extras:[[1,'sphinx']]});
  assert.equal(earth.b.startHP[1],C.cards[id('dwarf')].hp+earth.b.landHP-10);
  assert.match(fight('dragonoid','wallofstone',{atkGear:'nuclearfusion'}).b.strikes[0].notes.join(' '),/75 피해/);
  const swarm=fight('redcap','dwarf',{type:2,level:3,extras:[[0,'goblin'],[1,'goblin']]});
  assert.deepEqual([swarm.b.attackST,swarm.b.startHP[0]],[40,40]);
  const recruit=fight('goblin','dwarf',{extras:[[1,'redcap']]});
  assert.equal(recruit.b.attackST,40);
  const moth=fight('mothman','goblin',{extras:[[0,'goblin'],[1,'fighter']]});
  assert.equal(moth.b.attackST,45);assert.equal(moth.b.strikes[0].side,0);
  const second=fight('avenger','goblin');
  assert.deepEqual([second.b.attackST,second.b.startHP[0]],[50,50]);
  const drawn=fight('gildedraptor','goblin',{atkGear:'mace',books:[['fighter'],[]]});
  assert.deepEqual(drawn.s.players[0].hand,[id('fighter')]);
  assert.deepEqual(fight('gildedraptor','goblin',{books:[['fighter'],[]]}).s.players[0].hand,[]);
  assert.equal(fight('fighter','gildedraptor').s.players[1].cash,1100);
  const holdings=n=>Array.from({length:n},()=>[1,'goblin']);
  const returns=fight('fighter','ouroboros',{extras:holdings(3)});
  assert.equal(returns.tile.unit.id,id('ouroboros'));assert.equal(returns.tile.unit.hp,20);
  assert.equal(fight('fighter','ouroboros',{extras:holdings(4)}).tile.unit.id,id('fighter'));
  const spell=start(),site=spell.tiles.findIndex(t=>C.territoryType(t.type));
  const sand=place(spell,site,1,'sandman',{hp:20}),other=spell.tiles.findIndex((t,i)=>i!==site&&C.territoryType(t.type));
  const goblin=place(spell,other,1,'goblin');
  spell.players[0].hand=[id('tempest'),id('goblin')];spell.players[0].cash=1000;spell.phase='spell';
  assert.ok(C.play(spell,['cast',0]));
  if(spell.phase==='sacrifice')assert.ok(C.play(spell,['sacrifice',1]));
  assert.equal(sand.unit.hp,20);assert.ok(goblin.unit.hp<30);
}
console.log('3DS swarm, neutral wards, scrolls, last strike, obliteration, rank, resurrection and legacy effects checked.');
