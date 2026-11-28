
'use strict';
const $=k=>document.getElementById(k);
const C=Cepter,colors=['#fa9c80','#85c9ff','#e3c367','#a9d6a4'],storage='cept-local-v1'+(C.edition==='ps2'?'':'-'+C.edition);
if(C.edition==='revolt'){
  const rules=document.querySelectorAll('#matchRules p');
  rules[0].textContent='턴 시작에 마력을 받고 카드 한 장을 뽑습니다. 주문 한 장이나 크리처 비술 하나를 쓴 뒤 주사위를 굴립니다. 손패가 6장을 넘으면 턴이 끝날 때 버립니다.';
  rules[1].textContent='지나가지 않은 내 영지에도 명령할 수 있습니다. 소환하거나 명령한 크리처는 피로해집니다. 게이트에 멈추거나 한 주를 완주하면 내 크리처의 피로가 풀립니다.';
  document.querySelector('#matchRules').append(Object.assign(document.createElement('p'),{textContent:'동맹에서는 피로하지 않은 아군 영지에 명령할 수 있습니다. 팀당 에보 카드 2장까지 출전하며, 초과분은 기본 크리처로 교체됩니다.'}));
  rules[2].textContent='방향이 다른 게이트를 모두 지나면 한 주를 완주합니다. 총마력이 목표에 도달한 뒤 어느 게이트든 지나면 승리합니다.';
}
if(C.edition==='3ds'){
  const rules=document.querySelector('#matchRules');
  rules.append(Object.assign(document.createElement('p'),{textContent:'2대2 동맹전에서는 아군 영지의 레벨을 올리거나 크리처를 교체·이동할 수 있습니다. 아군 영지로는 침략할 수 없으며 아군 크리처로 적 영지를 침략할 때는 그 크리처의 주인이 장비를 고릅니다.'}));
}
$('editionChoice').value=C.edition;$('editionChoice').onchange=e=>location.assign(location.pathname+'?edition='+e.target.value);
const labels={secretArt:'비술',secretLand:'대상 영지',secretPlayer:'대상 셉터',secretCancel:'선택 취소',circleCast:'마법진 주문',circleSkip:'주문 없이 계속',buyGem:'속성석 매수',sellGem:'속성석 매도',stealGem:'상대 보유분 매입',leaveGem:'거래 건너뛰기',switchKeep:'방향 유지',switchFlip:'방향 변경',towerAim:'사령탑 사용',towerTo:'목표 영지',towerCancel:'뒤로',wormDiscard:'파괴할 손패',suppressCard:'모두 제거할 주문',sacrifice:'추가 비용으로 버릴 카드',ability:'영지 능력',abilityPlayer:'대상 셉터',abilityLand:'대상 영지',teleTo:'이동할 영지',eraseDraw:'파괴할 북 위치',comboArea:'효과 적용 지역',totem:'토템을 바쳐 마력 획득',plagueArea:'독을 부여할 지역',fortuneDraw:'카드 종류 선택',route:'갈림길 선택',leaveTemple:'거래 종료',buySymbol:'호부 매수',sellSymbol:'호부 매도',liquidate:'호부 처분',targetPlayer:'대상 셉터',targetLand:'대상 영지',breakCard:'파괴할 카드',fizzle:'대상 없음',cast:'주문 사용',roll:'주사위 굴리기',direction:'이동 방향',summon:'크리처 소환',invade:'영지 침략',pay:'통행료 지불',level:'영지 레벨업',element:'속성 변경',exchange:'크리처 교체',transfer:'크리처 이동',pass:'행동 마치기',bare:'아이템 없이 전투',equip:'아이템 사용',continue:'전투 결과 확인',sell:'영지 처분',discard:'카드 버리기'};
const hints={secretTarget:'지도에서 비술을 적용할 영지를 누르세요.',spellCircle:'제시된 주문 중 한 장을 비용 없이 사용할 수 있습니다.',gemStore:'속성석을 거래하거나 이동을 계속하세요.',pathSwitch:'분기 스위치의 방향을 유지하거나 바꾸세요.',towerTarget:'지도에서 빈 영지나 침략할 적 영지를 누르세요.',towerDeploy:'하단 손패에서 사용할 크리처를 고르세요.',bookWorm:'북 웜으로 파괴할 상대 손패를 선택하세요.',squeeze:'파괴할 손패 한 장을 선택하세요. 그 셉터는 150G를 받습니다.',suppression:'대상 손패에서 제거할 주문을 선택하세요.',sacrifice:'추가 비용으로 버릴 카드를 선택하세요.',territoryTarget:'영지 능력의 대상을 선택하세요.',teleMove:'이동할 칸을 선택하세요.',mindseeker:'북 맨 위에서 몇 번째 카드를 파괴할지 선택하세요.',fortune:'북에서 뽑을 카드의 종류를 선택하세요.',fork:'지도에서 이동할 방향의 화살표를 누르세요.',temple:'지역과 속성을 골라 호부를 거래하거나 지나가세요.',spellTarget:'주문을 적용할 대상을 고르세요.',shatter:'선택한 셉터의 아이템이나 주문 한 장을 파괴하세요.',spell:'주문을 한 장 쓰거나 주사위를 굴리세요.',roll:'주문 효과가 준비됐습니다. 주사위를 굴리세요.',direction:'지도에서 출발할 방향의 화살표를 누르세요.',land:'도착한 칸의 행동 또는 영지 명령을 선택하세요.',attack:'침략자가 사용할 아이템을 고르세요.',defend:'방어자가 사용할 아이템을 고르세요.',result:'전투 결과를 확인하세요.',sell:'통행료를 충당할 영지를 선택하세요.',discard:'손패가 6장이 될 때까지 버릴 카드를 고르세요.'};
Object.assign(labels,C.spellActions);Object.assign(hints,C.spellHints);
if(C.edition==='revolt')hints.spell='주문이나 크리처 비술을 쓰거나 주사위를 굴리세요.';
labels.shrineChoice='성소 효과 선택';hints.shrineChoice='성소에서 받을 효과를 고르세요.';
let room=null,customBook=null,draft=[],draftEvos=[],s=null,pending=false,timer,focusCard=-1,inspect=-1;
labels.leaveShop='구매하지 않고 나가기';
hints.shop='이 상점에서 카드 한 장을 살 수 있습니다. 카드를 고르면 효과와 구매 후 잔액을 볼 수 있습니다.';
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function btn(text,fn,cls){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
function save(){
  if(room)return;
  try{localStorage.setItem(storage,JSON.stringify(s));}
  catch{
    try{
      const {replay,...match}=s;localStorage.setItem(storage,JSON.stringify(match));
      $('notice').textContent='저장 공간이 부족해 대국만 저장했습니다. 리플레이는 결과 화면에서 파일로 저장할 수 있습니다.';
    }catch{$('notice').textContent='저장 공간을 사용할 수 없어 이번 대국은 현재 창에서만 진행됩니다.';}
  }
}
try{const raw=localStorage.getItem(storage);if(raw){const v=JSON.parse(raw);if(v.version===1&&[2,3,4].includes(v.players.length)&&C.board(v)?.types.length===v.tiles.length&&(v.phase==='over'||C.choices(v).length))s=v;else throw Error();}}catch{$('notice').textContent='저장한 대국을 읽을 수 없습니다.';}
function seats(){
  const count=+$('count').value,humans=$('humans'),prior=+humans.value||1;
  humans.replaceChildren();
  for(let i=1;i<=count;i++)humans.add(new Option(i+'명 · AI '+(count-i)+'명',i));
  humans.value=Math.min(prior,count);
  const alliance=$('alliance');
  for(const option of alliance.querySelectorAll('[value^="teams"]'))option.disabled=count!==4;
  if(count!==4&&alliance.value.startsWith('teams'))alliance.value='auto';
  updateSeatBooks();
}
const modernBookNames=C.edition==='3ds'?
  {intro:'지속성 영지 확장 북',fire:'설욕·이동 침략 북',stronghold:'수속성 방어·견제 북',
    handheldStarterFireEarth:'화·지 초기 북',handheldStarterWaterAir:'수·풍 초기 북',handheldStarterFireAir:'화·풍 초기 북',handheldStarterWaterEarth:'수·지 초기 북',
    ...Object.fromEntries(Cepter2012PlayerBooks.map(([group,name,source])=>['handheld-'+source,group+' · '+name]))}:
  {intro:'균형 북',fire:'공격 북',stronghold:'방어 북',...(C.edition==='revolt'?{revoltAliciaEntry:'알리시아 · 입단 시험',revoltGenSerious:'겐 · 진심',revoltYumaFellowship:'유마 · 동료',revoltYumaResolve:'유마 · 결의',revoltYumaBonds:'유마 · 유대',revoltSomniaSerenity:'솜니아 · 평온',revoltTenetBelief:'테넷 · 신념',revoltTenetPraise:'테넷 · 찬사',revoltAliciaFreedom:'알리시아 · 자유',revoltTenetPoverty:'테넷 · 빈곤',revoltGoliganServant:'골리건 · 시종',revoltZenethPower:'제네스 · 힘',revoltYumaLove:'유마 · 사랑',revoltHypnaPetrify:'히프나 · 석화',revoltMoriAnnoying:'모리 · 교란',revoltSomniaScripture:'솜니아 · 경전',revoltMoriCrazy:'모리 · 광기',revoltHypnaBewitch:'히프나 · 현혹',revoltTerrormireFireClaw:'테러마이어 · 화염 발톱',revoltGoliganSuppression:'골리건 · 제압',revoltTerrormireFireStorm:'테러마이어 · 화염 폭풍',revoltMemenLame:'메멘 · 시시한 속임수',revoltZenethInvasion:'제네스 · 침략',revoltKranissResurrection:'크라니스 · 부활'}:{}),...(C.edition==='begins'?{beginsArtAssault:'금술 침략 북',beginsTidalGuard:'수·지 수비 북',beginsStarterFireEarth:'카무르 · 화·지 초기 북',beginsStarterWaterAir:'카무르 · 수·풍 초기 북',beginsVeramiSeaWind:'베라미 · 바다에 부는 바람',beginsIsharaFirst:'이샤라 · 선착',beginsGanzBeast:'간츠 · 야수의 힘',beginsGanzInstinct:'간츠 · 야생의 본능',beginsGanzGiantBeasts:'간츠 · 거대 야수의 습격',beginsTindalosFreeWind:'틴달로스 · 자유롭게 부는 바람',beginsNajaranMistral:'나자란 · 미스트랄 비긴즈',beginsPopoloDragon:'포포로 · 강한 드래곤',beginsSteamdrillPierce:'스팀드릴 · 삼중 관통',
    ...Object.fromEntries(CepterBeginsPlayerBooks.map(([author,name,source])=>['begins-'+source,author+' · '+name]))}:{}),...(C.edition==='saga'?{sagaStarterWater:'수·풍 초기 북',sagaStarterFire:'화·지 초기 북',sagaRilaraPlunder:'리라라 · 약탈',sagaRilaraRobbery:'리라라 · 습격',
    sagaGottliebKill:'고틀리프 · 섬멸',sagaGottliebSlaves:'고틀리프 · 포로',
    sagaBorivalFire:'보리발 · 화염',sagaZenethDragon:'제네스 · 용의 눈',
    sagaTicomunKill:'티코문 · 처단',sagaTicomunChallenge:'티코문 · 결투',sagaRilaraExploit:'리라라 · 강탈',sagaBorivalHellFire:'보리발 · 지옥불',sagaRilaraConspire:'리라라 · 모략',sagaRilaraFierce:'리라라 · 맹공',sagaKoenigStar:'쾨니히 · STAR',sagaTraderMoney:'상인 · MONEY!',sagaGuilderTwins:'길더와 루블 · 쌍둥이',sagaImmediate:'즉시·연속 주문 북',sagaAffinity:'화·지 조건 주문 북',
    ...Object.fromEntries(CepterSagaPlayerBooks.map(([author,name,source,,variant])=>['saga-'+source+variant,author+' · '+name]))}:{})};
if(C.edition==='revolt')for(const [character,name,source] of CepterRevoltBookArchive){
  const id='revolt-'+source;
  if(C.presets[id])modernBookNames[id]=character+' · '+name;
}
function addOpeningBookOptions(select){
  select.add(new Option('방장과 같은 북','host'));
  for(const [key,template] of Object.entries(C.presets)){
    if(C.validBook(template))select.add(new Option(C.presets.stronghold?modernBookNames[key]:key==='intro'?'기본 북':key==='fire'?'화·지 북':key,key));
  }
  if(customBook)select.add(new Option('이 기기의 저장 북','custom'));
}
const openingBook=key=>key==='custom'?customBook:C.presets[key];
function updateSeatBooks(){
  const fields=$('localSeatBookFields'),previous=[...fields.querySelectorAll('select')].map(select=>select.value);
  const humans=+$('humans').value;
  $('localSeatBooks').hidden=humans<2;
  fields.replaceChildren();
  for(let seat=1;seat<humans;seat++){
    const label=el('label',(seat+1)+'번 좌석'),select=el('select');
    addOpeningBookOptions(select);select.value=previous[seat-1]||'host';
    label.append(select);fields.append(label);
  }
}
let seenMove=0,activeWalk=null;
function resetScroll(){document.querySelector('main').scrollTop=0;window.scrollTo(0,0);}
function setMatchChrome(active){
  const screenButtons=['full','wide','setup'].map($);
  (active?$('matchScreenControls'):$('lobbyScreenControls')).append(...screenButtons);
  const sound=$('openSound');
  (active?$('matchSound'):$('lobbyScreenControls')).append(sound);
  sound.textContent=active?'♪':'소리';
  sound.setAttribute('aria-label','소리');
  $('siteHeader').hidden=active;
  $('libraryHome').hidden=active;
  $('matchMenu').open=false;
}
function setupMatchInfo(){
  const menu=$('matchMenu'),dialog=$('matchInfo'),body=$('matchInfoBody');
  for(const button of menu.querySelectorAll('[data-match-info]')){
    button.onclick=()=>{
      const panel=$(button.dataset.matchInfo),previous=panel.parentElement,wasOpen=panel.open;
      $('matchInfoTitle').textContent=panel.querySelector('summary').textContent;
      menu.open=false;panel.open=true;body.append(panel);
      dialog.addEventListener('close',()=>{
        previous.append(panel);panel.open=wasOpen;menu.querySelector('summary').focus();
      },{once:true});
      dialog.showModal();
    };
  }
  $('closeMatchInfo').onclick=()=>dialog.close();
}
setupMatchInfo();
// The action menu opens beside the active cepter. The choice to fold it lasts for the current decision.
const actionMenu=$('buttons').closest('aside'),actionToggle=$('matchActionsToggle');
let menuState={game:null,key:'',open:false};
function setActionMenu(open){
  menuState.open=open;
  actionToggle.setAttribute('aria-expanded',String(open));
  actionToggle.setAttribute('aria-label',open?'행동 메뉴 접기':'행동 메뉴 열기');
  focusMapTile(cameraTile);
}
actionToggle.onclick=()=>setActionMenu(actionToggle.getAttribute('aria-expanded')!=='true');
function lobby(){
  cancelMapEffect();stopWalk();
  if(room){location.assign(location.pathname+(C.edition==='ps2'?'':'?edition='+C.edition));return;}
  clearTimeout(timer);$('lobby').hidden=false;$('game').hidden=true;$('setup').hidden=true;setMatchChrome(false);
  $('resume').hidden=!s;$('resume').textContent=s?.phase==='over'?'저장한 대국 결과':'저장한 대국 계속';
  resetScroll();
}
function handoff(){return !room&&s.phase!=='over'&&!C.isComputer(s,C.actor(s))&&s.players.filter(p=>!p.ai).length>1;}
function enter(){
  seenActionSound=s.actionSound?.sequence||0;cancelMapEffect();seenMapEffect=s.mapEffect?.sequence||0;stopWalk();
  seenMove=s.lastMove?.sequence||0;pending=handoff();focusCard=inspect=-1;
  $('lobby').hidden=true;$('game').hidden=false;$('setup').hidden=false;setMatchChrome(true);
  if(!room&&!pending&&C.armClock(s))save();
  render();resetScroll();
}
function matchOptions(){
  return {inputSeconds:+$('inputLimit').value,suddenDeath:$('suddenDeath').checked,recordReplay:true};
}
const roundLimit=$('roundLimit'),suddenDeathField=$('suddenDeath');
if(C.edition==='begins'){
  roundLimit.add(new Option('25','25'),[...roundLimit.options].find(option=>+option.value===30));
  suddenDeathField.closest('label').lastChild.textContent=' 서든데스 · 목표 절반 도달 후 마력 고갈 시 종료';
}else{
  roundLimit.addEventListener('change',()=>{suddenDeathField.disabled=+roundLimit.value===0;});
  suddenDeathField.disabled=true;
}
$('count').onchange=seats;$('setup').onclick=lobby;$('resume').onclick=enter;
$('humans').addEventListener('change',updateSeatBooks);
$('localSeatBooks').addEventListener('toggle',()=>{if($('localSeatBooks').open)updateSeatBooks();});
$('config').onsubmit=e=>{
  e.preventDefault();
  if(s&&s.phase!=='over'&&!confirm('진행 중인 대국을 새 대국으로 바꿀까요?'))return;
  s=C.start(+$('count').value,+$('humans').value,+$('target').value,$('mapChoice').value,chosenBook(),chosenAiBook(),selectedAiLevel(),$('alliance').value,+$('roundLimit').value);
  [...$('localSeatBookFields').querySelectorAll('select')].forEach((select,i)=>{
    const book=openingBook(select.value);if(book)C.setOpeningBook(s,i+1,book);
  });
  C.configureMatch(s,matchOptions());
  save();enter();
};
const handPanel=$('handPanel');
try{handPanel.open=localStorage.getItem('cept-hand-open')==='1';}catch{}
handPanel.addEventListener('toggle',()=>{
  try{localStorage.setItem('cept-hand-open',handPanel.open?'1':'0');}catch{}
  $('seats').querySelector('[aria-controls=handPanel]')?.setAttribute('aria-expanded',String(handPanel.open));
  if(!handPanel.open&&$('detail').classList.contains('card-popup'))closeCardPopup();
  if(s&&!s.battle&&!$('game').hidden)focusMapTile(cameraTile);
});
$('hand').addEventListener('scroll',()=>placeCardPopup(),{passive:true});
seats();lobby();
function act(a){
  if(room){roomAction(a);return;}
  localAction(a,false);
}
function localAction(a,timedOut){
  const before=C.actor(s),reading=C.isComputer(s,before)?s.players.find(p=>!p.ai):null,card=reading?.hand[focusCard];
  if(!(timedOut?C.expire(s):C.play(s,a)))return;
  if(timedOut)document.querySelector('#turnPicker[open]')?.close();
  pending=before!==C.actor(s)&&handoff();inspect=-1;
  if(pending)delete s.deadlineAt;
  if(pending||card==null||reading.hand[focusCard]!==card)focusCard=-1;
  save();render();
}
const inputClock=el('span',null,'input-clock');
inputClock.hidden=true;$('round').after(inputClock);
function tickInputClock(){
  const deadline=s?.deadlineAt,active=deadline&&!$('game').hidden&&!pending&&s.phase!=='over';
  inputClock.hidden=!active;
  if(!active)return;
  const left=Math.max(0,Math.min(s.inputSeconds||Infinity,Math.ceil((deadline-Date.now()-(room?.clockOffset||0))/1000)));
  inputClock.textContent=left?'입력 '+left+'초':'시간 초과';
  inputClock.classList.toggle('urgent',left<=5);
  if(!left&&!room)localAction(null,true);
}
setInterval(tickInputClock,250);
function selectedAiLevel(){return $('tierChoice').value==='same'?0:Number($('tierChoice').value)+1;}
function tierBooks(){
  if(C.presets.stronghold){
    // 3DS defaults use 6,048 holdout matches with rotated duel and alliance seats.
    // Begins uses 9,216 seeded four-seat matches. Revolt uses 27,648 across both deck roles.
    const order=C.edition==='3ds'?['intro','handheldStarterFireEarth','handheldStarterWaterAir']:C.edition==='begins'?['beginsStarterFireEarth','beginsGanzBeast','beginsGanzGiantBeasts']:
      C.edition==='revolt'?['revoltZenethPower','revoltYumaFellowship','revoltAliciaFreedom']:C.edition==='saga'&&C.presets.sagaAffinity&&C.presets.sagaImmediate?
      ['intro','sagaImmediate','sagaAffinity']:['intro','fire','stronghold'];
    const level=Number($('tierChoice').value),preferred=order[level];
    const key=C.presets[preferred]?preferred:'intro';
    const playerOrder=C.edition==='begins'?['beginsStarterWaterAir','beginsIsharaFirst','intro']:
      C.edition==='revolt'?['stronghold','fire','intro']:[];
    const playerKey=playerOrder[level]||'intro';
    return {name:modernBookNames[key],deck:C.presets[key],practice:true,
      player:{name:modernBookNames[playerKey],deck:C.presets[playerKey],practice:true}};
  }
  if(C.edition!=='ps2'){
    const player={name:'화·지 기반 북',deck:C.presets.fire,practice:true};
    return {name:'수·풍 기반 북',deck:C.presets.intro,practice:true,player};
  }
  const tier=CepterTierBooks[Number($('tierChoice').value)||0];
  if(typeof sourceBook!=='function')return tier;
  const find=b=>adaptedBooks.find(v=>v.name===b.name)||b;
  return {...tier,...find(tier),player:find(tier.player)};
}
function storyCastSelected(){return $('count').value==='4'&&!!C.storyAlliances[$('mapChoice').value]&&($('alliance').value==='teams'||$('alliance').value==='auto'&&$('target').value==='0')&&$('aiChoice').value==='tier'&&$('tierChoice').value!=='same';}
function chosenAiBook(){if(storyCastSelected())return $('mapChoice').value==='ps2-14'&&$('storyAlly').value==='leo'?'story-leo':'story';return $('tierChoice').value==='same'?chosenBook():(sourceBook($('aiChoice'))||tierBooks()).deck;}
function chosenBook(){if(/^(source|combo)-/.test($('bookChoice').value))return sourceBook($('bookChoice')).deck;if($('bookChoice').value==='recommend')return tierBooks().player.deck;return $('bookChoice').value==='custom'?customBook:C.presets[$('bookChoice').value];}
const bookKey='cept-book-v1'+(C.edition==='ps2'?'':'-'+C.edition);
let legacyBook=null;
try{
  const data=JSON.parse(localStorage.getItem(bookKey));
  if(C.validBook(data)){customBook=data;$('bookChoice').lastElementChild.disabled=false;}
  else if(C.validLegacyBook(data))legacyBook=data;
}catch{}
$('bookHelp').textContent='카드를 합계 '+C.bookSize+'장, 종류별 최대 4장까지 담으세요.'+(C.edition==='begins'?' E 등급은 같은 카드 한 장까지 담을 수 있습니다.':'');
const cardElements=c=>c.elements?.map(e=>C.elements[e]).join('·')||C.elements[c.element]||'무';
const catalogTypes={dual:'복합 속성',neutral:'무속성',fire:'화속성',water:'수속성',earth:'지속성',air:'풍속성',weapon:'무기',armor:'방어구',scroll:'두루마리',tool:'도구',sflash:'단일 즉시 주문',mflash:'복수 즉시 주문',senchant:'단일 지속 주문',menchant:'복수 지속 주문'};
function showCatalogCard(c,id){
  const entry=c.catalog;
  $('catalogName').textContent=entry&&entry.name!==c.name?c.name+' · '+entry.name:c.name;
  $('catalogArt').replaceChildren(cardSeal(id));
  $('catalogStats').textContent=entry?[c.elements?cardElements(c)+' 속성':catalogTypes[entry.category]||entry.category,entry.rarity,entry.stats].join(' · '):c.cost+'G';
  const ability=localAbility(c)||entry?.ability||stats(c);
  $('catalogAbility').textContent=c.catalogOnly?'도감 전용 · '+ability:ability;
  if(entry){
    const terms={R:'화 영지',B:'수 영지',G:'지 영지',Y:'풍 영지','+[]':'손패 1장',Fire:'화',Water:'수',Earth:'지',Air:'풍',Weapon:'무기',Armor:'방어구',Scroll:'두루마리',Tool:'도구'};
    const describe=v=>v.split(',').filter(Boolean).map(x=>terms[x]||x).join(' · ');
    const limits=[entry.additionalCost&&'소환 조건 '+describe(entry.additionalCost),entry.placement&&'배치 제한 '+describe(entry.placement),entry.equipment&&'장비 제한 '+describe(entry.equipment)].filter(Boolean);
    $('catalogStats').textContent=['No. '+entry.number,$('catalogStats').textContent,...limits].join(' · ');
  }
  if(entry?.source)$('catalogAbility').append(' · ',sourceLink(entry.source,'판본 원문'));
  $('cardDialog').showModal();
}
$('closeCard').onclick=()=>$('cardDialog').close();
function tallyBook(){
  const total=draft.reduce((a,b)=>a+b,0)+draftEvos.length;
  $('bookCount').textContent=total+' / '+C.bookSize+'장';$('storeBook').disabled=total!==C.bookSize||draft.some((count,id)=>count>C.copyLimit(C.cards[id]));
}
const cardsPerPage=24;
let bookPage=0;
function filterBook(page=0){
  const query=$('cardSearch').value.trim().toLowerCase(),scope=$('cardScope').value,kind=$('cardKind').value;
  const matches=[];
  C.cards.forEach((c,id)=>{
    if(c.unlisted||scope==='deck'&&!draft[id])return;
    if((scope==='original'&&!c.catalog)||(scope==='usable'&&(c.catalogOnly||c.generatedOnly))||(kind&&kind!==c.kind))return;
    if(![c.name,c.catalog?.name,c.catalog?.path].some(v=>v?.toLowerCase().includes(query)))return;
    matches.push(id);
  });
  bookPage=Math.max(0,Math.min(page,Math.ceil(matches.length/cardsPerPage)-1));
  const offset=bookPage*cardsPerPage;
  const rows=matches.slice(offset,offset+cardsPerPage).map(id=>{
    const c=C.cards[id];
    const row=el('div',null,'catalog-entry'),open=btn(c.name,()=>showCatalogCard(c,id),'catalog-open');
    const art=cardSeal(id);if(art.tagName==='IMG'){art.loading='lazy';art.alt='';}
    open.prepend(art);row.append(open);
    if(c.catalogOnly||c.generatedOnly){row.append(el('small',c.generatedOnly?'대전 중 생성':'도감 전용'));}
    else{
      const input=el('select');input.setAttribute('aria-label',c.name+' 수량');
      for(let i=0;i<=C.copyLimit(c);i++)input.add(new Option(i+'장',i));
      if(draft[id]>C.copyLimit(c)){const prior=new Option(draft[id]+'장 · 수량 줄이기',draft[id]);prior.disabled=true;input.add(prior);}
      input.value=draft[id];input.onchange=()=>{draft[id]=+input.value;tallyBook();if(scope==='deck'&&!draft[id])filterBook(bookPage);};row.append(input);
    }
    return row;
  });
  $('bookRows').replaceChildren(...rows);$('bookRows').scrollTop=0;
  $('cardResults').textContent=matches.length?matches.length+'종 중 '+(offset+1)+'–'+(offset+rows.length):'조건에 맞는 카드가 없습니다.';
  $('bookPages').hidden=matches.length<=cardsPerPage;
  $('prevCards').disabled=bookPage===0;$('nextCards').disabled=offset+rows.length>=matches.length;
}
function loadBookDraft(book){
  draft=C.cards.map((_,id)=>book.filter(n=>n===id).length);
  draftEvos=C.evo?book.filter(id=>C.cards[id]?.evo):[];
  if(C.evo)renderEvoEditor();
  filterBook();tallyBook();
}
$('cardSearch').onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
$('cardSearch').oninput=()=>filterBook();$('cardScope').onchange=()=>filterBook();$('cardKind').onchange=()=>filterBook();
$('prevCards').onclick=()=>filterBook(bookPage-1);$('nextCards').onclick=()=>filterBook(bookPage+1);
function bookEditor(){loadBookDraft(chosenBook());}
$('editor').ontoggle=()=>{if($('editor').open&&!draft.length)bookEditor();};
$('bookChoice').onchange=bookEditor;
const legacyBookButton=legacyBook?btn(legacyBook.length===50?'이전 50장 북 불러오기':'이전 저장 북 불러오기',()=>loadBookDraft(legacyBook)):null;
if(legacyBookButton)$('bookHelp').after(legacyBookButton);
$('storeBook').onclick=()=>{
  const book=[...draft.flatMap((n,id)=>Array(n).fill(id)),...draftEvos];if(!C.validBook(book))return;
  customBook=book;$('bookChoice').lastElementChild.disabled=false;$('bookChoice').value='custom';
  try{localStorage.setItem(bookKey,JSON.stringify(book));legacyBookButton?.remove();$('bookCount').textContent=C.bookSize+'장 · 북 저장 완료';}catch{$('bookCount').textContent='이번 창에서 사용할 북으로 설정했습니다.';}
};
function localAbility(c){
  if(c.kind==='spell')return describeCepterSpell(C,c);
  if(c.kind==='item')return describeCepterItem(C,c);
  return CepterCreatureText.describe(C,c);
}
function stats(c){
  if(c.kind!=='creature')return localAbility(c)||c.catalog?.ability||c.name;
  const equipment={weapon:'무기',armor:'방어구',scroll:'두루마리',tool:'도구'};
  const banned=c.ban?.map(v=>equipment[v]).filter(Boolean)||[];
  return [c.st+' ST / '+c.hp+' HP',c.landBan!=null?C.elements[c.landBan]+' 배치 불가':null,
    banned.length?banned.join('·')+' 장비 불가':null].filter(Boolean).join(' · ');
}
function opts(a,p){const [k,x,y]=a,c=C.cards[p.hand[x]];
  switch(k){
    case 'circleCast':return C.cards[x].name;
    case 'shrineChoice':return C.shrineNames[x];
    case 'soltisPower':return C.soltisOptions[x];
    case 'zeromnPower':return C.zeromnOptions[x];
    case 'intrusionCard':return C.cards[y].name;
    case 'foresightCard':case 'replaceCard':case 'mesmerCard':case 'stealCard':case 'forgeCard':case 'reformCard':case 'poisonBookCard':return C.cards[y].name;
    case 'clairvoyanceDone':case 'metamorphCard':return C.cards[y].name;
    case 'forfeitSymbol':{
      const qty=s.players[s.spellTarget].symbols[x];
      return symbolLabel(x)+' · '+qty+'장 → '+qty*s.prices[x]+'G';
    }
    case 'soltisArea':case 'comboArea':case 'plagueArea':return (x+1)+'지역';
    case 'prophecyKind':case 'fortuneDraw':return {creature:'크리처',item:'아이템',spell:'주문'}[x];
    case 'route':return (x+1)+'번 · '+(C.elements[s.tiles[x].type]||s.tiles[x].type);
    case 'targetLand':case 'secretLand':case 'abilityLand':case 'teleTo':case 'towerTo':{
      const tile=s.tiles[x],unit=tile.unit,board=C.board(s),gate=board.gateNames?.[board.gates[x]];
      if(gate)return (x+1)+'번 · '+gate;
      return (x+1)+'번 · '+(C.elements[tile.type]||tile.type)+' · '+(unit?C.cards[unit.id].name+' ('+(tile.owner+1)+'P)':'빈 영지');
    }
    case 'secretArt':{
      const unit=s.tiles[x].unit,card=C.cards[unit.id],art=C.secretArt(card,unit);
      return (x+1)+'번 · '+card.name+' · '+art.label+' · '+art.cost+'G';
    }
    case 'ability':case 'totem':return (x+1)+'번 · '+C.cards[s.tiles[x].unit.id].name;
    case 'eraseDraw':return '위에서 '+(x+1)+'번째'+(['saga','revolt'].includes(C.edition)&&p.peek?.ids[x]!=null?' · '+C.cards[p.peek.ids[x]].name:'');
    case 'sacrifice':return c.name;
    case 'secretPlayer':case 'abilityPlayer':case 'targetPlayer':return s.players[x].name;
    case 'wormDiscard':case 'suppressCard':case 'breakCard':return C.cards[s.players[s.spellTarget].hand[x]].name;
    case 'liquidate':case 'buySymbol':case 'sellSymbol':return symbolLabel(x)+' · '+y+'장 · '+s.prices[x]*y+'G';
    case 'direction':if(C.board(s).stage||C.board(s).graph){const exits=C.board(s).links[p.pos];return (1+(x===1?exits[0]:exits.at(-1)))+'번 칸 방향';}return x===1?'시계 방향':'반시계 방향';
    case 'cast':case 'equip':case 'discard':case 'summon':case 'invade':return c.name+' · '+C.price(p,c,s)+'G';
    case 'level':return (x+1)+'번 → Lv.'+y+' · '+C.levelCost(s.tiles[x],y,p)+'G';
    case 'exchange':return (x+1)+'번 · '+C.cards[p.hand[y]].name;
    case 'transfer':return (x+1)+'번 → '+(y+1)+'번';
    case 'element':return (x+1)+'번 → '+C.elements[y]+' · '+C.elementCost(s.tiles[x])+'G';
    case 'sell':return (x+1)+'번 · '+C.debtSaleValue(s,s.tiles[x])+'G';
    default:return labels[k];
  }
}
// StockAgent uses a 104px standing figure on its 360px battle stage.
const boardSizeObserver=new ResizeObserver(([entry])=>{
  const height=entry.contentRect.height;
  if(height>0)entry.target.parentElement.style.setProperty('--standing-height',(height*104/360)+'px');
});
boardSizeObserver.observe($('map'));
// Feet are points on the top diamond; all distances are fractions of the tile.
function pawnFoot(tileId,seat,occupants){
  const positions=[[],[[.5,.58]],[[.36,.50],[.64,.60]],[[.40,.42],[.64,.52],[.44,.70]],[[.29,.43],[.58,.35],[.45,.66],[.75,.56]]];
  const [x,y]=positions[occupants.length][occupants.indexOf(seat)];
  return [s.tiles[tileId].unit ? .60+x*.32 : x,y];
}
const viewport=$('mapViewport'),mapRoll=$('mapRoll'),matchHud=$('matchHud');
function placeHandPanel(){
  if(!s?.battle){
    if(handPanel.parentElement!==viewport)viewport.append(handPanel);
  }else if(handPanel.parentElement!==$('buttons').parentElement){
    $('buttons').after(handPanel);
  }
}
const mapViewButtons=[...$('mapViews').querySelectorAll('[data-zoom]')];
let mapZoom='1.8',cameraTile=0,targetZoom=null;
try{
  const saved=localStorage.getItem('cept-map-zoom');
  if(mapViewButtons.some(b=>b.dataset.zoom===saved))mapZoom=saved;
}catch{}
// The map may slide until its edge meets the free area, so edge tiles never sit under a panel.
function mapOffset(offset,start,end,canvas){
  return canvas<=end-start?start+(end-start-canvas)/2:Math.max(end-canvas,Math.min(start,offset));
}
let mapFree={left:0,top:0,right:0,bottom:0};
function measureMapFree(){
  const width=viewport.clientWidth,height=viewport.clientHeight;
  const free={left:0,top:matchHud.offsetHeight,right:width,bottom:height};
  const dock=document.querySelector('#game .match-actions');
  const panels=[];
  if(handPanel.parentElement===viewport&&handPanel.open)panels.push(handPanel);
  if(dock&&!dock.classList.contains('action-menu')&&dock.offsetHeight>64&&getComputedStyle(dock).visibility!=='hidden')panels.push(dock);
  for(const panel of panels){
    if(panel.offsetWidth>width*.62)free.bottom=Math.min(free.bottom,panel.offsetTop);
    else if(panel.offsetLeft<width*.3)free.left=Math.max(free.left,panel.offsetLeft+panel.offsetWidth);
    else free.right=Math.min(free.right,panel.offsetLeft);
  }
  if(free.bottom-free.top<96)free.bottom=height;
  if(free.right-free.left<140){free.left=0;free.right=width;}
  return mapFree=free;
}
function actionMenuShown(){
  return actionMenu.classList.contains('action-menu')&&actionMenu.offsetHeight>0&&getComputedStyle(actionMenu).visibility!=='hidden';
}
// The roll button and the action menu form one stack: beside the figures when a side has room,
// otherwise under their feet, never over them.
function placeMapRoll(root,x,y,zoom){
  const pawn=root.querySelector('.pawn-action');
  actionMenu.style.maxHeight='';
  const rollShown=!mapRoll.hidden,menuShown=actionMenuShown();
  if(!pawn||!rollShown&&!menuShown)return;
  const tile=pawn.closest('.tile');
  const tileLeft=tile.offsetLeft-tile.offsetWidth/2;
  const feetY=y+(tile.offsetTop+pawn.offsetTop)*zoom,pawnHeight=pawn.offsetHeight*zoom;
  const width=viewport.clientWidth,height=viewport.clientHeight;
  const rollWidth=rollShown?mapRoll.offsetWidth:0,rollHeight=rollShown?mapRoll.offsetHeight:0;
  const menuWidth=menuShown?actionMenu.offsetWidth:0,menuHeight=menuShown?actionMenu.offsetHeight:0;
  const gap=rollShown&&menuShown?6:0,stackWidth=Math.max(rollWidth,menuWidth),stackHeight=rollHeight+gap+menuHeight;
  const bounds=[...tile.querySelectorAll('.pawn')].map(piece=>{
    const center=x+(tileLeft+piece.offsetLeft)*zoom;
    const half=Math.max(piece.offsetWidth/2,piece.offsetHeight*.3)*zoom;
    return [center-half,center+half];
  });
  const groupStart=Math.min(...bounds.map(([start])=>start)),groupEnd=Math.max(...bounds.map(([,end])=>end));
  const right=groupEnd+10,before=groupStart-stackWidth-10;
  // While another tile is inspected, or route arrows surround the cepter, the stack waits at the edge.
  const routeOnMap=['fork','direction'].includes(s.phase);
  const away=cameraTile!==s.players[s.turn].pos||routeOnMap,wideView=width>height*1.1;
  const side=away?0:right+stackWidth+4<=width?1:before>=4?-1:0;
  const tools=$('mapViews'),toolsHeight=tools.querySelector('summary').offsetHeight;
  const left=Math.max(4,Math.min(width-stackWidth-4,away?(wideView?tools.offsetLeft-stackWidth-6:(width-stackWidth)/2):side>0?right:side<0?before:(groupStart+groupEnd-stackWidth)/2));
  const status=$('center'),underStatus=status.offsetHeight&&left<status.offsetLeft+status.offsetWidth+4?status.offsetTop+status.offsetHeight+4:0;
  const minTop=Math.max(underStatus,left+stackWidth+4>tools.offsetLeft?tools.offsetTop+toolsHeight+4:matchHud.offsetHeight+5);
  const floor=handPanel.parentElement===viewport&&(handPanel.open||left+stackWidth+4>handPanel.offsetLeft)?handPanel.offsetTop-6:height-4;
  const bubble=$('detail'),underBubble=bubble.classList.contains('card-popup')&&bubble.offsetHeight&&left<bubble.offsetLeft+bubble.offsetWidth&&left+stackWidth>bubble.offsetLeft;
  const maxTop=Math.max(minTop,(underBubble?Math.min(floor,bubble.offsetTop-6):floor)-stackHeight);
  const body=feetY-Math.min(45,pawnHeight*.55);
  let top=away?(wideView||routeOnMap?minTop:maxTop):side?body-(menuShown?stackHeight:rollHeight)/2:feetY+10;
  // Under the feet is full: use the space over the heads when the stack fits there.
  if(!away&&!side&&top>maxTop&&feetY-pawnHeight-8-stackHeight>=minTop)top=feetY-pawnHeight-8-stackHeight;
  top=Math.max(minTop,Math.min(maxTop,top));
  const align=size=>left+(side>0?0:side<0?stackWidth-size:(stackWidth-size)/2);
  mapRoll.style.setProperty('--roll-left',align(rollWidth)+'px');
  mapRoll.style.setProperty('--roll-top',top+'px');
  actionMenu.style.setProperty('--menu-left',align(menuWidth)+'px');
  actionMenu.style.setProperty('--menu-top',(top+rollHeight+gap)+'px');
  // A long menu scrolls inside itself instead of leaving the screen.
  if(menuShown)actionMenu.style.maxHeight=Math.max(96,floor-top-rollHeight-gap)+'px';
}
function setMapCamera(root,x,y,zoom){
  root.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')';
  placeMapRoll(root,x,y,zoom);
}
function selectingSpellMapTarget(){
  if(C.edition==='begins'&&s?.spellEffect==='telekinesis'&&['spellTarget','teleMove'].includes(s.phase))return true;
  if(['dc','ps1','saturn','revolt','3ds'].includes(C.edition)&&s?.spellEffect==='chariot'&&['spellTarget','teleMove'].includes(s.phase))return true;
  if(C.edition==='saga'&&s?.phase==='spellTarget'&&['trade','intrusion','reflection','replace','holyasylum','lunaticlight','sagapolymorph','sagaliquidform','walltransform'].includes(s.spellEffect))return true;
  if(C.edition==='revolt'&&['outrage','thrustblow'].includes(s?.spellEffect)&&['spellTarget','teleMove'].includes(s.phase))return true;
  if(C.edition==='revolt'&&s?.phase==='spellTarget'&&['asteroid','asteroidStrong','diselement','dominantgrowth','hyperactive','bountyhunt','revoltExchange','revoltTemptation'].includes(s.spellEffect))return true;
  if(C.edition==='3ds'&&s?.phase==='spellTarget'&&
    ['heal','weakness','exile','camouflage','removecurse','quintessence','landtransfer','mutation'].includes(s.spellEffect))return true;
  return s?.phase==='spellTarget'&&['remission','magicalleap','shadowleap','sigiloffloat','sigilofdrain','sigilofshrink','blasttrap','energyfield','magicshelter','debility','debilitystrong','metalform','temptation','beginspolymorph'].includes(s.spellEffect);
}
function selectingSecretPlayer(){
  const unit=s?.tiles[s.secretFrom]?.unit;
  return s?.phase==='secretTarget'&&C.secretArt(C.cards[unit?.id],unit)?.player;
}
function selectingTerritoryMove(){
  return s?.territoryMove||s?.phase==='territoryTarget'&&C.combo.key(C.cards[s.tiles[s.abilityFrom]?.unit?.id])==='sleipnir';
}
function selectingBeginsAbility(){
  return C.edition==='begins'&&s?.phase==='territoryTarget'&&(room?room.choices:C.choices(s)).some(([kind])=>kind==='abilityLand');
}
function selectingMapTarget(){return selectingSpellMapTarget()||s?.phase==='secretTarget'&&!selectingSecretPlayer()||s?.phase==='towerTarget'||selectingTerritoryMove()||selectingBeginsAbility();}
function focusMapTile(index){
  cameraTile=index;
  const root=$('map'),tile=root.children[index];
  if(!tile?.classList.contains('tile')||!root.clientWidth||!viewport.clientHeight)return;
  const w=root.clientWidth,h=root.clientHeight,viewWidth=viewport.clientWidth,viewHeight=viewport.clientHeight;
  const free=measureMapFree(),freeWidth=free.right-free.left,freeHeight=free.bottom-free.top;
  if(!selectingMapTarget())targetZoom=null;
  const preferred=selectingMapTarget()?(targetZoom??(selectingTerritoryMove()||inspect<0?'1':mapZoom)):mapZoom;
  const overview=preferred==='1';
  const cover=Math.max(viewWidth/w,viewHeight/h);
  const zoom=overview?Math.min(1,freeWidth/w,freeHeight/h):
    Math.max(Number(preferred),cover*Number(preferred)/1.8);
  viewport.classList.toggle('pannable',!overview);
  for(const b of mapViewButtons)b.setAttribute('aria-pressed',String(b.dataset.zoom===preferred));
  root.style.setProperty('--camera-zoom',zoom);
  // The pawn stands above its tile, so the tile sits a little below the middle of the free area.
  // An open action menu takes the right half on a wide screen and the lower part on a tall one.
  const menuOpen=actionMenuShown()&&actionToggle.getAttribute('aria-expanded')==='true';
  const wide=freeWidth>freeHeight*1.1;
  const x=mapOffset(free.left+freeWidth*(menuOpen&&wide?.36:.5)-tile.offsetLeft*zoom,free.left,free.right,w*zoom);
  const y=mapOffset(free.top+freeHeight*(menuOpen&&!wide?.3:.56)-(tile.offsetTop+tile.offsetHeight*.5)*zoom,free.top,free.bottom,h*zoom);
  setMapCamera(root,x,y,zoom);
}
for(const button of mapViewButtons){
  button.setAttribute('aria-pressed',String(button.dataset.zoom===mapZoom));
  button.onclick=()=>{
    $('mapViews').open=false;
    if(selectingMapTarget()){
      targetZoom=button.dataset.zoom;focusMapTile(cameraTile);return;
    }
    mapZoom=button.dataset.zoom;
    for(const b of mapViewButtons)b.setAttribute('aria-pressed',String(b===button));
    try{localStorage.setItem('cept-map-zoom',mapZoom);}catch{}
    focusMapTile(cameraTile);
  };
}
function adjustMatchHud(){
  $('game').style.setProperty('--hud-height',matchHud.offsetHeight+'px');
  focusMapTile(cameraTile);
}
// A short pulse confirms a tap on phones that support it; it follows the sound-effect switch.
document.addEventListener('click',e=>{
  if(e.isTrusted&&$('effectsOn')?.checked&&e.target.closest?.('#game button,#turnPicker button'))navigator.vibrate?.(8);
},true);
// Sheets and drop-down menus close when the map behind them is tapped.
document.addEventListener('click',e=>{
  const target=e.target;
  if(target instanceof HTMLDialogElement&&target.open&&target.matches('#turnPicker,#seatDialog,#cardDialog,#matchInfo,#musicPanel')){
    const box=target.getBoundingClientRect();
    if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)target.close();
  }
  for(const menu of [$('matchMenu'),$('mapViews')])if(menu.open&&!menu.contains(target))menu.open=false;
  const bubble=$('detail');
  if(bubble.classList.contains('card-popup')&&bubble.childElementCount&&!target.closest?.('#detail,#hand .card,dialog'))closeCardPopup();
});
const matchResize=new ResizeObserver(adjustMatchHud);
matchResize.observe(viewport);matchResize.observe(matchHud);
let drag=null,ignoreMapClick=false;
viewport.addEventListener('pointerdown',e=>{
  ignoreMapClick=false;
  if(!e.isPrimary||e.button!==0||e.target.closest('#mapViews,#mapRoll,#handPanel')||!viewport.classList.contains('pannable')||s?.battle||activeWalk||mapPlayback)return;
  const matrix=new DOMMatrixReadOnly(getComputedStyle($('map')).transform);
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,tx:matrix.e,ty:matrix.f,zoom:matrix.a,started:false};
});
viewport.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  let dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.started&&Math.hypot(dx,dy)<7)return;
  if(!drag.started){viewport.setPointerCapture(e.pointerId);drag.started=true;viewport.classList.add('dragging');}
  if(document.documentElement.classList.contains('cept-wide')&&matchMedia('(orientation:portrait)').matches)[dx,dy]=[dy,-dx];
  const map=$('map'),zoom=drag.zoom;
  const x=mapOffset(drag.tx+dx,mapFree.left,mapFree.right,map.clientWidth*zoom);
  const y=mapOffset(drag.ty+dy,mapFree.top,mapFree.bottom,map.clientHeight*zoom);
  setMapCamera(map,x,y,zoom);
});
function endDrag(e){if(drag?.id===e.pointerId){ignoreMapClick=drag.started;drag=null;viewport.classList.remove('dragging');}}
viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
viewport.addEventListener('click',e=>{if(ignoreMapClick){ignoreMapClick=false;e.preventDefault();e.stopPropagation();}},true);
$('mapHome').onclick=()=>{$('mapViews').open=false;inspect=-1;render();};
function drawRouteArrows(actions){
  const root=$('map'),pos=s.players[s.turn].pos,from=root.children[pos],exits=C.board(s).links[pos];
  for(const action of actions){
    const [kind,value]=action;
    const dest=kind==='route'?value:value===1?exits[0]:exits.at(-1);
    const to=root.children[dest];
    const dx=(to.offsetLeft-from.offsetLeft)/root.clientWidth,dy=(to.offsetTop-from.offsetTop)/root.clientHeight;
    const angle=Math.atan2(dy*root.clientHeight,dx*root.clientWidth);
    const b=btn('➜',()=>act(action),'route-arrow');
    b.setAttribute('aria-label',(dest+1)+'번 칸 방향으로 이동');
    b.style.left=(100*to.offsetLeft/root.clientWidth)+'%';
    b.style.top=(100*(to.offsetTop+to.offsetHeight/2)/root.clientHeight)+'%';
    b.style.setProperty('--angle',angle+'rad');
    b.style.setProperty('--push-x',Math.cos(angle)*16+'px');
    b.style.setProperty('--push-y',Math.sin(angle)*16+'px');
    root.append(b);
  }
}
function map(){
  const root=$('map'),m=C.board(s);root.replaceChildren();const span=m.stage?1:m.rows+m.cols+.6;
  const half=m.stage?m.half:100/span;
  root.classList.toggle('source-map',!!m.stage);
  if(['3ds','saga','revolt','begins'].includes(C.edition))root.dataset.editionBoard=C.edition;
  else delete root.dataset.editionBoard;
  root.style.setProperty('--board-art',m.stage?'url("art/cept-maps/'+m.image+'.webp")':'none');
  root.style.backgroundImage='var(--board-art)';
  root.style.setProperty('--half-tile',half+'cqw');
  root.style.aspectRatio=m.stage?'3 / 2':'100 / '+(18+.5*(m.rows+m.cols)*half);
  root.closest('.atlas').classList.toggle('in-battle',!!s.battle);root.inert=!!s.battle;
  const standing=s.phase==='over'?-1:s.players[s.turn].pos;
  const canTarget=!pending&&!C.isComputer(s,C.actor(s))&&(!room||room.seat===C.actor(s)&&!room.busy);
  const targets=new Map(canTarget&&['spellTarget','secretTarget','territoryTarget','teleMove','towerTarget'].includes(s.phase)?
    (room?room.choices:C.choices(s)).filter(a=>['targetLand','secretLand','abilityLand','teleTo','towerTo'].includes(a[0])).map(a=>[a[1],a]):[]);
  const exits=new Set(s.phase==='fork'?(room?room.choices:C.choices(s)).filter(a=>a[0]==='route').map(a=>a[1]):[]);
  s.tiles.forEach((t,n)=>{
    const name=m.gateNames?.[m.gates[n]]||({light:'빛의 성소',dark:'어둠의 성소'}[m.shrineKinds?.[n]])||C.elements[t.type]||t.type,owner=t.owner>=0?s.players[t.owner].name:'미점유';
    const b=btn('',e=>{if(e?.target.closest('.pawn-action')&&!targets.has(n)){launchPawnActions();return;}if(s.phase==='fork'&&canTarget&&exits.has(n)){act(['route',n]);return;}if(s.phase==='towerTarget'&&targets.has(n)){act(targets.get(n));return;}inspect=n;focusCard=-1;render();},'tile '+(['fire','water','earth','wind'][t.type]||'special')+(n===inspect||n===s.towerAt?' chosen':''));
    const [r,c]=m.position[n];b.style.left=((m.rows+c-r+.3)*half)+'%';
    b.style.top=(11+(r+c-2)*half*.5)+'cqw';
    if(m.stage){
      b.style.left=r+'%';b.style.top='calc('+c+'% - '+half*.5+'cqw)';
      // Crop the tile from the same 3:2 artwork that the board uses.
      b.style.setProperty('--tile-art-x',(half-r)+'cqw');
      b.style.setProperty('--tile-art-y',(half*.5-c*2/3)+'cqw');
      b.classList.toggle('altered',t.type!==m.types[n]);b.dataset.fort=m.forts.includes(n)?'true':'false';
    }
    b.style.zIndex=String(m.stage?Math.round(c):2*(r+c));b.setAttribute('aria-label',(n+1)+'번 '+name+' '+owner);
    const links=C.chain(s,t);
    if(links>=2){
      const label=C.chainName(s,t)+' '+links+'연쇄';
      b.append(el('span',label,'chain-mark'));
      b.setAttribute('aria-label',b.getAttribute('aria-label')+' · '+label+' · 영지 가치 ×'+C.chainRate(s,t));
      b.classList.toggle('chain-peer',inspect>=0&&C.sameChain(t,s.tiles[inspect],s));
    }
    const surface=el('span',null,'tile-surface');surface.setAttribute('aria-hidden','true');
    b.append(surface,el('b',(n+1)+' · '+name));
    const prior=s.players[s.turn].pos===n?s.players[s.turn].previous:null;
    const switchInfo=C.pathSwitch(s,n,prior);
    if(switchInfo){
      const [toRow,toCol]=m.position[switchInfo.to];
      const right=toCol-toRow>c-r,down=toCol+toRow>c+r;
      const arrow=down?(right?'↘':'↙'):(right?'↗':'↖');
      b.append(el('small',arrow+' '+(switchInfo.to+1)+'번 · '+switchInfo.rounds+'R'));
      b.setAttribute('aria-label',(n+1)+'번 '+name+' · '+(switchInfo.to+1)+'번 방향 · '+switchInfo.rounds+'라운드 후 자동 전환');
    }
    if(t.type==='마력 트랩'){
      const stored='적립 '+(t.trapMagic??0)+'G';
      b.append(el('small',stored));
      b.setAttribute('aria-label',(n+1)+'번 '+name+' · '+stored);
    }
    if(n===standing)b.classList.add('current-step');
    if(exits.has(n))b.classList.add('exit');
    if(targets.has(n)){
      b.classList.add('targetable');
      b.setAttribute('aria-label',b.getAttribute('aria-label')+' · '+labels[targets.get(n)[0]]);
    }
    if(t.unit){const miniature=creatureFigure(t.unit.id);miniature.classList.add('summoned');b.append(miniature);}
    if(t.unit){
      b.append(el('small',(t.owner+1)+'P · Lv.'+t.level+' · '+tollLabel(t)+(t.unit.fatigued?' · 피로':'')));
      if(t.unit.fatigued)b.setAttribute('aria-label',b.getAttribute('aria-label')+' · 피로');
    }
    const pawns=el('div',null,'pawns');
    const occupants=s.players.flatMap((p,i)=>p.pos===n?[i]:[]);
    s.players.forEach((p,i)=>{
      if(p.pos!==n)return;
      const mark=el('span',null,'pawn');const [fx,fy]=pawnFoot(n,i,occupants);
      if(canTarget&&i===C.actor(s)&&!s.battle&&s.phase!=='over'){
        mark.classList.add('pawn-action');
        mark.title=targets.has(n)?labels[targets.get(n)[0]]:p.name+' 행동';
        b.setAttribute('aria-label',b.getAttribute('aria-label')+' · '+p.name+' 위치');
      }
      mark.style.left=fx*100+'%';mark.style.top=fy*100+'%';
      mark.dataset.seat=i;mark.style.setProperty('--color',colors[i]);
      mark.append(figure(i,p.name),el('i',(i+1)+'P'));pawns.append(mark);
    });
    b.append(pawns);root.append(b);
  });
  focusMapTile(inspect>=0?inspect:s.towerAt??s.players[s.turn].pos);
  const center=$('center');center.classList.toggle('market-center',s.mapId==='market'&&!s.battle);
  center.classList.toggle('turn-status',!s.battle&&inspect<0);
  if(s.battle){
    renderBattle(center,s);return;
  }
  center.replaceChildren();
  if(s.chainNotice)center.append(el('span',s.chainNotice,'chain-notice'));
  if(s.shrineNotice)center.append(el('span',s.shrineNotice,'chain-notice'));
  const world=C.combo.worlds[C.combo.activeWorld(s)];
  if(world){
    const chip=el('span',world.name+' · '+(s.world.until-s.round)+'라운드','chain-notice');
    chip.setAttribute('aria-label',chip.textContent+' · '+world.description);chip.title=world.description;center.append(chip);
  }
  if(inspect>=0){
    const t=s.tiles[inspect],u=t.unit;
    const closeInspect=btn('✕',()=>{inspect=-1;render();},'inspect-close');closeInspect.setAttribute('aria-label','칸 정보 닫기');
    center.append(closeInspect,el('small',(inspect+1)+'번 칸'+(m.areaCount>1?' · '+(t.area+1)+'지역':'')),el('b',m.gateNames?.[m.gates[inspect]]||({light:'빛의 성소',dark:'어둠의 성소'}[m.shrineKinds?.[inspect]])||C.elements[t.type]||t.type));
    if(u){
      const c=C.cards[u.id],effect=C.cards.find(card=>u.enchant&&C.combo.key(card)===u.enchant);
      const status=u.poisoned?'독':u.confused?'혼란':u.enchant==='paralysis'?'마비':u.enchant==='phantasm'?'판타즘':effect?.name;
      center.prepend(creatureFigure(u.id));
      center.append(el('span',[c.name,status,u.fatigued?'피로 · 영지 명령 불가':null,'ST '+(u.st??c.st),'HP '+u.hp+'/'+(u.mhp??c.hp),typeof t.type==='number'?(t.area+1)+'지역 '+C.chainName(s,t)+' · '+(C.chain(s,t)>1?C.chain(s,t)+'연쇄':'단독 영지')+' ×'+C.chainRate(s,t):'연쇄 제외','통행료 '+tollLabel(t),'가치 '+C.value(s,t)+'G'].filter(Boolean).join(' · ')));
    }else if(t.type==='카드 상점'){
      const stock=C.shopStock(s,inspect);
      center.append(el('span',stock.length?stock.map(id=>C.cards[id].name+' '+C.shopCost(id)+'G').join(' · '):'이 맵의 상품 정보 없음'));
    }else if(t.type==='모프'){
      center.append(el('span','처음 배치한 크리처의 속성을 얻습니다. '+(['revolt','begins'].includes(C.edition)?'무속성 크리처를 배치하면 복합 영지가 됩니다. ':'')+'변한 속성은 영지가 비어도 유지됩니다.'));
    }else if(t.type==='마법진'){
      center.append(el('span','멈추면 제시된 주문 두 장 중 한 장을 0G로 사용할 수 있습니다.'));
    }else if(t.type==='보석 상점'){
      center.append(el('span',s.prices.map((price,e)=>C.elements[e]+' '+price+'G').join(' · ')));
    }else if(t.type==='분기 스위치'){
      const entry=s.players[s.turn].pos===inspect?s.players[s.turn].previous:null;
      const current=C.pathSwitch(s,inspect,entry),alternate=C.pathSwitch(s,inspect,entry,true);
      center.append(el('span',(current.to+1)+'번 진행 · 전환 시 '+(alternate.to+1)+'번 · 자동 전환까지 '+current.rounds+'라운드'));
    }else if(t.type==='사령탑'){
      center.append(el('span','멈추면 빈 영지에 소환하거나 적 영지를 원격으로 침략할 수 있습니다.'));
    }else if(t.type==='성소'&&C.edition==='begins'){
      center.append(el('span','멈추면 성소 효과 하나가 무작위로 발동합니다.'));
    }else if(t.type==='마력 트랩'){
      center.append(el('span','적립 '+(t.trapMagic??0)+'G · 통과하거나 멈출 때 주사위 합 0–3이면 전액 획득, 4–5면 유지, 6 이상이면 보유 마력 20% 적립'));
    }else if(t.type==='분수'){
      center.append(el('span','멈추면 손패를 모두 버리고 남은 북에서 같은 수만큼 뽑습니다.'));
    }else if(['전송진','강제 전송진'].includes(t.type)){
      const destination=m.transit?.[inspect];
      const when=t.type==='강제 전송진'?'통과하거나 멈추면 ':'정지 시 ';
      center.append(el('span',destination==null?'목적지 미설정 · 이동 효과 없음':when+(destination+1)+'번으로 이동'));
    }else center.append(el('span',m.transit?.[inspect]!=null?(m.transit[inspect]+1)+'번으로 이동':'점유 크리처 없음'));
    if(targets.has(inspect)){
      const action=targets.get(inspect);
      if(action[0]==='targetLand'&&C.hasLandDamage(s.spellEffect)){
        const next=C.spellHP(s,t,s.spellEffect);
        const revival=C.spellRevival(s,t,s.spellEffect);
        center.append(el('span',revival?'예상 · '+revival+'로 부활':'예상 HP '+u.hp+' → '+next+(next===0?' · 격파':'')));
      }
      const label=s.phase==='spellTarget'&&s.spellEffect==='trade'?(s.tradeFrom==null?'교환할 내 영지':'교환할 적 영지'):
        s.phase==='spellTarget'&&['magicalleap','shadowleap'].includes(s.spellEffect)?'이동':labels[action[0]];
      center.append(btn((inspect+1)+'번 · '+label+' 확정',()=>act(action),'primary'));
    }
    return;
  }
  const p=s.players[s.turn];center.append(figure(s.turn,p.name),el('small',s.phase==='over'?'대전 종료':p.name+' · '+p.lap+'주 완주'),el('b',s.phase==='over'?winLabel():s.die?'주사위 '+s.die:m.name),el('span',(m.gates?'게이트 ':'요새 ')+p.flags.length+'/'+(m.checkpoints||m.forts).length+(s.remaining?' · 남은 이동 '+s.remaining:'')));
  if(C.edition==='begins'&&s.phase==='spellTarget'&&s.spellEffect==='relief')
    center.lastElementChild.textContent=s.reliefFrom==null?'교환할 첫 영지를 누르세요.':'교환할 두 번째 영지를 누르세요.';
  if(C.edition==='begins'&&s.phase==='teleMove'&&s.spellEffect==='chariot')
    center.lastElementChild.textContent='두 칸 떨어진 도착 영지를 누르세요.';
  if(s.phase==='spellCircle')center.lastElementChild.textContent='마법진 · 주문 한 장 무료 사용';
  if(s.phase==='gemStore')center.lastElementChild.textContent='보석 상점 · '+(s.remaining?'거래 후 '+s.remaining+'칸 이동':'속성석 거래');
  if(s.phase==='pathSwitch')center.lastElementChild.textContent='분기 스위치 · 유지 또는 변경을 선택하세요';
  if(s.phase==='towerTarget')center.lastElementChild.textContent='사령탑 · 목표 영지를 터치하세요';
  if(s.phase==='towerDeploy')center.lastElementChild.textContent='사령탑 · '+(s.towerAt+1)+'번 영지 · 하단 손패에서 선택';
  if(selectingSpellMapTarget()&&targets.size){
    const prompt={intrusion:'인트루드로 침략할 적 영지를 선택하세요',reflection:'반사를 걸 크리처를 선택하세요',replace:'교체할 크리처가 있는 영지를 선택하세요',trade:s.tradeFrom==null?'교환할 내 영지를 선택하세요':'같은 레벨의 적 영지를 선택하세요',remission:'경유할 게이트를 선택하세요',magicalleap:'이동할 칸을 선택하세요',blasttrap:'함정을 놓을 영지를 선택하세요',energyfield:'결계를 걸 영지를 선택하세요',magicshelter:'방마벽을 걸 영지를 선택하세요',metalform:'금속화할 크리처를 선택하세요',temptation:'영지 능력을 빌릴 크리처를 선택하세요',beginspolymorph:'변신시킬 크리처를 선택하세요',debility:'기본 ST를 낮출 크리처를 선택하세요',debilitystrong:'기본 ST와 최대 HP를 낮출 크리처를 선택하세요',chariot:s.phase==='teleMove'?'도착 영지를 선택하세요':'이동할 크리처를 선택하세요',telekinesis:s.phase==='teleMove'?'인접한 도착 영지를 선택하세요':'강제로 이동시킬 크리처를 선택하세요'};
    center.lastElementChild.textContent=prompt[s.spellEffect]||'비술을 새길 크리처를 선택하세요';
  }
  center.dataset.rolled=String(!!s.die||s.phase==='over');
}
function stopWalk(){
  if(!activeWalk)return;
  const {sprite,pawn,animation}=activeWalk;
  activeWalk=null;
  animation?.cancel();
  sprite.remove();
  if(pawn)pawn.style.visibility='';
  $('game').inert=false;
}

async function walkPath(move){
  const root=$('map'),tiles=[...root.querySelectorAll('.tile')];
  const pawn=root.querySelector('.pawn[data-seat="'+move.seat+'"]');
  const sprite=el('img',null,'walking-cepter');
  sprite.alt='';sprite.src='art/cept-walk-'+move.seat+'.webp';
  const walk={sprite,pawn,animation:null};
  activeWalk=walk;
  $('game').inert=true;
  try{
    await sprite.decode();
    if(activeWalk!==walk)return;
    root.append(sprite);
    if(pawn)pawn.style.visibility='hidden';
    root.querySelector('.current-step')?.classList.remove('current-step');
    tiles[move.path[0]].classList.add('current-step');
    for(let step=1;step<move.path.length;step++){
      const from=tiles[move.path[step-1]],to=tiles[move.path[step]];
      const point=(tile,[fx,fy])=>[
        tile.offsetLeft-tile.offsetWidth/2+tile.offsetWidth*fx,
        tile.offsetTop+tile.offsetHeight*fy
      ];
      const start=step===1&&pawn?[parseFloat(pawn.style.left)/100,parseFloat(pawn.style.top)/100]:[.5,.58];
      const destination=move.path[step];
      focusMapTile(destination);
      const occupants=s.players.flatMap((p,i)=>p.pos===destination?[i]:[]);
      const end=step===move.path.length-1?pawnFoot(destination,move.seat,occupants):[.5,.58];
      const [x,y]=point(from,start),[endX,endY]=point(to,end);
      sprite.style.zIndex=String(Math.max(+from.style.zIndex,+to.style.zIndex)+1);
      sprite.style.left=x+'px';sprite.style.top=y+'px';
      if(endX!==x)sprite.style.scale=endX<x?'-1 1':'1 1';
      const jumping=C.board(s).transit?.[move.path[step-1]]===destination;
      playEffect(jumping?'warp':'step');
      const frames=jumping?[{left:x+'px',top:y+'px',opacity:1},{left:x+'px',top:y+'px',opacity:0,offset:.49},{left:endX+'px',top:endY+'px',opacity:0,offset:.5},{left:endX+'px',top:endY+'px',opacity:1}]:[{left:x+'px',top:y+'px'},{left:endX+'px',top:endY+'px'}];
      walk.animation=sprite.animate(frames,{duration:480,fill:'forwards'});
      await walk.animation.finished;
      from.classList.remove('current-step');
      to.classList.add('current-step');
      walk.animation.cancel();
    }
  }catch{/* A cancelled walk or missing sprite falls back to the current board. */}
  finally{if(activeWalk===walk){stopWalk();render();}}
}

function sideName(j){return s.teams?String.fromCharCode(65+s.teams[j])+'팀':s.players[j].name;}
function winLabel(){
  const result=C.outcome(s);
  return result.winners.length?sideName(result.winners[0])+' 승리':result.tie?'공동 1위 · 승자 없음':'승자 없음';
}
function render(){
  clearTimeout(timer);
  mapRoll.hidden=true;
  // Only a dedicated screen can keep its own hand visible during another seat's turn.
  const reader=room?room.seat:s.players.filter(q=>!q.ai).length===1?s.players.findIndex(q=>!q.ai):null;
  if(pending||C.isComputer(s,C.actor(s))||room&&room.seat!==C.actor(s)){
    $('buttons').replaceChildren();$('hint').textContent='';
    if(reader==null){
      $('hand').replaceChildren();$('detail').replaceChildren();$('handTitle').textContent='손패';
      if($('cardDialog').open)$('cardDialog').close();
    }
  }
  syncStageMusic();
  syncActionSound(s);
  $('map').querySelectorAll('.route-arrow').forEach(b=>b.remove());
  if(presentMapEffect(s.mapEffect))return;
  const move=s.lastMove;
  if(move&&move.sequence!==seenMove){
    stopWalk();seenMove=move.sequence;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)playEffect('step');
    if(move.path.length>1&&s.players[move.seat].pos===move.path.at(-1)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      walkPath(move);return;
    }
  }
  if(activeWalk)return;
  const i=C.actor(s),p=s.players[i],over=s.phase==='over',local=!C.isComputer(s,i)&&!pending&&!over&&(!room||room.seat===i&&!room.busy);
  $('mapViews').hidden=!!s.battle;
  $('mapName').textContent=C.board(s).name;
  $('round').textContent=(s.overtime||s.suddenDeathArmed?'서든데스 · ':'')+(s.roundLimit&&!s.overtime?s.round+'/'+s.roundLimit:s.round)+'라운드 · 목표 '+s.target+'G';
  $('gameTitle').textContent=$('editionChoice').selectedOptions[0].textContent;
  const handSeat=over?null:reader??(local?i:null);
  if(pending||over)handPanel.open=false;
  $('seats').style.setProperty('--seat-count',s.players.length);
  const openSeat=j=>{seatSummary(j);$('seatDialog').dataset.seat=j;$('seatDialog').showModal();};
  $('handSeatInfo').hidden=handSeat==null;
  $('handSeatInfo').onclick=()=>openSeat(handSeat);
  $('seats').replaceChildren(...s.players.map((v,j)=>{
    const ownHand=j===handSeat;
    const box=btn('',()=>{if(ownHand)handPanel.open=!handPanel.open;else openSeat(j);},'seat'+(i===j?' active':'')),wealth=C.total(s,j);
    if(ownHand){
      box.setAttribute('aria-controls','handPanel');
      box.setAttribute('aria-expanded',String(handPanel.open));
    }else box.setAttribute('aria-haspopup','dialog');
    box.setAttribute('aria-label',v.name+' · 총마력 '+wealth+'G · '+(ownHand?'손패':'셉터 정보'));
    box.style.setProperty('--color',colors[j]);box.style.setProperty('--progress',Math.max(0,Math.min(100,100*wealth/s.target))+'%');
    const name=el('b',v.name);name.title=v.name+(s.teams?' · '+String.fromCharCode(65+s.teams[j])+'팀':'');
    if(s.teams)name.append(el('em',String.fromCharCode(65+s.teams[j])+'팀','seat-team'));
    const cash=el('span',null,'seat-cash');cash.append(el('i','마력 '),v.cash+'G');
    box.append(figure(j,v.name),name,cash,el('span',(s.teams?'팀 총 ':'총 ')+wealth+'G','seat-wealth'));
    if(wealth>=s.target)box.append(el('small','성 귀환 시 승리','castle-goal'));
    const symbols=v.symbols.reduce((a,b)=>a+b,0);if(symbols)box.append(el('small',(C.board(s).gemStore?'속성석 ':'호부 ')+symbols));
    return box;
  }));
  if($('seatDialog').open)seatSummary(Number($('seatDialog').dataset.seat));
  placeHandPanel();
  map();$('who').textContent=over?winLabel():p.name+' 차례';
  const endSummary=s.endReason==='roundLimit'?'제한 라운드 종료':s.endReason==='suddenDeath'?'서든데스 · 마력 고갈':null;
  $('hint').textContent=over?(endSummary?endSummary+(C.outcome(s).tie?' · 총마력 동률이라 승자가 없습니다.':' · 총마력으로 순위를 결정했습니다.'):'목표 총마력을 가지고 성에 귀환했습니다.'):pending?'다음 셉터에게 기기를 건네세요.':C.isComputer(s,i)?'AI가 행동을 선택하고 있습니다.':room&&room.seat!==i?p.name+'의 입력을 기다립니다.':selectingTerritoryMove()?(s.territoryMove?'지도에서 이동할 땅을 누르세요.':'지도에서 이동시킬 내 크리처를 누르세요.'):selectingSecretPlayer()?'비술을 적용할 적 셉터를 고르세요.':s.phase==='spellTarget'&&s.spellEffect==='magicalleap'?'지도에서 이동할 칸을 고르세요.':s.phase==='spellTarget'&&s.spellEffect==='trade'?(s.tradeFrom==null?'교환할 내 영지를 누르세요.':'지도에서 같은 레벨의 적 영지를 누르세요.'):s.phase==='bookWorm'&&s.cloudGizmo?'대상 셉터의 손패에서 교체할 카드 한 장을 고르세요.':hints[s.phase];
  if(local&&s.immediateAt!=null)$('hint').textContent=(s.immediateAt+1)+'번 영지 · 즉시 능력으로 영지 명령을 사용할 수 있습니다.';
  if(local&&s.phase==='spell'&&s.doublecast==='ready')$('hint').textContent='연속 주문 사용 가능 · 주문을 더 쓰거나 주사위를 굴리세요.';
  if(room?.busy)$('hint').textContent='선택을 반영하고 있습니다.';
  const limited=s.players[reader??i]?.evoOpeningLimited;
  if(limited)$('hint').textContent+=' · 동맹 한도로 에보 '+limited+'장을 기본 크리처로 교체했습니다.';
  const controls=$('buttons');controls.replaceChildren();
  if(pending){
    const handover=btn('내 차례 확인',()=>{pending=false;if(C.armClock(s,Date.now(),true))save();render();},'primary');
    handover.setAttribute('aria-label',p.name+' · 내 차례 확인');controls.append(handover);
  }
  if(over){
    if((s.replay?.steps.length||s.replayAvailable)&&typeof replayResult==='function')
      replayResult(controls,s.replay,room?.id);
    if(s.campaign&&typeof campaignResult==='function')campaignResult(controls,s);
    const verdict=C.outcome(s);
    const standings=el('ol',null,'match-standings');
    standings.setAttribute('aria-label','최종 순위');
    const totals=s.players.flatMap((p,j)=>!s.teams||s.teams.indexOf(s.teams[j])===j?[[j,C.total(s,j)]]:[]);
    const goalWinner=j=>!endSummary&&C.allied(s,j,s.winner);
    totals.sort((a,b)=>Number(goalWinner(b[0]))-Number(goalWinner(a[0]))||b[1]-a[1]);
    let rank=1;
    totals.forEach(([j,wealth],i)=>{
      if(i&&(totals[i-1][1]!==wealth||goalWinner(totals[i-1][0])))rank=i+1;
      const row=el('li');row.append(el('span',(rank===1&&verdict.tie?'공동 ':'')+rank+'위 · '+sideName(j)),el('strong',wealth+'G'));standings.append(row);
    });
    controls.append(standings);
    if(C.evo){
      const earned=rewardEvos(s,room);
      if(earned.length)controls.append(el('p','에보 드래곤 '+earned.map(i=>i+1).join('·')+' · AGE +1 · SP +5','chain-notice'));
    }
    if(s.reward){
      const result=el('details');result.append(el('summary','승리 보상 카드 '+s.reward.length+'장'));
      const grid=el('div',null,'archive-cards');
      for(const id of s.reward){const c=C.cards[id];grid.append(archiveCard(c.catalog.path));}
      result.append(grid);controls.append(result);
    }
    const retry=s.mapGoal&&C.board(s).storyGoal&&s.players.some(p=>!p.ai)&&!s.players.some((v,j)=>!v.ai&&verdict.winners.includes(j));
    const storyFinished=C.edition==='ps2'&&s.mapGoal&&C.board(s).stage===16&&!retry;
    if(storyFinished)controls.append(el('p','스토리 맵 최종전 클리어','primary story-complete'));
    const nextId=retry?s.mapId:storyFinished?null:C.edition==='ps2'?'ps2-'+(C.board(s).stage+1):C.board(s).next;
    if(!room&&!s.campaign&&C.maps[nextId])controls.append(btn((retry?'다시 도전 · ':'다음 스테이지 · ')+C.maps[nextId].name,()=>{
      const book=s.players[0].template;
      const oldStoryBook=s.storyCast&&s.players.some(p=>p.name==='Leo · Revenge')?'story-leo':'story';
      $('mapChoice').value=nextId;
      if(s.mapGoal&&!retry){
        $('alliance').value='auto';
        showStage();lobby();return;
      }
      showStage();
      const previous=s;
      s=C.start(s.players.length,s.players.filter(v=>!v.ai).length,s.mapGoal?0:s.target,nextId,book,
        retry&&s.storyCast?oldStoryBook:s.players.find(p=>p.ai)?.template||book,s.aiLevel||0,s.alliance||'auto',s.roundLimit||0);
      for(let i=1;i<previous.players.length;i++)if(!previous.players[i].ai&&C.validBook(previous.players[i].template))
        C.setOpeningBook(s,i,previous.players[i].template);
      C.configureMatch(s,{...previous,recordReplay:true});
      save();enter();
    },'primary'));
    controls.append(btn('대국 설정으로',lobby));
  }
  if(local&&p.peek&&C.edition!=='revolt')$('hint').textContent+=' · 위저드 아이로 본 순서 '+p.peek.ids.map(id=>C.cards[id].name).join(' → ');
  const choices=local?(room?room.choices:C.choices(s)):[];
  if(local&&s.phase==='shop')shopMenu(controls,choices,p);
  const roll=choices.find(([kind])=>kind==='roll');
  // A decision that must be made opens the menu; beside a roll it waits folded until asked for.
  const optional=!!roll&&choices.some(([kind])=>kind!=='roll'),anchored=choices.length>0&&!s.battle;
  actionMenu.classList.toggle('action-menu',anchored);
  const menuKey=[s.round,s.turn,s.phase,s.logSequence||0,room?.revision||0,optional].join(':');
  if(menuState.game!==s||menuState.key!==menuKey){
    const landTarget=choices.some(([kind])=>kind==='targetLand');
    const specialOnMap=selectingSpellMapTarget()&&(landTarget||s.phase==='teleMove');
    const beginsOnMap=C.edition==='begins'&&(
      landTarget&&['camouflage','chariot','relief','mutation','removecurse','turntothewall','replace'].includes(s.spellEffect)||
      s.spellEffect==='chariot'&&choices.some(([kind])=>kind==='teleTo')||selectingBeginsAbility()
    );
    const spellOnMap=C.hasLandDamage(s.spellEffect)&&landTarget||beginsOnMap;
    const towerOnMap=s.phase==='towerTarget'||s.phase==='towerDeploy';
    const secretOnMap=s.phase==='secretTarget'&&choices.some(([kind])=>kind==='secretLand');
    const routeOnMap=choices.some(([kind])=>kind==='route'||kind==='direction');
    menuState={game:s,key:menuKey,open:!optional&&!specialOnMap&&!spellOnMap&&!towerOnMap&&!secretOnMap&&!routeOnMap&&!selectingTerritoryMove()};
    if(routeOnMap)handPanel.open=false;
    if(towerOnMap&&choices.length)handPanel.open=s.phase==='towerDeploy';
    if(spellOnMap||specialOnMap)handPanel.open=false;
    // A card bubble left open from reading the hand must not cover a new decision.
    if(choices.length&&$('detail').classList.contains('card-popup'))focusCard=-1;
  }
  actionToggle.setAttribute('aria-expanded',String(anchored&&menuState.open));
  actionToggle.setAttribute('aria-label',anchored&&menuState.open?'행동 메뉴 접기':'행동 메뉴 열기');
  if(roll){
    mapRoll.hidden=false;
    mapRoll.onclick=()=>act(roll);
    focusMapTile(cameraTile);
  }
  const kinds=[...new Set(choices.map(a=>a[0]))];
  for(const k of kinds){
    if(k==='buyCard'||k==='roll')continue;
    const group=choices.filter(a=>a[0]===k);
    if(k==='direction'||k==='route'){drawRouteArrows(group);const routes=el('div',null,'route-options');routes.append(...group.map(routeOption));controls.append(routes);continue;}
    if(['buySymbol','sellSymbol','liquidate','buyGem','sellGem','stealGem'].includes(k)){symbolTrade(group,p,controls);continue;}
    commandGroup(group,p,controls);
  }
  const owner=handSeat==null?null:s.players[handSeat];
  const hand=$('hand'),handScroll=hand.scrollLeft;hand.replaceChildren();$('handTitle').textContent=owner?owner.name+'의 손패 · '+owner.hand.length+'장':'손패';
  $('handCount').textContent=owner?String(owner.hand.length):'';
  $('detail').textContent='';
  if(owner){owner.hand.forEach((id,j)=>{const c=C.cards[id],b=btn('',()=>{
      focusCard=j;
      for(const [slot,card] of [...hand.querySelectorAll('.card')].entries()){
        card.classList.toggle('active',slot===j);card.setAttribute('aria-pressed',String(slot===j));
      }
      for(const select of controls.querySelectorAll('select[data-action]')){
        const options=choices.filter(a=>a[0]===select.dataset.action);
        const match=options.findIndex(a=>['cast','equip','discard','invade','summon'].includes(a[0])&&a[1]===j);
        if(match>=0){select.value=match;select.onchange();}
      }
      showHandSelection(owner,choices);
    },'card'+(j===focusCard?' active':''));const ready=choices.find(([kind,index])=>index===j&&['cast','equip','summon','invade'].includes(kind));
    const type=c.kind==='creature'?cardElements(c)+' · 크리처':c.kind==='item'?'아이템':'주문';
    const availability={cast:'주문 사용 가능',equip:'장비 가능',summon:'소환 가능',invade:'침략 가능'};
    b.classList.toggle('ready',!!ready);b.setAttribute('aria-pressed',String(j===focusCard));
    b.append(cardSeal(id),el('span',ready?availability[ready[0]]:type,'card-type'),el('b',c.name),el('span',stats(c)),el('span',C.price(owner,c,s,!s.battle)+' G'));hand.append(b);});
    showHandSelection(owner,choices);hand.scrollLeft=handScroll;
  }else hand.append(el('span',over?'대국이 끝났습니다.':'본인 차례에 표시됩니다.','muted'));
  if(owner&&typeof showHandCombos==='function')showHandCombos(hand,owner.hand);
  $('log').replaceChildren(...(s.log.length?s.log:['아직 진행 기록이 없습니다.']).map(t=>el('li',t)));
  if(!s.battle)focusMapTile(cameraTile);
  if(!room&&!over&&C.isComputer(s,i))timer=setTimeout(()=>act(C.ai(s)),550+(s.phase==='result'?battleReplayDuration(s.battle):0));
}
