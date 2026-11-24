const stageSelect=$('mapChoice');
const originalStages=document.createElement('optgroup');
originalStages.label='PS2 스테이지';
for(const stage of CepterStages)originalStages.append(new Option(stage.stage+' · '+stage.name,'ps2-'+stage.stage));
stageSelect.prepend(originalStages);
stageSelect.value='ps2-1';
const stageFeatureLabels={'Temple':'신전','Shrine':'성소','Fortune-Teller':'점술관','Fortune Teller':'점술관','Card Shop':'카드 상점','none':'없음'};
function showStage(){
  const m=C.maps[stageSelect.value],preview=$('stagePreview');
  preview.hidden=!m.stage;
  if(!m.stage)return;
  const image=preview.querySelector('img');image.src='art/cept-maps/'+m.image+'.webp';image.alt=m.name;
  const features=m.special.replace(/Fortune[- ]Teller|Card Shop|Temple|Shrine|none/g,v=>stageFeatureLabels[v]);
  preview.querySelector('figcaption').textContent='주사위 1–'+m.die+' · 요새 '+m.forts.length+' · '+m.areaCount+'지역 · 특수지 '+features+' · 승리 보상 '+m.reward.counts.reduce((a,b)=>a+b,0)+'장';
}
stageSelect.onchange=showStage;showStage();
const archive=CepterArchive;
const cardIndex=new Map(C.cards.flatMap((c,id)=>c.catalog?[[c.catalog.path,id]]:[]));
const comboCards=paths=>paths.map(path=>C.cards[cardIndex.get(path)]?.catalog.name||path);
function archiveLabel(kind,row){
  if(kind==='books')return row.group+' · '+row.name;
  if(kind==='combos')return row[0]+' · '+comboCards(row[1]).join(' + ');
  return row[0];
}
function sourceLink(url,label){
  const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener';return a;
}
function archiveCard(path,qty){
  const id=cardIndex.get(path),c=C.cards[id];
  if(!c)return el('span',path);
  const button=btn((c.catalog?.name||c.name)+(qty?' ×'+qty:''),()=>showCatalogCard(c,id),'archive-card');
  const im=cardSeal(id);im.loading='lazy';button.prepend(im);return button;
}
function showEntry(){
  const kind=$('libraryKind').value,select=$('libraryResults'),detail=$('libraryDetail');
  detail.replaceChildren();if(select.selectedIndex<0){detail.textContent='검색 결과가 없습니다.';return;}
  const index=+select.value,row=archive[kind][index];
  if(kind==='books'){
    const cards=Object.entries(row.cards),book=cards.flatMap(([path,n])=>Array(n).fill(cardIndex.get(path)));
    const ready=book.filter(id=>C.cards[id]&&!C.cards[id].catalogOnly).length;
    detail.append(el('p',book.length+'장 · 대전 지원 '+ready+'장'),sourceLink(row.url,'원작 덱 보기'));
    if(C.validBook(book))detail.append(btn('이 북으로 대국 설정',()=>{
      customBook=book;const choice=$('bookChoice');choice.lastElementChild.disabled=false;choice.value='custom';
      try{localStorage.setItem(bookKey,JSON.stringify(book));}catch{}
      bookEditor();lobby();$('config').scrollIntoView({block:'center'});
    }));
    else if(ready)detail.append(btn('지원 카드로 북 편집 시작',()=>{
      draft=C.cards.map((c,id)=>c.catalogOnly?0:Math.min(4,book.filter(n=>n===id).length));
      lobby();$('editor').open=true;$('cardScope').value='usable';$('cardSearch').value='';$('cardKind').value='';
      filterBook();tallyBook();$('bookCount').append(' · '+row.name+'에서 가져옴');$('editor').scrollIntoView();
    }));
    const grid=el('div',null,'archive-cards');grid.append(...cards.map(([path,n])=>archiveCard(path,n)));detail.append(grid);
    const matched=archive.combos.filter(([,parts])=>parts.every(path=>row.cards[path]));
    if(matched.length)detail.append(el('p','포함된 콤보 · '+matched.map(([,parts])=>comboCards(parts).join(' + ')).join(' / ')));
  }else if(kind==='combos'){
    const grid=el('div',null,'archive-cards');grid.append(...row[1].map(path=>archiveCard(path)));detail.append(grid,sourceLink('https://culdceptcentral.com/ii/culdcept-ii-ps2-dc/culdcept-ps2dc-card-combos/culdcept-ps2dc-all-combos','원문 조합 설명'));
  }else if(kind==='music'){
    detail.append(btn('재생 · '+row[1],()=>{$('stageMusic').checked=false;playTrack(index);}));
  }else if(kind==='medals'){detail.append(el('p',row[1]));}
  else detail.append(sourceLink(row[1],row[0]));
}
function showHandCombos(container,hand){
  const held=new Set(hand.map(id=>C.cards[id]?.catalog?.path));
  const matches=archive.combos.filter(([,parts])=>parts.length>1&&parts.every(path=>held.has(path)));
  if(!matches.length)return;
  const details=el('details');details.append(el('summary','손패에 모인 콤보 '+matches.length+'개'));
  for(const [kind,parts] of matches)details.append(el('p',kind+' · '+comboCards(parts).join(' + ')));
  container.append(details);
}
function listEntries(){
  const kind=$('libraryKind').value,q=$('libraryQuery').value.trim().toLowerCase(),select=$('libraryResults');
  select.replaceChildren(...archive[kind].flatMap((row,i)=>{
    const name=archiveLabel(kind,row);return name.toLowerCase().includes(q)?[new Option(name,i)]:[];
  }));showEntry();
}
$('libraryKind').onchange=listEntries;$('libraryQuery').oninput=listEntries;$('libraryResults').onchange=showEntry;
$('ps2Library').ontoggle=()=>{if($('ps2Library').open)listEntries();};
const audio=$('soundtrack');audio.volume=.45;
function playTrack(index){
  $('musicPanel').hidden=false;
  audio.src=archive.music[index][2];audio.title=archive.music[index][0];audio.loop=true;
  audio.play().catch(()=>{$('notice').textContent='음악 재생 버튼을 눌러주세요.';});
}
function syncStageMusic(){
  if(!$('stageMusic').checked||!s)return;
  const first=[2,5,8,11,14,17,20,14,23,23,23,26,29,32,35,38][C.board(s).stage-1];
  const track=s.phase==='over'?41:first==null?49:first+(s.battle?2:s.players.some((_,i)=>C.total(s,i)>=s.target/2)?1:0);
  if(audio.src!==archive.music[track][2])playTrack(track);
}
$('stageMusic').onchange=()=>{if($('stageMusic').checked)syncStageMusic();};
