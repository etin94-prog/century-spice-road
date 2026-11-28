const { chromium } = require('playwright'),
  assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://127.0.0.1:8088/';
const ids = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
(async () => {
  const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || 'msedge' }),
    failures = [];
  try {
    const page = await browser.newPage({ viewport: { width: 667, height: 375 }, hasTouch: true });
    // Drive the same animation loop one simulated frame at a time without waiting for wall time.
    await page.addInitScript(() => {
      let queued = null,
        now = 0,
        seed = 9837;
      Math.random = () => {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      window.requestAnimationFrame = (fn) => {
        queued = fn;
        return 1;
      };
      window.cancelAnimationFrame = () => {
        queued = null;
      };
      window.advanceFrames = (n) => {
        while (n-- && queued) {
          const fn = queued;
          queued = null;
          now += 1000 / 60;
          fn(now);
        }
      };
      // Rendering is covered by the mobile smoke test. Retain geometry for the simulation.
      const gradient = { addColorStop() {} };
      window.ballsSeen = [];
      let arc = null;
      const ctx = {
        clearRect() {
          window.ballsSeen = [];
        },
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        arc(x, y, r) {
          arc = { x, y, r };
          window.ballsSeen.push(arc);
        },
        fillText(value) {
          if (arc) arc.value = value;
        },
      };
      HTMLCanvasElement.prototype.getContext = () =>
        new Proxy(ctx, {
          get: (o, k) => (k in o ? o[k] : () => {}),
          set: (o, k, v) => {
            o[k] = v;
            return true;
          },
        });
    });
    for (const id of ids) {
      try {
        await page.goto(base + 'world-table.html?game=' + id);
        await page.waitForSelector('canvas');
        const result = await page.evaluate((id) => {
          const stop = document.querySelector('#result'),
            canvas = document.querySelector('canvas');
          const buttons = [...document.querySelectorAll('.studio-key')],
            score = () => document.querySelector('#score').textContent;
          function tap(x, y) {
            const r = canvas.getBoundingClientRect(),
              e = {
                clientX: r.left + (canvas.clientLeft + canvas.clientWidth * x / 600) * r.width / canvas.offsetWidth,
                clientY: r.top + (canvas.clientTop + canvas.clientHeight * y / 360) * r.height / canvas.offsetHeight,
                pointerId: 1,
              };
            // Synthetic DOM events have no active native pointer to capture.
            canvas.setPointerCapture = () => {};
            canvas.onpointerdown(e);
            canvas.onpointerup(e);
          }
          let i = 0;
          const limit = [32, 34, 35].includes(id) ? 800 : 350;
          while (stop.hidden && i++ < limit) {
            if (id === 31) {
              const goals = [
                  [518, 46],
                  [469, 240],
                  [500, 145],
                ],
                n = Number(score()[0]) || 1;
              tap(...goals[n - 1]);
            }
            if (id === 33) tap(300, 158); // Head pin in the lane camera.
            if (id === 32 || id === 35) {
              window.advanceFrames(2);
              const carrom = id === 35,
                all = window.ballsSeen.filter((t) => t.r === (carrom ? 9 : 8)),
                cue = carrom ? window.ballsSeen.find((t) => t.r === 10) : all.pop();
              const pockets = window.ballsSeen.filter((t) => t.r === 15),
                first = carrom
                  ? all
                  : all
                      .slice()
                      .sort((a, b) => a.value - b.value)
                      .slice(0, 1);
              if (
                cue &&
                first.length &&
                document.querySelector('#status').textContent.startsWith('나')
              ) {
                const norm = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
                const blocked = (a, b, t) => {
                  const dx = b.x - a.x,
                    dy = b.y - a.y,
                    k = ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy);
                  return (
                    k > 0.01 &&
                    k < 0.98 &&
                    Math.hypot(a.x + k * dx - t.x, a.y + k * dy - t.y) < t.r * 1.9
                  );
                };
                let best = null;
                for (const obj of first)
                  for (const pocket of pockets) {
                    const d = norm(obj, pocket),
                      nx = (pocket.x - obj.x) / d,
                      ny = (pocket.y - obj.y) / d;
                    const ghost = {
                      x: obj.x - nx * (cue.r + obj.r),
                      y: obj.y - ny * (cue.r + obj.r),
                    };
                    const free = buttons.find((b) => b.textContent === '흰 공 놓기' && !b.disabled);
                    const pos = { x: ghost.x - 28 * nx, y: ghost.y - 28 * ny };
                    const place =
                      free &&
                      pos.x > 36 &&
                      pos.x < 564 &&
                      pos.y > 36 &&
                      pos.y < 324 &&
                      !all.some((t) => norm(t, pos) < 19);
                    const source = place ? pos : cue;
                    const cut =
                      ((ghost.x - source.x) * nx + (ghost.y - source.y) * ny) /
                      Math.max(1, norm(source, ghost));
                    const score =
                      cut * 5 -
                      d / 400 -
                      all.filter((t) => t !== obj && blocked(obj, pocket, t)).length * 6 -
                      all.filter((t) => t !== obj && blocked(source, ghost, t)).length * 7;
                    if (!best || score > best.score) best = { score, ghost, pos, place, free, obj };
                  }
                if (best) {
                  if (best.place) {
                    best.free.click();
                    tap(best.pos.x, best.pos.y);
                  }
                  const shift = best.score < 0 ? (Math.random() - 0.5) * 16 : 0;
                  const slider = document.querySelector('input[type=range]');
                  slider.value = 90;
                  slider.dispatchEvent(new Event('input'));
                  tap(best.ghost.x + shift, best.ghost.y);
                }
              }
            }
            if (id === 34) {
              const n = Number(score().match(/나 (\d+)/)?.[1] || 301),
                goal = Math.min(20, n),
                order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
                angle = (order.indexOf(goal) * Math.PI) / 10;
              tap(300 + 110 * Math.sin(angle), 180 - 110 * Math.cos(angle));
              buttons[0].click();
            }
            if ([36, 37, 41].includes(id)) tap(35, 28);
            if (id === 38) tap(300, 78); // Button in the projected house.
            if (id === 39) buttons[i % 2].click();
            if (id === 40) {
              buttons[0].click();
              window.advanceFrames(2);
              buttons[2].click();
            }
            if (id === 42 && i === 1) buttons[0].click();
            if (id === 43) {
              if (i % 2) tap(200, 140);
              else buttons[0].click();
            }
            if (id === 44 || id === 45) buttons[0].click();
            if (id === 46) tap(140, 125);
            window.advanceFrames(
              [32, 35].includes(id) ? 800 : [31, 33, 38].includes(id) ? 360 : 60,
            );
          }
          return [!stop.hidden, stop.textContent, score(), i];
        }, id);
        assert(result[0], JSON.stringify(result));
        if (id === 33) assert.match(result[1], /10프레임 · [1-9]\d*점/, 'A centered roll must score');
        console.log(id, result[1], result[3]);
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
