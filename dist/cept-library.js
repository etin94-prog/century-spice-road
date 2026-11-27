const archive=CepterArchive;
const cardIndex=new Map(C.cards.flatMap((c,id)=>c.catalog?[[c.catalog.path,id]]:[]));
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
  const modernEdition={'3ds':'CULDCEPT 3DS · 2012',saga:'CULDCEPT SAGA',revolt:'CULDCEPT REVOLT',begins:'CULDCEPT BEGINS'}[C.edition];
  document.querySelector('.intro [lang=en]').textContent=modernEdition||(C.edition==='dc'?'CULDCEPT SECOND':'CULDCEPT');
  const profile={dc:'2nd',saturn:'1st',ps1:'1ex'}[C.edition];
  const references=el('details');references.append(el('summary','판본 자료'));
  const list=el('p');
  if(C.edition==='3ds'){
    const ref=CepterEditions.handheldRefs,maps=CepterEditions.handheldMaps;
    list.append(sourceLink(ref.cards,'2012 카드 도감'),' · ',sourceLink(ref.maps,'2012 지도 목록'),' · ',
      sourceLink(ref.rules,'공식 매뉴얼'),' · ',sourceLink(ref.decks,'공개 플레이어 북'));
    const archive=el('details');archive.append(el('summary','원작 지도 수치 · '+maps.length+'개'));
    const pick=el('select');pick.setAttribute('aria-label','2012 지도 자료');
    pick.append(...maps.map((m,i)=>new Option(m.name,i)));
    const values=el('p'),show=()=>{
      const m=maps[+pick.value];
      const sections={story:'스토리',arena:'대전',download:'다운로드'};
      values.textContent=[sections[m.section],m.tiles?m.tiles+'칸':null,m.areas?m.areas+'지역':null,
        m.die?'최대 주사위 '+m.die:null,m.goal?'목표 '+m.goal+'G':null,
        m.start!=null?'시작 '+m.start+'G':null,m.lap!=null?'주회 '+m.lap+'G':null,
        m.forts?'요새 '+m.forts+' · '+m.fortBonus+'G':null].filter(Boolean).join(' · ');
    };
    pick.onchange=show;show();archive.append(pick,values);references.append(list,archive,handheldBookArchive());
  }else if(modernEdition){
    const source='https://culdcept.club/maps/'+C.edition+'/';
    list.append(sourceLink('https://culdceptcentral.com/culdcept-'+C.edition,'판본별 카드 목록'),' · ',sourceLink(source+'table?limit=all','지도 목록'));
    const entries=CepterModernMapArchive[C.edition],sections={story:'스토리',arena:'대전',download:'다운로드',memory:'추가 지도',tutorial:'튜토리얼'};
    const playable=new Map(Object.entries(C.maps).filter(([,m])=>m.source).map(([id,m])=>[m.source,id]));
    const archive=el('details');archive.append(el('summary','원작 지도 자료 · '+entries.length+'개'));
    const pick=el('select');pick.setAttribute('aria-label','원작 지도 자료');
    for(const [section,label] of Object.entries(sections)){
      const group=el('optgroup');group.label=label;
      entries.forEach(([path,name],index)=>{
        if(path.split('/')[0]===section)group.append(new Option(name,index));
      });
      if(group.children.length)pick.append(group);
    }
    const values=el('p');values.setAttribute('aria-live','polite');
    const selectMap=btn('대전 지도로 선택',()=>{
      const [path]=entries[+pick.value];
      const id=playable.get(source+path);
      if(!id)return;
      stageSelect.value=id;
      stageSelect.dispatchEvent(new Event('change',{bubbles:true}));
      stageSelect.focus();
    });
    const show=()=>{
      const [path,,lands,elements,facilities]=entries[+pick.value];
      const supported=playable.has(source+path);
      values.replaceChildren([
        supported?'대전 가능':'자료 열람',lands+'개 영지',elements,facilities||'등록 시설 없음'
      ].filter(Boolean).join(' · '),' · ',sourceLink(source+path,'지도 원문'));
      selectMap.hidden=!supported;
    };
    pick.onchange=show;show();archive.append(pick,values,selectMap);references.append(list,archive);
    if(C.edition==='begins')references.append(editionBookArchive(CepterBeginsPlayerBooks,
      '공개 덱 자료','비긴즈 공개 덱 자료','https://www.culdceptcentral.com/culdcept-begins/culdcept-begins-player-decks/','begins-book-archive'),
      editionComboArchive('비긴즈','begins','https://culdceptcentral.com/culdcept-begins/culdcept-begins-card-combos/culdcept-begins-in-battle-combos'));
    if(C.edition==='saga')references.append(editionBookArchive(CepterSagaPlayerBooks,
      '공개 덱 자료','사가 공개 덱 자료','https://www.culdceptcentral.com/culdcept-saga/culdcept-saga-player-decks/','saga-book-archive'),
      editionComboArchive('사가','saga','https://www.culdceptcentral.com/culdcept-saga/culdcept-saga-card-combos/culdcept-saga-in-battle-combos'));
    if(C.edition==='revolt')references.append(editionBookArchive(CepterRevoltBookArchive,
      '스토리 북 자료','리볼트 스토리 북 자료','https://www.culdceptcentral.com/culdcept-revolt/culdcept-revolt-ai-decks/','revolt-book-archive'),
      editionComboArchive('리볼트','revolt','https://www.culdceptcentral.com/culdcept-revolt/culdcept-revolt-combos/culdcept-revolt-in-battle-combos'));
  }else{
    list.append(sourceLink('https://card.culdcept.net/'+profile+'/','판본별 카드 목록'),' · ',sourceLink('https://culdcept.club/maps/'+profile+'/table','지도 목록'));
    if(C.edition!=='dc')list.append(' · ',sourceLink('https://drgs.app/culdceptex/scenario.html','초기 북·시나리오 공략'));
    else list.append(' · ',sourceLink('https://culdceptcentral.com/culdcept-ps2dc/culdcept-ps2dc-guides/706-cps2-guides-dcfaq','DC판 공략'));
    references.append(list);
  }
  $('config').before(references);
  $('alliance').options[0].textContent='개인전';
}
const stageFeatureLabels={'Temple':'신전','Shrine':'성소','Fortune-Teller':'점술관','Fortune Teller':'점술관','Card Shop':'카드 상점','none':'없음'};
function showStage(){
  const m=C.maps[stageSelect.value],preview=$('stagePreview');
  $('target').querySelector('[value="0"]').textContent=(m.storyGoal?'스토리 목표 · ':'기본 목표 · ')+(m.storyGoal||m.defaultGoal||5000)+'G';
  if(m.graph){
    preview.hidden=false;preview.querySelector('img').hidden=true;
    const unlinked=m.types.filter((type,index)=>['전송진','강제 전송진'].includes(type)&&m.transit?.[index]==null).length;
    const warning=unlinked?' · 목적지 미설정 전송진 '+unlinked+'곳':'';
    const caption=preview.querySelector('figcaption');
    caption.textContent=m.types.length+'칸 · '+m.areaCount+'지역 · 요새 '+m.forts.length+'곳'+warning;
    if(C.edition==='3ds')caption.append(' · 단일 주사위 1–'+m.die+' · 시작 '+m.startCash+'G');
    if(m.source)caption.append(' · ',sourceLink(m.source,'지도 참고 자료'));
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
const comboCards=paths=>paths.map(path=>C.cards[cardIndex.get(path)]?.catalog.name||path);
const pathByName=new Map([...cardIndex.keys()].map(path=>[path.split('/').pop(),path]));
function comboLabel(i,recipe=C.combo.recipes[i]){return recipe.map(group=>group.length>4?'조건에 맞는 크리처 ('+group.length+'종)':comboCards(group.map(n=>pathByName.get(n))).join(' 또는 ')).join(' + ');}
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
function useArchiveBook(book){
  customBook=book;const choice=$('bookChoice');choice.lastElementChild.disabled=false;choice.value='custom';
  try{localStorage.setItem(bookKey,JSON.stringify(book));}catch{}
  bookEditor();refreshMatchup();lobby();$('config').scrollIntoView({block:'center'});
}
function handheldBookArchive(){
  const starters={handheldStarterFireEarth:'844-c3ds-playerdecks-starterrg',handheldStarterWaterAir:'845-c3ds-playerdecks-starterby',
    handheldStarterFireAir:'846-c3ds-playerdecks-starterry',handheldStarterWaterEarth:'847-c3ds-playerdecks-starterbg'};
  const opening=Object.entries(starters).map(([key,source])=>{
    const counts={};
    for(const id of C.presets[key]){
      const slug=C.combo.key(C.cards[id]);counts[slug]=(counts[slug]||0)+1;
    }
    return ['초기 덱',modernBookNames[key],source,counts];
  });
  return editionBookArchive([...opening,...Cepter2012PlayerBooks],'공개 덱 자료','2012 공개 덱 자료',CepterEditions.handheldRefs.decks+'/','handheld-book-archive');
}
function editionBookArchive(entries,title,selectLabel,sourceBase,archiveClass){
  const paths=new Map(C.cards.flatMap(c=>c.catalog&&!c.unlisted?[[C.combo.key(c),c.catalog.path]]:[]));
  const archive=el('details',null,archiveClass+' revolt-library-panel');
  archive.append(el('summary',title+' · '+entries.length+'개'));
  const pick=el('select');pick.setAttribute('aria-label',selectLabel);
  const filter=C.edition==='saga'?el('input'):null;
  if(filter){
    filter.type='search';filter.placeholder='덱 이름 또는 작성자';
    filter.setAttribute('aria-label','사가 공개 덱 검색');
    archive.append(filter);
  }
  function populate(){
    const prior=pick.value,query=filter?.value.trim().toLowerCase()||'';
    pick.replaceChildren();
    const groups=new Map();
    entries.forEach(([character,name],i)=>{
      if(query&&!(character+' '+name).toLowerCase().includes(query))return;
      if(!groups.has(character)){
        const group=el('optgroup');group.label=character;
        groups.set(character,group);pick.append(group);
      }
      groups.get(character).append(new Option(name,i));
    });
    if([...pick.options].some(option=>option.value===prior))pick.value=prior;
    pick.disabled=!pick.options.length;
  }
  populate();
  const summary=el('p');summary.setAttribute('aria-live','polite');
  const link=el('p'),grid=el('div',null,'archive-cards');
  let selected=[];
  const use=btn('대전용 북으로 선택',()=>{
    useArchiveBook(selected);
    $('bookChoice').focus({preventScroll:true});
  });
  const update=()=>{
    if(pick.disabled){
      selected=[];summary.textContent='검색 결과가 없습니다.';use.hidden=true;
      link.replaceChildren();grid.replaceChildren();return;
    }
    const [character,name,source,recipe]=entries[+pick.value];
    const counts=Object.entries(recipe).map(([slug,n])=>[paths.get(slug),n]);
    selected=counts.flatMap(([path,n])=>Array(n).fill(cardIndex.get(path)));
    const ready=selected.filter(id=>C.cards[id]&&!C.cards[id].catalogOnly&&!C.cards[id].generatedOnly).length;
    const valid=C.validBook(selected);
    const status=valid?'대전 가능':selected.length!==C.bookSize?'원문 수량 확인 필요':'미지원 카드 포함';
    summary.textContent=character+' · '+name+' · '+selected.length+'장 · 대전 지원 '+ready+'장 · '+status;
    link.replaceChildren(sourceLink(sourceBase+source,'북 구성 원문'));
    grid.replaceChildren(...counts.map(([path,n])=>archiveCard(path,n)));
    use.hidden=!valid;
  };
  pick.onchange=update;
  if(filter)filter.oninput=()=>{populate();update();};
  archive.addEventListener('toggle',()=>{if(archive.open&&!summary.textContent)update();});
  archive.append(pick,summary,use,link,grid);
  return archive;
}
function editionComboArchive(label,edition,source){
  const recipes=C.battleCombos,archive=el('details',null,edition+'-combo-archive revolt-library-panel');
  archive.append(el('summary','전투 콤보 · '+recipes.length+'개'));
  const picker=el('select');picker.setAttribute('aria-label',label+' 전투 콤보');
  const hint=el('p'),grid=el('div',null,'archive-cards');
  hint.setAttribute('aria-live','polite');
  const choose=btn('콤보 연습 북으로 선택',()=>{
    const select=$('bookChoice');
    select.value='combo-'+picker.value;
    refreshMatchup();lobby();$('config').scrollIntoView({block:'center'});
    select.focus({preventScroll:true});
  });
  const update=()=>{
    const {groups,hint:text}=recipes[Number(picker.value)];
    hint.textContent=text;
    grid.replaceChildren(...groups.flatMap(group=>group.slice(0,4)).map(n=>archiveCard(pathByName.get(n))));
  };
  picker.onchange=update;
  archive.addEventListener('toggle',()=>{
    if(!archive.open||picker.options.length)return;
    picker.append(...recipes.map(({groups},i)=>new Option(comboLabel(i,groups),i)));
    update();
  });
  archive.append(picker,hint,choose,grid,sourceLink(source,'전투 콤보 참고 자료'));
  return archive;
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
    if(C.validBook(book))detail.append(btn('이 북으로 대국 설정',()=>useArchiveBook(book)));
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
  if(C.battleCombos){
    const held=new Set(hand.map(id=>C.combo.key(C.cards[id])));
    const combos=C.battleCombos.filter(({groups})=>groups.every(group=>group.some(n=>held.has(n))));
    if(!combos.length)return;
    const details=el('details');details.append(el('summary','손패에 모인 콤보 '+combos.length+'개'));
    for(const {groups,hint} of combos)details.append(el('p',comboLabel(0,groups.map(group=>group.filter(n=>held.has(n))))+' · '+hint));
    container.append(details);return;
  }
  if(C.presets.stronghold||C.edition==="saturn"||C.edition==="ps1")return;
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
