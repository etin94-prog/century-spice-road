const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
// Put a nearly full rival on a two-player island. All choices after setup use touch.
async function checkTollChoice(p){
 const {site,dest}=await p.evaluate(()=>{
   g=newGame(['Medium'],()=>.4);
   const site=g.tiles.findIndex(t=>t.range===99),dest=g.islands.findIndex(t=>t.recipe);
   g.players[0].bag=[2,0,0,0];
   g.players[0].won=[mixWhiteOrders.find(c=>c[3]===g.tiles[site].help&&c[4]===1)];
   const rival=g.players[1];rival.boat=dest;rival.bag=[4,3,2,1];rival.priority=[3,2,1,0];
   rival.tracks[g.islands[dest].suit]++;g.islands[dest].owners=[1];
   mixTab='board';render();return {site,dest};
 });
 await p.locator('[data-site="'+site+'"]').tap();await p.locator('[data-dest="'+dest+'"]').tap();
 await p.locator('#settle').tap();await p.locator('[data-k="1"]').tap();
 await p.getByRole('button',{name:'건설비 선택 건너뛰기'}).tap();
 const free=await p.evaluate(({site,dest})=>mixOptions(g,site,{pay:[1],buildPay:[]}).findIndex(c=>c.dest===dest&&!c.build&&!c.n),{site,dest});
 await p.locator('[data-option="'+free+'"]').tap();
 assert.deepEqual(await p.evaluate(()=>g.players.map(q=>q.bag)),[[2,0,0,0],[4,4,2,0]]);
 assert.equal(await p.evaluate(()=>g.players[0].boat),dest);
}
async function run(){
 const server=http.createServer((req,res)=>{
   const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
   if(!/^(art\/)?[\w.-]+$/.test(name)){res.writeHead(404).end();return;}
   const file=path.join(__dirname,'../dist',name);
   if(!fs.existsSync(file)){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({js:'text/javascript',html:'text/html; charset=utf-8',css:'text/css'})[name.split('.').at(-1)]||'application/octet-stream');
   fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
   const base=process.env.GAME_URL||'http://127.0.0.1:'+server.address().port+'/';
   const apple=process.env.QA_BROWSER==='webkit';
   browser=apple?await webkit.launch():await chromium.launch(process.env.CI?{}:{channel:'msedge'});
   for(const mode of [1,2,3,12,123,13])for(const seats of [2,3,4]){
     const viewport=apple?{width:390,height:844}:{width:740,height:360};
     const p=await browser.newPage({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
     const errors=[];p.on('pageerror',e=>errors.push(e.message));
     await p.goto(base);assert.equal(await p.locator('a[href="splendor.html?mode=base"]').count(),1);
     const href=mode===1?'spice.html':'expedition.html?'+(mode<10?'edition':'combo')+'='+mode;
     await p.locator('a[href="'+href+'"]').tap();await p.locator('[data-count="'+seats+'"]').tap();await p.locator('#new').tap();
     assert.equal(await p.evaluate(()=>g.players.length),seats);
     if(mode===1){
       await p.locator('[data-kind="play"][data-i="1"]').tap();
       await p.locator('#confirm').tap();
       assert(await p.evaluate(()=>g.players[0].used.some(c=>c.up)&&g.players[0].bag[0]===3));
     }else if(mode<10){
       await p.waitForFunction(()=>myTurn());
       const i=await p.evaluate(()=>g.tiles.findIndex((t,i)=>(g.departures?t.recipe:t.industry===0)&&actionsAt(g,i).length));
       await p.locator('[data-site="'+i+'"]').tap();await p.locator('[data-option="0"]').tap();
       assert(await p.evaluate(()=>g.log.some(x=>x.who===0)));
     }else{
       await p.waitForFunction(()=>myTurn());
       await p.locator('[data-tab="cards"]').tap();
       if(mode===12){await p.locator('[data-tab="board"]').tap();await p.locator('[data-site]').filter({hasText:'섬'}).first().tap();}
       else{
         const target=await p.evaluate(()=>{
           const card=g.tiles.findIndex((t,i)=>t.special==='market'&&mixOptions(g,i).length);
           if(card!==-1)return {i:card,tab:'cards'};
           return {i:g.tiles.findIndex((t,i)=>t.industry===0&&mixOptions(g,i).length),tab:'board'};
         });
         await p.locator('[data-tab="'+target.tab+'"]').tap();await p.locator('[data-site="'+target.i+'"]').tap();
       }
       await p.locator('[data-option]').first().tap();
       await p.waitForFunction(()=>myTurn()&&g.log.length>=2);
       const count=await p.evaluate(()=>g.log.length);
       await p.reload();assert.equal(await p.evaluate(()=>g.log.length),count);
       if(mode===123){await p.locator('[data-tab="map"]').tap();assert.equal(await p.locator('[data-island]').count(),13);}
     }
     if(mode===123&&seats===2)await checkTollChoice(p);
     assert.deepEqual(errors,[]);await p.close();console.log('mobile',mode,seats);
   }
 }finally{await browser?.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
