const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
async function audit(page, width) {
  const tap = selector => page.locator(selector).first().tap();
  const showing = async selector => assert(await page.locator(selector).first().isVisible(), selector);
  const open = async path => {
    await page.goto(new URL(path, base).href);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  };
  const rules = async (button, dialog, close) => {
    await tap(button);
    await showing(dialog + '[open]');
    await tap(close);
    assert.equal(await page.locator(dialog + '[open]').count(), 0);
  };

  await open('index.html');
  const tabs = page.getByRole('tab');
  for (const tab of await tabs.all()) {
    await tab.tap();
    const panel = '#' + await tab.getAttribute('aria-controls');
    await showing(panel);
    for (const link of await page.locator(panel + ' nav a').all()) {
      const destination = await link.getAttribute('href');
      await Promise.all([page.waitForURL(new URL(destination, base).href), link.tap()]);
      assert.equal(new URL(page.url()).pathname, new URL(destination, base).pathname);
      await page.goBack();
      await showing(panel);
    }
  }

  for (const path of ['spice.html', 'expedition.html?edition=2', 'splendor.html']) {
    await open(path);
    await tap('#new');
    for (const button of ['#guide', '#latestMove', '#options', '#reserved', '#setupTop']) {
      const control = page.locator(button);
      if (await control.isVisible() && await control.isEnabled()) await rules(button, '#modal', '#close');
    }
  }

  await open('splendor.html?mode=cities');
  await page.locator('#mode').selectOption('orient');
  await tap('#new');
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'orient');
  await page.reload();
  assert.equal(await page.locator('#modal[open]').count(), 0);
  assert.equal(await page.locator('#market [data-card]').count(), 18);
  await page.goto(new URL('splendor.html?mode=forts', base).href);
  assert.equal(await page.locator('#mode').inputValue(), 'forts');
  await tap('#new'); await tap('#continueGame');
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'orient');

  if (process.argv.includes('--rooms')) {
    for (const path of ['spice.html', 'expedition.html?edition=3', 'vegas.html', 'splendor.html']) {
      const url = new URL(path, base);
      url.searchParams.set('emulator', '1');
      await open(url);
      await tap('#friend');
      const invite = await page.locator('#invite').inputValue();
      await tap('#copyInvite');
      await page.evaluate(() => Object.defineProperty(navigator, 'share', {configurable:true, value:undefined}));
      await tap('#shareInvite');
      await showing('#mailInvite');
      const email = await page.locator('#mailInvite').getAttribute('href');
      assert(decodeURIComponent(email).includes(invite));
      await tap('#solo');
      await page.waitForFunction(() => !document.querySelector('#invite'));
    }
  }

  for (const mode of ['classic', 'friendly', 'ports', 'sea', 'knights']) {
    await open('catan.html?mode=' + mode);
    await page.locator('#count').selectOption('4');
    await tap('#config .primary');
    await showing('#game');
    if (await page.locator('[data-region]').count()) {
      await tap('[data-region]');
      await tap('#mapBack');
      await tap('[data-region]');
    }
    await tap('[data-index]');
    for (const details of await page.locator('#game details').all()) {
      await details.locator('summary').tap();
      assert(await details.getAttribute('open') !== null);
    }
    await tap('#settings');
    await tap('#resume');
    await showing('#game');
  }

  await open('cept.html');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Culdcept setup overflow');
  await tap('#editor summary'); await page.locator('#cardSearch').fill('고블린');
  await rules('.catalog-open', '#cardDialog', '#closeCard');
  await tap('#editor summary');
  await tap('#config .primary'); await showing('#game');
  for (const zoom of ['1.8','1']) {
    const choice = '[data-zoom="' + zoom + '"]';
    if (!await page.locator(choice).isVisible()) await tap('#mapViews summary');
    await tap(choice);
  }
  await tap('#buttons button:enabled'); await tap('#setup'); await tap('#resume');
  await showing('#game');

  await open('vegas.html');
  await page.locator('#count').selectOption('4');
  await page.locator('[data-level="2"]').selectOption('Hell');
  await tap('#start'); await rules('#guide', '#modal', '#close');
  await tap('#action'); await showing('.casino:enabled'); await tap('.casino:enabled');
  await showing('.casino:disabled');

  await open('blackjack.html');
  await rules('#rules', '#help', '#dismiss');
  await tap('[data-bet]'); await tap('[data-action="deal"]');
  for (let step = 0; step < 12; step++) {
    if (await page.locator('[data-action="next"]').count()) break;
    const action = page.locator('[data-action="decline"], [data-action="stand"]');
    if (await action.count()) await action.first().tap();
    else await page.waitForTimeout(350);
  }
  await tap('[data-action="next"]'); await showing('[data-action="deal"]');

  for (const game of ['poker', 'hula']) {
    await open('card-table.html?game=' + game);
    await page.locator('#count').selectOption('2'); await tap('[data-act="start"]');
    await rules('#guide', '#modal', '#close');
    if (game === 'poker') {
      await tap('[data-act="fold"]');
      await tap('[data-act="next"]');
    } else {
      await tap('[data-act="draw"]'); await tap('.handBtn:enabled');
      await showing('.handBtn[aria-pressed="true"]'); await tap('[data-act="discard"]');
    }
    await page.reload(); await showing('.localSeat');
  }

  await open('tichu.html'); await tap('[data-a="start"]');
  await rules('#guide', '#modal', '#close'); await tap('[data-a="continue"]');
  assert.equal(await page.locator('.handBtn').count(), 14);
  for (let n = 0; n < 3; n++) await page.locator('.handBtn').nth(n).tap();
  await tap('[data-a="exchange"]');
  await tap('[data-a="suggest"]');
  await tap(await page.locator('[data-a="play"]').isEnabled() ? '[data-a="play"]' : '[data-a="pass"]');
  await page.reload(); await showing('#opponents');
  await page.evaluate(() => {
    Object.assign(g, {phase:'play', turn:0, leader:0, top:null, pile:[], passed:[], order:[], wish:0});
    g.p[0].hand = [Tichu.M, 6, 19, 32, 45, Tichu.PH];
    g.p[0].played = false;
    g.p[0].call = 0;
    changed();
  });
  await tap('[data-a="small"]');
  await tap('[data-id="52"]'); await page.locator('#wish').selectOption('9');
  await tap('[data-a="play"]');
  assert.equal(await page.evaluate(() => g.wish), 9);
  for (const id of [6, 19, 32, 45]) await tap('[data-id="' + id + '"]');
  await tap('[data-a="play"]');
  assert.equal(await page.evaluate(() => g.top.type), 'bomb');
  await page.evaluate(() => {
    Object.assign(g, {phase:'dragon', turn:0, leader:0, pile:[Tichu.DR]});
    changed();
  });
  await tap('[data-a="gift3"]');
  assert(await page.evaluate(() => g.p[3].won.includes(Tichu.DR)));
  console.log(width, 'catalog, Catan, Culdcept, Vegas, blackjack, poker, hula and Tichu passed');
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'msedge' });
  try {
    for (const viewport of [{width:667,height:375}, {width:390,height:844}]) {
      const page = await browser.newPage({viewport, isMobile:true, hasTouch:true, reducedMotion:'reduce'});
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await audit(page, viewport.width);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
