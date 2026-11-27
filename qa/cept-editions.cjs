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
