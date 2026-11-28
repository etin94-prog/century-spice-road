const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const useWebKit = process.argv.includes('--webkit');

async function enterTable(page, id, rotated) {
  await page.goto(base + 'world-table.html?game=' + id);
  await page.locator('#cardFull').tap();
  await page.waitForFunction(() => document.querySelector('#cardFull').getAttribute('aria-pressed') === 'true');
  if (rotated) await page.locator('#cardWide').tap();
}

async function checkCast(page, rotated) {
  await enterTable(page, 43, rotated);
  const arena = page.locator('.arena');
  // Observe where the game draws the float after a real touch, including the bitmap's rim.
  await page.evaluate(() => {
    const ctx = document.querySelector('.arena').getContext('2d');
    const original = ctx.drawImage;
    ctx.drawImage = function (image, ...args) {
      if (image.src?.endsWith('/float.webp')) {
        const [x, y, w, h] = args;
        window.castAt = { x: x + w / 2, y: y + h / 2 + 8 };
      }
      return original.call(this, image, ...args);
    };
  });
  const spot = await arena.evaluate((canvas, rotated) => {
    const r = canvas.getBoundingClientRect();
    const x = canvas.clientLeft + canvas.clientWidth * 0.94;
    const y = canvas.clientTop + canvas.clientHeight * 0.11;
    return {
      fits: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      x: rotated ? r.right - y : r.left + x,
      y: rotated ? r.top + x : r.top + y,
    };
  }, rotated);
  assert(spot.fits, 'entire arena fits on screen');
  await page.touchscreen.tap(spot.x, spot.y);
  await page.waitForFunction(() => window.castAt);
  const cast = await page.evaluate(() => window.castAt);
  assert(Math.abs(cast.x - 600 * 0.94) < 2 && Math.abs(cast.y - 360 * 0.11) < 2,
    'float lands at the touched content coordinate: ' + JSON.stringify(cast));
}

async function checkZoom(page, id, rotated) {
  await enterTable(page, id, rotated);
  await page.locator('#boardZoom').tap();
  const slot = page.locator('.zoom-frame .cell:is(button):enabled').last();
  await slot.scrollIntoViewIfNeeded();
  const bounds = await slot.boundingBox();
  assert(Math.min(bounds.width, bounds.height) >= 44, 'zoomed cell size in game ' + id);
  await slot.evaluate(el => {
    window.pressedSlot = false;
    el.addEventListener('pointerdown', () => { window.pressedSlot = true; }, { once: true });
  });
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  assert(await page.evaluate(() => window.pressedSlot), 'zoomed touch selected the intended cell');
}

(async () => {
  const browser = await (useWebKit ? webkit : chromium).launch(useWebKit ? {} : { channel: process.env.QA_CHANNEL || 'msedge' });
  try {
    for (const rotated of [false, true]) {
      const viewport = rotated ? { width: 390, height: 844 } : { width: 740, height: 360 };
      const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true });
      await checkCast(page, rotated);
      for (const id of [10, 12, 16]) await checkZoom(page, id, rotated);
      await page.close();
    }
    console.log('Landscape and quarter-turn viewport, cast coordinates and zoomed cell taps OK');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
