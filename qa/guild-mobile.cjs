const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://127.0.0.1:8088/',rooms=process.argv.includes('--rooms');
async function run(){
 const b=await chromium.launch(process.env.QA_CHANNEL?{channel:process.env.QA_CHANNEL}:{});
 try{
  for(const mode of ['cities','posts','orient','forts']){
   const errors=[];
   const page=async()=>{const p=await b.newPage({viewport:{width:740,height:360},isMobile:true,hasTouch:true,reducedMotion:'reduce'});p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));return p;};
   const h=await page();await h.goto(base+'splendor.html'+(rooms?'?emulator=1':''));
   await h.locator('#mode').selectOption(mode);let guest;
   if(rooms){
    await h.locator('#friend').tap();const invite=await h.locator('#invite').inputValue();assert(invite.includes('emulator=1'));
    guest=await page();await guest.goto(invite);await h.waitForFunction(()=>online.people===2);
    await h.locator('#roomTotal').selectOption('2');await h.locator('#beginTable').tap();
    await Promise.all([h,guest].map(p=>p.waitForFunction(mode=>online?.ready&&online.connected&&g.mode===mode,mode)));
   }else await h.locator('#new').tap();
   assert.equal(await h.locator('#market [data-card]').count(),mode==='orient'?18:12);
   if(mode==='orient')await h.locator('[data-deck="3"]').tap();else await h.locator('[data-deck="0"]').tap();
   await h.locator('#confirm').tap();await h.waitForFunction(()=>g.players[0].held.length===1);
   if(rooms){
    await guest.waitForFunction(()=>online.count===1);assert.deepEqual(await h.evaluate(()=>g),await guest.evaluate(()=>g));
    await guest.reload();await guest.waitForFunction(mode=>online?.ready&&g.mode===mode&&online.count===1,mode);await guest.close();
   }else{
    await h.reload();await h.waitForFunction(mode=>g.mode===mode,mode);
    if(mode==='forts'){
      await h.evaluate(()=>{stopAI();g.turn=0;g.players[0].bonus=[9,9,9,9,9];render();});
      await h.locator('[data-card]').first().tap();await h.locator('#buy').tap();while(await h.locator('[data-choice]').count())await h.locator('[data-choice]').first().tap();await h.locator('#confirm').tap();
      assert(await h.evaluate(()=>Object.keys(g.forts).length>0));
      assert.equal(await h.locator('#passTurn').isVisible(),false);
      await h.evaluate(()=>{
        stopAI();
        g=newGame(['Medium','Medium','Medium'],()=>.4,'forts');
        g.players[0].held=[g.decks[0].pop(),g.decks[0].pop(),g.decks[0].pop()];
        for(let color=0;color<5;color++){
          for(let seat=1;seat<=3;seat++)g.players[seat].tokens[color]=2;
          g.players[color%3+1].tokens[color]++;
          g.bank[color]=0;
        }
        render();
      });
      await h.locator('#passTurn').tap();
      assert.match(await h.locator('#body').innerText(),/가능한 행동 없음/);
      await h.locator('#confirm').tap();
      assert.equal(await h.locator('#passTurn').isVisible(),false);
      assert.match(await h.evaluate(()=>g.log[0].msg),/턴 넘김/);
    }
   }
   assert.deepEqual(errors,[]);await h.close();console.log(mode,rooms?'invite + restore':'touch + restore');
  }
 }finally{await b.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
