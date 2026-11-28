const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const ids = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28,
      29, 30, 39, 43, 46, 47, 49,
    ];
(async () => {
  const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'msedge' }),
    failures = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 667, height: 375 },
      isMobile: true,
      hasTouch: true,
    });
    page.setDefaultNavigationTimeout(30000);
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, wait, ...args) => timeout(fn, Math.min(wait || 0, 1), ...args);
      let seed = 709 + Number(new URLSearchParams(location.search).get('game'));
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    let errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    for (const id of ids) {
      try {
        errors = [];
        await page.goto(base + 'world-table.html?game=' + id);
        await page.waitForFunction(() => document.querySelector('#surface')?.childElementCount > 0);
        const result = await page.evaluate(async (id) => {
          const stop = document.querySelector('#result'),
            surface = document.querySelector('#surface');
          let i = 0,
            idle = 0;
          const limit = id === 20 ? 4200 : 2400;
          while (stop.hidden && i++ < limit) {
            let choices = [...surface.querySelectorAll('button:enabled')];
            if (!choices.length) {
              idle++;
              await new Promise((r) => setTimeout(r, 1));
              if (idle > 800) break;
              continue;
            }
            idle = 0;
            const named = (re) => choices.filter((b) => re.test(b.textContent)),
              random = (a) => a[Math.floor(Math.random() * a.length)];
            const priority = named(
              /암호 확인|정답 확인|점으로 멈추기|라스트 카드 선언|론$|쯔모$|계속$/,
            );
            let button = random(choices);
            if (id === 3) {
              button =
                random(choices.filter((b) => b.classList.contains('score-cell'))) || choices[0];
            }
            if (id === 5) {
              button =
                random(
                  choices.filter((b) => b.parentElement === surface.querySelectorAll('.tiles')[1]),
                ) ||
                priority[0] ||
                button;
            }
            if (
              id === 6 ||
              id === 8 ||
              id === 9 ||
              id === 12 ||
              id === 16 ||
              id === 17 ||
              id === 18
            ) {
              button =
                random(choices.filter((b) => b.classList.contains('target'))) ||
                random(choices.filter((b) => !b.classList.contains('selected'))) ||
                button;
            }
            if (id === 12) {
              const all = () => [...surface.querySelector('.star').children];
              const sources = all().flatMap((b, i) =>
                b.matches('button:enabled') && b.textContent === '●' ? [i] : [],
              );
              let best = null;
              for (const from of sources) {
                all()[from].click();
                const cells = all();
                for (const dest of cells.filter((b) => b.classList.contains('target'))) {
                  const to = cells.indexOf(dest);
                  const v =
                    (Math.floor(from / 25) - Math.floor(to / 25)) * 2 +
                    (Math.floor(from / 25) >= 4 && Math.floor(to / 25) < 4 ? 3 : 0) +
                    (Math.abs((from % 25) - 12) - Math.abs((to % 25) - 12)) * 0.12 +
                    Math.random() * 0.9;
                  if (!best || v > best.v) best = { from, to, v };
                }
                all()[from].click();
              }
              if (!best) break;
              all()[best.from].click();
              button = all()[best.to];
            }
            if (id === 20)
              button =
                priority[0] ||
                random(choices.filter((b) => !b.textContent.startsWith('리치'))) ||
                button;
            if (id === 21 || id === 19) button = priority[0] || button;
            if (id === 39) {
              button = choices[i % 2];
              await new Promise((r) => requestAnimationFrame(r));
            }
            if (id === 43 || id === 46) button = choices[0];
            if (id === 47) button = random(choices.filter((b) => b.textContent === '↓')) || button;
            if (id === 49) {
              const sel = surface.querySelector('.mah-tile.selected');
              button = sel
                ? choices.find((b) => b !== sel && b.textContent === sel.textContent)
                : choices.find((b) =>
                    choices.some((c) => c !== b && c.textContent === b.textContent),
                  );
              if (!button) break;
            }
            button.click();
            if (i % 8 === 0 || [20, 26, 39].includes(id))
              await new Promise((r) => setTimeout(r, 1));
          }
          return {
            end: !stop.hidden,
            text: stop.textContent,
            moves: i,
            status: document.querySelector('#status').textContent,
            remaining:
              id === 12
                ? [...surface.querySelector('.star').children]
                    .flatMap((b, i) => (b.textContent ? [i + ' ' + b.textContent] : []))
                    .filter((s) => !s.endsWith('·'))
                : undefined,
          };
        }, id);
        assert.equal(errors.join('; '), '');
        assert(result.end, JSON.stringify(result));
        console.log(id, result.text, result.moves);
      } catch (e) {
        console.error(id, e.message);
        failures.push(id);
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
