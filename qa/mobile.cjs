const assert = require('node:assert/strict');
const {chromium,webkit} = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
async function mobile() {
  const server = http.createServer((req,res)=>{
    const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(!/^(art\/)?[\w.-]+$/.test(name)){res.writeHead(404).end();return;}
    const file=path.join(__dirname,'../dist',name);
    if(!fs.existsSync(file)){res.writeHead(404).end();return;}
    const mime={js:'text/javascript',css:'text/css',html:'text/html; charset=utf-8',webp:'image/webp',svg:'image/svg+xml'};
    res.setHeader('Content-Type',mime[name.split('.').at(-1)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=process.env.GAME_URL || 'http://127.0.0.1:'+server.address().port+'/';
  const useWebKit=process.env.QA_BROWSER==='webkit';
  const browser = useWebKit?await webkit.launch():await chromium.launch({channel:process.env.QA_BROWSER || 'msedge'});
  try {
    for(const [width,height] of [[568,320],[844,390]]) {
      const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,
        reducedMotion:width===568?'reduce':'no-preference'});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      await page.locator('[data-count="4"]').tap();
      await page.locator('#new').tap();
      await page.locator('#guide').tap();
      assert((await page.locator('#body').innerText()).includes('첫 수'));
      await page.locator('#close').tap();
      await page.locator('#options').tap();
      await page.locator('#speed').selectOption('1.6');
      for(const [id,value] of [['music',0],['sound',20]]) {
        await page.locator('#'+id).fill(String(value));
      }
      await page.reload();
      assert.deepEqual(await page.evaluate(()=>[preferences.speed,preferences.music,preferences.sound]),[1.6,0,20]);
      await page.locator('#fullscreen').tap();
      await page.waitForFunction(()=>document.getElementById('fullscreen').getAttribute('aria-pressed')==='true');
      await page.setViewportSize({width:height,height:width});
      await page.setViewportSize({width,height});
      await page.locator('#myTable').tap();
      await page.locator('[data-hand-index]').last().tap();
      await page.locator('[data-pick="steps"][data-val="0"]').waitFor();
      await page.locator('#close').tap();
      const card=page.locator('#hand [data-kind]').first();
      await card.scrollIntoViewIfNeeded();
      if(useWebKit){
        await card.tap();
      }else{
      const rect=await card.boundingBox(), x=rect.x+rect.width/2,y=rect.y+rect.height/2;
      const session=await page.context().newCDPSession(page);
      const touch=(type,x,y)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
      await touch('touchStart',x,y);
      await page.waitForTimeout(380);
      await touch('touchMove',x-45,y-25);
      const zone=await page.locator('.dropzone').boundingBox();
      assert(zone,'long press generated drop target');
      await touch('touchMove',zone.x+zone.width/2,zone.y+zone.height/2);
      await touch('touchEnd');
      }
      await page.waitForFunction(()=>g.players[0].used.length===1);
      assert.equal(await page.evaluate(()=>g.players[0].bag[0]),5);
      if(width===568)assert.equal(await page.locator('.conversionLayer .spiceFlight').count(),0);
      assert.deepEqual(errors,[]);
      console.log('Mobile layout, settings, last hand card and '+(useWebKit?'tap':'drag')+' passed',width,height);
      await page.context().close();
    }
  } finally {await browser.close();server.close();}
}
mobile().catch(e=>{console.error(e);process.exitCode=1;});
