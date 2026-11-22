"use strict";
let online=null,roomService=null,openingRoom=false;
const roomIdFromUrl=()=>{
  const params=new URL(location.href).searchParams;
  const id=params.get('table')||params.get('room');
  return /^[a-f0-9]{32}$/.test(id||'')?id:null;
};
function seededGame(seed,roles=['친구']){
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return newGame(roles,random);
}
async function firebaseService(){
  if(roomService)return roomService;
  const local=['127.0.0.1','localhost'].includes(location.hostname)&&new URL(location.href).searchParams.has('emulator');
  const config=local?{projectId:'demo-century',apiKey:'demo-key',databaseURL:'https://demo-century-default-rtdb.firebaseio.com'}:await fetch('./firebase-config.json').then(r=>{if(!r.ok)throw Error('온라인 서비스 설정이 아직 배포되지 않았습니다.');return r.json();});
  const base='https://www.gstatic.com/firebasejs/13.0.0/';
  const [app,auth,db]=await Promise.all(['firebase-app','firebase-auth','firebase-database'].map(n=>import(base+n+'.js')));
  const instance=app.getApps()[0]||app.initializeApp(config);
  const a=auth.getAuth(instance),database=db.getDatabase(instance);
  if(local&&!a.emulatorConfig){auth.connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});db.connectDatabaseEmulator(database,'127.0.0.1',9000);}
  await a.authStateReady();const user=a.currentUser||(await auth.signInAnonymously(a)).user;
  roomService={...db,database,uid:user.uid};return roomService;
}
const roomRef=(s,id,path='',group=online?.group||'rooms')=>s.ref(s.database,group+'/'+id+(path?'/'+path:''));
function backToSolo(){const url=new URL(location.href);url.searchParams.delete('room');url.searchParams.delete('table');location.replace(url.href);}
function roomError(e){
  modal('게임방 연결', '<p id="roomError"></p><button id="retryRoom">다시 연결</button> <button id="solo">AI 대국으로</button>');
  el('roomError').textContent=e.message||'인터넷 연결을 확인해 주세요.';
  el('retryRoom').onclick=()=>location.reload();el('solo').onclick=backToSolo;
}
function roomMenu(){
  const url=location.href;
  const invite={title:'센추리 친구 대전',text:'센추리 한 판 같이 해요! 아래 링크로 입장하세요.',url};
  modal(online.ready?'온라인 '+g.players.length+'인 대전':'친구 초대','<div id="lobbySeats"></div><p>함께 할 친구에게 이 방의 링크를 보내세요. 같은 브라우저로 다시 열면 자기 자리로 돌아옵니다.</p><input id="invite" readonly aria-label="친구 초대 링크" style="width:100%"><div class="inviteActions"><button id="copyInvite">초대 링크 복사</button><button class="primary" id="shareInvite">공유</button></div><div id="shareFallback" hidden><p>이 브라우저에서는 공유창을 열 수 없습니다.</p><a id="mailInvite">메일로 초대하기</a></div><button id="solo">AI 대국으로</button>');
  if(online.group==='tables')drawLobby();
  el('invite').value=url;
  el('mailInvite').href='mailto:?subject='+encodeURIComponent(invite.title)+'&body='+encodeURIComponent(invite.text+'\n'+url);
  el('copyInvite').onclick=async()=>{
    try{await navigator.clipboard.writeText(url);el('copyInvite').textContent='복사됨';}
    catch{el('invite').select();}
  };
  el('shareInvite').onclick=async()=>{
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare(invite))){
        await navigator.share(invite);
        return;
      }
    }catch(error){if(error.name==='AbortError')return;}
    const fallback=el('shareFallback');
    if(fallback){fallback.hidden=false;el('mailInvite').focus();}
  };
  el('solo').onclick=backToSolo;
}
async function createOnline(){
  if(openingRoom)return;openingRoom=true;stopAI();
  try{
    const s=await firebaseService(),id=crypto.randomUUID().replaceAll('-','');
    await s.set(roomRef(s,id,'','tables'),{host:s.uid,seed:crypto.getRandomValues(new Uint32Array(1))[0],format:2});
    const url=new URL(location.href);url.searchParams.delete('room');url.searchParams.set('table',id);location.assign(url.href);
  }catch(e){openingRoom=false;roomError(e);}
}
async function enterOnline(id){
  stopAI();online={id,group:new URL(location.href).searchParams.has('table')?'tables':'rooms',seat:0,count:0,ready:false,pending:false,total:4,levels:['Medium','Medium','Medium','Medium']};
  modal('게임방 연결','<p>참가 좌석을 확인하고 있습니다.</p>');
  try{
    const s=await firebaseService(),host=(await s.get(roomRef(s,id,'host'))).val();
    if(!host)throw Error('초대 링크에 해당하는 방이 없습니다.');
    if(s.uid!==host&&online.group==='tables'){
      online.seat=await joinSeat(s,id);
    }else if(s.uid!==host){
      const guestRef=roomRef(s,id,'guest'),guest=(await s.get(guestRef)).val();
      if(guest&&guest!==s.uid)throw Error('두 자리가 모두 찼습니다.');
      if(!guest)await s.set(guestRef,s.uid);
      online.seat=1;
    }
    trackPresence(s,id);
    online.unsubscribe=s.onValue(roomRef(s,id),snap=>{
      if(!online.pending){try{syncRoom(snap.val());}catch(e){roomError(e);}}
    },roomError);
  }catch(e){roomError(e);}
}
function syncRoom(room){
  if(!room||![1,2].includes(room.format))throw Error('현재 버전과 호환되지 않는 방입니다.');
  if(room.format===2){
    online.people=1+Object.keys(room.seats||{}).length;
    online.config=room.config;
    if(!room.config){
      if(!online.inLobby){online.inLobby=true;el('setupTop').textContent='초대방';roomMenu();}
      else if(el('lobbySeats'))drawLobby();
      return;
    }
  }
  const presenceChanged=JSON.stringify(online.presence)!==JSON.stringify(room.presence);
  online.presence=room.presence;
  const first=!online.initialized,wasReady=online.ready;
  if(first){const roles=room.config?Array.from({length:room.config.total-1},(_,j)=>j+1<room.config.humans?'친구':room.config['level'+(j+1)]):['친구'];g=seededGame(room.seed,roles);online.initialized=true;}
  online.ready=Boolean(room.config||room.guest);
  if(first||(!wasReady&&online.ready)){close();render();if(!online.ready)roomMenu();}
  const moves=room.moves||{},last=Object.keys(moves).length;
  while(online.count<last){
    const row=moves['t'+online.count];if(!row||row.n!==online.count)throw Error('행동 기록을 다시 동기화해야 합니다.');
    const action=JSON.parse(row.action);
    if(!action||!['buy','order','play','rest'].includes(action.kind)||!Number.isInteger(action.i)||action.i<0)throw Error('유효하지 않은 행동 기록입니다.');
    // Recompute the board locally. No HTML, score, or board state from a peer is rendered.
    const animate=!first&&online.count===last-1;
    if(animate){
      const before=g.turn;advance(action,true,row.substitute===true);if(g.turn===before)throw Error('행동 기록이 규칙과 일치하지 않습니다.');
    }else{
      if(!apply(g,action))throw Error('행동 기록이 규칙과 일치하지 않습니다.');
      if(row.substitute)g.log[0].msg='AI 대행 · '+g.log[0].msg;
    }
    online.count++;
  }
  if(first||!wasReady||presenceChanged)render();
  if(first&&g.over)results();
  el('save').textContent='온라인 방 · '+(online.seat+1)+'번 좌석';
  scheduleRoomAI();
}
async function submitOnline(action,computer=false){
  if(online.pending||g.over||!(computer?canRunRoomAI():myTurn())||!apply(structuredClone(g),action))return;
  online.pending=true;
  if(!computer&&el('confirm'))el('confirm').disabled=true;
  const s=roomService,id=online.id,n=online.count;
  try{
    const turnRef=roomRef(s,id,'moves/t'+n);
    const row={n,action:JSON.stringify(action)};
    if(computer){
      if(!onlineAI(g.turn))row.substitute=true;
      // All connected seats may offer the same AI turn. Replay only the server winner.
      await s.runTransaction(turnRef,current=>current===null?row:undefined,{applyLocally:false});
    }else await s.set(turnRef,row);
    const snap=await s.get(roomRef(s,id));online.pending=false;syncRoom(snap.val());
  }catch(e){
    online.pending=false;
    try{
      const snap=await s.get(roomRef(s,id));
      if(computer||snap.child('moves/t'+n).exists()){online.aiJob=null;syncRoom(snap.val());return;}
    }catch{}
    roomError(e);
  }
}

async function joinSeat(s,id){
  for(let i=1;i<=3;i++){
    const ref=roomRef(s,id,'seats/'+i);
    const owner=(await s.get(ref)).val();
    if(owner===s.uid)return i;
    if(owner)continue;
    try{await s.set(ref,s.uid);return i;}
    catch(error){
      const winner=(await s.get(ref)).val();
      if(winner===s.uid)return i;
      if(!winner)throw Error('이미 대국이 시작되어 새로 입장할 수 없습니다.');
    }
  }
  throw Error('네 자리가 모두 찼습니다.');
}
function onlineAI(i){return Boolean(online?.config&&i>=online.config.humans);}
function trackPresence(s,id){
  const seat=roomRef(s,id,'presence/'+online.seat);
  const path='connections/'+crypto.randomUUID();
  let generation=0;
  s.onValue(s.ref(s.database,'.info/connected'),async snap=>{
    const current=++generation;
    online.connected=false;
    if(!snap.val()){if(online.initialized)render();return;}

    try{
      await s.onDisconnect(seat).update({[path]:null,changed:s.serverTimestamp()});
      if(generation!==current)return;
      await s.update(seat,{[path]:true,changed:s.serverTimestamp()});
      if(generation!==current)return;
      online.connected=true;
      if(online.initialized){render();scheduleRoomAI();}
    }catch(e){if(generation===current)roomError(e);}
  },roomError);
}
function awaySeat(i){
  const presence=online?.presence?.[i];
  return !!presence?.changed&&!presence.connections;
}
function canRunRoomAI(){
  return online?.ready&&online.connected&&!g.over&&g.turn!==online.seat&&(onlineAI(g.turn)||awaySeat(g.turn));
}
function scheduleRoomAI(){
  if(!canRunRoomAI()){online.aiJob=null;return;}
  if(online.pending||online.aiJob?.revision===online.count)return;
  const revision=online.count,job={revision};online.aiJob=job;
  const substitute=!onlineAI(g.turn);
  setTimeout(async()=>{
    if(online.aiJob!==job||revision!==online.count||!canRunRoomAI())return;
    const players=g.players.map((p,i)=>substitute&&i===g.turn?{...p,level:'Medium'}:p);
    const board={players,turn:g.turn,orders:g.orders,market:g.market,gold:g.gold,silver:g.silver};
    let move;
    try{
      move=await new Promise((resolve,reject)=>{
        const ai=new Worker('ai-worker.js');
        ai.onmessage=e=>{ai.terminate();resolve(e.data);};
        ai.onerror=e=>{ai.terminate();reject(e);};ai.postMessage(board);
      });
    }catch{move=chooseMove(board);}
    if(online.aiJob===job&&revision===online.count&&canRunRoomAI()){
      move.i??=0;
      await submitOnline(move,true);
    }
  },(substitute?8500:850)+online.seat*350);
}
function drawLobby(){
  const box=el('lobbySeats'),humans=online.people||1;
  if(online.ready){box.textContent='사람 '+online.config.humans+'명 · AI '+(online.config.total-online.config.humans)+'명';return;}
  online.total=Math.max(humans,online.total);
  box.innerHTML='<p><b>참가한 사람 '+humans+'/4명</b> · 내 좌석 '+(online.seat+1)+'번</p>';
  if(online.seat){box.innerHTML+='<p>방장이 인원과 AI 난이도를 정하고 시작합니다.</p>';return;}
  const total=online.total;
  box.innerHTML+='<label>전체 인원 <select id="roomTotal">'+[2,3,4].filter(n=>n>=humans).map(n=>'<option value="'+n+'" '+(n===total?'selected':'')+'>'+n+'인</option>').join('')+'</select></label><p>시작할 때 빈 자리를 AI로 채웁니다. 연결이 끊긴 사람의 차례는 잠시 기다린 뒤 Medium AI가 대행합니다.</p>';
  for(let i=Math.max(2,humans);i<total;i++){
    box.innerHTML+='<div class="seat"><label for="roomLevel'+i+'">'+(i+1)+'번 좌석 AI</label><select id="roomLevel'+i+'">'+levels.map(l=>'<option '+(online.levels[i]===l?'selected':'')+'>'+l+'</option>').join('')+'</select></div>';
  }
  box.innerHTML+='<button class="primary" id="beginTable" '+(humans<2?'disabled':'')+'>'+(humans<2?'친구 입장 대기':'사람 '+humans+'명 · AI '+(total-humans)+'명으로 시작')+'</button><small id="startHint"></small>';
  el('roomTotal').onchange=e=>{online.total=+e.target.value;drawLobby();};
  for(let i=Math.max(2,humans);i<total;i++)el('roomLevel'+i).onchange=e=>online.levels[i]=e.target.value;
  el('beginTable').onclick=async()=>{
    const config={humans,total};for(let i=humans;i<total;i++)config['level'+i]=online.levels[i];
    el('beginTable').disabled=true;
    // Wait for the server to confirm the exact roster before starting locally.
    try{
      await roomService.runTransaction(roomRef(roomService,online.id,'config'),current=>current===null?config:undefined,{applyLocally:false});
    }catch{
      if(el('lobbySeats')){drawLobby();el('startHint').textContent='참가 인원이 바뀌었거나 연결이 끊겼습니다. 확인 후 다시 시작하세요.';}
    }
  };
}
