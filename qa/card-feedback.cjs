const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function run() {
  const browser = await chromium.launch({channel: process.env.QA_CHANNEL || 'msedge'});
  try {
    for (const reducedMotion of ['no-preference','reduce']) {
      const page = await browser.newPage({viewport:{width:667,height:375},isMobile:true,hasTouch:true,reducedMotion});
      await page.addInitScript(() => {
        window.pulses = [];
        navigator.vibrate = ms => {window.pulses.push(ms);return true;};
      });
      const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
      await page.goto(new URL('card-table.html?game=hula',base).href);
      await page.locator('[data-act=start]').tap();
      const draw = page.locator('[data-act=draw]');
      await draw.waitFor();
      const old = await page.locator('.handBtn').count();
      await draw.tap();
      assert.equal(await page.locator('.handBtn').count(),old+1);
      const incoming = page.locator('#myCards .tableLanding');
      assert.equal(await incoming.count(),1);
      assert.equal(await incoming.evaluate(el=>getComputedStyle(el).animationName),reducedMotion==='reduce'?'none':'cardTableLand');
      const first = page.locator('.handBtn').first();
      const box = await first.boundingBox();
      const touch = await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
      await page.waitForFunction(() => {
        const held = document.querySelector('.handBtn[data-table-pressed]');
        return held && getComputedStyle(held).outlineStyle === 'solid';
      }, null, {timeout:1500});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+18,y:box.y+box.height/2}]});
      await page.waitForFunction(() => !document.querySelector('[data-table-pressed]'));
      await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal(await first.getAttribute('data-table-pressed'),null);
      assert.equal(await first.getAttribute('aria-pressed'),'false');
      await first.tap();
      assert.equal(await first.getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('.tableLanding').count(),0);
      await page.locator('[data-act=discard]').tap();
      assert.equal(await page.locator('#boardCards .tableLanding').count(),1);
      assert.deepEqual(await page.evaluate(()=>pulses),reducedMotion==='reduce'?[]:[10,10]);
      await page.close();
      console.log('draw, cancel, select, discard, landing and vibration request:',reducedMotion);
    }
  } finally {await browser.close();}
}

run().catch(error=>{console.error(error);process.exitCode=1;});
