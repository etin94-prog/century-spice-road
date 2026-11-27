const stageSelect=$('mapChoice');
const originalStages=document.createElement('optgroup');
originalStages.label='PS2 스테이지';
for(const stage of CepterStages)originalStages.append(new Option(stage.stage+' · '+stage.name,'ps2-'+stage.stage));
if(C.edition==='ps2'){stageSelect.prepend(originalStages);stageSelect.value='ps2-1';}
else{
  stageSelect.replaceChildren();
  for(const [sections,label] of [[['story'],'스토리'],[['tutorial'],'튜토리얼'],[['arena'],'대전'],[['memory','download'],'추가 지도']]){
    const group=document.createElement('optgroup');group.label=label;
    for(const [id,m] of Object.entries(C.maps))if(sections.includes(m.section))group.append(new Option(m.name,id));
    if(group.children.length)stageSelect.append(group);
  }
  document.title=document.querySelector('.intro h1').textContent=CepterEditions.names[C.edition];
  const modernEdition={saga:'CULDCEPT SAGA',revolt:'CULDCEPT REVOLT',begins:'CULDCEPT BEGINS'}[C.edition];
  document.querySelector('.intro [lang=en]').textContent=modernEdition||(C.edition==='dc'?'CULDCEPT SECOND':'CULDCEPT');
  const profile={dc:'2nd',saturn:'1st',ps1:'1ex'}[C.edition];
  const references=el('details');references.append(el('summary','판본 자료'));
  const list=el('p');
  if(modernEdition)list.append(sourceLink('https://culdceptcentral.com/culdcept-'+C.edition,'판본별 카드 목록'),' · ',sourceLink('https://culdcept.club/maps/'+C.edition+'/table','지도 목록'));
  else list.append(sourceLink('https://card.culdcept.net/'+profile+'/','판본별 카드 목록'),' · ',sourceLink('https://culdcept.club/maps/'+profile+'/table','지도 목록'));
  if(modernEdition);
  else if(C.edition!=='dc')list.append(' · ',sourceLink('https://drgs.app/culdceptex/scenario.html','초기 북·시나리오 공략'));
  else list.append(' · ',sourceLink('https://culdceptcentral.com/culdcept-ps2dc/culdcept-ps2dc-guides/706-cps2-guides-dcfaq','DC판 공략'));
  references.append(list);$('config').before(references);
  $('alliance').options[0].textContent='개인전';
}
const stageFeatureLabels={'Temple':'신전','Shrine':'성소','Fortune-Teller':'점술관','Fortune Teller':'점술관','Card Shop':'카드 상점','none':'없음'};
function showStage(){
  const m=C.maps[stageSelect.value],preview=$('stagePreview');
  $('target').querySelector('[value="0"]').textContent=(m.storyGoal?'스토리 목표 · ':'기본 목표 · ')+(m.storyGoal||5000)+'G';
  if(m.graph){
    preview.hidden=false;preview.querySelector('img').hidden=true;
    const unlinked=m.types.filter((type,index)=>type==='전송진'&&m.transit?.[index]==null).length;
    const warning=unlinked?' · 목적지 미설정 전송진 '+unlinked+'곳':'';
    preview.querySelector('figcaption').replaceChildren(m.types.length+'칸 · 요새 '+m.forts.length+'곳'+warning+' · ',sourceLink(m.source,'원작 지도'));
    return;
  }
  preview.hidden=!m.stage;
  if(!m.stage)return;
  const image=preview.querySelector('img');image.src='art/cept-maps/'+m.image+'.webp';image.alt=m.name;
  const features=m.special.replace(/Fortune[- ]Teller|Card Shop|Temple|Shrine|none/g,v=>stageFeatureLabels[v]);
  const caption=preview.querySelector('figcaption');caption.textContent='주사위 1–'+m.die+' · 요새 '+m.forts.length+' · '+m.areaCount+'지역 · 특수지 '+features+' · 승리 보상 '+m.reward.counts.reduce((a,b)=>a+b,0)+'장';
  if(m.source)caption.append(' · ',sourceLink(m.source,'칸 배치 원문'));
}
stageSelect.onchange=showStage;showStage();
const archive=CepterArchive;
const cardIndex=new Map(C.cards.flatMap((c,id)=>c.catalog?[[c.catalog.path,id]]:[]));
const comboCards=paths=>paths.map(path=>C.cards[cardIndex.get(path)]?.catalog.name||path);
const pathByName=new Map([...cardIndex.keys()].map(path=>[path.split('/').pop(),path]));
function comboLabel(i){return C.combo.recipes[i].map(group=>group.length>4?'조건에 맞는 크리처 ('+group.length+'종)':comboCards(group.map(n=>pathByName.get(n))).join(' 또는 ')).join(' + ');}
function archiveLabel(kind,row){
  if(kind==='books')return row.group+' · '+row.name;
  if(kind==='combos')return row[0]+' · '+comboLabel(archive.combos.indexOf(row));
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
    const ready=book.filter(id=>C.cards[id]&&!C.cards[id].catalogOnly&&!C.cards[id].generatedOnly).length;
    detail.append(el('p',book.length+'장 · 대전 지원 '+ready+'장'),sourceLink(row.url,'원작 덱 보기'));
    const audit=adaptedBooks[index];
    if(book.length!==50)detail.append(el('p','자료에 기록된 수량은 '+book.length+'장입니다. 대전용 북은 50장으로 맞췄습니다.'));
    if(audit.replacements.length){
      const changes=new Map();
      for(const [from,to] of audit.replacements){const label=(from?comboCards([from])[0]:'보충')+' → '+(to?comboCards([to])[0]:'50장 한도 제외');changes.set(label,(changes.get(label)||0)+1);}
      const list=el('details');list.append(el('summary','대전용 대체 카드 '+audit.replacements.length+'장'));
      for(const [label,count] of changes)list.append(el('p',label+' ×'+count));
      detail.append(list);
    }
    if(C.validBook(book))detail.append(btn('이 북으로 대국 설정',()=>{
      customBook=book;const choice=$('bookChoice');choice.lastElementChild.disabled=false;choice.value='custom';
      try{localStorage.setItem(bookKey,JSON.stringify(book));}catch{}
      bookEditor();refreshMatchup();lobby();$('config').scrollIntoView({block:'center'});
    }));
    else if(ready)detail.append(btn('지원 카드로 북 편집 시작',()=>{
      draft=C.cards.map((c,id)=>c.catalogOnly||c.generatedOnly?0:Math.min(4,book.filter(n=>n===id).length));
      lobby();$('editor').open=true;$('cardScope').value='usable';$('cardSearch').value='';$('cardKind').value='';
      filterBook();tallyBook();$('bookCount').append(' · '+row.name+'에서 가져옴');$('editor').scrollIntoView();
    }));
    const grid=el('div',null,'archive-cards');grid.append(...cards.map(([path,n])=>archiveCard(path,n)));detail.append(grid);
    const names=book.map(id=>C.combo.key(C.cards[id]));
    const matched=archive.combos.filter((_,i)=>C.combo.matches(C.combo.recipes[i],names));
    if(matched.length)detail.append(el('p','포함된 콤보 · '+matched.map(row=>comboLabel(archive.combos.indexOf(row))).join(' / ')));
  }else if(kind==='combos'){
    const groups=C.combo.recipes[index],paths=[...new Set(groups.flat())].map(n=>pathByName.get(n)).filter(Boolean);
    detail.append(el('p',comboLabel(index)));
    for(const [choice,label] of [['bookChoice','플레이어'],['aiChoice','AI']]){
      detail.append(btn(label+' 콤보 연습 북으로 선택',()=>{
        if(choice==='aiChoice'&&$('tierChoice').value==='same')$('tierChoice').selectedIndex=1;
        $(choice).value='combo-'+index;refreshMatchup();$('config').scrollIntoView({block:'center'});
      }));
    }
    const grid=el('div',null,'archive-cards');grid.append(...paths.map(path=>archiveCard(path)));detail.append(grid,sourceLink('https://culdceptcentral.com/ii/culdcept-ii-ps2-dc/culdcept-ps2dc-card-combos/culdcept-ps2dc-all-combos','원문 조합 설명'));
  }else if(kind==='music'){
    detail.append(btn('재생 · '+row[1],()=>{$('stageMusic').checked=false;saveAudioSettings();playTrack(index);}));
  }else if(kind==='medals'){detail.append(el('p',row[1]));}
  else detail.append(sourceLink(row[1],row[0]));
}
function showHandCombos(container,hand){
  if(C.edition==="saturn"||C.edition==="ps1")return;
  const held=hand.map(id=>C.combo.key(C.cards[id]));
  const matches=C.combo.recipes.flatMap((g,i)=>C.combo.matches(g,held)?[i]:[]);
  if(!matches.length)return;
  const details=el('details');details.append(el('summary','손패에 모인 콤보 '+matches.length+'개'));
  for(const i of matches)details.append(el('p',archive.combos[i][0]+' · '+comboLabel(i)));
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

let musicScene,currentTrack,missingTracks=new Set();
const fieldMusic=['field-1','field-2','field-3'],battleMusic=['battle-1','battle-2','battle-3'];
const musicScenes={field:fieldMusic,battle:battleMusic,over:fieldMusic};
let trackSwap=0;
function setMusicTrack(key,url,title,fade){
  currentTrack=key;
  $('audioStatus').textContent='';
  const swap=++trackSwap;
  const begin=()=>{
    if(swap!==trackSwap)return;
    audio.src=url;audio.title=title;audio.loop=false;
    musicFade=fade?0:1;updateMusicLevel();startMusic();
    if(fade)fadeMusic(1,900);
  };
  // A playing track fades out before the next one starts.
  if(fade&&audio.src&&!audio.paused)fadeMusic(0,420,begin);else begin();
}
function playTrack(index){
  const [title,,url]=archive.music[index];
  setMusicTrack(index,url,title);
}
function nextTrack(fade){
  if(!$('musicOn').checked||!$('stageMusic').checked)return;
  const pool=(musicScenes[musicScene]||fieldMusic).filter(key=>!missingTracks.has(key));
  const available=pool.length>1?pool.filter(key=>key!==currentTrack):pool;
  const key=available[Math.floor(Math.random()*available.length)];
  if(key)setMusicTrack(key,'art/cept-'+key+'.mp3',key.startsWith('battle')?'전투 배경음악':'지도 배경음악',fade);
}
function syncStageMusic(){
  if(!$('musicOn').checked||!$('stageMusic').checked||!s)return;
  const scene=s.phase==='over'?'over':s.battle?'battle':'field';
  if(musicScene===scene&&audio.src)return;
  const previous=musicScene;musicScene=scene;
  if(scene==='battle'&&previous)playEffect('battleStart');
  nextTrack(!!previous);
}
audio.addEventListener('ended',()=>nextTrack(false));
audio.addEventListener('error',()=>{
  if(typeof currentTrack!=='string'||missingTracks.has(currentTrack))return;
  missingTracks.add(currentTrack);nextTrack(false);
});
$('stageMusic').onchange=()=>{saveAudioSettings();musicScene=null;if($('stageMusic').checked)syncStageMusic();};
