const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomBytes}=require('node:crypto');
const {chromium}=require('playwright'),{createServer}=require('../cept-server.cjs'),C=require('../dist/cept-engine');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cept-test-')),server=createServer(dir);
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  const status=await fetch(base+'/api/cept/status');
  assert.equal((await status.json()).seatRecovery,true);
  const media=await fetch(base+'/art/cept-field-1.mp3',{headers:{Range:'bytes=0-1'}});
  assert.equal(media.status,206);
  assert.equal(media.headers.get('content-type'),'audio/mpeg');
  assert.match(media.headers.get('content-range'),/^bytes 0-1\/\d+$/);
  assert.equal((await media.arrayBuffer()).byteLength,2);
  const pages=[],errors=[],humans=Number(process.argv.find(arg=>/^--humans=[234]$/.test(arg))?.at(-1)||4);
  for(let i=0;i<humans;i++){
   const p=await browser.newPage({viewport:i%2?{width:740,height:360}:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   p.on('pageerror',e=>errors.push(e.message));pages.push(p);
  }
  const host=pages[0];await host.goto(base+'/index.html#cept');await host.locator('[href="cept.html"]').click();
  await host.selectOption('#humans',String(humans));if(process.argv.includes('--alliance'))await host.selectOption('#alliance','teams');await host.locator('#editor summary').tap();
  await host.locator('#storeBook').click();assert.equal(await host.inputValue('#bookChoice'),'custom');
  await host.locator('#hostRoom').click();await host.locator('#roomWait input').waitFor();
  const shown=new URL(await host.inputValue('#roomWait input'));const invite=base+shown.pathname+shown.search;
  for(const [i,p] of pages.slice(1).entries()){
   await p.goto(invite);
   if(i===0)await p.selectOption('#roomWait select','intro');
   await p.getByRole('button',{name:'이 북으로 참가'}).click();
  }
  await Promise.all(pages.map(p=>p.locator('#game:visible').waitFor()));
  assert.equal(await host.locator('.tile').count(),18);
  const id=new URL(invite).searchParams.get('ceptRoom'),url=base+'/api/cept/rooms/'+id;
  const saved=JSON.parse(fs.readFileSync(path.join(dir,id+'.json'),'utf8'));
  assert.deepEqual(saved.game.players[1].template,C.presets.intro);
  assert.notDeepEqual(saved.game.players[0].template,saved.game.players[1].template);
  const tokens=await Promise.all(pages.map(p=>p.evaluate(id=>localStorage.getItem('cept-room-seat-'+id),id)));
  const request=async(seat,action)=>{const response=await fetch(url+(action?'/action':''),{method:action?'POST':'GET',headers:{Authorization:'Bearer '+tokens[seat],'Content-Type':'application/json'},body:action?JSON.stringify(action):undefined});return {status:response.status,data:await response.json()};};
  let snap=(await request(0)).data;if(process.argv.includes('--alliance'))assert.deepEqual(snap.game.teams,[0,1,0,1]);assert.equal(snap.game.players[1].hand.length,0);assert.equal(snap.game.players[0].book,undefined);
  if(humans===4){
   const secret=()=>randomBytes(32).toString('hex');
   const api=async(endpoint,key,body)=>{
    const res=await fetch(url+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    return {status:res.status,data:await res.json()};
   };
   const target=1,roomPath=path.join(dir,id+'.json'),outside=secret(),oldGuest=pages[target],oldKey=tokens[target];
   assert.equal((await api('/recovery-link',oldKey,{seat:target})).status,403);
   assert.equal((await api('/recovery-link',tokens[0],{seat:0})).status,400);
   const stale=await api('/recovery-link',tokens[0],{seat:target});
   assert.equal(stale.status,201);
   const expired=JSON.parse(fs.readFileSync(roomPath,'utf8'));
   assert.ok(!JSON.stringify(expired).includes(stale.data.code));
   expired.recoveries[target].expiresAt=Date.now()-1;
   fs.writeFileSync(roomPath,JSON.stringify(expired));
   assert.equal((await api('/recover',outside,{code:stale.data.code})).status,410);
   const superseded=await api('/recovery-link',tokens[0],{seat:target});
   assert.equal(superseded.status,201);

   await host.locator('#matchMenu summary').tap();
   await host.getByRole('button',{name:'좌석 복구',exact:true}).tap();
   const dialog=host.locator('#matchInfo');
   await dialog.getByLabel('복구할 좌석').selectOption(String(target));
   await dialog.getByRole('button',{name:'일회용 링크 발급'}).tap();
   const field=dialog.getByLabel('일회용 좌석 복구 링크');
   await field.waitFor();
   const recovery=new URL(await field.inputValue()),code=new URLSearchParams(recovery.hash.slice(1)).get('recoverSeat');
   assert.match(code,/^[a-f0-9]{64}$/);
   assert.equal(recovery.searchParams.has('recoverSeat'),false);
   assert.equal((await api('/recover',outside,{code:superseded.data.code})).status,410);
   assert.equal((await api('/recover',tokens[2],{code})).status,409);
   assert.equal((await api('',oldKey)).status,200);
   const originalGame=JSON.parse(fs.readFileSync(roomPath,'utf8')).game;
   assert.notDeepEqual(originalGame.players[0].template,originalGame.players[target].template);
   await dialog.getByRole('button',{name:'닫기'}).tap();

   await oldGuest.evaluate(key=>localStorage.removeItem(key),'cept-room-seat-'+id);
   const replacement=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   replacement.on('pageerror',e=>errors.push(e.message));
   await replacement.goto(base+recovery.pathname+recovery.search+recovery.hash);
   await replacement.getByRole('button',{name:'기존 좌석 복구'}).tap();
   await replacement.locator('#game:visible').waitFor();
   assert.equal(await replacement.evaluate(()=>room.seat),target);
   assert.equal(new URL(replacement.url()).hash,'');
   const latest=JSON.parse(fs.readFileSync(roomPath,'utf8'));
   assert.deepEqual(latest.game,originalGame);
   assert.equal((await api('',oldKey)).status,403);
   assert.equal((await api('/recover',outside,{code})).status,410);
   const nextKey=await replacement.evaluate(key=>localStorage.getItem(key),'cept-room-seat-'+id);
   const confirmation=await api('/recover',nextKey,{code});
   assert.equal(confirmation.status,200);
   assert.equal(confirmation.data.revision,latest.rev);
   await oldGuest.locator('#notice').getByText('이 기기의 좌석 연결이 종료되었습니다.',{exact:false}).waitFor();
   await oldGuest.evaluate(([id,key])=>localStorage.setItem('cept-room-seat-'+id,key),[id,oldKey]);
   await oldGuest.reload();
   await oldGuest.locator('#roomWait').getByText('이 기기의 좌석 연결이 종료되었습니다.',{exact:false}).waitFor();
   await oldGuest.context().close();
   pages[target]=replacement;tokens[target]=nextKey;
   await host.waitForFunction(rev=>room.revision>=rev,latest.rev);
   await replacement.reload();
   await replacement.waitForFunction(seat=>room?.started&&room.seat===seat,target);
   snap=(await request(0)).data;
   console.log('Four-seat recovery: one-time transfer, expired/replaced links, preserved match, revoked old key, and reload OK');
   for(const p of pages)assert.ok(await p.evaluate(()=>innerWidth>=document.documentElement.scrollWidth));
   assert.deepEqual(errors,[]);
   if(process.argv.includes('--recover-only'))return;
  }
  const first={revision:snap.revision,action:['roll']};
  assert.equal((await request(1,first)).status,409);
  await host.getByRole('button',{name:'주사위 굴리기'}).tap();await host.locator('.route-arrow').first().waitFor();
  assert.equal((await request(0,first)).status,409);
  let resumed=false,n=0;
  while(n++<3500){
   snap=(await request(0)).data;const state=snap.game;
   if(state.phase==='over')break;
   const actor=C.actor(state),r=(await request(actor)).data;
   if(!resumed&&state.phase==='defend'){
    await pages[actor].reload();await pages[actor].getByRole('button',{name:'아이템 없이 전투'}).waitFor();
    assert.equal(await pages[actor].evaluate(()=>room.seat),actor);
    await pages[actor].getByRole('button',{name:'아이템 없이 전투'}).click();
    await pages[actor].waitForFunction(()=>s.phase==='result');resumed=true;continue;
   }
   let action=state.phase==='fortune'?r.choices[0]:C.ai(r.game);
   if(!r.choices.some(v=>JSON.stringify(v)===JSON.stringify(action)))action=r.choices[0];
   assert.equal((await request(actor,{revision:r.revision,action})).status,200);
  }
  assert.ok(resumed,'expected a human defender reconnect');assert.ok(n<3500);
  await Promise.all(pages.map(p=>p.waitForFunction(()=>s.phase==='over',null,{polling:250,timeout:60000})));
  const views=await Promise.all(pages.map(p=>p.evaluate(()=>[s.winner,C.total(s,s.winner),room.revision])));
  for(const view of views)assert.deepEqual(view,views[0]);
  for(const p of pages)assert.ok(await p.evaluate(()=>innerWidth>=document.documentElement.scrollWidth));
  assert.deepEqual(errors,[]);console.log(humans+' mobile seats, '+(4-humans)+' AI: invite, defender reconnect, final standings, mobile width OK',views[0]);
 }finally{
  await browser.close();await new Promise(ok=>server.close(ok));
  for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
