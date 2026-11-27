const firstSeries=['saturn','ps1'].includes(C.edition);
const modernSeries=!!C.presets.stronghold;
const adaptedBooks=(firstSeries||modernSeries?[]:archive.books).map(row=>adaptCepterBook(C,row));
for(const [group,select] of [['Player',$('bookChoice')],['AI',$('aiChoice')]]){
  const list=document.createElement('optgroup');list.label=group+' 원작 기반 50장';
  adaptedBooks.forEach((b,i)=>{if(b.group===group)list.append(new Option(b.name+' · 유지 '+b.kept+'장','source-'+i));});
  select.insertBefore(list,select.querySelector('[value="custom"]'));
}
const practiceBooks=C.battleCombos?C.battleCombos.map(({groups},i)=>({
  name:comboLabel(i,groups),deck:C.practiceBook(i),practice:true
})):(firstSeries||modernSeries?[]:C.combo.recipes).map((_,i)=>({name:'콤보 '+(i+1)+' · '+comboLabel(i),deck:C.practiceBook(i),practice:true}));
for(const select of [$('bookChoice'),$('aiChoice')]){
  const list=document.createElement('optgroup');list.label='콤보 연습 북';
  practiceBooks.forEach((b,i)=>{if(b.deck)list.append(new Option(b.name,'combo-'+i));});select.insertBefore(list,select.querySelector('[value="custom"]'));
}
if(C.edition!=='ps2'){
  const player=$('bookChoice'),ai=$('aiChoice'),recommended=player.querySelector('[value="recommend"]');
  const tierRecommendation=['begins','revolt'].includes(C.edition);
  if(tierRecommendation)recommended.textContent='난이도별 추천 북';
  else recommended.remove();
  if(modernSeries){
    for(const [key,name] of Object.entries(modernBookNames)){
      if(!C.presets[key])continue;
      const option=player.querySelector('option[value="'+key+'"]');
      if(option)option.textContent=name;
      else player.insertBefore(new Option(name,key),player.lastElementChild);
      ai.add(new Option(name,key));
    }
    player.value=tierRecommendation?'recommend':'intro';
  }else{
    player.querySelector('[value="fire"]').textContent='화·지 기반 북';
    player.querySelector('[value="intro"]').textContent='수·풍 기반 북';
    player.value='fire';
  }
  if(modernSeries)$('ps2Library').hidden=true;
  if(firstSeries){
    for(const [key,title] of [['fire','화·지 초기 북'],['intro','수·풍 초기 북']]){$('bookChoice').querySelector('[value='+key+']').textContent=title;$('aiChoice').add(new Option(title,key));}
    const titles={fireAir:'화·풍 초기 북',waterEarth:'수·지 초기 북',Stopper:'통행 저지',Earth:'지속성',Air:'풍속성',Fire:'화속성',Water:'수속성'};
    for(const [key,title] of Object.entries(titles)){
      $('bookChoice').insertBefore(new Option(title.includes('초기 북')?title:title+' · 공략 기반 북',key),$('bookChoice').lastElementChild);
      $('aiChoice').add(new Option(title.includes('초기 북')?title:title+' · 공략 기반 북',key));
    }
    $('ps2Library').hidden=true;$('aiChoice').options[0].textContent='판본별 기본 북';}
  else if(!modernSeries)$('ps2Library').querySelector('summary').textContent='세컨드 공통 자료실 · PS2/DC';
}
function sourceBook(select){const value=select.value;
  if((firstSeries||modernSeries)&&select.id==='aiChoice'&&C.presets[value])return {name:select.selectedOptions[0].text,deck:C.presets[value],practice:true};if(value.startsWith('combo-'))return practiceBooks[Number(value.slice(6))];return value.startsWith('source-')?adaptedBooks[Number(value.slice(7))]:null;}
let matchupWorker=null;
function refreshMatchup(){
  matchupWorker?.terminate();matchupWorker=null;
  const tier=tierBooks(),humanCount=Number($('humans').value),count=Number($('count').value);
  const usingAI=humanCount<count,same=$('tierChoice').value==='same';
  const story=storyCastSelected(),cast=C.storyAlliances[$('mapChoice').value];
  $('storyAllyLabel').hidden=!(story&&$('mapChoice').value==='ps2-14'&&humanCount<=2);
  const castNames=story?cast.map((name,i)=>i<humanCount?null:i===2&&chosenAiBook()==='story-leo'?'Leo · Revenge':name).filter(Boolean).join(' / '):'';
  const describe=b=>b.practice?b.name:b.name+' (원본 유지 '+b.kept+'/50장)';
  $('aiChoice').disabled=!usingAI||same;
  const player=$('bookChoice').value==='recommend'?describe(tier.player):$('bookChoice').selectedOptions[0].text;
  $('deckMatchNames').textContent='Player · '+player+' / AI · '+(!usingAI?'없음':same?'플레이어와 같은 북':story?castNames:describe(sourceBook($('aiChoice'))||tier));
  $('deckOdds').textContent=C.evo&&count===4&&$('alliance').value.startsWith('teams')?'팀당 에보 2장 · 초과분은 기본 크리처로 교체됩니다.':'';
  $('estimateDeck').disabled=false;
}
for(const id of ['mapChoice','count','humans','target','alliance','storyAlly','tierChoice','bookChoice','aiChoice']){
  $(id).addEventListener('change',()=>{
    if(id==='tierChoice')$('aiChoice').value='tier';
    if(id==='tierChoice'&&$('bookChoice').value==='recommend'&&$('editor').open)bookEditor();
    refreshMatchup();
  });
}
$('storeBook').addEventListener('click',refreshMatchup);
$('estimateDeck').onclick=()=>{
  matchupWorker?.terminate();
  const options={count:Number($('count').value),humans:Number($('humans').value),target:Number($('target').value),map:$('mapChoice').value,player:chosenBook(),opponent:chosenAiBook(),aiLevel:selectedAiLevel(),alliance:$('alliance').value,roundLimit:+$('roundLimit').value,suddenDeath:$('suddenDeath').checked};
  $('estimateDeck').disabled=true;
  $('deckOdds').textContent='모의 대국 계산 중…';
  function stop(){matchupWorker?.terminate();matchupWorker=null;$('estimateDeck').disabled=false;}
  try{
    matchupWorker=new Worker('cept-simulate.js?edition='+C.edition);
    matchupWorker.onmessage=({data})=>{
      const {wins,finished,sample}=data;
      const sum=values=>values.reduce((a,b)=>a+b,0);
      const rate=(w,n)=>n?(w/n*100).toFixed(1)+'%':'산출 불가';
      $('deckOdds').textContent='플레이어 북 · 실제 시작 자리(1번) '+rate(wins[0],finished[0])+' ('+wins[0]+'승/'+finished[0]+'판) · 자리 교대 평균 '+rate(sum(wins),sum(finished))+' (완주 '+sum(finished)+'/'+sample*options.count+'판). 사람 좌석은 기본 AI, 상대는 선택한 난이도로 계산합니다.';
      if(data.done)stop();
    };
    matchupWorker.onerror=()=>{$('deckOdds').textContent='계산할 수 없습니다. 다시 시도해 주세요.';stop();};
    matchupWorker.postMessage(options);
  }catch{$('deckOdds').textContent='이 주소에서 모의 대국을 실행할 수 없습니다.';stop();}
};
refreshMatchup();
