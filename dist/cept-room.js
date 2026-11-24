// Room state is authoritative on the server. A seat credential stays on its device.
const inviteId=new URLSearchParams(location.search).get('ceptRoom');
let pollTimer,onlineKey;
function newKey(){return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function requestRoom(path,method='GET',payload){
  const response=await fetch('/api/cept/'+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+onlineKey,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});
  const data=await response.json();if(!response.ok)throw Error(data.error||'초대 서버 응답 오류');return data;
}
function applyRoom(data){
  const first=!room?.started;
  const lanOrigin=data.lanOrigin||room?.lanOrigin;
  room={lanOrigin,id:data.id,seat:data.seat,revision:data.revision,busy:false,started:!!data.game,choices:data.choices||[]};
  $('roomWait').hidden=!!data.game;$('config').hidden=true;
  if(data.game){s=data.game;pending=false;focusCard=inspect=-1;if(first)enter();else render();return;}
  const here=new URL(room.lanOrigin&&['localhost','127.0.0.1','[::1]'].includes(location.hostname)?location.pathname:location.href,room.lanOrigin||location.origin);here.search='';here.searchParams.set('ceptRoom',data.id);
  const field=el('input');field.readOnly=true;field.value=here.href;field.setAttribute('aria-label','초대 주소');
  $('roomWait').replaceChildren(el('h2','참가자 대기 · '+data.joined+' / '+data.needed+'명'),el('p','각 기기에서 초대 주소를 열면 시작합니다. 내 좌석은 '+(data.seat+1)+'번입니다.'),field,
    btn('초대 주소 복사',async()=>{field.select();try{await navigator.clipboard.writeText(field.value);}catch{field.focus();}}),btn('로비로',()=>location.assign(location.pathname)));
}
function remember(id){localStorage.setItem('cept-room-seat-'+id,onlineKey);const url=new URL(location.href);url.searchParams.set('ceptRoom',id);history.replaceState(null,'',url);}
async function pollRoom(){
  clearTimeout(pollTimer);if(!room)return;
  if(!room.busy){const revision=room.revision;
    try{const data=await requestRoom('rooms/'+room.id);
      if(!room.busy&&room.revision===revision&&data.revision>revision)applyRoom(data);
    }catch(e){$('notice').textContent='연결 재시도 중 · '+e.message;}
  }
  pollTimer=setTimeout(pollRoom,1100);
}
async function roomAction(a){
  if(!room||room.busy||room.seat!==C.actor(s))return;
  room.busy=true;render();
  try{applyRoom(await requestRoom('rooms/'+room.id+'/action','POST',{revision:room.revision,action:a}));$('notice').textContent='';}
  catch(e){$('notice').textContent=e.message;try{applyRoom(await requestRoom('rooms/'+room.id));}catch{room.busy=false;render();}}
}
$('hostRoom').onclick=async()=>{
  if(+$('humans').value<2){$('roomHelp').textContent='사람 좌석을 2명 이상 선택하세요.';return;}
  $('hostRoom').disabled=true;
  try{
    onlineKey=newKey();const data=await requestRoom('rooms','POST',{count:+$('count').value,humans:+$('humans').value,target:+$('target').value,mapId:$('mapChoice').value,book:chosenBook(),aiBook:chosenAiBook()});
    remember(data.id);applyRoom(data);pollRoom();
  }catch(e){$('roomHelp').textContent='초대방을 열 수 없습니다. '+e.message;}finally{$('hostRoom').disabled=false;}
};
(async()=>{
  if(/^[0-9a-f]{32}$/.test(inviteId||'')){
    $('config').hidden=true;
    try{onlineKey=localStorage.getItem('cept-room-seat-'+inviteId)||newKey();remember(inviteId);applyRoom(await requestRoom('rooms/'+inviteId+'/join','POST',{}));pollRoom();}
    catch(e){$('roomWait').hidden=false;$('roomWait').replaceChildren(el('p',e.message),btn('로비로',()=>location.assign(location.pathname)));}
    return;
  }
  $('hostRoom').disabled=true;
  try{if(location.protocol==='file:')throw Error();const r=await fetch('/api/cept/status',{cache:'no-store'});if(!r.ok||!(await r.json()).available)throw Error();$('hostRoom').disabled=false;$('roomHelp').textContent='같은 서버에 연결한 기기끼리 초대 대전을 할 수 있습니다.';}
  catch{$('roomHelp').textContent='이 화면에서는 한 기기 대전을 이용할 수 있습니다. 초대방은 컬드셉트 대전 서버에서 열립니다.';}
})();