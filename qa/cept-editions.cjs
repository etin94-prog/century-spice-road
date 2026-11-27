const assert=require('node:assert/strict');
const ps2=require('../dist/cept-engine');
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
    if(edition==='begins')checkGear(mace,20,0,0);
    else checkGear(armor,-30,60,1);
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
