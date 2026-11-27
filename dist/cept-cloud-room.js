// On static hosting, the room creator runs the engine. Guests receive only their seat's view.
const CepterCloudRoom=(()=>{
  const local=['localhost','127.0.0.1'].includes(location.hostname)&&new URL(location.href).searchParams.has('emulator');
  let service,session,clockTimer;
  async function connect(){
    if(service)return service;
    const config=local?{projectId:'demo-century',apiKey:'demo-key',databaseURL:'https://demo-century-default-rtdb.firebaseio.com'}:
      await fetch('./firebase-config.json').then(r=>{if(!r.ok)throw Error('온라인 대전 설정을 읽을 수 없습니다.');return r.json();});
    const base='https://www.gstatic.com/firebasejs/13.0.0/';
    const [app,auth,db]=await Promise.all(['app','auth','database'].map(name=>import(base+'firebase-'+name+'.js')));
    const instance=app.getApps()[0]||app.initializeApp(config),a=auth.getAuth(instance),database=db.getDatabase(instance);
    if(local&&!a.emulatorConfig){auth.connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});db.connectDatabaseEmulator(database,'127.0.0.1',9000);}
    await a.authStateReady();const user=a.currentUser||(await auth.signInAnonymously(a)).user;
    service={db,database,uid:user.uid,serverOffset:0};
    db.onValue(db.ref(database,'.info/serverTimeOffset'),snap=>{service.serverOffset=snap.val()||0;});
    return service;
  }
  const path=(id,child='')=>service.db.ref(service.database,'ceptRooms/'+id+(child?'/'+child:''));
  const warn=e=>{$('notice').textContent='초대방 연결을 확인하세요. '+e.message;};
  async function create(game,needed){
    const {uid,db}=await connect(),id=newKey().slice(0,32);
    await db.set(path(id),{meta:{host:uid,needed,edition:game.edition,openingBooks:true},seats:{s0:uid},state:JSON.stringify(game),revision:0,actor:0});
    return id;
  }
  async function seatFor(id,meta,book){
    const {db,uid}=service;
    if(book!=null&&!C.validBook(book))throw Error('사용할 수 없는 북입니다.');
    const books=meta.openingBooks&&book!=null?JSON.stringify(book):null;
    for(let i=0;i<meta.needed;i++){
      const ref=path(id,'seats/s'+i),taken=(await db.get(ref)).val();
      if(taken===uid)return i;
      if(taken||!i)continue;
      try{
        if(books)await db.update(path(id),{['seats/s'+i]:uid,['openingBooks/s'+i]:books});
        else await db.set(ref,uid);
        return i;
      }
      catch(e){const owner=(await db.get(ref)).val();if(owner===uid)return i;if(!owner)throw e;}
    }
    throw Error('모든 좌석이 찼습니다.');
  }
  function recoverySeats(seats){
    return Object.keys(seats||{}).filter(slot=>/^s[1-3]$/.test(slot)).map(slot=>Number(slot[1]));
  }
  async function recoveryProof(code){
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
    return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function issueRecovery(id,seat){
    const {db,uid,serverOffset}=service;
    if(!session?.host||session.id!==id||!Number.isInteger(seat)||seat<1||seat>3)throw Error('방장만 참가자의 좌석을 복구할 수 있습니다.');
    const slot='s'+seat,code=slot+'.'+newKey(),proof=await recoveryProof(code);
    const expires=Date.now()+serverOffset+15*60*1000;
    const result=await db.runTransaction(path(id),r=>{
      if(!r||r.meta.host!==uid||!r.seats[slot])return;
      r.recoveryTickets??={};
      r.recoveryTickets[slot]={proof,expires};
      return r;
    },{applyLocally:false});
    if(!result.committed)throw Error('복구할 좌석을 찾을 수 없습니다.');
    return {code};
  }
  async function claimRecovery(id,code){
    const {db,uid}=await connect();
    if(!/^s[1-3]\.[0-9a-f]{64}$/.test(code))throw Error('좌석 복구 링크가 올바르지 않습니다.');
    const slot=code.slice(0,2),proof=await recoveryProof(code);
    const claim=path(id,'recoveryTickets/'+slot+'/claims/'+proof);
    try{await db.set(claim,uid);}
    catch(e){
      // The same claimant can resume a previously accepted request after a reload.
      const receipt=await db.get(claim).catch(()=>null);
      if(receipt?.val()!==uid)throw Error('이 링크는 만료되었거나 이미 사용되었거나 현재 기기가 다른 좌석에 연결되어 있습니다.');
    }
    let stop,timeout;
    try{
      await new Promise((resolve,reject)=>{
        timeout=setTimeout(()=>reject(Error('방장 연결을 기다리는 중입니다. 방장이 방을 다시 열면 이 기기에서 재시도하세요.')),15000);
        stop=db.onValue(path(id,'seats/'+slot),snap=>{if(snap.val()===uid)resolve();},reject);
      });
    }finally{clearTimeout(timeout);stop?.();}
    const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);
    await join(id);
  }
  function transferSeats(r){
    let changed=false;
    for(const seat of recoverySeats(r.seats)){
      const slot='s'+seat,ticket=r.recoveryTickets?.[slot],guest=ticket?.claims?.[ticket.proof];
      if(!guest||ticket.redeemed)continue;
      ticket.redeemed=true;changed=true;
      if(Object.values(r.seats).includes(guest))continue;
      r.formerSeats??={};r.formerSeats[r.seats[slot]]=true;delete r.formerSeats[guest];
      r.seats[slot]=guest;
      if(r.pending?.seat===seat)delete r.pending;
    }
    return changed;
  }
  async function advance(id){
    const {db}=service,ref=path(id),now=Date.now();
    await db.runTransaction(ref,r=>{
      if(!r)return;
      const transferred=transferSeats(r);
      if(Object.keys(r.seats).length!==r.meta.needed)return transferred?r:undefined;
      const game=JSON.parse(r.state),request=r.pending;
      if(!r.views){
        for(let seat=1;seat<r.meta.needed;seat++){
          const saved=r.openingBooks?.['s'+seat];
          if(typeof saved!=='string')continue;
          let book;
          try{book=JSON.parse(saved);}catch{continue;}
          C.setOpeningBook(game,seat,book);
        }
        delete r.openingBooks;
      }
      const timedOut=C.expire(game,now);
      if(r.views&&!request&&!timedOut&&!transferred)return;
      if(!timedOut&&request&&request.revision===r.revision&&r.actor===request.seat){
        let move;try{move=JSON.parse(request.action);}catch{}
        C.play(game,move,now);
      }
      if(!r.views||request||timedOut){
        CepterRoomState.runAI(C,game,now);C.armClock(game,now);
      }
      r.revision++;r.actor=game.phase==='over'?-1:C.actor(game);
      if(game.phase==='over'&&game.replay){
        r.replay=JSON.stringify(game.replay);delete game.replay;game.replayAvailable=true;
      }
      r.state=JSON.stringify(game);delete r.pending;r.views={};
      for(let seat=0;seat<r.meta.needed;seat++){
        r.views['s'+seat]=JSON.stringify({id,seat,revision:r.revision,serverNow:now,...CepterRoomState.view(C,game,seat),...(seat===0?{recoverable:recoverySeats(r.seats)}:{})});
      }
      return r;
    },{applyLocally:false});
  }
  async function join(id,book){
    const {db,database,uid}=await connect(),meta=(await db.get(path(id,'meta'))).val();
    if(!meta)throw Error('초대방을 찾을 수 없습니다.');
    if(meta.edition!==C.edition){const u=new URL(location.href);u.searchParams.set('edition',meta.edition);location.replace(u.href);return;}
    const seatStorage='cept-cloud-seat-'+id;
    const seats=(await db.get(path(id,'seats'))).val()||{};
    if(!Object.values(seats).includes(uid)){
      if(localStorage.getItem(seatStorage))throw Error(seatEnded);
      if(meta.openingBooks&&book===undefined){
        chooseGuestBook(template=>join(id,template));
        return;
      }
    }
    const seat=await seatFor(id,meta,book);
    const host=meta.host===uid;
    session={id,seat,host};
    localStorage.setItem(seatStorage,String(seat));
    let stopSeats,stopView,stopConnection;
    stopSeats=db.onValue(path(id,'seats'),snap=>{
      const current=snap.val()||{};
      if(current['s'+seat]!==uid){
        session=null;stopSeats?.();stopView?.();stopConnection?.();cloudSeatEnded();
        return;
      }
      const recoverable=host?recoverySeats(current):[];
      if(!room?.started)applyRoom({id,seat,revision:0,joined:Object.keys(current).length,needed:meta.needed,recoverable});
    },warn);
    stopView=db.onValue(path(id,'views/s'+seat),snap=>{
      if(session&&snap.exists()){
        const view=JSON.parse(snap.val());
        if(!room?.started||view.revision>room.revision)applyRoom(view);
      }
    },e=>{if(session)warn(e);});
    if(session.host){
      const online=db.ref(database,'.info/connected');
      db.onValue(online,async snap=>{
        if(!snap.val())return;
        const connection=db.push(path(id,'connections'));
        try{await db.onDisconnect(connection).remove();await db.set(connection,true);}catch(e){warn(e);}
      });
      // Keep the full host snapshot subscribed so a transaction has an initial value,
      // including after a mobile browser is suspended and reconnects.
      db.onValue(path(id),snap=>{
        const r=snap.val();
        clearTimeout(clockTimer);
        if(!r)return;
        const requested=Object.values(r.recoveryTickets||{}).some(t=>t.claims?.[t.proof]&&!t.redeemed);
        if(requested||Object.keys(r.seats).length===meta.needed&&(!r.views||r.pending)){
          advance(id).catch(warn);return;
        }
        if(!r.views)return;
        const deadline=JSON.parse(r.state).deadlineAt;
        if(deadline)clockTimer=setTimeout(()=>advance(id).catch(warn),Math.max(0,deadline-Date.now()));
      },warn);
    }else stopConnection=db.onValue(path(id,'connections'),snap=>{
      $('roomConnection').textContent=snap.exists()||s?.phase==='over'?'':'방장 연결 대기 중 · 방장이 돌아오면 이어집니다.';
    },warn);
  }
  async function action(move){
    if(!session)return;
    const {id,seat}=session,{db}=service;
    if(room.busy||room.seat!==C.actor(s))return;
    const revision=room.revision;room.busy=true;render();
    try{await db.set(path(id,'pending'),{seat,revision,action:JSON.stringify(move)});}
    catch(e){
      try{const snap=await db.get(path(id,'views/s'+seat));if(snap.exists()){
        const latest=JSON.parse(snap.val());if(session&&room&&latest.revision>=room.revision)applyRoom(latest);
      }}catch{/* The subscription resumes when the connection returns. */}
      finally{if(room?.revision===revision){room.busy=false;render();warn(e);}}
    }
  }
  async function loadReplay(id){
    const value=(await service.db.get(path(id,'replay'))).val();
    if(!value)throw Error('방 리플레이를 불러오지 못했습니다.');
    return JSON.parse(value);
  }
  return {create,join,action,local,loadReplay,issueRecovery,claimRecovery};
})();
