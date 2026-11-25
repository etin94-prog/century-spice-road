// Run with node cept-server.cjs. GET /cept.html and /api/cept share the same origin.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const C=require('./dist/cept-engine');
function createServer(dir){
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const dist=fs.realpathSync(path.join(__dirname,'dist'));
  const file=id=>path.join(dir,id+'.json');
  const persist=r=>{const tmp=file(r.id)+'.tmp';fs.writeFileSync(tmp,JSON.stringify(r),{mode:0o600});fs.renameSync(tmp,file(r.id));};
  const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
  function snapshot(r,seat){
    const ready=r.keys.every(Boolean),out={id:r.id,seat,revision:r.rev,joined:r.keys.filter(Boolean).length,needed:r.keys.length};
    if(!ready)return out;
    const s=structuredClone(r.game);
    s.players.forEach((p,j)=>{if(j!==seat)delete p.peek;p.bookCount=p.book.length;delete p.book;delete p.template;if(j!==seat&&!(['shatter','suppression'].includes(s.phase)&&s.turn===seat&&s.spellTarget===j))p.hand=[];});
    if(s.battle&&s.phase==='defend'&&seat!==s.turn)s.battle.atkItem=null;
    out.game=s;out.choices=C.actor(r.game)===seat?C.choices(r.game):[];return out;
  }
  function pump(r){
    let n=0;
    while(r.keys.every(Boolean)&&r.game.phase!=='over'&&r.game.players[C.actor(r.game)].ai){
      if(++n>2000)fail(500,'AI 진행 오류');C.play(r.game,C.ai(r.game));r.rev++;
    }
  }
  async function body(req){
    let buffer='';for await(const part of req){buffer+=part;if(buffer.length>16384)fail(413,'요청이 너무 큽니다.');}
    try{return JSON.parse(buffer);}catch{fail(400,'요청 형식 오류');}
  }
  return http.createServer(async(req,res)=>{
    const json=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
    try{
      const url=new URL(req.url,'http://localhost'),route=url.pathname;
      if(!route.startsWith('/api/cept/')){
        if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'허용되지 않은 요청');
        const relative=decodeURIComponent(route==='/'?'cept.html':route.slice(1));
        if(!/^(?:art\/(?:cept-maps\/|cept-catalog\/[\w-]+\/)?)?[\w-]+\.[\w]+$/.test(relative))fail(404,'파일 없음');
        const name=path.join(dist,relative);
        if(!fs.existsSync(name)||!fs.statSync(name).isFile()||!fs.realpathSync(name).startsWith(dist+path.sep))fail(404,'파일 없음');
        const type={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css',webp:'image/webp',png:'image/png',json:'application/json'}[path.extname(name).slice(1)]||'application/octet-stream';
        res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(name).pipe(res);return;
      }
      if(route==='/api/cept/status'&&req.method==='GET'){json(200,{available:true});return;}
      const auth=req.headers.authorization||'';
      if(!/^Bearer [a-f0-9]{64}$/.test(auth))fail(401,'좌석 인증이 필요합니다.');
      const key=crypto.createHash('sha256').update(auth).digest('hex');
      const data=req.method==='POST'?await body(req):{};
      if(route==='/api/cept/rooms'&&req.method==='POST'){
        const {count,humans,target,mapId,book,aiBook,aiLevel,alliance}=data;
        if(!Number.isInteger(humans)||humans<2||humans>count||!C.validBook(book))fail(400,'초대방은 사람 좌석이 2개 이상 필요합니다.');
        let game;try{game=C.start(count,humans,target,mapId,book,aiBook,aiLevel,alliance);}catch{fail(400,'대국 설정 오류');}
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
      const r=JSON.parse(fs.readFileSync(file(match[1]),'utf8'));let seat=r.keys.indexOf(key);
      if(match[2]==='join'&&req.method==='POST'){
        if(seat<0){seat=r.keys.indexOf(null);if(seat<0)fail(409,'모든 좌석이 찼습니다.');r.keys[seat]=key;r.rev++;pump(r);persist(r);}
      }else{
        if(seat<0)fail(403,'이 방의 참가자가 아닙니다.');
        if(match[2]==='action'&&req.method==='POST'){
          if(data.revision!==r.rev)fail(409,'대국이 갱신되었습니다.');
          if(!r.keys.every(Boolean)||r.game.phase==='over'||seat!==C.actor(r.game))fail(409,'현재 입력할 좌석이 아닙니다.');
          if(!C.play(r.game,data.action))fail(400,'선택할 수 없는 행동입니다.');
          r.rev++;pump(r);persist(r);
        }else if(match[2]||req.method!=='GET')fail(405,'허용되지 않은 요청');
      }
      json(200,snapshot(r,seat));
    }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'서버 처리 오류'});}
  });
}
module.exports={createServer};
if(require.main===module){
  const port=Number(process.env.PORT||8094);
  const dir=process.env.CEPT_ROOM_DIR||path.join(os.homedir(),'.cept-rooms');
  createServer(dir).listen(port,process.env.HOST||'0.0.0.0',()=>console.log('컬드셉트 초대 서버 · http://localhost:'+port+'/cept.html'));
}