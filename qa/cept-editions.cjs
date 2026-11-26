const assert=require('node:assert/strict');
const ps2=require('../dist/cept-engine');
let seed=89231;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const [edition,count,mapCount] of [['dc',459,39],['ps1',361,36],['saturn',361,10],['saga',487,17],['revolt',489,34],['begins',400,15]]){
  const modern=['saga','revolt','begins'].includes(edition);
  const C=ps2.createEdition(edition),catalog=C.cards.filter(c=>!c.unlisted);
  assert.equal(catalog.length,count);
  assert.equal(Object.keys(C.maps).length,mapCount);
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
