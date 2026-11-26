const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../cept-server.cjs'),C=require('../dist/cept-engine');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cept-test-')),server=createServer(dir);
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
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
