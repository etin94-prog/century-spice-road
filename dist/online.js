"use strict";
let online=null,roomService=null,openingRoom=false;
const roomIdFromUrl=()=>{
  const id=new URL(location.href).searchParams.get('room');
  return /^[a-f0-9]{32}$/.test(id||'')?id:null;
};
function seededGame(seed){
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return newGame(['친구'],random);
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
const roomRef=(s,id,path='')=>s.ref(s.database,'rooms/'+id+(path?'/'+path:''));
function backToSolo(){const url=new URL(location.href);url.searchParams.delete('room');location.replace(url.href);}
function roomError(e){
  modal('게임방 연결', '<p id="roomError"></p><button id="retryRoom">다시 연결</button> <button id="solo">AI 대국으로</button>');
  el('roomError').textContent=e.message||'인터넷 연결을 확인해 주세요.';
  el('retryRoom').onclick=()=>location.reload();el('solo').onclick=backToSolo;
}
function roomMenu(){
  const url=location.href;
  modal(online.ready?'온라인 2인 대전':'친구 초대','<p>친구 한 명에게 이 방의 링크를 보내세요. 같은 브라우저로 다시 열면 자기 자리로 돌아옵니다.</p><input id="invite" readonly aria-label="친구 초대 링크" style="width:100%"><button class="primary" id="copyInvite">초대 링크 복사</button><button id="solo">AI 대국으로</button>');
  el('invite').value=url;el('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(url);el('copyInvite').textContent='복사됨';}catch{el('invite').select();}};el('solo').onclick=backToSolo;
}
async function createOnline(){
  if(openingRoom)return;openingRoom=true;stopAI();
  try{
    const s=await firebaseService(),id=crypto.randomUUID().replaceAll('-','');
    await s.set(roomRef(s,id),{host:s.uid,seed:crypto.getRandomValues(new Uint32Array(1))[0],format:1});
    const url=new URL(location.href);url.searchParams.set('room',id);location.assign(url.href);
  }catch(e){openingRoom=false;roomError(e);}
}
async function enterOnline(id){
  stopAI();online={id,seat:0,count:0,ready:false,pending:false};
  modal('게임방 연결','<p>참가 좌석을 확인하고 있습니다.</p>');
  try{
    const s=await firebaseService(),host=(await s.get(roomRef(s,id,'host'))).val();
    if(!host)throw Error('초대 링크에 해당하는 방이 없습니다.');
    if(s.uid!==host){
      const guestRef=roomRef(s,id,'guest'),guest=(await s.get(guestRef)).val();
      if(guest&&guest!==s.uid)throw Error('두 자리가 모두 찼습니다.');
      if(!guest)await s.set(guestRef,s.uid);
      online.seat=1;
    }
    online.unsubscribe=s.onValue(roomRef(s,id),snap=>{
      if(!online.pending){try{syncRoom(snap.val());}catch(e){roomError(e);}}
    },roomError);
  }catch(e){roomError(e);}
}
function syncRoom(room){
  if(!room||room.format!==1)throw Error('현재 버전과 호환되지 않는 방입니다.');
  const first=!online.initialized,wasReady=online.ready;
  if(first){g=seededGame(room.seed);online.initialized=true;}
  online.ready=Boolean(room.guest);
  if(first||(!wasReady&&online.ready)){close();render();if(!online.ready)roomMenu();}
  const moves=room.moves||{},last=Object.keys(moves).length;
  while(online.count<last){
    const row=moves['t'+online.count];if(!row||row.n!==online.count)throw Error('행동 기록을 다시 동기화해야 합니다.');
    const action=JSON.parse(row.action);
    if(!action||!['buy','order','play','rest'].includes(action.kind)||!Number.isInteger(action.i)||action.i<0)throw Error('유효하지 않은 행동 기록입니다.');
    // Recompute the board locally. No HTML, score, or board state from a peer is rendered.
    const animate=!first&&online.count===last-1;
    if(animate){
      const before=g.turn;advance(action,true);if(g.turn===before)throw Error('행동 기록이 규칙과 일치하지 않습니다.');
    }else if(!apply(g,action))throw Error('행동 기록이 규칙과 일치하지 않습니다.');
    online.count++;
  }
  if(first||!wasReady){render();if(g.over)results();}
  el('save').textContent='온라인 방 · '+(online.seat?'후공':'선공');
}
async function submitOnline(action){
  if(!myTurn()||g.over||!apply(structuredClone(g),action))return;
  online.pending=true;el('confirm').disabled=true;
  const s=roomService,id=online.id,n=online.count;
  try{
    await s.set(roomRef(s,id,'moves/t'+n),{n,action:JSON.stringify(action)});
    const snap=await s.get(roomRef(s,id));online.pending=false;syncRoom(snap.val());
  }catch(e){online.pending=false;roomError(e);}
}
