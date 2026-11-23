const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8088/';
async function run(){
  const b=await chromium.launch(process.env.QA_CHANNEL?{channel:process.env.QA_CHANNEL}:{});
  async function page(){return b.newPage({viewport:{width:740,height:360},isMobile:true,hasTouch:true,reducedMotion:'reduce'});}
  try{
    for(const readBlocked of [true,false]){
      const p=await page(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.addInitScript(readBlocked=>{
        const deny=()=>{throw new DOMException('Storage unavailable','SecurityError');};
        if(readBlocked)Storage.prototype.getItem=deny;Storage.prototype.setItem=deny;
      },readBlocked);
      await p.goto(base+'splendor.html');await p.locator('#new').tap();
      assert.match(await p.locator('#save').innerText(),/저장 공간 사용 불가/);
      await p.locator('[data-deck="0"]').tap();await p.locator('#confirm').tap();
      assert.equal(await p.evaluate(()=>g.players[0].held.length),1);assert.deepEqual(errors,[]);await p.close();
    }
    const p=await page();await p.goto(base+'expedition.html?edition=2');
    const [site,cost]=await p.evaluate(()=>{
      close();stopAI();g.departures=null;g.turn=1;
      const sites=g.tiles.flatMap((t,i)=>t.port?[]:[i]);const site=sites[0];
      g.players[0].boat=sites.find(i=>seaPath(g,i,site).length>1);
      g.players[0].bag=[8,0,0,0];g.players[1].boat=site;
      const expected=seaPath(g,g.players[0].boat,site).length;render();return [site,expected];
    });
    await p.locator('[data-site="'+site+'"]').tap();assert((await p.locator('#body').innerText()).includes('항해 지불 '+cost+'개'));await p.close();
    for(const computing of [false,true]){
      const q=await page();await q.addInitScript(()=>{
        const Native=Worker;window.Worker=class extends Native{
          postMessage(...args){window.workerStarted=true;setTimeout(()=>{if(!this.stopped)super.postMessage(...args);},350);}
          terminate(){this.stopped=true;super.terminate();}
        };
      });
      await q.goto(base+'expedition.html?edition=3');await q.locator('#new').tap();
      await q.evaluate(()=>{g.turn=1;render();schedule();});
      if(computing)await q.waitForFunction(()=>window.workerStarted);
      await q.locator('#setupTop').tap();await q.locator('[data-count="4"]').tap();
      await q.waitForTimeout(1300);
      assert.equal(await q.locator('#modal[open] [data-count="4"][aria-pressed="true"]').count(),1);
      assert.equal(await q.evaluate(()=>g.turn),1);
      const n=await q.evaluate(()=>g.log.length);await q.locator('#close').tap();await q.waitForFunction(()=>g.turn===0);
      assert.equal(await q.evaluate(()=>g.log.length),n+1);await q.close();
    }
    console.log('Mobile storage, voyage quote, timer and active worker checks passed.');
  }finally{await b.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
