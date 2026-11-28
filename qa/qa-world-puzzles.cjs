const { chromium } = require('playwright'),
  assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
function shuffleChoices(source, target) {
  const choices = [],
    a = source.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = a.slice(0, i + 1).indexOf(target[i]);
    assert(j >= 0);
    choices.push((j + 0.25) / (i + 1));
    [a[j], a[i]] = [a[i], a[j]];
  }
  return choices;
}
function spiderDeal() {
  const cols = Array.from({ length: 10 }, (_, i) => Array(i < 4 ? 11 : 10)),
    left = cols.map((c) => c.length),
    plan = [];
  for (let set = 0; set < 8; set++) {
    const target = left.indexOf(Math.min(...left.filter(Boolean)));
    cols[target][--left[target]] = 12;
    for (let rank = 11; rank >= 0; rank--) {
      const source = left.indexOf(Math.max(...left.map((n, i) => (i === target ? -1 : n))), 0);
      // Resolve ties without ever selecting the anchor.
      const from =
        source !== target ? source : left.findIndex((n, i) => i !== target && n === left[source]);
      assert(from >= 0 && left[from] > 0);
      cols[from][--left[from]] = rank;
      plan.push([from, target]);
    }
  }
  const initial = cols.flatMap((c, i) => c.slice(0, i < 4 ? 6 : 5));
  const stock = Array.from({ length: 5 }, (_, k) =>
    cols.map((c, i) => c[(i < 4 ? 6 : 5) + k]),
  ).flat();
  return { deal: initial.concat(stock.reverse()), plan };
}
(async () => {
  const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'msedge' });
  try {
    for (const id of [48, 50, 51]) {
      const ctx = await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
      });
      const page = await ctx.newPage();
      const order = Array.from({ length: 52 }, (_, i) => Math.floor(i / 4) + (i % 4) * 13);
      let target = [],
        plan = [],
        source = [];
      if (id === 50) {
        const ord = order.slice();
        for (let i = 1; i <= 7; i++) target.push(...ord.splice(0, i).reverse());
        target.push(...ord.reverse());
        source = Array.from({ length: 52 }, (_, i) => i);
      }
      if (id === 51) {
        ({ deal: target, plan } = spiderDeal());
        source = Array.from({ length: 104 }, (_, i) => i % 13);
      }
      await page.addInitScript(
        ({ id, choices }) => {
          let seed = 79321;
          window.shuffleTrace = [];
          Math.random = () => {
            if (choices.length) return choices.shift();
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const v = seed / 4294967296;
            if (id === 48) window.shuffleTrace.push(v);
            return v;
          };
        },
        { id, choices: shuffleChoices(source, target) },
      );
      await page.goto(base + 'world-table.html?game=' + id);
      await page.waitForSelector('#surface button');
      const result = await page.evaluate(
        async ({ id, plan }) => {
          const surface = document.querySelector('#surface'),
            end = document.querySelector('#result');
          let moves = 0;
          if (id === 48) {
            let hole = 15;
            const history = [];
            for (const v of window.shuffleTrace) {
              const x = hole % 4,
                y = hole >> 2;
              const adj = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]
                .map(([dx, dy]) => [x + dx, y + dy])
                .filter(([x, y]) => x >= 0 && x < 4 && y >= 0 && y < 4)
                .map(([x, y]) => y * 4 + x);
              history.push(hole);
              hole = adj[Math.floor(v * adj.length)];
            }
            for (const i of history.reverse()) {
              if (!end.hidden) break;
              const tile = surface.querySelector('.pipe-board').children[i];
              if (tile.tagName !== 'BUTTON') break;
              tile.click();
              moves++;
            }
            if (end.hidden) await new Promise((r) => setTimeout(r, 3200));
          } else if (id === 50) {
            for (let n = 0; n < 52; n++) {
              const r = n % 4,
                s = Math.floor(n / 4),
                suit = '♠♥♣♦'[r],
                rank = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'][s];
              if (n >= 28) surface.querySelector('button.card-back').click();
              const b = [...surface.querySelectorAll('button.playing-card')].find(
                (b) => (b.getAttribute('aria-label') || b.textContent) === rank + suit,
              );
              if (!b) throw Error('Missing accessible card ' + rank + suit);
              b.click();
              const f = surface.querySelector('button.foundation.target');
              if (!f) throw Error('Missing foundation');
              f.click();
              moves++;
            }
          } else {
            for (let i = 0; i < 5; i++) surface.querySelector('button.card-back').click();
            for (const [from, to] of plan) {
              let cols = surface.querySelectorAll('.stack');
              cols[from].lastElementChild.click();
              cols = surface.querySelectorAll('.stack');
              const dest = cols[to].lastElementChild;
              if (!dest.classList.contains('target'))
                throw Error('Illegal known move ' + from + ' ' + to);
              dest.click();
              moves++;
            }
          }
          return { won: !end.hidden, text: end.textContent, moves };
        },
        { id, plan },
      );
      assert(result.won);
      console.log(id, result.text, result.moves);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
