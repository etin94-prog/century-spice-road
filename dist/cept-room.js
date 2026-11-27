// Room state is authoritative on the server. A seat credential stays on its device.
const inviteId=new URLSearchParams(location.search).get('ceptRoom');
const recoveryCode=new URLSearchParams(location.hash.slice(1)).get('recoverSeat');
const recoveryControl=btn('좌석 복구',showRecoveryDialog);
recoveryControl.hidden=true;
$('matchMenu').querySelector('.match-menu-items').append(recoveryControl);
let pollTimer,onlineKey,cloudRoom=new URLSearchParams(location.search).has('ceptCloud');
function newKey(){return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function requestRoom(path,method='GET',payload){
  const response=await fetch('/api/cept/'+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+onlineKey,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});
  const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'초대 서버 응답 오류'),{status:response.status});return data;
}
function applyRoom(data){
  const first=!room?.started;
  if(room?.started&&data.revision!==room.revision)document.querySelector('#turnPicker[open]')?.close();
  const lanOrigin=data.lanOrigin||room?.lanOrigin;
  const clockOffset=data.serverNow!=null?data.serverNow-Date.now():(room?.clockOffset||0);
  room={lanOrigin,clockOffset,id:data.id,seat:data.seat,revision:data.revision,busy:false,started:!!data.game,choices:data.choices||[],recoverable:data.recoverable||[]};
  recoveryControl.hidden=!room.recoverable.length||cloudRoom;
  $('roomWait').hidden=!!data.game;$('config').hidden=true;
  $('campaignPanel').hidden=true;$('replayLobby').hidden=true;
  if(data.game&&(data.game.edition||'ps2')!==C.edition){const url=new URL(location.href);url.searchParams.set('edition',data.game.edition||'ps2');location.replace(url);return;}
  if(data.game){
    const oldCard=s?.players[room.seat]?.hand[focusCard];
    s=data.game;pending=false;
    if(oldCard==null||s.players[room.seat].hand[focusCard]!==oldCard)focusCard=-1;
    if(first)enter();else render();return;
  }
  const here=roomInviteUrl(data.id);
  const field=el('input');field.readOnly=true;field.value=here.href;field.setAttribute('aria-label','초대 주소');
  const copy=btn('초대 주소 복사',async()=>{try{await navigator.clipboard.writeText(field.value);copy.textContent='복사됨';}catch{field.focus();field.select();}});
  $('roomWait').replaceChildren(el('h2','참가자 대기 · '+data.joined+' / '+data.needed+'명'),el('p','각 기기에서 초대 주소를 열면 시작합니다. 내 좌석은 '+(data.seat+1)+'번입니다.'),field,copy);
  if(navigator.share)$('roomWait').append(btn('친구에게 공유',async()=>{try{await navigator.share({title:'컬드셉트 친구 대전',url:here.href});}catch(e){if(e.name!=='AbortError'){field.focus();field.select();}}}));
  if(!recoveryControl.hidden)$('roomWait').append(btn('좌석 복구',showRecoveryDialog));
  $('roomWait').append(btn('로비로',()=>location.assign(location.pathname+(C.edition==='ps2'?'':'?edition='+C.edition))));
}
function roomInviteUrl(id,lan=room.lanOrigin){
  const here=new URL(lan&&['localhost','127.0.0.1','[::1]'].includes(location.hostname)?location.pathname:location.href,lan||location.origin);here.search='';here.hash='';if(C.edition!=='ps2')here.searchParams.set('edition',C.edition);here.searchParams.set('ceptRoom',id);
  if(cloudRoom)here.searchParams.set('ceptCloud','1');
  if(CepterCloudRoom.local)here.searchParams.set('emulator','1');
  return here;
}
function showRecoveryDialog(){
  if(cloudRoom||!room?.recoverable.length)return;
  const dialog=$('matchInfo'),panel=$('matchInfoBody'),menu=$('matchMenu'),id=room.id;
  const select=el('select'),label=el('label','복구할 좌석'),status=el('p'),link=el('input'),output=el('div');
  for(const seat of room.recoverable)select.add(new Option((seat+1)+'번 좌석',seat));
  label.append(select);status.setAttribute('role','status');
  link.readOnly=true;link.setAttribute('aria-label','일회용 좌석 복구 링크');
  output.hidden=true;
  const copy=btn('복구 링크 복사',async()=>{
    try{await navigator.clipboard.writeText(link.value);status.textContent='복구 링크를 복사했습니다.';}
    catch{link.focus();link.select();}
  });
  output.append(link,copy);
  const issue=btn('일회용 링크 발급',async()=>{
    issue.disabled=true;select.disabled=true;status.textContent='';output.hidden=true;
    try{
      const result=await requestRoom('rooms/'+id+'/recovery-link','POST',{seat:Number(select.value)});
      const url=roomInviteUrl(id,result.lanOrigin||room.lanOrigin);url.hash='recoverSeat='+result.code;
      link.value=url.href;output.hidden=false;link.focus();link.select();
      status.textContent='선택한 참가자에게만 전달하세요. 링크는 15분 동안 유효합니다.';
    }catch(e){status.textContent=e.message;}finally{issue.disabled=false;select.disabled=false;}
  },'primary');
  $('matchInfoTitle').textContent='좌석 복구';
  panel.append(label,el('p','새 기기에서 링크를 사용하면 기존 기기의 좌석 연결이 종료됩니다.'),issue,output,status);
  menu.open=false;
  dialog.addEventListener('close',()=>{panel.replaceChildren();if(room?.started)menu.querySelector('summary').focus();},{once:true});
  dialog.showModal();
}
function claimRecovery(){
  const waiting=$('roomWait'),status=el('p');
  status.setAttribute('role','status');
  const claim=btn('기존 좌석 복구',async()=>{
    claim.disabled=true;status.textContent='';
    const pending='cept-room-recovery-'+inviteId;
    onlineKey=localStorage.getItem('cept-room-seat-'+inviteId)||sessionStorage.getItem(pending)||newKey();
    sessionStorage.setItem(pending,onlineKey);
    try{
      const data=await requestRoom('rooms/'+inviteId+'/recover','POST',{code:recoveryCode});
      remember(inviteId);sessionStorage.removeItem(pending);applyRoom(data);pollRoom();
    }catch(e){status.textContent=e.message;claim.disabled=false;}
  },'primary');
  waiting.hidden=false;waiting.replaceChildren(el('h2','좌석 복구'),el('p','기존 좌석의 덱과 진행 상태로 돌아갑니다.'),claim,status);
}
function remember(id){localStorage.setItem('cept-room-seat-'+id,onlineKey);const url=new URL(location.href);url.searchParams.set('ceptRoom',id);if(recoveryCode)url.hash='';history.replaceState(null,'',url);}
async function joinLocalRoom(book){
  const data=await requestRoom('rooms/'+inviteId+'/join','POST',{book});
  remember(inviteId);applyRoom(data);pollRoom();
}
function chooseGuestBook(joinRoom=joinLocalRoom){
  const waiting=$('roomWait'),label=el('label','사용할 북'),book=el('select'),error=el('p');
  addOpeningBookOptions(book);
  label.append(book);
  const join=btn('이 북으로 참가',async()=>{
    join.disabled=true;error.textContent='';
    const template=openingBook(book.value)??null;
    try{await joinRoom(template);}catch(e){error.textContent=e.message;join.disabled=false;}
  },'primary');
  error.setAttribute('role','status');
  waiting.hidden=false;waiting.replaceChildren(el('h2','친구 대전 참가'),label,join,error);
}
async function pollRoom(){
  clearTimeout(pollTimer);if(!room)return;
  if(!room.busy){const revision=room.revision;
    try{const data=await requestRoom('rooms/'+room.id);
      if(!room.busy&&room.revision===revision&&data.revision>revision)applyRoom(data);
    }catch(e){
      if(e.status===403){room.busy=true;render();$('notice').textContent='이 기기의 좌석 연결이 종료되었습니다. 방장에게 복구 링크를 요청하세요.';return;}
      $('notice').textContent='연결 재시도 중 · '+e.message;
    }
  }
  pollTimer=setTimeout(pollRoom,1100);
}
async function roomAction(a){
  if(!room||room.busy||room.seat!==C.actor(s))return;
  if(cloudRoom){await CepterCloudRoom.action(a);return;}
  room.busy=true;render();
  try{applyRoom(await requestRoom('rooms/'+room.id+'/action','POST',{revision:room.revision,action:a}));$('notice').textContent='';}
  catch(e){$('notice').textContent=e.message;try{applyRoom(await requestRoom('rooms/'+room.id));}catch{room.busy=false;render();}}
}
$('hostRoom').onclick=async()=>{
  if(+$('humans').value<2){$('roomHelp').textContent='사람 좌석을 2명 이상 선택하세요.';$('humans').focus();return;}
  $('hostRoom').disabled=true;
  try{
    const count=+$('count').value,humans=+$('humans').value,target=+$('target').value,mapId=$('mapChoice').value,book=chosenBook(),aiBook=chosenAiBook(),aiLevel=selectedAiLevel(),alliance=$('alliance').value,roundLimit=+$('roundLimit').value;
    const options=matchOptions();
    if(cloudRoom){
      const game=C.start(count,humans,target,mapId,book,aiBook,aiLevel,alliance,roundLimit);
      const id=await CepterCloudRoom.create(C.configureMatch(game,options),humans);
      const url=new URL(location.href);url.searchParams.set('ceptCloud','1');url.searchParams.set('ceptRoom',id);history.replaceState(null,'',url);
      await CepterCloudRoom.join(id);return;
    }
    onlineKey=newKey();const data=await requestRoom('rooms','POST',{edition:C.edition,count,humans,target,mapId,book,aiBook,aiLevel,alliance,roundLimit,...options});
    remember(data.id);applyRoom(data);pollRoom();
  }catch(e){$('roomHelp').textContent='초대방을 열 수 없습니다. '+e.message;}finally{$('hostRoom').disabled=false;}
};
(async()=>{
  if(/^[0-9a-f]{32}$/.test(inviteId||'')){
    $('config').hidden=true;
    $('campaignPanel').hidden=true;$('replayLobby').hidden=true;
    try{
      if(cloudRoom){await CepterCloudRoom.join(inviteId);return;}
      const savedKey=localStorage.getItem('cept-room-seat-'+inviteId);
      onlineKey=savedKey||newKey();
      if(savedKey&&!recoveryCode){
        try{applyRoom(await requestRoom('rooms/'+inviteId));pollRoom();}
        catch(e){
          if(e.status===403)throw Error('이 기기의 좌석 연결이 종료되었습니다. 방장에게 복구 링크를 요청하세요.');
          throw e;
        }
        return;
      }
      const {edition}=await requestRoom('rooms/'+inviteId+'/lobby');
      if(edition!==C.edition){const url=new URL(location.href);url.searchParams.set('edition',edition);location.replace(url);return;}
      if(recoveryCode){claimRecovery();return;}
      chooseGuestBook();
    }
    catch(e){$('roomWait').hidden=false;$('roomWait').replaceChildren(el('p',e.message),btn('로비로',()=>location.assign(location.pathname)));}
    return;
  }
  $('hostRoom').disabled=true;
  try{if(location.protocol==='file:'||CepterCloudRoom.local)throw Error();const r=await fetch('/api/cept/status',{cache:'no-store'});if(!r.ok||!(await r.json()).available)throw Error();$('hostRoom').disabled=false;$('roomHelp').textContent='같은 서버에 연결한 기기끼리 초대 대전을 할 수 있습니다.';}
  catch{
    cloudRoom=location.protocol==='https:'||CepterCloudRoom.local;
    $('hostRoom').disabled=!cloudRoom;
    $('roomHelp').textContent=cloudRoom?'친구가 각자 휴대폰에서 참가합니다. 대전 중 방장은 이 창을 열어 두세요.':'한 기기에서 번갈아 플레이할 수 있습니다. 기기별 초대는 공개 사이트 또는 대전 서버에서 이용하세요.';
  }
})();
