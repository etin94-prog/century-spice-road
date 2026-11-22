const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.GAME_URL||'https://etin94-prog.github.io/century-spice-road/';
async function run(){
 const isWebKit=process.env.QA_BROWSER==='webkit';
 const b=isWebKit?await webkit.launch():await chromium.launch({channel:'msedge'});
 try{
  for(const edition of [2,3])for(const [width,height] of [[568,320],[844,390]]){
   const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(new URL('expedition.html?edition='+edition,base).href);
   await p.locator('[data-count="2"]').tap();await p.locator('#new').tap();
   await p.waitForFunction(()=>myTurn());
   const a=await p.evaluate(()=>chooseMove(g,'Medium'));
   await p.locator('[data-site="'+a.i+'"]').tap();
   await p.locator('[data-option="'+a.option+'"]').tap();
   await p.waitForFunction(()=>review.open);
   const atCenter=await p.evaluate(async()=>{
     await new Promise(resolve=>setTimeout(resolve,pace(730)));
     const r=document.querySelector('.motionTile').getBoundingClientRect();
     return Math.hypot(r.x+r.width/2-innerWidth/2,r.y+r.height/2-innerHeight/2);
   });
   assert(atCenter<2,'card not centered: '+atCenter);
   await p.waitForFunction(()=>myTurn());
   const snap=await p.evaluate(()=>JSON.stringify(g));
   await p.reload();await p.waitForFunction(()=>myTurn());
   assert.equal(await p.evaluate(()=>JSON.stringify(g)),snap);
   if(edition===2){
     await p.locator('[data-site="'+await p.evaluate(()=>g.players[0].boat)+'"]').tap();
     await p.locator('#editRoute').tap();await p.locator('[data-next]').first().tap();
     await p.locator('#landHere').tap();
     assert(await p.locator('[data-option]').count()>0);
   }
   assert.deepEqual(errors,[]);console.log(edition,width,height,'central animation, tap, save and resume OK');
   await p.context().close();
  }
 }finally{await b.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
