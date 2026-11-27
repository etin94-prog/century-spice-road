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
for(const [edition,count,mapCount] of [['dc',459,39],['ps1',361,36],['saturn',361,10],['saga',487,19],['revolt',489,41],['begins',400,18]]){
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
    assert.deepEqual(Object.keys(C.presets),['intro','fire','stronghold',...(edition==='saga'?['sagaStarterWater','sagaStarterFire','sagaRilaraPlunder','sagaRilaraRobbery','sagaGottliebKill','sagaGottliebSlaves','sagaBorivalFire','sagaZenethDragon','sagaTicomunKill','sagaTicomunChallenge','sagaRilaraExploit','sagaBorivalHellFire','sagaRilaraConspire','sagaRilaraFierce','sagaKoenigStar','sagaTraderMoney','sagaGuilderTwins','sagaImmediate','sagaAffinity']:edition==='begins'?['beginsStarterFireEarth','beginsStarterWaterAir','beginsVeramiSeaWind','beginsIsharaFirst','beginsGanzBeast','beginsGanzInstinct','beginsGanzGiantBeasts','beginsTindalosFreeWind','beginsNajaranMistral','beginsPopoloDragon','beginsSteamdrillPierce','beginsArtAssault','beginsTidalGuard']:edition==='revolt'?['revoltAliciaEntry','revoltGenSerious','revoltYumaFellowship','revoltYumaResolve','revoltYumaBonds','revoltSomniaSerenity','revoltTenetBelief','revoltTenetPraise','revoltAliciaFreedom','revoltTenetPoverty','revoltGoliganServant','revoltZenethPower','revoltYumaLove','revoltHypnaPetrify','revoltMoriAnnoying','revoltSomniaScripture','revoltMoriCrazy']:[])]);
    assert.equal(new Set(Object.values(C.presets).map(deck=>[...deck].sort((a,b)=>a-b).join(','))).size,Object.keys(C.presets).length);
    for(const [name,deck] of Object.entries(C.presets)){
      assert.ok(deck.every(id=>!C.cards[id].unlisted));
      const expectedKinds=name==='beginsVeramiSeaWind'?['creature','spell']:name==='beginsSteamdrillPierce'?['creature','item']:['creature','item','spell'];
      assert.deepEqual(new Set(deck.map(id=>C.cards[id].kind)),new Set(expectedKinds));
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
  assert.equal(id('gearion'),-1,'fusion-only creature is not a collectible card');
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
  assert.equal(id('grassstrider'),-1);
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
    const s=C.start(2,2,5000,edition+'-1');
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
    revoltMoriCrazy:'amphibianwarrior:2 aquahorn:2 odontotyrannus:2 undine:2 yeti:2 breezespirit:2 elvenarcher:2 pulgasari:2 rokh:2 spectre:2 witch:2 battleaxe:2 bindingwhip:1 shadowblaze:2 spectresrobe:2 stormshield:2 stormspear:2 blackout:2 chariot:2 disease:2 freezecyclone:1 holyword6:2 liquidform:2 remoteswitch:2 shatter:2 spartoi:2'
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
    if(revoltCatalog.validBook(original))ready.push(character+' · '+name);
  }
  assert.deepEqual(uneven.sort(),[48,49,49,49,51,51,52]);
  assert.equal(ready.length,17);
  assert.equal(archive.filter(([, , ,recipe])=>recipe.livinghelmet).length,3);
  const helmet=revolt('livinghelmet','livingarmor','fighter','fighter').s.battle;
  assert.deepEqual([helmet.attackST,helmet.startHP[0],helmet.startHP[1]],[60,70,80]);
  const living=revolt(null,null,'livingarmor','fighter').s.battle;
  assert.equal(living.attackST,50);
  const deployed=(element,name,owner=0)=>(state,id)=>{
    Object.assign(state.tiles[8],{owner,type:element,unit:{id:id(name),hp:40}});
  };
  assert.equal(revolt(null,null,'rokh','fighter').s.battle.attackST,40);
  assert.equal(revolt(null,null,'rokh','fighter',deployed(1,'blueogre',1)).s.battle.attackST,70);
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
  console.log('Revolt seventeen exact AI books, terrain defenses, metamorphosis, item effects and Yeti threshold OK');
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
  const creature=n=>C.cards.findIndex(c=>!c.unlisted&&!c.catalogOnly&&C.combo.key(c)===n);
  const goblin=creature('goblin'),fighter=creature('fighter');
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
  const frost=duel(fighter,ice,null,null);
  assert.deepEqual([frost.startHP[1],frost.won],[60,false]);
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
  assert.equal(dreamCaster.cash,460);
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
  console.log('Begins spells, 100 MHP cap, redraw, 80 percent land liquidation and original Ford routes OK');
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
