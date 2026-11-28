const { chromium, webkit } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const requested=process.argv.slice(2).filter(v=>/^\d+$/.test(v)).map(Number);
const ids = Array.from({length:51},(_,i)=>i+1).filter(id=>![31,36,37,40,42].includes(id) && (!requested.length || requested.includes(id)));
const out = process.env.WW_REVIEW_DIR;
const rotated = process.argv.includes('--rotate');
const useWebKit = process.argv.includes('--webkit');
const results = [];
const selectors = {
  3:'.roll-btn,button.piece', 10:'.board-grid button', 13:'.roll-btn,button.piece',
  30:'.ring-draw', 47:'.sixball-precise button',
  22:'button[data-action="deal"]', 23:'#controls button:enabled',
};
async function inspect(browser, group) {
  for (const id of group) {
  const page = await browser.newPage({viewport:rotated ? {width:375,height:667}:{width:667,height:375},
    hasTouch:true,isMobile:true,reducedMotion:'reduce',locale:'ko-KR'});
  page.setDefaultTimeout(11000);
  let errors;
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultNavigationTimeout(45000);
    errors=[];
    const row={id,errors};
    try {
      const route=id===22?'blackjack.html':id===23?'card-table.html?game=poker':'world-table.html?game='+id;
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      if(id===23) await page.getByRole('button',{name:'로컬 대국 시작'}).tap();
      await page.locator('#cardFull').tap();
      await page.waitForFunction(()=>document.querySelector('#cardFull').getAttribute('aria-pressed')==='true');
      if(rotated) await page.locator('#cardWide').tap();
      await page.waitForTimeout(150);
      if(id!==22 && id!==23) await page.locator('#surface > :visible').first().waitFor();
      if (id===23) await page.locator('#controls button:enabled, footer button:enabled').first().waitFor({timeout:5500});
      row.before=await page.locator('#status,#message,#msg').first().textContent({timeout:500}).catch(()=>'');
      row.metrics=await page.evaluate((selector)=>{
        const scope=document.querySelector('#surface')||document.querySelector('main');
        function info(el) {
          const r=el.getBoundingClientRect(), x=r.x+r.width/2,y=r.y+r.height/2;
          const hit=document.elementFromPoint(x,y);
          return {cls:el.className,txt:(el.getAttribute('aria-label')||el.innerText||'').slice(0,42),
            w:Math.round(r.width),h:Math.round(r.height),x,y,ok:el===hit||el.contains(hit)};
        }
        const all=[...scope.querySelectorAll('button:not([disabled]),canvas,input[type=range]')].map(info)
          .filter(e=>e.w>0 && e.h>0);
        const act=[...scope.querySelectorAll(selector || 'canvas,.target,.legal,.movable,button:enabled')].filter(el=>el.matches('canvas,button:enabled'));
        const targets=act.map(info).filter(e=>e.ok && e.w>0 && e.h>0);
        const preferred=targets.filter(e=>/target|legal|movable/.test(e.cls));
        const available=preferred.length?preferred:targets;
        return {count:all.length,tiny:all.filter(e=>Math.min(e.w,e.h)<24).length,blocked:all.filter(e=>!e.ok).length,
          sample:all.filter(e=>!e.ok).slice(0,4),action:available[Math.floor(available.length/2)]};
      },selectors[id]);
      if(id===20) assert.ok(await page.locator('.mj-concealed i').count()>=30,'missing concealed tiles');
      const initialBacks=id===30 ? await page.locator('.ring-cards > .card-back').count() : 0;
      if(id===47) {
        await page.locator('.sixball-precise select').selectOption('4');
        assert.ok(await page.locator('.ballwell .ghost').count()>0,'missing landing preview');
      }
      let target=row.metrics.action;
      if(!target) {
        const b=page.locator('#surface button:enabled,main #controls button:enabled,main button[data-action]:enabled').first();
        if(await b.count()){await b.tap();row.action=await b.textContent().catch(()=>'button');}
      }else{
        await page.touchscreen.tap(target.x,target.y);row.action=target.txt||target.cls||'field';
      }
      await page.waitForTimeout(320);
      row.after=await page.locator('#status,#message,#msg').first().textContent({timeout:500}).catch(()=>'');
      if(id===30) assert.ok(await page.locator('.ring-cards > .card-back').count()<initialBacks,'center draw did not take a card');
      if(id===47) assert.ok(await page.locator('.ballwell .ball').count()>=3,'selected pair did not receive balls');
      if(id===27) {
        row.cardsVisible=await page.locator('.memory-grid > .piece').evaluateAll(els=>els.every(el=>{
          const r=el.getBoundingClientRect();return r.left>=-1 && r.top>=-1 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;
        }));
        assert.ok(row.cardsVisible,'flipping a card clipped the grid');
      }
      if(out) await page.screenshot({path:path.join(out,id+'.jpg'),type:'jpeg',quality:86});
      assert.deepEqual(errors,[]);
    }catch(e){row.error=e.message.slice(0,260);}
    results.push(row);
    await page.close();
  }
}
(async()=>{
  if(out)fs.mkdirSync(out,{recursive:true});
  const browser=useWebKit?await webkit.launch():await chromium.launch({channel:process.env.QA_CHANNEL||'msedge'});
  try{await Promise.all(Array.from({length:2},(_,i)=>inspect(browser,ids.filter((_,j)=>j%2===i))));}
  finally{await browser.close();}
  results.sort((a,b)=>a.id-b.id);
  if(out)fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(results,null,2));
  for(const row of results)if(row.error||!row.action) console.log('inspect',row.id,row.error||'missing action');
  console.log(results.length,'full-screen routes,',results.filter(r=>r.action&&!r.error).length,'with touch');
  if(results.some(r=>r.error || !r.action))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});