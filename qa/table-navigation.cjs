const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({channel:process.env.QA_CHANNEL || 'msedge'});
  const base = process.env.GAME_URL || 'http://127.0.0.1:18965/';
  try {
    const page = await browser.newPage({viewport:{width:667,height:375},isMobile:true,hasTouch:true});
    for (const [path, tab] of [['card-table.html?game=poker','worldwide'],['card-table.html?game=hula','worldwide'],['tichu.html','worldwide'],['vegas.html','vegas']]) {
      await page.goto(new URL(path,base).href);
      const back = page.locator('dialog[open] a.setupBack');
      assert(await back.isVisible(),path + ' setup exit');
      await back.tap();
      await page.locator('#tab-'+tab+'[aria-selected=true]').waitFor();
    }
    for (const game of ['tichu','hula']) {
      await page.goto(new URL(game==='tichu'?'tichu.html':'card-table.html?game=hula',base).href);
      await page.locator('[data-a=start],[data-act=start]').tap();
      await page.locator('[data-a=continue],[data-act=draw]').tap();
      const hand = page.locator('.handBtn:enabled').first();
      await hand.focus();
      await page.keyboard.press('Enter');
      assert.equal(await hand.getAttribute('aria-pressed'),'true');
      assert(await hand.evaluate(b=>b===document.activeElement),'focus lost after card selection');
      if(game==='tichu'){
        for(const i of [1,2]) await page.locator('.handBtn').nth(i).tap();
        assert(await page.locator('.handBtn').nth(3).isDisabled());
        await hand.tap();
        assert(await page.locator('.handBtn').nth(3).isEnabled());
      } else {
        await page.evaluate(()=>{
          Object.assign(game,{round:5,phase:'result',reason:'스톱',winners:[0,1]});
          game.players.forEach((p,i)=>p.wins=i<2?3:1);
          render();
        });
        const standings=await page.locator('#msg').innerText();
        assert.equal(standings.match(/공동 1위/g)?.length,2);
        assert.match(standings,/3위/);
      }
    }
    console.log('Setup exit, keyboard selection and exchange limit passed');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
