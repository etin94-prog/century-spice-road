'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const modes = ['classic', 'friendly', 'ports', 'sea', 'knights'];
const viewports = [{ width: 375, height: 812 }, { width: 667, height: 375 }];

async function checkZoom(browser, mode, viewport) {
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(new URL('catan.html?mode=' + mode, base).href);
    await page.locator('#config .primary').tap();

    const board = page.locator('#board svg');
    const region = page.locator('#board [data-region]').first();
    const overview = await board.getAttribute('viewBox');
    await region.waitFor();
    const target = await region.boundingBox();
    assert(target.width >= 44 && target.height >= 44, 'Touch area below 44×44');
    await region.tap();
    const zoomed = await board.getAttribute('viewBox');
    assert.notEqual(zoomed, overview);

    // A browser toolbar height change must not discard the selected district.
    await page.setViewportSize({ ...viewport, height: viewport.height - 32 });
    assert.equal(await board.getAttribute('viewBox'), zoomed);

    const back = page.locator('.map #mapBack');
    await back.tap();
    assert.equal(await board.getAttribute('viewBox'), overview);
    assert.equal(await back.isVisible(), false);
    await region.tap();
    await page.locator('#board [data-index]').first().tap();
    await page.waitForFunction(() => state.phase === 'setupRoad');
    assert.equal(await board.getAttribute('viewBox'), overview);
    assert.deepEqual(errors, []);
    console.log(mode, viewport.width + '×' + viewport.height, 'zoom, return, and placement passed');
  } finally {
    await page.close();
  }
}

async function run() {
  const channel = process.env.QA_CHANNEL;
  const browser = await chromium.launch(channel ? { channel } : {});
  try {
    for (const mode of modes) for (const viewport of viewports) await checkZoom(browser, mode, viewport);
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
