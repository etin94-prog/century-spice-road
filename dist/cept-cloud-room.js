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
    service={db,database,uid:user.uid};return service;
  }
  const path=(id,child='')=>service.db.ref(service.database,'ceptRooms/'+id+(child?'/'+child:''));
  const warn=e=>{$('notice').textContent='초대방 연결을 확인하세요. '+e.message;};
  async function create(game,needed){
    const {uid,db}=await connect(),id=newKey().slice(0,32);
    await db.set(path(id),{meta:{host:uid,needed,edition:game.edition},seats:{s0:uid},state:JSON.stringify(game),revision:0,actor:0});
    return id;
  }
  async function seatFor(id,meta){
    const {db,uid}=service;
    for(let i=0;i<meta.needed;i++){
      const ref=path(id,'seats/s'+i),taken=(await db.get(ref)).val();
      if(taken===uid)return i;
      if(taken||!i)continue;
      try{await db.set(ref,uid);return i;}
      catch(e){const owner=(await db.get(ref)).val();if(owner===uid)return i;if(!owner)throw e;}
    }
    throw Error('모든 좌석이 찼습니다.');
  }
  async function advance(id){
    const {db}=service,ref=path(id),now=Date.now();
    await db.runTransaction(ref,r=>{
      if(!r||Object.keys(r.seats).length!==r.meta.needed)return;
      const game=JSON.parse(r.state),request=r.pending;
      const timedOut=C.expire(game,now);
      if(r.views&&!request&&!timedOut)return;
      if(!timedOut&&request&&request.revision===r.revision&&r.actor===request.seat){
        let move;try{move=JSON.parse(request.action);}catch{}
        C.play(game,move,now);
      }
      CepterRoomState.runAI(C,game,now);C.armClock(game,now);
      r.revision++;r.actor=game.phase==='over'?-1:C.actor(game);
      if(game.phase==='over'&&game.replay){
        r.replay=JSON.stringify(game.replay);delete game.replay;game.replayAvailable=true;
      }
      r.state=JSON.stringify(game);delete r.pending;r.views={};
      for(let seat=0;seat<r.meta.needed;seat++){
        r.views['s'+seat]=JSON.stringify({id,seat,revision:r.revision,serverNow:now,...CepterRoomState.view(C,game,seat)});
      }
      return r;
    },{applyLocally:false});
  }
  async function join(id){
    const {db,database,uid}=await connect(),meta=(await db.get(path(id,'meta'))).val();
    if(!meta)throw Error('초대방을 찾을 수 없습니다.');
    if(meta.edition!==C.edition){const u=new URL(location.href);u.searchParams.set('edition',meta.edition);location.replace(u.href);return;}
    const seat=await seatFor(id,meta);
    session={id,seat,host:meta.host===uid};
    db.onValue(path(id,'seats'),snap=>{
      if(!room?.started)applyRoom({id,seat,revision:0,joined:Object.keys(snap.val()||{}).length,needed:meta.needed});
    },warn);
    db.onValue(path(id,'views/s'+seat),snap=>{
      if(snap.exists()){
        const view=JSON.parse(snap.val());
        if(!room?.started||view.revision>room.revision)applyRoom(view);
      }
    },warn);
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
        if(!r||Object.keys(r.seats).length!==meta.needed)return;
        if(!r.views||r.pending){advance(id).catch(warn);return;}
        const deadline=JSON.parse(r.state).deadlineAt;
        if(deadline)clockTimer=setTimeout(()=>advance(id).catch(warn),Math.max(0,deadline-Date.now()));
      },warn);
    }else db.onValue(path(id,'connections'),snap=>{
      $('roomConnection').textContent=snap.exists()||s?.phase==='over'?'':'방장 연결 대기 중 · 방장이 돌아오면 이어집니다.';
    },warn);
  }
  async function action(move){
    const {id,seat}=session,{db}=service;
    if(room.busy||room.seat!==C.actor(s))return;
    const revision=room.revision;room.busy=true;render();
    try{await db.set(path(id,'pending'),{seat,revision,action:JSON.stringify(move)});}
    catch(e){
      try{const snap=await db.get(path(id,'views/s'+seat));if(snap.exists()){
        const latest=JSON.parse(snap.val());if(latest.revision>=room.revision)applyRoom(latest);
      }}catch{/* The subscription resumes when the connection returns. */}
      finally{if(room.revision===revision){room.busy=false;render();warn(e);}}
    }
  }
  async function loadReplay(id){
    const value=(await service.db.get(path(id,'replay'))).val();
    if(!value)throw Error('방 리플레이를 불러오지 못했습니다.');
    return JSON.parse(value);
  }
  return {create,join,action,local,loadReplay};
})();
