const adaptedBooks=archive.books.map(row=>{
  const pool=C.cards.flatMap((c,id)=>c.catalog&&!c.catalogOnly?[id]:[]);
  const deck=[],missing=[];
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
    const source=missing.shift()||C.cards[C.presets.fire[deck.length]];
    const available=pool.filter(id=>deck.filter(x=>x===id).length<4);
    available.sort((a,b)=>distance(C.cards[a],source)-distance(C.cards[b],source));
    deck.push(available[0]);
  }
  return {name:row.name,group:row.group,kept,deck};
});
for(const [group,select] of [['Player',$('bookChoice')],['AI',$('aiChoice')]]){
  const list=document.createElement('optgroup');list.label=group+' 원작 기반 50장';
  adaptedBooks.forEach((b,i)=>{if(b.group===group)list.append(new Option(b.name+' · 유지 '+b.kept+'장','source-'+i));});
  select.insertBefore(list,select.querySelector('[value="custom"]'));
}
function sourceBook(select){const value=select.value;return value.startsWith('source-')?adaptedBooks[Number(value.slice(7))]:null;}
let matchupWorker=null;
function refreshMatchup(){
  matchupWorker?.terminate();matchupWorker=null;
  const tier=tierBooks(),humanCount=Number($('humans').value),count=Number($('count').value);
  const usingAI=humanCount<count,same=$('tierChoice').value==='same';
  const describe=b=>b.name+' (원본 유지 '+b.kept+'/50장)';
  $('aiChoice').disabled=!usingAI||same;
  const player=$('bookChoice').value==='recommend'?describe(tier.player):$('bookChoice').selectedOptions[0].text;
  $('deckMatchNames').textContent='Player · '+player+' / AI · '+(!usingAI?'없음':same?'플레이어와 같은 북':describe(sourceBook($('aiChoice'))||tier));
  if(usingAI&&!same&&!sourceBook($('aiChoice'))) $('deckMatchNames').append(' · 기준 덱 상대 AI 승률 '+(tier.score/384*100).toFixed(1)+'% (6개 맵, 2인 384판)');
  $('deckOdds').textContent='';
  $('estimateDeck').disabled=false;
}
for(const id of ['mapChoice','count','humans','target','tierChoice','bookChoice','aiChoice']){
  $(id).addEventListener('change',()=>{
    if(id==='tierChoice')$('aiChoice').value='tier';
    if(id==='tierChoice'&&$('bookChoice').value==='recommend'&&$('editor').open)bookEditor();
    refreshMatchup();
  });
}
$('storeBook').addEventListener('click',refreshMatchup);
$('estimateDeck').onclick=()=>{
  matchupWorker?.terminate();
  const options={count:Number($('count').value),humans:Number($('humans').value),target:Number($('target').value),map:$('mapChoice').value,player:chosenBook(),opponent:chosenAiBook()};
  $('estimateDeck').disabled=true;
  $('deckOdds').textContent='모의 대국 계산 중…';
  function stop(){matchupWorker?.terminate();matchupWorker=null;$('estimateDeck').disabled=false;}
  try{
    matchupWorker=new Worker('cept-simulate.js');
    matchupWorker.onmessage=({data})=>{
      const {wins,finished,attempts}=data;
      const rate=finished?(wins/finished*100).toFixed(1)+'%':'산출 불가';
      $('deckOdds').textContent='1번 좌석 예상 승률 '+rate+' · '+wins+'승 / 완주 '+finished+'판 (시도 '+attempts+'판). 모든 좌석을 같은 AI가 조작한 추정치입니다.';
      if(data.done)stop();
    };
    matchupWorker.onerror=()=>{$('deckOdds').textContent='계산할 수 없습니다. 다시 시도해 주세요.';stop();};
    matchupWorker.postMessage(options);
  }catch{$('deckOdds').textContent='이 주소에서 모의 대국을 실행할 수 없습니다.';stop();}
};
refreshMatchup();
