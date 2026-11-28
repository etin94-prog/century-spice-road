const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const capture = process.env.WW_SPORT_CAPTURE;
const games = [31, 36, 40];
const webKit = process.argv.includes('--webkit');

async function checkScores(page) {
  await page.goto(base + 'world-table.html?game=31');
  const themes = await page.evaluate(async () => {
    const { href } = await import('./ww-data.js');
    const source = await (await fetch('ww-music.js')).text();
    // Exercise the public catalog URLs, including the two standalone card tables.
    return Array.from({length:51}, (_, i) => {
      const location = new URL(href(i + 1), document.baseURI);
      const music = Function('location', source + '\nreturn worldwideMusic;')(location);
      const notes = [];
      for (let tick=0; tick<64; tick++)
        music.render(tick, tick*music.interval, (...note) => notes.push(note));
      return [music.id, notes];
    });
  });
  assert.equal(new Set(themes.map(([id]) => id)).size, 51);
  assert.equal(new Set(themes.map(([,notes]) => JSON.stringify(notes))).size, 51);
  for (const [id,notes] of themes) {
    assert.ok(notes.length > 70, 'short score '+id);
    assert.ok(notes.every(([pitch,time,duration,level]) =>
      Number.isFinite(pitch) && time >= 0 && duration > .012 && level > .001));
  }
}

async function play(page, id, viewport) {
  await page.goto(base + 'world-table.html?game=' + id);
  await page.locator('canvas').waitFor();
  await page.evaluate(() => window.framesAhead(1));
  const tap = async (name) => {
    const b = await page.getByRole('button', {name, exact:true}).boundingBox();
    assert.ok(b && b.width && b.height, name);
    await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
  };
  const png = page.locator('canvas');
  const advance = n => page.evaluate(n => window.framesAhead(n), n);
  await page.waitForFunction(() => performance.getEntriesByType('resource')
    .some(e => e.name.includes('/sport-') && e.responseEnd > 0), undefined, {polling:50});
  // The next draw decodes and composites the newly loaded field.
  await advance(2);
  if (id === 31) {
    await tap('샷');
    await advance(19);
    assert.match(await page.locator('#score').innerText(), /1타/);
  } else if (id === 36) {
    await tap('샷 · 드라이브');
    assert.equal(await page.getByRole('button', {name:'샷 · 로브'}).getAttribute('aria-pressed'),'true');
    await tap('서브 · 시작');
    await advance(64);
  } else {
    await tap('투구 요청');
    await advance(59);
    await tap('스윙');
    assert.match(await page.locator('#status').textContent(), /홈런/);
    await advance(20);
  }
  const shape = await png.boundingBox();
  assert.ok(shape.width>155 && shape.height>100, JSON.stringify(shape));
  if (capture) {
    fs.mkdirSync(capture,{recursive:true});
    await page.screenshot({path:path.join(capture, id + '-' + viewport.width + (webKit ? '-wk':'-cr') + '.png')});
  }
  if (id === 40) {
    await advance(120);
    assert.match(await page.locator('#score').innerText(), /나\s+1\s*:\s*0/);
  }
  if (id === 36) {
    await advance(540);
    assert.doesNotMatch(await page.locator('#score').innerText(), /나 0 · 상대 0/);
  }
  assert.equal(await page.evaluate(() => worldwideMusic.id),id);
}

(async () => {
  const browser = await (webKit ? webkit.launch() : chromium.launch({channel:process.env.QA_CHANNEL || 'msedge'}));
  const errors=[];
  try {
    for (const viewport of [{width:844,height:390},{width:390,height:844}]) {
      const page = await browser.newPage({viewport, hasTouch:true, isMobile:true, deviceScaleFactor:1});
      page.setDefaultTimeout(8000);
      page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(() => {
        let queue=[], time=0;
        Math.random=()=>.5;
        window.requestAnimationFrame=fn=>{ queue.push(fn); return queue.length; };
        window.framesAhead=n => {
          while(n--) {const batch=queue;queue=[];time+=1000/60;for(const fn of batch)fn(time);}
        };
      });
      if (viewport.width>viewport.height) await checkScores(page);
      for (const id of games) await play(page,id,viewport);
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log((webKit?'WebKit':'Chromium')+': 51 scores and 3 playable sports in landscape and portrait passed');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});