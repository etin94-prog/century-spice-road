const assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
  try{
    for(const humans of [1,2,3,4]){
      const page=await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
      await page.clock.install();
      await page.addInitScript(seed=>{Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);},1940+humans);
      await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/cept.html')).href);
      await page.selectOption('#humans',String(humans));await page.selectOption('#target','3000');
      await page.locator('#config .match-start .primary').tap();
      let turns=0,handovers=0,moves=0,resumed=false;
      for(let step=0;step<5000;step++){
        await page.clock.fastForward(2200);
        const status=await page.evaluate(()=>{
          if(s.phase==='over')return 'over';
          if(document.getElementById('game').inert||activeWalk)return 'animating';
          if(pending){
            if(document.querySelector('#hand .card,#detail button'))throw Error('이전 손패 노출');
            document.querySelector('#buttons .primary').click();return 'handoff';
          }
          if(s.players[C.actor(s)].ai)return 'ai';
          const action=C.ai(s),[kind,x,y]=action;
          if(!document.querySelector('#hand .card')&&s.players[C.actor(s)].hand.length)throw Error('활성 좌석 손패 누락');
          const group=C.choices(s).filter(a=>a[0]===kind);
          const index=group.findIndex(a=>a.length===action.length&&a.every((v,j)=>v===action[j]));
          if(kind==='direction'||kind==='route')document.querySelectorAll('.route-option')[index].click();
          else if(kind==='buySymbol'||kind==='sellSymbol'){
            const label=[...document.querySelectorAll('#buttons label')].find(l=>l.textContent.startsWith(labels[kind]));
            const [asset,quantity]=label.querySelectorAll('select');asset.value=x;asset.onchange();quantity.value=y;label.querySelector('button').click();
          }else{
            const select=document.querySelector('select[data-action="'+kind+'"]');
            if(select){select.value=index;select.onchange();}
            document.querySelector('button[data-action="'+kind+'"]').click();
          }
          return kind;
        });
        if(status==='over')break;
        if(status==='handoff')handovers++;
        if(status==='roll')turns++;
        if(!['animating','ai','handoff'].includes(status))moves++;
        if(turns>=4&&!resumed){
          const prior=await page.evaluate(()=>[s.turn,s.phase,s.round]);
          await page.reload();await page.tap('#resume');
          assert.deepEqual(await page.evaluate(()=>[s.turn,s.phase,s.round]),prior);resumed=true;
        }
      }
      const result=await page.evaluate(()=>[s.phase,s.winner,C.total(s,s.winner),s.target]);
      assert.equal(result[0],'over');assert.ok(result[2]>=result[3]);
      assert.ok(resumed&&moves>4);assert.equal(handovers>0,humans>1);assert.deepEqual(errors,[]);
      console.log(humans+' local humans / '+(4-humans)+' AI:',moves,'UI actions,',handovers,'private handoffs, saved match resumed, winner',result[1]+1);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
