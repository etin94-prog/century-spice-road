// Run with node cept-server.cjs. GET /cept.html and /api/cept share the same origin.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const C=require('./dist/cept-engine');
const roomState=require('./dist/cept-room-state');
const engines=new Map([['ps2',C]]);
function engine(edition='ps2'){
  if(!Object.hasOwn(require('./dist/cept-editions').names,edition))throw Object.assign(Error('알 수 없는 판본'),{status:400});
  if(!engines.has(edition))engines.set(edition,C.createEdition(edition));
  return engines.get(edition);
}
function createServer(dir){
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const dist=fs.realpathSync(path.join(__dirname,'dist'));
  const file=id=>path.join(dir,id+'.json');
  const clocks=new Map();
  function persist(r){
    const tmp=file(r.id)+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(r),{mode:0o600});fs.renameSync(tmp,file(r.id));
    schedule(r);
  }
  function schedule(r){
    clearTimeout(clocks.get(r.id));clocks.delete(r.id);
    const deadline=r.game.deadlineAt;
    if(!deadline||!r.keys.every(Boolean)||r.game.phase==='over')return;
    const timeout=setTimeout(()=>{
      clocks.delete(r.id);
      try{
        const latest=JSON.parse(fs.readFileSync(file(r.id),'utf8')),prior=latest.rev;
        pump(latest);
        if(latest.rev!==prior)persist(latest);
        else if(latest.game.deadlineAt>Date.now())schedule(latest);
      }catch(e){console.error('컬드셉트 입력 시간 처리 실패',e.message);}
    },Math.max(0,deadline-Date.now()));
    timeout.unref();clocks.set(r.id,timeout);
  }
  const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
  function snapshot(r,seat){
    const C=engine(r.game.edition);
    const ready=r.keys.every(Boolean),out={id:r.id,seat,revision:r.rev,joined:r.keys.filter(Boolean).length,needed:r.keys.length,serverNow:Date.now()};
    if(!ready)return out;
    return Object.assign(out,roomState.view(C,r.game,seat));
  }
  function pump(r,now=Date.now()){
    const C=engine(r.game.edition);
    if(!r.keys.every(Boolean))return;
    if(C.expire(r.game,now))r.rev++;
    r.rev+=roomState.runAI(C,r.game,now);
    if(C.armClock(r.game,now))r.rev++;
  }
  async function body(req){
    let buffer='';for await(const part of req){buffer+=part;if(buffer.length>16384)fail(413,'요청이 너무 큽니다.');}
    try{return JSON.parse(buffer);}catch{fail(400,'요청 형식 오류');}
  }
  const server=http.createServer(async(req,res)=>{
    const json=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
    try{
      const url=new URL(req.url,'http://localhost'),route=url.pathname;
      if(!route.startsWith('/api/cept/')){
        if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'허용되지 않은 요청');
        const relative=decodeURIComponent(route==='/'?'cept.html':route.slice(1));
        if(!/^(?:art\/(?:cept-maps\/|cept-catalog\/[\w-]+\/)?)?[\w-]+\.[\w]+$/.test(relative))fail(404,'파일 없음');
        const name=path.join(dist,relative);
        const file=fs.statSync(name,{throwIfNoEntry:false});
        if(!file?.isFile()||!fs.realpathSync(name).startsWith(dist+path.sep))fail(404,'파일 없음');
        const type={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css',webp:'image/webp',png:'image/png',mp3:'audio/mpeg',json:'application/json'}[path.extname(name).slice(1)]||'application/octet-stream';
        const headers={'Content-Type':type,'Content-Length':file.size,'X-Content-Type-Options':'nosniff'};
        if(type==='audio/mpeg'){
          headers['Accept-Ranges']='bytes';
          const range=req.method==='GET'&&!req.headers['if-range']&&/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
          if(range&&(range[1]||range[2])){
            const start=range[1]?Number(range[1]):Math.max(0,file.size-Number(range[2]));
            const end=range[1]&&range[2]?Math.min(Number(range[2]),file.size-1):file.size-1;
            if(start>end){res.writeHead(416,{'Content-Range':'bytes */'+file.size});res.end();return;}
            headers['Content-Range']='bytes '+start+'-'+end+'/'+file.size;
            headers['Content-Length']=end-start+1;
            res.writeHead(206,headers);fs.createReadStream(name,{start,end}).pipe(res);return;
          }
        }
        res.writeHead(200,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(name).pipe(res);return;
      }
      if(route==='/api/cept/status'&&req.method==='GET'){json(200,{available:true});return;}
      const auth=req.headers.authorization||'';
      if(!/^Bearer [a-f0-9]{64}$/.test(auth))fail(401,'좌석 인증이 필요합니다.');
      const key=crypto.createHash('sha256').update(auth).digest('hex');
      const data=req.method==='POST'?await body(req):{};
      const lobby=route.match(/^\/api\/cept\/rooms\/([0-9a-f]{32})\/lobby$/);
      if(lobby&&req.method==='GET'){
        if(!fs.existsSync(file(lobby[1])))fail(404,'초대방을 찾을 수 없습니다.');
        const waiting=JSON.parse(fs.readFileSync(file(lobby[1]),'utf8'));
        json(200,{edition:waiting.game.edition||'ps2'});return;
      }
      if(route==='/api/cept/rooms'&&req.method==='POST'){
        const C=engine(data.edition);
        const {count,humans,target,mapId,book,aiBook,aiLevel,alliance,roundLimit,inputSeconds,suddenDeath}=data;
        if(!Number.isInteger(humans)||humans<2||humans>count||!C.validBook(book))fail(400,'초대방은 사람 좌석이 2개 이상 필요합니다.');
        let game;
        try{
          game=C.start(count,humans,target,mapId,book,aiBook,aiLevel,alliance,roundLimit);
          C.configureMatch(game,{inputSeconds,suddenDeath,recordReplay:true});
        }catch{fail(400,'대국 설정 오류');}
        const r={id:crypto.randomBytes(16).toString('hex'),game,keys:[key,...Array(humans-1).fill(null)],rev:0};
        persist(r);const out=snapshot(r,0);
        if(['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){
          const lan=Object.values(os.networkInterfaces()).flat().find(n=>n.family==='IPv4'&&!n.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(n.address));
          if(lan)out.lanOrigin='http://'+lan.address+':'+req.socket.localPort;
        }
        json(201,out);return;
      }
      const match=route.match(/^\/api\/cept\/rooms\/([0-9a-f]{32})(?:\/(join|action))?$/);
      if(!match||!fs.existsSync(file(match[1])))fail(404,'초대방을 찾을 수 없습니다.');
      // No await between loading a revision and committing its replacement.
      const r=JSON.parse(fs.readFileSync(file(match[1]),'utf8'));const C=engine(r.game.edition);let seat=r.keys.indexOf(key);
      if(match[2]==='join'&&req.method==='POST'){
        if(seat<0){
          seat=r.keys.indexOf(null);if(seat<0)fail(409,'모든 좌석이 찼습니다.');
          if(data.book!=null&&!C.setOpeningBook(r.game,seat,data.book))fail(400,'사용할 수 없는 북입니다.');
          r.keys[seat]=key;r.rev++;pump(r);persist(r);
        }
      }else{
        if(seat<0)fail(403,'이 방의 참가자가 아닙니다.');
        const prior=r.rev,now=Date.now();
        pump(r,now);
        if(r.rev!==prior)persist(r);
        if(match[2]==='action'&&req.method==='POST'){
          if(data.revision!==r.rev)fail(409,'대국이 갱신되었습니다.');
          if(!r.keys.every(Boolean)||r.game.phase==='over'||seat!==C.actor(r.game))fail(409,'현재 입력할 좌석이 아닙니다.');
          if(!C.play(r.game,data.action,now))fail(400,'선택할 수 없는 행동입니다.');
          r.rev++;pump(r);persist(r);
        }else if(match[2]||req.method!=='GET')fail(405,'허용되지 않은 요청');
      }
      if(!clocks.has(r.id))schedule(r);
      json(200,snapshot(r,seat));
    }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'서버 처리 오류'});}
  });
  server.once('close',()=>{for(const timeout of clocks.values())clearTimeout(timeout);});
  return server;
}
module.exports={createServer};
if(require.main===module){
  const port=Number(process.env.PORT||8094);
  const dir=process.env.CEPT_ROOM_DIR||path.join(os.homedir(),'.cept-rooms');
  createServer(dir).listen(port,process.env.HOST||'0.0.0.0',()=>console.log('컬드셉트 초대 서버 · http://localhost:'+port+'/cept.html'));
}
