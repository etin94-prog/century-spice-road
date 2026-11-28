'use strict';
// One chip balance shared by the 51 Worldwide money tables (blackjack, hold'em).
// It always lives in localStorage. With an ID it is also kept on the server at
// wallets/<token>, where the token is derived from ID + password on the device,
// so the same ID restores the balance on another phone. The password itself is
// never stored or sent.
// A device never uploads its balance, only what was won or lost since it last
// agreed with the server (chips - base). A phone left open with an old number
// therefore cannot wipe out what another phone won.
const Wallet=(()=>{
  const key='worldwide-wallet-v1',START=1000,REFILL=500,MAX=1e9,LOW=10;
  const state={chips:START,base:START,name:'',token:''};
  const listeners=new Set();
  let service,timer,running=null,queued=false,last=0,note='',busy=()=>false;
  const clamp=n=>Math.max(0,Math.min(MAX,Math.round(n)));
  const dirty=()=>!!state.token&&state.chips!==state.base;
  function read(){
    try{
      const s=JSON.parse(localStorage.getItem(key));
      if(s&&Number.isInteger(s.chips)&&s.chips>=0&&s.chips<=MAX){
        const signed=typeof s.name==='string'&&/^[a-f0-9]{64}$/.test(s.token||'');
        Object.assign(state,{chips:s.chips,name:signed?s.name:'',token:signed?s.token:'',base:signed&&Number.isInteger(s.base)&&s.base>=0?s.base:s.chips});
      }
    }catch{}
  }
  function store(){try{localStorage.setItem(key,JSON.stringify({...state,dirty:dirty()}));}catch{}}
  function emit(){paint();listeners.forEach(f=>f());}
  function soon(){clearTimeout(timer);timer=setTimeout(sync,700);}
  function set(n){
    if(!Number.isFinite(n))return state.chips;
    n=clamp(n);
    if(n===state.chips)return n;
    state.chips=n;store();emit();
    if(state.token)soon();
    return n;
  }
  async function db(){
    if(service)return service;
    const local=['127.0.0.1','localhost'].includes(location.hostname)&&new URL(location.href).searchParams.has('emulator');
    const config=local?{projectId:'demo-century',apiKey:'demo-key',databaseURL:'https://demo-century-default-rtdb.firebaseio.com'}:await fetch('./firebase-config.json').then(r=>{if(!r.ok)throw Error('서버 설정을 불러오지 못했습니다.');return r.json();});
    const base='https://www.gstatic.com/firebasejs/13.0.0/';
    const [app,auth,d]=await Promise.all(['firebase-app','firebase-auth','firebase-database'].map(n=>import(base+n+'.js')));
    const instance=app.getApps()[0]||app.initializeApp(config);
    const a=auth.getAuth(instance),database=d.getDatabase(instance);
    if(local&&!a.emulatorConfig){auth.connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});d.connectDatabaseEmulator(database,'127.0.0.1',9000);}
    await a.authStateReady();if(!a.currentUser)await auth.signInAnonymously(a);
    service={get:path=>d.get(d.ref(database,path)),update:values=>d.update(d.ref(database),values),transact:(path,change)=>d.runTransaction(d.ref(database,path),change),now:d.serverTimestamp};
    return service;
  }
  const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
  const bytes=text=>new TextEncoder().encode(text);
  async function derive(name,password){
    const material=await crypto.subtle.importKey('raw',bytes(password),'PBKDF2',false,['deriveBits']);
    return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes('worldwide-wallet:'+name.toLowerCase()),iterations:150000},material,256));
  }
  const nameKey=async name=>hex(await crypto.subtle.digest('SHA-256',bytes('worldwide-name:'+name.toLowerCase())));
  function check(name,password){
    if(!/^[0-9A-Za-z가-힣_]{2,12}$/.test(name))throw Error('아이디는 한글·영문·숫자 2~12자입니다.');
    if(password.length<6||password.length>64)throw Error('비밀번호는 6자 이상입니다.');
    if(!globalThis.crypto?.subtle)throw Error('이 주소에서는 계정을 쓸 수 없습니다. HTTPS로 접속하세요.');
  }
  // One reconcile at a time, across tabs too: two tabs must not both upload the
  // same winnings.
  const exclusive=work=>navigator.locks?navigator.locks.request(key,work):work();
  async function reconcile(){
    read();
    const token=state.token,before=state.chips;
    if(!token)return;
    try{
      const s=await db(),path='wallets/'+token;
      let local=state.chips,server;
      if(dirty()){
        // The first run may see an empty cache; the server then replays it with the real wallet.
        const done=await s.transact(path,wallet=>{
          local=state.chips;
          return {name:wallet?wallet.name:state.name,chips:clamp((wallet?wallet.chips:state.base)+local-state.base),at:s.now()};
        });
        server=done.snapshot.val()?.chips;
      }else{
        const snap=await s.get(path);
        server=snap.exists()?snap.val().chips:state.base;
      }
      if(state.token!==token||!Number.isInteger(server))return;
      // Anything won or lost while the request was in flight stays on top.
      state.chips=clamp(server+state.chips-local);state.base=server;store();note='';last=Date.now();
    }catch{note='서버 연결 안 됨 · 이 기기에 보관 중';}
    if(state.chips!==before)emit();
  }
  function sync(){
    clearTimeout(timer);
    if(!state.token)return Promise.resolve();
    if(running){queued=true;return running;}
    running=Promise.resolve().then(()=>exclusive(reconcile)).catch(()=>{}).then(()=>{
      running=null;paint();
      if(queued||(dirty()&&!note)){queued=false;soon();}
    });
    return running;
  }
  async function register(name,password){
    check(name,password);
    const s=await db(),token=await derive(name,password),taken='walletNames/'+await nameKey(name);
    if((await s.get(taken)).exists())throw Error('이미 있는 아이디입니다. 로그인하세요.');
    const chips=state.chips;
    // The ID and its wallet are written together, so a dropped connection cannot
    // leave an ID that nobody can use.
    try{await s.update({[taken]:true,['wallets/'+token]:{name,chips,at:s.now()}});}
    catch(error){if(!(await s.get('wallets/'+token)).exists())throw error;}
    Object.assign(state,{name,token,base:chips});store();emit();
    if(dirty())soon();
  }
  async function login(name,password){
    check(name,password);
    const s=await db(),token=await derive(name,password),snap=await s.get('wallets/'+token);
    if(!snap.exists()){
      const known=(await s.get('walletNames/'+await nameKey(name))).exists();
      throw Error(known?'비밀번호가 다릅니다.':'없는 아이디입니다. 새 아이디로 만들어 주세요.');
    }
    const saved=snap.val(),chips=Number.isInteger(saved.chips)?saved.chips:state.chips;
    Object.assign(state,{name:saved.name,token,chips,base:chips});store();emit();
  }
  async function logout(){
    if(dirty())await Promise.race([sync(),new Promise(done=>setTimeout(done,6000))]);
    if(dirty())throw Error('칩이 아직 서버에 저장되지 않았습니다. 연결을 확인한 뒤 다시 로그아웃하세요.');
    Object.assign(state,{name:'',token:'',base:state.chips});store();emit();
  }
  // A table holds refills while a stake is out; otherwise an all-in would be free.
  function refill(){return state.chips<LOW&&!busy()?set(REFILL):state.chips;}

  // ---- account dialog, shared by the lobby and the tables ----
  const css='#walletDialog{width:min(380px,94vw);max-height:90dvh;overflow:auto;overscroll-behavior:contain;padding:16px;background:#192f28;color:#f7efdf;border:1px solid #af996d;border-radius:12px;font:15px/1.4 system-ui,sans-serif}#walletDialog::backdrop{background:#081612bf}#walletDialog h2{margin:0 0 4px;font:600 20px Georgia,serif;color:#e6ca90}#walletDialog .sum{font-size:13px;color:#d5cdb9;margin:0 0 10px}#walletDialog .sum b{font-size:24px;color:#fff2ce;font-variant-numeric:tabular-nums;margin-right:4px}#walletDialog label{display:block;font-size:13px;margin-top:8px}#walletDialog input{display:block;width:100%;min-height:44px;margin-top:3px;padding:6px 10px;font:16px system-ui,sans-serif;color:#18282a;background:#fffdf5;border:1px solid #af996d;border-radius:8px}#walletDialog .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#walletDialog button{flex:1 1 auto;min-height:44px;padding:6px 12px;font:inherit;color:inherit;background:#20332d;border:1px solid #476053;border-radius:8px;cursor:pointer;touch-action:manipulation}#walletDialog button.primary{background:#edd29c;border-color:#ebd7ad;color:#252e22;font-weight:700}#walletDialog button:disabled{opacity:.55}#walletDialog #walletNote{min-height:1.4em;margin:8px 0 0;font-size:13px;color:#ffcf8a}#walletDialog small{display:block;margin-top:8px;font-size:12px;color:#b9c2b2}';
  let dialog;
  function build(){
    if(dialog)return dialog;
    document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));
    dialog=document.createElement('dialog');dialog.id='walletDialog';dialog.setAttribute('aria-labelledby','walletTitle');
    dialog.innerHTML='<h2 id="walletTitle">내 칩 · 계정</h2><p class="sum"><b id="walletChips"></b>칩 · <span id="walletWho"></span></p>'
      +'<form id="walletForm"><label>아이디<input id="walletName" name="username" autocomplete="username" maxlength="12" required></label><label>비밀번호<input id="walletPass" name="password" type="password" autocomplete="current-password" maxlength="64" required></label>'
      +'<div class="acts"><button class="primary" type="submit" value="login">로그인</button><button type="submit" value="register">새 아이디 만들기</button></div>'
      +'<small>아이디를 만들면 지금 가진 칩이 서버에 저장되고, 다른 기기에서도 같은 아이디로 이어서 쓸 수 있습니다. 비밀번호는 다시 찾을 수 없으니 기억해 두세요.</small></form>'
      +'<div class="acts"><button type="button" id="walletRefill">무료 리필 '+REFILL+'칩</button><button type="button" id="walletOut">로그아웃</button><button type="button" id="walletClose">닫기</button></div><p id="walletNote" role="status"></p>';
    document.body.appendChild(dialog);
    const q=id=>dialog.querySelector('#'+id),say=text=>{q('walletNote').textContent=text;};
    q('walletForm').onsubmit=async e=>{
      e.preventDefault();
      const make=e.submitter?.value==='register',buttons=dialog.querySelectorAll('button');
      buttons.forEach(b=>b.disabled=true);say(make?'아이디를 만드는 중…':'로그인하는 중…');
      try{
        await (make?register:login)(q('walletName').value.trim(),q('walletPass').value);
        q('walletPass').value='';say(make?'아이디를 만들었습니다. 칩이 서버에 저장됩니다.':'로그인했습니다. 서버의 칩을 불러왔습니다.');
      }catch(error){say(/PERMISSION_DENIED|permission/i.test(error.message)?'서버가 계정 저장을 아직 허용하지 않습니다.':error.message||'서버에 연결하지 못했습니다.');}
      buttons.forEach(b=>b.disabled=false);paint();
    };
    q('walletRefill').onclick=()=>{refill();say('칩을 '+REFILL+'개로 채웠습니다.');};
    q('walletOut').onclick=async()=>{
      q('walletOut').disabled=true;say('서버에 저장하는 중…');
      try{await logout();say('로그아웃했습니다. 칩은 이 기기에 남아 있습니다.');}catch(error){say(error.message);}
      q('walletOut').disabled=false;
    };
    q('walletClose').onclick=()=>dialog.close();
    return dialog;
  }
  function paint(){
    const label=state.name||'게스트';
    document.querySelectorAll('[data-wallet-chips]').forEach(el=>{el.textContent=state.chips.toLocaleString('ko-KR');});
    document.querySelectorAll('[data-wallet-name]').forEach(el=>{el.textContent=state.name?state.name+(note?' · '+note:''):'게스트 · 아이디 만들기';});
    if(!dialog)return;
    const q=id=>dialog.querySelector('#'+id);
    q('walletChips').textContent=state.chips.toLocaleString('ko-KR');
    q('walletWho').textContent=state.name?label+' · 서버 저장'+(note?' ('+note+')':''):'게스트 · 이 기기에만 저장';
    q('walletForm').hidden=!!state.name;q('walletOut').hidden=!state.name;q('walletRefill').hidden=state.chips>=LOW||busy();
  }
  function open(){build();paint();dialog.querySelector('#walletNote').textContent='';if(!dialog.open)dialog.showModal();}

  read();
  addEventListener('storage',e=>{if(e.key===key){read();emit();}});
  addEventListener('pagehide',()=>{if(dirty())sync();});
  // A page that comes back (tab switch, unlocked phone, back/forward cache) may be
  // behind another tab or another device.
  addEventListener('pageshow',e=>{if(e.persisted){read();emit();sync();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden?dirty():dirty()||Date.now()-last>10000)sync();});
  document.addEventListener('click',e=>{if(e.target.closest('[data-wallet-open]'))open();});
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();}
  const ready=sync();
  return {get chips(){return state.chips;},get name(){return state.name;},set,refill,open,onChange:f=>listeners.add(f),hold:f=>{busy=f;},sync,ready,register,login,logout,START,REFILL,LOW};
})();
