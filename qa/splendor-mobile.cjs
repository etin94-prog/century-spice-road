const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.join(__dirname,'../dist');
async function perform(p,a){
  const tap=s=>p.locator(s).tap();
  if(a.kind==='take'){
    await tap('[data-bank="'+a.take[0]+'"]');
    for(const color of a.take.slice(1))await tap('[data-pick="'+color+'"]');
    await tap('#take');
  }else{
    if(a.kind==='held')await tap('#reserved');
    const field=a.kind==='held'?'held':'card';
    await tap('[data-'+field+'="'+a.i+'"]');
    await tap(a.kind==='reserve'?'#reserve':'#buy');
  }
  if(await p.locator('#modal[open] #confirm').count()){
    for(let i=0;i<6;i++)for(let n=0;n<(a.drop?.[i]||0);n++)await tap('[data-drop="'+i+'"]');
    if(await p.locator('[data-noble]').count())await p.locator('[data-noble]').first().tap();
    await tap('#confirm');
  }
}
async function run(){
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.join(root,pathname==='/'?'index.html':pathname);
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404).end();return;}
    const mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp'};
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'msedge',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errors=[],pages=[];
  async function page(portrait=false){
    const context=await browser.newContext({isMobile:true,hasTouch:true,reducedMotion:'reduce',viewport:portrait?{width:390,height:844}:{width:740,height:360}});
    const p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));pages.push(p);return p;
  }
  try{
    const url=process.env.GAME_URL||'http://127.0.0.1:'+server.address().port+'/';
    const host=await page();await host.goto(url);await host.locator('#tab-splendor').tap();await host.locator('[href="splendor.html?mode=base"]').tap();
    const room=process.argv.includes('--room');
    if(room){
      await host.locator('#friend').tap();const guest=await page(true);await guest.goto(await host.locator('#invite').inputValue());
      await host.waitForFunction(()=>online.people===2);await host.locator('#roomTotal').selectOption('4');await host.locator('#beginTable').tap();
      await Promise.all(pages.map(p=>p.waitForFunction(()=>online?.ready&&online.connected)));
    }else{
      await host.locator('[data-count="3"]').tap();await host.locator('#level0').selectOption('Hard');await host.locator('#new').tap();
      await host.emulateMedia({reducedMotion:'no-preference'});
      await host.locator('[data-deck="0"]').tap();await host.locator('#confirm').tap();
      await host.locator('.deck.flying').waitFor();await host.locator('.flying .g5').waitFor();
      await host.locator('#status').tap();
      assert.equal(await host.evaluate(()=>g.players[0].held.length),1);
      await host.emulateMedia({reducedMotion:'reduce'});
    }
    for(let k=0;k<250;k++){
      await host.waitForFunction(()=>g.over||g.turn<(online?online.config.humans:1)&&(!online||!online.pending));
      const {turn,n,over}=await host.evaluate(()=>({turn:g.turn,n:g.log.length,over:g.over}));if(over)break;
      const p=pages[turn];await p.waitForFunction(n=>myTurn()&&g.log.length===n,n);
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const a=await p.evaluate(()=>chooseMove(g,'Hell'));await perform(p,a);
      await host.waitForFunction(n=>g.log.length>n,n);
      if(!room&&k===1)await host.reload();
    }
    await Promise.all(pages.map(p=>p.locator('.ranking').first().waitFor()));
    const finals=await Promise.all(pages.map(p=>p.evaluate(()=>({board:g,ranks:rankings(g)}))));
    for(const f of finals)assert.deepEqual(f,finals[0]);assert.equal(errors.length,0,errors.join('\n'));
    console.log('Final',finals[0].board.players.length,'seats',finals[0].board.log.length,'turns',finals[0].ranks);
  }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
