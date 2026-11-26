function adaptCepterBook(C,row){
  const cardIndex=new Map(C.cards.map((c,i)=>[c.catalog?.path,i]));
  const pool=C.cards.flatMap((c,id)=>c.catalog&&!c.catalogOnly&&!c.generatedOnly?[id]:[]);
  const deck=[],missing=[],replacements=[];
  for(const [path,n] of Object.entries(row.cards)){
    const id=cardIndex.get(path);
    for(let i=0;i<n;i++){
      if(pool.includes(id)&&i<4&&deck.length<50)deck.push(id);
      else missing.push(C.cards[id]);
    }
  }
  const kept=deck.length;
  function distance(c,source){
    return 1000*(c.kind!==source.kind)+150*(c.catalog.category!==source.catalog.category)
      +Math.abs(c.cost-source.cost)+Math.abs((c.st||0)-(source.st||0))+Math.abs((c.hp||0)-(source.hp||0));
  }
  while(deck.length<50){
    const from=missing.shift();
    const source=from||C.cards[C.presets.fire[deck.length]];
    const available=pool.filter(id=>deck.filter(x=>x===id).length<4);
    available.sort((a,b)=>distance(C.cards[a],source)-distance(C.cards[b],source));
    deck.push(available[0]);replacements.push([from?.catalog.path??null,C.cards[available[0]].catalog.path]);
  }
  for(const c of missing)replacements.push([c.catalog.path,null]);
  return {name:row.name,group:row.group,kept,deck,replacements};
}
if(typeof module!=='undefined')module.exports=adaptCepterBook;
