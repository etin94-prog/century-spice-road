const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path'),
  fs = require('node:fs');
const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const capture = process.env.WW_COVER_DIR;
const requested = process.argv.slice(2).map(Number).filter(Number.isInteger);
const ids = requested.length ? requested : Array.from({ length: 51 }, (_, i) => i + 1);
(async () => {
  const browser = await chromium.launch({
    channel: process.env.QA_CHANNEL || 'msedge',
    headless: true,
  });
  const failures = [];
  try {
    for (const [width, height] of [
      [375, 812],
      [667, 375],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        locale: 'ko-KR',
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === new URL(base).origin
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.setDefaultNavigationTimeout(25000);
      let errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '#worldwide');
      const links = page.locator('.ww-list a');
      assert.equal(await links.count(), 51);
      await page.getByRole('searchbox').fill('23');
      assert.equal(await page.locator('.ww-list a:visible').count(), 1);
      await page.getByRole('searchbox').fill('Renegade');
      assert.match(await page.locator('.ww-list a:visible').innerText(), /15 · 리버시/);
      await page.getByRole('searchbox').fill('');
      const urls = await links.evaluateAll((ls) => ls.map((a) => a.href));
      const covers = await links.evaluateAll((ls) =>
        Promise.all(
          ls.map(async (a, index) => {
            const image = new Image();
            image.src = a.querySelector('img').src;
            await image.decode();
            return (
              a.textContent.startsWith(String(index + 1).padStart(2, '0') + ' · ') &&
              image.naturalWidth > 200
            );
          }),
        ),
      );
      assert(covers.every(Boolean), 'Missing or mismatched cover');
      for (const id of ids) {
        errors = [];
        try {
          await page.goto(urls[id - 1]);
          await page.waitForFunction(() => /^\d\d · /.test(document.title), {}, { timeout: 4500 });
          if (id === 22 || id === 23) {
            const begin =
              id === 22
                ? page.locator('button[data-action="deal"]')
                : page.getByRole('button', { name: '로컬 대국 시작' });
            await begin.tap();
            assert.equal(errors.join(' | '), '');
            if (capture && width === 375)
              await page.screenshot({ path: path.join(capture, id + '.png') });
            continue;
          }
          await page.waitForFunction(
            () => document.querySelector('#surface')?.childElementCount > 0,
            {},
            { timeout: 6000 },
          );
          await page.locator('#guide').tap();
          assert(await page.locator('#dialog').isVisible());
          assert((await page.locator('#dialog p').innerText()).length >= 15);
          await page.locator('#dialog button[value=close]').tap();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          assert(overflow <= 1, 'overflow ' + overflow);
          const arena = page.locator('canvas'),
            active = page.locator('#surface button:enabled');
          if (await arena.count()) {
            await arena.tap();
            // A canvas tap can start a shot; the table then rests its keys until the balls
            // stop, so a key that turns disabled after it was found is expected.
            await page.waitForTimeout(120);
            if (await active.count())
              await active
                .first()
                .tap({ timeout: 3000 })
                .catch((e) => {
                  if (!/not enabled/.test(e.message)) throw e;
                });
          } else {
            await active.first().waitFor({ state: 'visible' });
            await active.first().tap();
          }
          if (capture && width === 375) {
            if ([4, 7, 10].includes(id))
              for (let k = 0; k < 4; k++) {
                await page.waitForTimeout(525);
                const b = page.locator('#surface button:enabled');
                if (await b.count()) await b.nth(Math.floor((await b.count()) * 0.52)).click();
              }
            if (id === 3 && (await page.locator('.die').count()) === 0)
              await page.waitForTimeout(500);
            const source = page.locator('canvas,.board-grid,.pipe-board,.mancala,.dots').first();
            const frame = (await source.count()) ? source : page.locator('#surface');
            await frame.screenshot({ path: path.join(capture, id + '.png'), timeout: 15000 });
          }
          if (id === 10) {
            await page.locator('#boardZoom').tap();
            assert(await page.locator('.zoom-frame').isVisible());
            await page.locator('#boardZoom').tap();
          }
          await page.locator('#restart').tap();
          await page.locator('#confirm').tap();
          await page.waitForTimeout(60);
          assert.equal(errors.join(' | '), '');
        } catch (e) {
          const detail = [width, id, String(e.message).slice(0, 380), errors];
          failures.push(detail);
          console.error(JSON.stringify(detail));
        }
      }
      console.log(width + '×' + height + ' reviewed ' + ids.length + ' games');
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
