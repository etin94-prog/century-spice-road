const replayActionNames={
  roll:'주사위',direction:'출발',route:'이동',bare:'장비 없이 진행',equip:'장비 결정',
  pass:'행동 마침',continue:'전투 종료',level:'영지 레벨업',buyCard:'카드 구매',pay:'통행료',
  discard:'손패 정리',replaceCard:'크리처 교체',foresightCard:'북에서 카드 선택'
};
function replayBoard(replay){
  return C.board({mapId:replay.map,layoutRevision:replay.layout});
}
// The last frame of a finished match carries the same verdict as the result screen.
function replayVerdict(replay,f){
  if(f.phase!=='over')return null;
  const seat=i=>Number.isInteger(i)&&i>=0&&i<replay.names.length;
  const side=i=>Array.isArray(replay.teams)&&Number.isInteger(replay.teams[i])?String.fromCharCode(65+replay.teams[i])+'팀':replay.names[i];
  const tied=Array.isArray(f.leaders)?f.leaders.filter(seat):[];
  if(tied.length>1)return '공동 1위 · '+tied.map(side).join(', ')+' · 승자 없음';
  return seat(f.winner)?side(f.winner)+' 승리':'승자 없음';
}
function validateReplay(replay){
  if(replay?.version!==1||replay.edition!==C.edition||typeof replay.map!=='string'||
      !Object.hasOwn(C.maps,replay.map)||typeof replay.title!=='string')return false;
  const board=replayBoard(replay),count=board?.types.length;
  const validTile=t=>Array.isArray(t)&&(t.length===8||t.length===9&&Number.isSafeInteger(t[8])&&t[8]>0)&&Number.isInteger(t[1])&&Number.isInteger(t[2]);
  if(!Array.isArray(replay.names)||replay.names.length<2||replay.names.length>4||replay.names.some(name=>typeof name!=='string')||
      !Array.isArray(replay.initial)||replay.initial.length!==count||!replay.initial.every(validTile)||!Array.isArray(replay.steps))return false;
  const validFrame=f=>f&&Array.isArray(f.players)&&f.players.length===replay.names.length&&
    (f.turnOrder===undefined||Array.isArray(f.turnOrder)&&f.turnOrder.length===replay.names.length&&
      new Set(f.turnOrder).size===replay.names.length&&f.turnOrder.every(i=>Number.isInteger(i)&&i>=0&&i<replay.names.length))&&
    f.players.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<count);
  return validFrame(replay.opening)&&replay.steps.every(f=>validFrame(f)&&Array.isArray(f.tiles)&&
    f.tiles.every(d=>Array.isArray(d)&&Number.isInteger(d[0])&&d[0]>=0&&d[0]<count&&validTile(d[1])));
}
function downloadReplay(replay){
  const blob=new Blob([JSON.stringify(replay)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=el('a');
  link.href=url;link.download='cept-replay-'+replay.map+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showReplay(replay){
  if(!validateReplay(replay))throw Error('이 판본에서 읽을 수 있는 대전 기록이 아닙니다.');
  const board=replayBoard(replay);
  const dialog=el('dialog',null,'replay-screen');
  const title=el('h2','경기 리플레이 · '+replay.title),stage=el('div',null,'replay-map');
  const status=el('p'),wealth=el('ul',null,'replay-wealth'),log=el('ol',null,'replay-log');
  const combat=el('div',null,'replay-combat');
  const menu=el('div',null,'replay-toolbar'),seek=el('input');seek.type='range';seek.min=0;seek.max=replay.steps.length;
  seek.value=0;seek.setAttribute('aria-label','리플레이 위치');
  let step=0,playback;
  const previous=btn('이전',()=>go(step-1)),next=btn('다음',()=>go(step+1));
  const play=btn('재생',()=>{
    if(playback){stop();return;}
    if(step===replay.steps.length)go(0);
    play.textContent='일시정지';playback=setInterval(()=>go(step+1),550);
  },'primary');
  function stop(){clearInterval(playback);playback=null;play.textContent='재생';}
  function go(index){
    step=Math.max(0,Math.min(replay.steps.length,index));seek.value=step;
    const tiles=replay.initial.slice();
    for(let i=0;i<step;i++)for(const [at,tile] of replay.steps[i].tiles)tiles[at]=tile;
    const f=step?replay.steps[step-1]:replay.opening;
    previous.disabled=step===0;next.disabled=step===replay.steps.length;
    if(next.disabled)stop();
    status.textContent=[step+'/'+replay.steps.length,f.round+'라운드',step?replay.names[f.seat]:'대전 시작',
      f.timeout?'시간 초과':null,replayActionNames[f.action]||labels[f.action]||f.action,
      f.die?'주사위 '+f.die:null,Array.isArray(f.circleOffers)?f.circleOffers.map(id=>C.cards[id]?.name).filter(Boolean).join(' / '):null,
      f.effect?.[1],replayVerdict(replay,f)].filter(Boolean).join(' · ');
    wealth.replaceChildren(...(f.turnOrder||f.players.map((_,i)=>i)).map(i=>{
      const [at,cash,total]=f.players[i];
      const gems=Array.isArray(f.gems?.[i])&&Array.isArray(f.gemPrices)?f.gems[i].flatMap((n,e)=>n?[C.elements[e]+' '+n+'개 × '+f.gemPrices[e]+'G']:[]):[];
      return el('li',replay.names[i]+' · '+(at+1)+'번 칸 · '+cash+'G · 총 '+total+'G'+(gems.length?' · '+gems.join(', '):''));
    }));
    const details=Array.isArray(f.battle?.lines)?f.battle.lines:Array.isArray(f.notes)?f.notes:[];
    log.replaceChildren(...details.map(line=>el('li',String(line))));
    combat.replaceChildren();
    const b=f.battle;
    if(Array.isArray(b?.forms))b.forms.slice(0,2).forEach((id,i)=>{
      if(!C.cards[id])return;
      const item=C.cards[b.items?.[i]],cell=el('div');
      const final=C.cards[b.settled?.forms?.[i]??b.finalForms?.[i]];
      const endHP=b.settled?.hp?.[i]??b.finalHP?.[i]??'—',endST=b.settled?.st?.[i];
      cell.append(cardSeal(id),el('strong',C.cards[id].name),el('span',
        [item?.name,'HP '+(b.startHP?.[i]??'—')+' → '+endHP,Number.isFinite(endST)?'종료 ST '+endST:null,
          final&&final!==C.cards[id]?final.name:null].filter(Boolean).join(' · ')));
      combat.append(cell);
    });
    const movement={mapId:replay.map,round:f.round,switchRound:f.switchRound,switchSide:f.switchSide};
    stage.replaceChildren(...tiles.map(([type,owner,level,id,hp,,,,timeBombUntil],at)=>{
      const tile=el('div',String(at+1),'replay-tile '+(['fire','water','earth','wind'][type]||'special'));
      const [r,c]=board.position[at],span=board.rows+board.cols;
      tile.style.left=(board.stage?r:50+(c-r)*78/span)+'%';
      tile.style.top=(board.stage?c:12+(r+c-2)*79/Math.max(1,span-2))+'%';
      if(Array.isArray(f.path)&&f.path.includes(at))tile.classList.add('on-route');
      if(owner>=0&&owner<colors.length)tile.style.borderColor=colors[owner];
      const arrow=C.pathSwitch(movement,at);
      const bombRounds=C.timeBombRounds({round:f.round,turn:f.turn,players:f.players,turnOrder:f.turnOrder},{timeBombUntil});
      tile.title=[C.elements[type]||type,bombRounds?'시한폭탄 '+bombRounds+'라운드 남음':'',arrow?(arrow.to+1)+'번 방향 · '+arrow.rounds+'라운드 후 자동 전환':'Lv. '+level,C.cards[id]?.name,hp==null?'':hp+' HP'].filter(Boolean).join(' · ');
      const occupants=f.players.flatMap((p,i)=>p[0]===at?[i+1]:[]);
      if(occupants.length)tile.append(el('span',occupants.join('/'),'replay-pawns'));
      return tile;
    }));
  }
  seek.oninput=()=>go(Number(seek.value));
  menu.append(previous,play,next,seek,btn('파일 저장',()=>downloadReplay(replay)),btn('닫기',()=>dialog.close()));
  title.id='replayTitle';dialog.setAttribute('aria-labelledby',title.id);
  dialog.append(title,menu,status,stage,wealth,combat,log);
  dialog.addEventListener('close',()=>{stop();dialog.remove();},{once:true});
  document.querySelector('main').append(dialog);dialog.showModal();go(0);
}
function replayResult(controls,replay,roomId){
  const open=btn('전체 경기 리플레이',async()=>{
    open.disabled=true;
    try{showReplay(replay||await CepterCloudRoom.loadReplay(roomId));}
    catch(e){$('notice').textContent=e.message;}
    finally{open.disabled=false;}
  });
  controls.append(open);
}
const replayFile=el('input');replayFile.type='file';replayFile.accept='.json,application/json';replayFile.hidden=true;
$('replayLobby').append(btn('리플레이 파일 열기',()=>replayFile.click()),replayFile);
replayFile.onchange=async()=>{
  const file=replayFile.files[0];replayFile.value='';
  if(!file)return;
  try{
    if(file.size>16*1024*1024)throw Error('리플레이 파일은 16MB까지 열 수 있습니다.');
    showReplay(JSON.parse(await file.text()));
  }catch(e){$('notice').textContent=e.message;}
};
