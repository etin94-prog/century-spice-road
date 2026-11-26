const CepterCampaign=(()=>{
  const chapters=[
    {title:'길을 잇는 사람',map:'classic',seats:2,goal:3000,rounds:20,skill:0,rivals:['도선사 모린'],
      briefing:'봉인된 항로를 열 열쇠는 두 요새에 흩어져 있다. 순환로를 익혀 첫 원정을 완주한다.'},
    {title:'유리여울의 약속',map:'campaign-reef',seats:2,goal:4000,rounds:30,skill:1,rivals:['여울지기 렌'],
      briefing:'여울 양쪽을 관리하는 렌과 겨룬다. 물길을 먼저 확보하면 귀환에 여유가 생긴다.'},
    {title:'서로 다른 장부',map:'market',seats:3,goal:5000,rounds:30,skill:1,rivals:['조합장 베라','감정사 토린'],
      briefing:'두 상단이 같은 신전에 도착했다. 호부와 영지 중 어디에 마력을 묶을지 결정한다.'},
    {title:'감시령의 판결',map:'campaign-watch',seats:4,goal:6000,rounds:40,skill:2,rivals:['감시관 에다','선봉장 룬','파수꾼 세아'],
      briefing:'감시령을 가로지르는 길이 열렸다. 갈림길이 많은 지도에서 세 명을 제치고 등불 봉인을 얻는다.'},
    {title:'등불을 되찾는 날',map:'campaign-lantern',seats:4,goal:7000,rounds:40,skill:3,rivals:['항로관 라온','개척자 이브','불씨지기 아린'],
      briefing:'군도 중심 신전에 모든 항로가 모인다. 마지막 대전에서 승리해 등불을 다시 밝힌다.'},
  ];
  function start(engine,index,book,options){
    const chapter=chapters[index];
    const game=engine.start(chapter.seats,1,chapter.goal,chapter.map,book,index<2?engine.presets.intro:engine.presets.fire,chapter.skill,'duel',chapter.rounds);
    game.campaign={chapter:index};
    chapter.rivals.forEach((name,i)=>{game.players[i+1].name=name;});
    return engine.configureMatch(game,options);
  }
  function complete(progress,game){
    if(game.phase!=='over'||game.winner!==0||game.leaders?.length>1)return progress;
    const next=game.campaign.chapter+1;
    return next===progress+1&&next<=chapters.length?next:progress;
  }
  return {chapters,start,complete};
})();
if(typeof module!=='undefined')module.exports=CepterCampaign;

const campaignSaveKey='cept-lantern-campaign-v1';
let campaignProgress=0;
if(typeof document!=='undefined'&&C.edition==='ps2'){
  try{
    const progress=Number(localStorage.getItem(campaignSaveKey));
    if(Number.isInteger(progress)&&progress>=0&&progress<=CepterCampaign.chapters.length)campaignProgress=progress;
  }catch{/* A private browser can still play the campaign in the current tab. */}
  paintCampaign();
}
function paintCampaign(){
  const panel=$('campaignPanel'),story=CepterCampaign.chapters;
  panel.hidden=false;
  panel.replaceChildren(el('h2','등불 항로 캠페인'),el('p',campaignProgress===story.length?'모든 장 완료':campaignProgress+' / '+story.length+'장 완료'));
  const list=el('div',null,'campaign-chapters');
  story.forEach((chapter,index)=>{
    const available=index<=campaignProgress;
    const play=btn((index+1)+'장 · '+chapter.title+(!available?' · 잠김':index<campaignProgress?' · 재도전':''),()=>startCampaignChapter(index),
      index===campaignProgress?'primary':'');
    play.disabled=!available;
    const card=el('article');
    card.append(play,el('p',chapter.briefing),el('small',chapter.seats+'인 · 목표 '+chapter.goal+'G · '+chapter.rounds+'라운드'));
    list.append(card);
  });
  panel.append(list);
  document.getElementById('campaignMaps')?.remove();
  const group=el('optgroup');group.id='campaignMaps';group.label='캠페인 해금 지도';
  const chosen=$('mapChoice').value;
  for(const chapter of story.slice(0,campaignProgress))if(chapter.map.startsWith('campaign-'))
    group.append(new Option(C.maps[chapter.map].name,chapter.map));
  if(group.children.length)$('mapChoice').append(group);
  if(chosen)$('mapChoice').value=chosen;
}
function startCampaignChapter(index,retryBook){
  if(room||index>campaignProgress)return;
  if(s?.phase!=='over'&&s&&!confirm('진행 중인 대국을 캠페인으로 바꿀까요?'))return;
  s=CepterCampaign.start(C,index,retryBook||chosenBook(),matchOptions());
  save();enter();
}
function campaignResult(controls,game){
  const index=game.campaign.chapter,chapter=CepterCampaign.chapters[index];
  if(!chapter)return;
  const before=campaignProgress;
  campaignProgress=CepterCampaign.complete(before,game);
  if(before!==campaignProgress){
    try{localStorage.setItem(campaignSaveKey,String(campaignProgress));}catch{/* The current tab retains progress. */}
    paintCampaign();
  }
  const won=game.winner===0&&!(game.leaders?.length>1);
  const final=index===CepterCampaign.chapters.length-1;
  const message=won?(final?'항로의 마지막 등불을 밝혔다. 캠페인 완료!':chapter.title+' 완료 · 다음 장 해금'):chapter.title+' · 다시 도전할 수 있습니다.';
  controls.append(el('p',message,'campaign-notice'));
  if(won&&chapter.map.startsWith('campaign-'))controls.append(el('p',C.maps[chapter.map].name+' 자유 대전 해금'));
  if(won&&!final)controls.append(btn('다음 장',()=>startCampaignChapter(index+1),'primary'));
  controls.append(btn('이 장 다시 하기',()=>startCampaignChapter(index,game.players[0].template)));
}
