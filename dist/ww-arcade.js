import { tennis, baseballField } from './ww-field-sports.js';
import { miniature, material } from './ww-scenery.js';
import { range, random, games } from './ww-core.js';
import {
  sport,
  ball,
  shoot,
  disc,
  advance,
  dist,
  circle,
  line,
  label,
  surface,
  clamp,
} from './ww-studio.js';
const red = '#e06c57',
  blue = '#389aa3',
  cream = '#f4e1ba',
  gold = '#f3cf7a';
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// ---------------------------------------------------------------------------------------------
// Phone kit shared by the arcade tables.
// - In a tall (portrait) surface ww-fit-arcade.css turns top-down fields a quarter turn so the
//   player's side sits at the bottom, under the thumb. Touches and arrow keys are mapped back
//   into table coordinates here, so the rules keep their 600 × 360 field.
// - Rejected input explains itself through the table's ui.reject.
// - A tap ring, a finished-game veil and upright labels are drawn over every field.
// ---------------------------------------------------------------------------------------------
let liveUi = null;
// turnable: a top-down field that may turn a quarter turn in portrait.
// crop: for a side-view field, how much wider than the table it may be drawn in portrait; the
// empty outer edges are cropped so the action is drawn larger (1 = no crop).
function arcade(id, rules, setup, turnable = false, crop = 1) {
  sport(id, rules, (a) => {
    enhance(a, liveUi, turnable, crop);
    const game = setup(a);
    const paint = game.draw;
    game.draw = (g) => {
      a.frame();
      paint(g);
      a.overlay(g);
    };
    return game;
  });
  // The studio passes the table's ui only to its own closure; keep it for the kit above.
  const def = games.get(id),
    start = def.start;
  def.start = (ui) => {
    liveUi = ui;
    return start(ui);
  };
}
const turnKeys = { ArrowUp: 'ArrowRight', ArrowDown: 'ArrowLeft', ArrowLeft: 'ArrowUp', ArrowRight: 'ArrowDown' };
// After the end the thumb pad becomes 새 판 시작. The table's own 새 판 path is reused: its dialog
// starts a new table when it closes with 'restart'. A finished game has nothing to lose, so the
// confirmation is skipped; without that dialog the 새 판 button is pressed instead.
function replay() {
  const dialog = document.querySelector('#dialog');
  if (dialog && !dialog.open && typeof dialog.onclose === 'function' && dialog.showModal) {
    dialog.returnValue = '';
    dialog.showModal();
    dialog.close('restart');
  } else document.querySelector('#restart')?.click();
}
function enhance(a, ui, turnable, crop) {
  const canvas = a.canvas,
    board = canvas.parentElement,
    pads = canvas.nextElementSibling;
  board.classList.add('arcade');
  board.classList.toggle('turnable', turnable);
  board.classList.toggle('crop', crop > 1);
  if (crop > 1) board.style.setProperty('--crop', crop);
  else board.style.removeProperty('--crop');
  board.classList.remove('has-hud', 'is-over');
  pads?.classList.add('arcade-pads');
  let turned = false,
    tapFx = null,
    over = null,
    scale = 1;
  const isTurned = () => turnable && /^-90/.test(getComputedStyle(canvas).rotate || '');
  a.holding = false;
  a.turned = () => turned;
  a.over = () => over !== null;
  a.calm = () => calm.matches;
  // Table units for n CSS pixels on screen (the field is 600 units long in every orientation).
  a.px = (n) => n / scale;
  // The part of the 600-unit width that is visible when the field is cropped (boxing in portrait).
  a.view = () => {
    if (crop <= 1 || !canvas.clientWidth) return [0, 600];
    const half = Math.min(300, (300 * board.clientWidth) / canvas.clientWidth);
    return [300 - half, 300 + half];
  };
  a.reject = (message, el) => ui?.reject?.(message, el);
  a.keys = () => [...(pads?.querySelectorAll('.studio-key') || [])];
  a.hud = (cls) => {
    const el = document.createElement('div');
    el.className = 'arcade-hud ' + cls;
    if (pads) pads.before(el);
    else board.append(el);
    board.classList.add('has-hud');
    return el;
  };
  // Draw something that should read upright on screen (labels, standing figures).
  a.upright = (g, x, y, paint) => {
    if (!turned) return paint(x, y);
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI / 2);
    const drawn = paint(0, 0);
    g.restore();
    return drawn;
  };
  // A point d table units above (x, y) as seen on screen, in either orientation.
  a.above = (x, y, d) => (turned ? [x + d, y] : [x, y - d]);
  // A label on a soft pill, upright in either orientation. It never reads smaller than 13 CSS px,
  // however small the field is drawn.
  a.tag = (g, text, x, y, wanted = 18, color = '#fff8dd', back = '#10241ecc') =>
    a.upright(g, x, y, (px, py) => {
      const size = Math.max(wanted, a.px(13));
      g.save();
      g.font = '700 ' + size + 'px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (back) {
        const w = (g.measureText(text)?.width || text.length * size * 0.6) + size * 0.9,
          h = size * 1.45;
        g.fillStyle = back;
        g.beginPath();
        g.roundRect(px - w / 2, py - h / 2, w, h, h / 2);
        g.fill();
      }
      g.shadowColor = '#0009';
      g.shadowBlur = 3;
      g.shadowOffsetY = 1;
      g.fillStyle = color;
      g.fillText(text, px, py + 1);
      g.restore();
    });
  // Soft breathing value for invitations; steady when the player asked for less motion.
  a.pulse = (speed = 4) => (calm.matches ? 0.6 : 0.5 + 0.5 * Math.sin(a.time * speed));
  const finish = a.finish;
  a.finish = (message) => {
    if (ui?.ended) return;
    over = message;
    finish(message);
    // Taps after the end get the table's "game over" reason instead of nothing.
    canvas.dataset.why = '경기가 끝났어요.';
    a.keys().forEach((k) => (k.dataset.why = '경기가 끝났어요.'));
    // The spent pads step aside; the thumb pad now starts the next game.
    if (pads) {
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'studio-key replay is-hot';
      again.textContent = '새 판 시작';
      again.setAttribute('aria-label', '새 판 시작하기');
      again.addEventListener('click', replay);
      pads.append(again);
      board.classList.add('is-over');
    }
    const outcome = /^(나|우리 팀)/.test(message)
      ? 'win'
      : /^(상대|상대 팀)/.test(message)
        ? 'loss'
        : /무승부/.test(message)
          ? 'draw'
          : null;
    if (outcome && typeof cardAudio !== 'undefined') cardAudio.result(outcome);
  };
  a.frame = () => {
    turned = isTurned();
    scale = canvas.clientWidth / 600 || 1;
  };
  a.overlay = (g) => {
    if (tapFx) {
      const k = (a.time - tapFx.t) / 0.4;
      if (k >= 1 || k < 0) tapFx = null;
      else {
        g.save();
        g.globalAlpha = 1 - k;
        circle(g, tapFx.x, tapFx.y, calm.matches ? 16 : 10 + 22 * k, '#fff6dc', true);
        g.restore();
      }
    }
    if (over) {
      g.save();
      g.fillStyle = '#0d1d18a6';
      g.fillRect(0, 0, 600, 360);
      g.restore();
      a.tag(g, '경기 종료', ...a.above(300, 180, 30), 30, gold, null);
      a.tag(g, over, ...a.above(300, 180, -22), 20, '#fff8dd', '#173a31e6');
    }
  };
  // Map touches on the quarter-turned field back into table coordinates. The studio
  // attaches its handlers right after setup, so wrap them on the next microtask.
  queueMicrotask(() => {
    const remap = (e) => {
      if (!isTurned() || typeof e.clientX !== 'number') return e;
      const r = canvas.getBoundingClientRect(),
        across = (r.bottom - e.clientY) / r.height,
        down = (e.clientX - r.left) / r.width;
      return {
        clientX: r.left + across * r.width,
        clientY: r.top + down * r.height,
        pointerId: e.pointerId,
        isPrimary: e.isPrimary,
      };
    };
    for (const k of ['onpointerdown', 'onpointermove', 'onpointerup']) {
      const handler = canvas[k];
      if (typeof handler !== 'function') continue;
      canvas[k] = (e) => {
        const result = handler(remap(e));
        if (k === 'onpointerdown' && !ui?.ended && e.isPrimary !== false) {
          a.holding = true;
          tapFx = { x: a.aim.x, y: a.aim.y, t: a.time };
        }
        if (k === 'onpointerup') a.holding = false;
        return result;
      };
    }
    canvas.addEventListener('pointercancel', () => (a.holding = false));
    canvas.addEventListener('lostpointercapture', () => (a.holding = false));
    const keys = canvas.onkeydown;
    if (typeof keys === 'function')
      canvas.onkeydown = (e) =>
        isTurned() && turnKeys[e.key]
          ? keys({ key: turnKeys[e.key], preventDefault: () => e.preventDefault() })
          : keys(e);
  });
  return a;
}
// Fading copies of a moving ball make its direction readable at a glance.
function trail(g, points, r, color) {
  points.forEach((p, i) => {
    g.save();
    g.globalAlpha = ((i + 1) / (points.length + 1)) * 0.35;
    circle(g, p.x, p.y, r * (0.55 + (0.45 * i) / points.length), color);
    g.restore();
  });
}
function remember(points, b, n = 6) {
  points.push({ x: b.x, y: b.y });
  if (points.length > n) points.shift();
}
function glowRing(g, x, y, r, color = gold, width = 3) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = 8;
  g.lineWidth = width;
  g.strokeStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

arcade(36, '서브 후 화면을 좌우로 끌어 선수를 이동하세요. 라켓 가운데로 받으면 안정적인 리턴, 가장자리로 받으면 크로스 샷입니다. 드라이브와 로브를 고를 수 있고 7점 이상에서 두 점 앞서면 승리합니다.', tennis);
for (const id of [37, 41])
  arcade(
    id,
    id === 37
      ? '화면을 터치하거나 끌어 내 선수 줄을 옮기세요(세로 화면은 아래쪽, 가로 화면은 왼쪽 팀). 공을 밀어 상대 골대에 5골을 먼저 넣으면 승리합니다.'
        : '내 쪽 절반(세로 화면은 아래, 가로 화면은 왼쪽)에서 손가락으로 말렛을 움직여 퍽을 칩니다. 상대 골대에 5골을 먼저 넣으세요.',
    (a) => {
      const hockey = id === 41,
        football = id === 37,
        score = [0, 0],
        b = ball(300, 180, football ? 8 : 7, hockey ? '#223b49' : cream);
      const me = { x: 65, y: 180 },
        ai = { x: 535, y: 180 };
      let started = false,
        pause = 0,
        flash = null;
      const path = [],
        hint = hockey ? '끌어서 말렛 이동' : '끌어서 선수 줄 이동';
      a.aim = { ...me };
      a.status('터치해서 시작하세요');
      function info() {
        a.score('나 ' + score[0] + ' · 상대 ' + score[1]);
      }
      function serve(side) {
        Object.assign(b, { x: 300, y: 180, vx: side * 205, vy: random(140) - 70 });
        pause = 0.55;
        path.length = 0;
        info();
      }
      function start() {
        if (!started) {
          started = true;
          serve(-1);
          a.status(hint);
          key.textContent = '경기 중';
          key.classList.add('is-idle');
          key.classList.remove('is-hot');
        }
      }
      const key = a.button('서브 · 시작', () =>
        started ? a.reject('경기 중 · ' + hint, key) : start(),
      );
      key.classList.add('is-hot');
      info();
      function goal(p) {
        score[p]++;
        flash = { p, t: a.time };
        info();
        if (score[p] >= 5) {
          a.finish((p ? '상대' : '나') + ' 승리 · ' + score.join(' : '));
          return;
        }
        serve(p ? -1 : 1);
      }
      const players = (p) =>
        football
          ? [
              { x: p ? 495 : 105, y: p ? ai.y : me.y },
              { x: p ? 340 : 260, y: clamp((p ? ai.y : me.y) - 76, 20, 340) },
              { x: p ? 340 : 260, y: clamp((p ? ai.y : me.y) + 76, 20, 340) },
            ]
          : [p ? ai : me];
      return {
        down: start,
        tap: start,
        step(dt) {
          if (!started) return;
          const move = (v, t, spd) => v + clamp(t - v, -spd * dt, spd * dt);
          me.y = move(me.y, clamp(a.aim.y, 15, 345), 640);
          ai.y = move(ai.y, clamp(b.y + 12 * Math.sin(a.time * 3), 18, 342), hockey ? 195 : 155);
          if (hockey) {
            me.x = move(me.x, clamp(a.aim.x, 18, 290), 650);
            ai.x = move(ai.x, clamp(b.x + 40, 330, 568), 165);
          }
          if (pause > 0) {
            pause -= dt;
            return;
          }
          advance(b, dt);
          remember(path, b);
          if (b.y < b.r || b.y > 360 - b.r) {
            b.y = clamp(b.y, b.r, 360 - b.r);
            b.vy *= -1;
          }
          for (const p of [0, 1])
            for (const o of players(p)) {
              const direction = p ? -1 : 1,
                dy = b.y - o.y,
                dx = b.x - o.x;
              const hits = Math.hypot(dx, dy) < (hockey ? 26 : 21);
              if (hits && b.vx * direction < 0) {
                b.x = o.x + direction * 24;
                b.vx = direction * clamp(Math.abs(b.vx) * 1.08 + 12, 200, 460);
                b.vy = clamp(dy * 13, -240, 240);
              }
            }
          if (b.x < 0 || b.x > 600) {
            if (Math.abs(b.y - 180) < 62) goal(b.x < 0 ? 1 : 0);
            else {
              b.vx *= -1;
              b.x = clamp(b.x, 1, 599);
            }
          }
        },
        draw(g) {
          surface(g, ...(hockey ? ['#ccdfe2', '#8cb3c2'] : ['#4b9265', '#256348']));
          material(g, hockey ? 'hockey-rink' : 'sport-pitch', 1);
          g.strokeStyle = hockey ? '#60899b' : '#e7e4c9aa';
          g.lineWidth = 2;
          g.strokeRect(10, 10, 580, 340);
          line(g, 300, 10, 300, 350, g.strokeStyle, 3);
          circle(g, 300, 180, 48, g.strokeStyle, true);
          for (const x of [0, 556]) g.strokeRect(x, 112, 44, 136);
          if (football) {
            // Polished rods beneath the sliding wooden figures.
            for (const x of [105, 260, 340, 495]) {
              line(g, x+2, 10, x+2, 350, '#15251d63', 4);
              line(g, x, 10, x, 350, '#869596', 3);
              line(g, x-1, 10, x-1, 350, '#d6dbcf', 1);
            }
          }
          // Big faint score on each half: readable without looking up at the status rail.
          g.save();
          g.globalAlpha = hockey ? 0.22 : 0.3;
          a.tag(g, String(score[0]), 200, 180, 54, hockey ? '#24485a' : '#fff8dd', null);
          a.tag(g, String(score[1]), 400, 180, 54, hockey ? '#24485a' : '#fff8dd', null);
          g.restore();
          // Before the serve: show which half is mine and invite the first touch.
          if (!started) {
            g.save();
            g.globalAlpha = 0.16 + 0.12 * a.pulse(3);
            g.fillStyle = '#ffe7a3';
            g.fillRect(12, 12, 286, 336);
            g.restore();
            a.tag(g, '내 쪽 · 터치해서 시작', a.turned() ? 190 : 175, a.turned() ? 180 : 318, 19, '#fff8dd', '#173a31e0');
          }
          // Where my finger is steering: a guide across my half.
          if (started && a.holding && !a.over()) {
            g.save();
            g.setLineDash([6, 6]);
            if (hockey) circle(g, clamp(a.aim.x, 18, 290), clamp(a.aim.y, 15, 345), 24, '#1d4f63aa', true);
            else line(g, 14, clamp(a.aim.y, 15, 345), 296, clamp(a.aim.y, 15, 345), '#fff3c477', 2);
            g.restore();
          }
          // Goal flash: the scoring side lights up briefly.
          // (Not on the final frame: the result veil reads alone.)
          if (flash && a.time - flash.t < 0.9 && !a.over()) {
            const k = 1 - (a.time - flash.t) / 0.9;
            g.save();
            g.globalAlpha = 0.35 * k;
            g.fillStyle = flash.p ? '#d9553f' : '#ffd76a';
            g.fillRect(flash.p ? 0 : 300, 0, 300, 360);
            g.restore();
            a.tag(g, flash.p ? '실점' : '득점!', flash.p ? 150 : 450, 180, 26, '#fff8dd', flash.p ? '#8e2f22e0' : '#7a5a18e0');
          }
          for (const p of [0, 1])
            for (const o of players(p)) {
              if (!p) {
                g.save();
                g.globalAlpha = 0.55;
                glowRing(g, o.x, o.y, hockey ? 23 : 18, gold, 2);
                g.restore();
              }
              if (
                !a.upright(g, o.x, o.y, (x, y) =>
                  miniature(
                    g,
                    hockey ? (p ? 'red-mallet' : 'teal-mallet') : p ? 'red-player' : 'blue-player',
                    x,
                    y,
                    hockey ? 40 : 32,
                    hockey ? 40 : 44,
                  ),
                )
              ) {
                disc(g, ball(o.x, o.y, hockey ? 20 : 14, p ? red : blue));
                circle(g, o.x, o.y, hockey ? 9 : 5, p ? '#784b45' : '#246372');
              }
            }
          if (pause <= 0) trail(g, path, b.r, hockey ? '#223b49' : '#fff6dc');
          if (!football || !miniature(g, 'football', b.x, b.y, b.r * 2, b.r * 2)) disc(g, b);
        },
      };
    },
    true,
  );
arcade(
  39,
  '하이·로우 펀치를 알맞은 타이밍에 누르세요. 같은 높이의 가드는 펀치를 막습니다. 상대가 공격을 준비하는 자세를 보고 가드를 바꾸세요. 체력이 먼저 바닥나면 KO입니다.',
  (a) => {
    const hp = [12, 12],
      gloves = ['하이', '로우'];
    let begun = false,
      guard = 0,
      tell = 0,
      aiGuard = 0,
      ready = 0,
      strike = 0,
      mySwing = 0,
      aiSwing = 0,
      last = -1,
      done = false;
    const hud = a.hud('fight');
    hud.innerHTML =
      '<div class="hp me"><span>나</span><b><i></i></b><em></em></div>' +
      '<p class="call" aria-live="off"></p>' +
      '<div class="hp them"><span>상대</span><b><i></i></b><em></em></div>';
    const [mine, call, theirs] = hud.children;
    function sync() {
      for (const [el, v] of [
        [mine, hp[0]],
        [theirs, hp[1]],
      ]) {
        const n = Math.max(0, v);
        el.style.setProperty('--hp', n / 12);
        el.classList.toggle('low', n <= 4);
        el.querySelector('em').textContent = n + ' HP';
      }
      const text = done
        ? '경기 종료'
        : strike
        ? '상대 ' + gloves[tell] + ' 펀치! ' + (guard === tell ? '가드 OK' : '가드 바꾸기')
        : '내 가드 · ' + gloves[guard];
      if (call.textContent !== text) call.textContent = text;
      call.classList.toggle('hot', !done && !!strike && guard !== tell);
      call.classList.toggle('safe', !done && !!strike && guard === tell);
      if (guardKey) guardKey.textContent = '가드 · ' + gloves[guard];
    }
    const info = () => {
      a.score('나 ' + Math.max(0, hp[0]) + ' HP · 상대 ' + Math.max(0, hp[1]) + ' HP');
      sync();
    };
    function start() {
      if (!begun) {
        begun = true;
        ready = a.time + 0.7;
      }
    }
    function punch(n) {
      start();
      if (a.time - last < 0.43) {
        a.reject('숨 고르는 중 · 잠깐 뒤에 치세요', a.keys()[n]);
        return;
      }
      last = a.time;
      mySwing = a.time + 0.25;
      cool(a.keys()[n]);
      if (n !== aiGuard) {
        hp[1] -= 2;
        a.status(gloves[n] + ' 적중');
      } else a.status('상대 가드');
      aiGuard = n;
      info();
      if (hp[1] <= 0) {
        done = true;
        sync();
        a.finish('나 · KO 승리');
      }
    }
    function cool(el) {
      if (!el) return;
      el.classList.remove('cooling');
      void el.offsetWidth;
      el.classList.add('cooling');
      setTimeout(() => el.classList.remove('cooling'), 430);
    }
    for (const [n, name] of gloves.entries()) a.button(name + ' 펀치', () => punch(n));
    const guardKey = a.button('가드 높이 전환', () => {
      start();
      guard = 1 - guard;
      a.status(gloves[guard] + ' 가드');
      sync();
    });
    guardKey.setAttribute('aria-label', '가드 높이 전환');
    guardKey.classList.add('guard');
    info();
    a.status('펀치를 눌러 시작하세요');
    return {
      step() {
        if (!begun || done) return;
        if (!strike && a.time > ready) {
          tell = random(2);
          strike = a.time + 0.65;
          a.status('상대 ' + gloves[tell] + ' 펀치 준비');
          sync();
        }
        if (strike && a.time >= strike) {
          aiSwing = a.time + 0.27;
          if (guard !== tell || a.time - last < 0.22) {
            hp[0] -= 2;
            a.status('상대 펀치 적중');
          } else a.status('가드 성공');
          info();
          strike = 0;
          ready = a.time + 0.55 + Math.random() * 0.55;
          aiGuard = random(2);
          sync();
          if (hp[0] <= 0) {
            done = true;
            sync();
            a.finish('상대 · KO 승리');
          }
        }
      },
      draw(g) {
        surface(g, '#3f4858', '#252e40');
        g.fillStyle = '#798aa2';
        g.fillRect(25, 155, 550, 150);
        material(g, 'boxing-ring', 1);
        for (const x of [25, 575]) {
          line(g, x, 109, x, 291, '#926d48', 12);
          line(g, x - 2, 110, x - 2, 290, '#e6c294', 3);
        }
        for (const y of [125, 166, 205]) line(g, 25, y, 575, y, y === 125 ? red : cream, 4);
        for (const p of [0, 1]) {
          const s = p ? -1 : 1,
            x = p ? 372 : 228,
            y = 223,
            c = p ? red : blue,
            reach = (p ? aiSwing : mySwing) > a.time ? 76 : 0,
            high = p ? (strike ? tell : aiGuard) : guard;
          const lunging = reach > 0;
          // A soft contact shadow under each boxer, light from the upper left.
          g.save();
          g.fillStyle = '#10182466';
          g.beginPath();
          g.ellipse(x + 8, y + 60, 46, 9, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
          const drawn = miniature(g, p ? 'red-boxer' : 'teal-boxer',
            x + s * (lunging ? 18 : 0), y - (high ? 12 : 8), 102, high ? 139 : 127);
          if (drawn) {
            if (lunging) {
              line(g, x + s * 26, y - 9, x + s * 84, y - (high ? 5 : 35), c, 14);
              disc(g, ball(x + s * 92, y - (high ? 5 : 35), 16, c));
            }
            continue;
          }
          g.fillStyle = '#26343c';
          g.fillRect(x - 23, y + 17, 16, 33);
          g.fillRect(x + 7, y + 17, 16, 33);
          disc(g, ball(x, y - 50, 22, '#c79870'));
          disc(g, ball(x, y, 34, c));
          disc(g, ball(x + s * (30 + reach), y - (high ? 5 : 35), 18, c));
          disc(g, ball(x - s * 18, y - 28, 15, c));
        }
        if (done) return;
        // Labels stay inside the visible part of the ring when portrait crops its edges.
        const [x0, x1] = a.view();
        // My guard height, at the height it covers.
        a.tag(g, (guard ? '▼ ' : '▲ ') + '가드 ' + gloves[guard], Math.max(120, x0 + 62), guard ? 250 : 180, 17,
          '#e9fbff', '#1d5560dd');
        if (strike) {
          // The incoming punch with a countdown ring: how long until it lands.
          const left = clamp((strike - a.time) / 0.65, 0, 1),
            safe = guard === tell,
            rx = Math.min(470, x1 - 34);
          g.save();
          g.lineWidth = 5;
          g.strokeStyle = '#00000055';
          g.beginPath();
          g.arc(rx, tell ? 250 : 180, 24, 0, Math.PI * 2);
          g.stroke();
          g.strokeStyle = safe ? '#8fe0b0' : '#ff8a6b';
          g.beginPath();
          g.arc(rx, tell ? 250 : 180, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
          g.stroke();
          g.restore();
          a.tag(g, gloves[tell] + '!', rx, tell ? 250 : 180, 15, '#fff8dd', null);
          a.tag(g, '상대 ' + gloves[tell] + ' 펀치', Math.min(375, x1 - 80), 100, 18, '#fff8dd', safe ? '#1f6047e6' : '#8e2f22e6');
        }
      },
    };
  },
  false,
  1.5,
);
arcade(
  40,
  '3이닝 동안 공격과 수비를 번갈아 합니다. 공격에서는 공이 홈플레이트에 닿을 때 스윙하세요. 수비에서는 완급을 골라 던집니다. 3스트라이크는 아웃이고 3아웃이면 공수가 교대됩니다.',
  (a) => {
    let pitch = -1,
      outs = 0,
      strikes = 0,
      inning = 1,
      batting = 0,
      bases = [0, 0, 0],
      speed = 1,
      note = '투구를 불러 타석에 서세요',
      cpuSwing = 1,
      shout = null;
    const runs = [0, 0],
      plateTime = 1;
    let contactAt = -10, play = null;
    const hud = a.hud('scoreboard');
    hud.innerHTML =
      '<p class="inning"><b></b><span></span></p>' +
      '<p class="runs"><span>나</span><b></b><span>상대</span></p>' +
      '<p class="count"><span>S</span><i></i><i></i><span>O</span><i></i><i></i></p>' +
      '<p class="diamond" aria-hidden="true"><i></i><i></i><i></i></p>';
    const [inningEl, runsEl, countEl, diamond] = hud.children;
    const why = {
      slow: '느린 공은 투구 차례에만 던져요',
      swing: '지금은 투구 차례 · 직구나 느린 공',
    };
    function sync() {
      inningEl.querySelector('b').textContent = inning + '회' + (batting ? '말' : '초');
      inningEl.querySelector('span').textContent = batting ? '수비 · 투구' : '공격 · 타격';
      runsEl.querySelector('b').textContent = runs[0] + ' : ' + runs[1];
      const dots = countEl.querySelectorAll('i');
      dots.forEach((d, i) => d.classList.toggle('on', i < 2 ? i < strikes : i - 2 < outs));
      diamond.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', !!bases[i]));
      const [pitchKey, slowKey, swingKey] = a.keys();
      if (!pitchKey) return;
      pitchKey.textContent = batting ? '직구' : '투구 요청';
      for (const [key, off, reason] of [
        [slowKey, !batting, why.slow],
        [swingKey, !!batting, why.swing],
      ]) {
        if (a.ended) break;
        key.disabled = off;
        if (off) key.dataset.why = reason;
        else delete key.dataset.why;
      }
      swingKey.classList.toggle('is-hot', !batting && pitch >= 0);
    }
    function info() {
      a.score(
        inning +
          '회' +
          (batting ? '말' : '초') +
          '　나 ' +
          runs[0] +
          ' : ' +
          runs[1] +
          ' 상대　' +
          outs +
          '아웃 · ' +
          strikes +
          '스트라이크',
      );
      a.status(note);
      sync();
    }
    function start(fast = false) {
      if (play) return a.reject('타구와 주자가 이동 중이에요');
      if (pitch >= 0) return;
      pitch = 0;
      speed = batting ? (fast ? 1.45 : 0.78) : 0.75 + Math.random() * 0.55;
      cpuSwing = plateTime + (Math.random() - 0.5) * (fast ? 0.58 : 0.45);
      note = batting ? '상대 타석' : '공을 보고 스윙하세요';
      info();
    }
    function swing() {
      if (pitch < 0) {
        if (!batting) start();
        return;
      }
      const timing = pitch - plateTime;
      const accuracy = Math.abs(timing * 355);
      contactAt = a.time;
      if (accuracy <= 43 && typeof cardAudio !== 'undefined') cardAudio.cue('bat');
      pitch = -1;
      if (accuracy > 43) {
        strikes++;
        note = '스트라이크';
        if (strikes === 3) {
          outs++;
          strikes = 0;
          note = '삼진 아웃';
        }
      } else {
        const steps = accuracy < 6 ? 4 : accuracy < 15 ? 2 : 1;
        note = steps === 4 ? '홈런' : steps === 2 ? '2루타' : '안타';
        strikes = 0;
        const runners = [1, ...bases];
        play = { start: a.time, duration: .78 + steps*.17, steps, runners,
          x: clamp(300 - timing * 1540, 60, 540), y: 172 - steps*25 };
        bases = [0, 0, 0];
        runners.forEach((v, i) => {
          if (!v) return;
          if (i + steps >= 4) runs[batting]++;
          else bases[i + steps - 1] = 1;
        });
      }
      shout = { text: note, good: (note === '홈런' || note === '2루타' || note === '안타') !== !!batting, t: a.time };
      if (outs === 3) {
        if (batting && inning === 3) {
          info();
          a.finish(
            runs[0] === runs[1]
              ? '3회 무승부'
              : (runs[0] > runs[1] ? '나' : '상대') + ' 승리 · ' + runs.join(' : '),
          );
          return;
        }
        if (batting) inning++;
        batting = 1 - batting;
        outs = strikes = 0;
        bases = [0, 0, 0];
        note = batting ? '공수 교대 · 구속을 선택하세요' : '공수 교대 · 공격 차례';
      }
      info();
    }
    const flying = () => a.reject('공이 날아가는 중 · 끝나면 다시');
    const pitchKey = a.button('투구 / 직구', () => (pitch >= 0 ? flying() : start(true)));
    a.button('느린 공', () => {
      if (!batting) a.reject(why.slow);
      else if (pitch >= 0) flying();
      else start(false);
    });
    a.button('스윙', () => {
      if (!batting) swing();
      else a.reject(why.swing);
    });
    pitchKey.classList.add('primary-key');
    a.ended = false;
    const finish = a.finish;
    a.finish = (m) => {
      a.ended = true;
      finish(m);
    };
    info();
    return {
      tap: () => {
        if (batting) {
          if (pitch < 0) start();
          else a.reject('상대가 치는 중 · 끝나면 다음 공');
        } else swing();
      },
      step(dt) {
        if (pitch >= 0) {
          pitch += dt * speed;
          if ((batting && pitch >= cpuSwing) || pitch > 1.48) swing();
        }
        if (play && a.time - play.start >= play.duration) play = null;
      },
      draw(g) {
        baseballField(g, a, bases, pitch, contactAt, play, batting);
        if (shout && a.time - shout.t < 1.1 && !a.over())
          a.tag(g, shout.text, 300, 92, 24, '#fff8dd', shout.good ? '#7a5a18e6' : '#3b4752e6');
      },
    };
  },
  false,
  1.2,
);
arcade(
  42,
  '가속 버튼(또는 화면)을 눌러 속도를 올리고 다시 눌러 감속합니다. 주황색 커브 구간에서 속도계가 빨간 칸에 있으면 미끄러져 시간을 잃습니다. 세 바퀴를 먼저 완주하세요.',
  (a) => {
    let go = false,
      fast = false,
      s = 0,
      cpu = 0,
      v = 0.03,
      skid = 0,
      recover = false;
    function toggle() {
      fast = !fast;
      go = true;
      recover = false;
      a.status(fast ? '가속 중 · 커브 전에 감속' : '감속 중');
      sync();
    }
    const key = a.button('가속 / 감속', toggle);
    key.classList.add('is-hot');
    function sync() {
      key.textContent = fast ? '감속하기' : '가속하기';
      key.setAttribute('aria-pressed', String(fast));
      // Glows before the start and after a skid, until the throttle is pressed again.
      key.classList.toggle('is-hot', !go || (recover && !fast));
    }
    sync();
    a.status('가속을 눌러 출발');
    const curveArc = Math.acos(0.84);
    return {
      tap: toggle,
      step(dt) {
        if (!go) return;
        const curve = Math.abs(Math.cos(s * Math.PI * 2)) > 0.84;
        if (skid > 0) {
          skid -= dt;
          v = 0.035;
        } else {
          v = clamp(v + (fast ? 0.075 : -0.11) * dt, 0.052, 0.2);
          if (curve && v > 0.156) {
            skid = 0.55;
            fast = false;
            recover = true;
            a.status('미끄러짐 · 다시 가속하세요');
            sync();
          }
        }
        s += v * dt;
        cpu += (0.103 - 0.018 * Math.cos(cpu * 4 * Math.PI)) * dt;
        a.score(
          '나 ' +
            Math.min(3, Math.floor(s) + 1) +
            '/3 바퀴 · 상대 ' +
            Math.min(3, Math.floor(cpu) + 1) +
            '/3',
        );
        if (Math.max(s, cpu) >= 3) a.finish(s >= 3 ? '나 · 레이스 우승' : '상대 · 레이스 우승');
      },
      draw(g) {
        surface(g, '#62876c', '#3b614e');
        material(g, 'sport-race', 1);
        g.save();
        g.shadowColor = '#13201bab';
        g.shadowBlur = 6; g.shadowOffsetY = 5;
        g.beginPath();
        g.ellipse(300, 180, 234, 107, 0, 0, Math.PI*2);
        g.strokeStyle = '#383d3e'; g.lineWidth = 44; g.stroke();
        g.restore();
        for (const r of [0, 1]) {
          g.beginPath();
          g.ellipse(300, 180, 225 + r * 18, 100 + r * 15, 0, 0, 2 * Math.PI);
          g.lineWidth = 23;
          g.strokeStyle = '#384348';
          g.stroke();
          g.lineWidth = 2;
          g.strokeStyle = '#a39f8e';
          g.stroke();
        }
        for (let j=0; j<5; j++) {
          for (let k=0; k<2; k++) {
            g.fillStyle = (j+k)%2 ? '#22262a' : '#f2ecda';
            g.fillRect(517+j*7, 179+k*6, 7, 6);
          }
        }
        // Curve zones on my lane: too fast here means a skid.
        for (const mid of [0, Math.PI]) {
          g.beginPath();
          g.ellipse(300, 180, 225, 100, 0, mid - curveArc, mid + curveArc);
          g.lineWidth = 15;
          g.strokeStyle = fast && v > 0.13 ? '#e0603c88' : '#f0a43a66';
          g.stroke();
        }
        for (let j = 0; j < 32; j++) {
          const start = (j * Math.PI) / 16;
          g.beginPath();
          g.ellipse(300, 180, 256, 127, 0, start, start + Math.PI / 16);
          g.lineWidth = 5;
          g.strokeStyle = j % 2 ? '#ad503c' : '#ead5b1';
          g.stroke();
        }
        a.tag(g, '커브', 300 + 190, 180, 14, '#fff1d6', '#8a4a1fd0');
        a.tag(g, '커브', 300 - 190, 180, 14, '#fff1d6', '#8a4a1fd0');
        [s, cpu].forEach((n, i) => {
          const angle = n * Math.PI * 2,
            cx = 300 + (225 + i * 18) * Math.cos(angle),
            cy = 180 + (100 + i * 15) * Math.sin(angle);
          if (!i) {
            glowRing(g, cx, cy, 19, skid > 0 ? '#ff6b4a' : gold, skid > 0 ? 4 : 2);
          }
          g.save();
          g.translate(cx, cy);
          g.rotate(Math.atan2(100 * Math.cos(angle), -225 * Math.sin(angle)));
          if (!miniature(g, i ? 'red-car' : 'cream-car', 0, 0, 33, 21)) {
            g.fillStyle = i ? red : cream;
            g.fillRect(-12, -7, 24, 14);
            g.fillStyle = '#263b43';
            g.fillRect(-3, -5, 8, 10);
          }
          g.restore();
        });
        // Speed gauge in the infield: the red end is too fast for a curve.
        a.upright(g, 300, 180, (x, y) => {
          const w = 150,
            left = x - w / 2,
            k = clamp((v - 0.052) / (0.2 - 0.052), 0, 1),
            limit = (0.156 - 0.052) / (0.2 - 0.052);
          g.save();
          g.fillStyle = '#10241ecc';
          g.beginPath();
          g.roundRect(left - 12, y - 38, w + 24, 76, 14);
          g.fill();
          g.fillStyle = '#3b4a44';
          g.fillRect(left, y + 4, w, 12);
          g.fillStyle = '#c94a32';
          g.fillRect(left + w * limit, y + 4, w * (1 - limit), 12);
          g.fillStyle = k > limit ? '#ff8a6b' : '#8fe0b0';
          g.fillRect(left, y + 6, w * k, 8);
          g.fillStyle = '#fff8dd';
          g.fillRect(left + w * k - 2, y, 4, 20);
          g.font = '700 ' + Math.max(16, a.px(13)) + 'px system-ui, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(Math.min(3, Math.floor(s) + 1) + ' / 3 LAPS', x, y - 18);
          g.restore();
        });
      },
    };
  },
  true,
);
arcade(
  43,
  '수면을 터치해 찌를 던지세요. 물고기가 다가와 찌가 잠기면 챔질하세요. 여덟 번의 캐스팅 동안 잡은 물고기의 무게를 합산합니다.',
  (a) => {
    let phase = 'idle',
      count = 0,
      weight = 0,
      at = { x: 320, y: 180 },
      bite = 0,
      note = '수면을 터치해 던지세요',
      catchFx = null,
      late = false;
    function cast(pt) {
      if (phase === 'idle') {
        at = pt;
        phase = 'wait';
        count++;
        bite = a.time + 1.3 + Math.random() * 3;
        note = '찌를 지켜보세요';
      } else {
        const ok = phase === 'bite';
        const fish = ok ? 300 + random(1700) : 0;
        weight += fish;
        // A miss says whether the strike came too early or too late.
        note = ok
          ? fish + 'g 낚았습니다'
          : late
            ? '늦었어요 · 잠기면 바로 챔질'
            : '너무 일찍 · 찌가 잠기면 챔질';
        catchFx = { ...at, text: ok ? '+' + fish + 'g' : late ? '놓침' : '너무 일찍!', ok, t: a.time };
        phase = 'idle';
        late = false;
        if (count === 8) a.finish('낚시 종료 · 총 ' + (weight / 1000).toFixed(2) + 'kg');
      }
      a.status(note);
      a.score(count + ' / 8회　' + (weight / 1000).toFixed(2) + 'kg');
      sync();
    }
    const key = a.button('던지기 / 챔질', () => cast(a.aim));
    function sync() {
      key.textContent = phase === 'idle' ? '던지기' : phase === 'bite' ? '지금 챔질!' : '기다리는 중…';
      key.classList.toggle('is-hot', phase === 'bite');
      // Still pressable while waiting (an early strike is a rule), but it does not invite it.
      key.classList.toggle('is-idle', phase === 'wait');
    }
    sync();
    a.status(note);
    return {
      tap: cast,
      step() {
        if (phase === 'wait' && a.time >= bite) {
          phase = 'bite';
          a.status('지금 챔질!');
          sync();
        }
        if (phase === 'bite' && a.time > bite + 0.92) {
          phase = 'wait';
          late = true;
          cast(at);
        }
      },
      draw(g) {
        surface(g, '#4b9796', '#214c60');
        material(g, 'review-harbor', 1);
        for (const i of range(22)) {
          const x = ((i * 83 + a.time * 8) % 660) - 30,
            y = 30 + ((i * 53) % 300);
          line(g, x, y, x + 20, y, '#c3e7d32e');
        }
        if (phase !== 'idle') {
          // The approaching silhouette gives the bite a visible source.
          const biting = phase === 'bite';
          const approach = biting ? 1 : clamp(1 - (bite - a.time)/1.5,0,1);
          if (approach>0) {
            g.save();g.globalAlpha=.32+.2*approach;
            const sign=at.x>300 ? -1 : 1;
            g.translate(at.x+sign*(1-approach)*74,at.y+12+8*(1-approach));
            g.scale(-sign,1);miniature(g,'trout',0,0,48,19);g.restore();
          }
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.ellipse(
              at.x,
              at.y,
              (biting ? 14 + i * 14 : 9 + i * 10) + (calm.matches ? 0 : Math.sin(a.time * (biting ? 12 : 4)) * 2),
              (biting ? 6 + i * 6 : 4 + i * 4),
              // Ripples lie flat on screen in either orientation.
              a.turned() ? Math.PI / 2 : 0,
              0,
              2 * Math.PI,
            );
            g.lineWidth = biting ? 3 : 1;
            g.strokeStyle = biting ? '#fff6dccc' : '#cae8d966';
            g.stroke();
          }
          if (phase === 'wait') {
            // A ring about 26 px across on screen keeps the small float easy to watch.
            g.save();
            g.globalAlpha = 0.45 + 0.25 * a.pulse(2.5);
            g.setLineDash([5, 4]);
            circle(g, ...a.above(at.x, at.y, 6), Math.max(16, a.px(13)), '#fff6dc', true);
            g.restore();
            // The float stands upright on screen in either orientation.
            line(g, at.x, at.y, ...a.above(at.x, at.y, 18), cream, 4);
            if (!a.upright(g, ...a.above(at.x, at.y, 8), (x, y) => miniature(g, 'float', x, y, 17, 26)))
              circle(g, ...a.above(at.x, at.y, 17), 4, red);
          } else a.tag(g, '챔질!', ...a.above(at.x, at.y, 34), 20, '#fff8dd', '#b0412be6');
        } else {
          g.fillStyle = '#36545c88';
          for (const i of [1, 2, 3]) {
            g.beginPath();
            const x = (i * 115 + a.time * 12) % 580,
              y = 70 + i * 60;
            if (miniature(g, 'trout', x, y, 52, 24)) continue;
            g.ellipse(x, y, 19, 6, -0.3, 0, Math.PI * 2);
            g.fill();
          }
          // Where the 던지기 button will cast: the last touched spot.
          g.save();
          g.globalAlpha = 0.5 + 0.3 * a.pulse(3);
          circle(g, a.aim.x, a.aim.y, 14, '#fff6dc', true);
          line(g, a.aim.x - 20, a.aim.y, a.aim.x - 8, a.aim.y, '#fff6dc', 2);
          line(g, a.aim.x + 8, a.aim.y, a.aim.x + 20, a.aim.y, '#fff6dc', 2);
          g.restore();
        }
        if (catchFx && a.time - catchFx.t < 1.2 && !a.over())
          a.tag(g, catchFx.text, ...a.above(catchFx.x, catchFx.y, 30 + 20 * (calm.matches ? 0 : a.time - catchFx.t)), 20,
            '#fff8dd', catchFx.ok ? '#7a5a18e6' : '#3b4752e6');
      },
    };
  },
  true,
);
for (const [id, team] of [
  [44, false],
  [45, true],
])
  arcade(
    id,
    '미니어처 전차를 움직여 상대 팀에 페인트를 맞히세요. 빈 곳을 누르면 이동하고 상대 말(빨간 점선 원 안)을 누르면 그쪽으로 발사합니다. 먼저 ' +
      (team ? 8 : 5) +
      '점을 얻으면 승리합니다.',
    (a) => {
      const units = [
        { x: 75, y: 180, p: 0, angle: 0 },
        { x: 500, y: 180, p: 1, angle: Math.PI },
      ];
      if (team)
        units.push({ x: 80, y: 285, p: 0, angle: 0 }, { x: 480, y: 75, p: 1, angle: Math.PI });
      const shots = [],
        scores = [0, 0],
        blocks = team ? [{x:180,y:102,r:28},{x:388,y:95,r:28},{x:215,y:256,r:32},{x:420,y:254,r:29}] : [
          { x: 220, y: 110, r: 32 },
          { x: 390, y: 250, r: 35 },
        ],
        splats = [];
      let ready = false,
        last = -1;
      const me = units[0];
      let target = { ...me };
      function fire(u, pt) {
        const b = ball(u.x, u.y, 5, u.p ? red : blue, { p: u.p });
        shoot(b, pt, 265);
        u.angle = Math.atan2(b.vy, b.vx);
        shots.push(b);
      }
      const reloading = () => a.reject('재장전 중 · 잠깐 뒤에 쏘세요');
      function tap(pt) {
        ready = true;
        if (units.some((u) => u.p && dist(u, pt) < 45)) {
          if (a.time - last > 0.36) {
            fire(me, pt);
            last = a.time;
          } else reloading();
        } else {
          target = pt;
          if (blocks.some((b) => dist(b, pt) < b.r + 13))
            a.reject('바위·타이어 위로는 못 가요 · 앞에서 멈춰요');
        }
      }
      a.button('가까운 상대에 발사', () => {
        ready = true;
        if (a.time - last > 0.36) {
          const e = units.filter((u) => u.p).sort((a, b) => dist(a, me) - dist(b, me))[0];
          fire(me, e);
          last = a.time;
        } else reloading();
      });
      a.status('빈 곳은 이동 · 상대는 페인트 발사');
      a.score('0 : 0');
      return {
        tap,
        step(dt) {
          if (!ready) return;
          units.forEach((u, i) => {
            const t =
              i === 0
                ? target
                : {
                    x: (u.p ? 430 : 125) + 70 * Math.sin(a.time * 0.63 + i),
                    y: 185 + 110 * Math.sin(a.time * 0.83 + i),
                  };
            const l = dist(u, t),
              speed = Math.min(l, dt * (i ? 55 : 105));
            if (l > 1) {
              const next = {
                x: clamp(u.x + ((t.x - u.x) / l) * speed, 14, 586),
                y: clamp(u.y + ((t.y - u.y) / l) * speed, 14, 346),
              };
              if (!blocks.some((b) => dist(b, next) < b.r + 13)) Object.assign(u, next);
            }
            if (i && a.time > (u.next ?? 1.2)) {
              const enemy = units
                .filter((e) => e.p !== u.p)
                .sort((a, b) => dist(a, u) - dist(b, u))[0];
              fire(u, { x: enemy.x + random(45) - 22, y: enemy.y + random(45) - 22 });
              u.next = a.time + 1.7 + Math.random();
            }
          });
          for (let i = shots.length - 1; i >= 0; i--) {
            const b = shots[i];
            advance(b, dt);
            const hit = units.find((u) => u.p !== b.p && dist(u, b) < 15);
            if (hit) {
              splats.push({ x: hit.x, y: hit.y, c: b.color, r: 9 + random(6), t: a.time });
              if (splats.length > 24) splats.shift();
              scores[b.p]++;
              a.score(scores.join(' : '));
              Object.assign(hit, { x: hit.p ? 520 : 70, y: 70 + random(220) });
              if (hit === me) target = { ...me };
            }
            if (
              hit ||
              b.x < 0 ||
              b.x > 600 ||
              b.y < 0 ||
              b.y > 360 ||
              blocks.some((t) => dist(t, b) < t.r)
            )
              shots.splice(i, 1);
            if (Math.max(...scores) >= (team ? 8 : 5)) {
              a.finish((scores[0] > scores[1] ? '우리 팀' : '상대 팀') + ' 승리');
              break;
            }
          }
        },
        draw(g) {
          surface(g, '#adb493', '#777e69', true);
          material(g,team ? 'review-teams' : 'review-arena',1);
          // Paint splats stay on the ground where tanks were hit.
          for (const sp of splats) {
            g.save();
            g.globalAlpha = 0.55;
            g.fillStyle = sp.c;
            g.beginPath();
            for (let k = 0; k < 9; k++) {
              const ang = (k / 9) * Math.PI * 2,
                rr = sp.r * (k % 2 ? 0.65 : 1.1);
              g.lineTo(sp.x + Math.cos(ang) * rr, sp.y + Math.sin(ang) * rr);
            }
            g.closePath();
            g.fill();
            g.restore();
          }
          blocks.forEach((t, i) => {
            if (!a.upright(g, t.x, t.y, (x, y) => miniature(g, i % 2 ? 'rocks' : 'tire', x, y, 2 * t.r, 2 * t.r)))
              disc(g, ball(t.x, t.y, t.r, '#778779'));
          });
          // Move order: a dashed path to the destination marker.
          if (dist(me, target) > 4) {
            const blocked = blocks.some((b) => dist(b, target) < b.r + 13);
            g.save();
            g.setLineDash([7, 7]);
            line(g, me.x, me.y, target.x, target.y, blocked ? '#c94a32cc' : '#fff6dccc', 2);
            g.restore();
            const c = blocked ? '#c94a32' : '#fff6dc';
            line(g, target.x - 8, target.y - 8, target.x + 8, target.y + 8, c, 3);
            line(g, target.x - 8, target.y + 8, target.x + 8, target.y - 8, c, 3);
          }
          // Enemy tanks: the dashed ring is the area a tap fires into.
          for (const u of units)
            if (u.p) {
              g.save();
              g.setLineDash([5, 5]);
              circle(g, u.x, u.y, 45, '#c94a3299', true);
              g.restore();
            }
          for (const u of units) {
            g.save();
            g.fillStyle = '#1a1d1655';
            g.beginPath();
            g.ellipse(u.x + 3, u.y + 5, 22, 15, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
            if (u === me) {
              glowRing(g, u.x, u.y, 27, gold, 3);
              const k = clamp((a.time - last) / 0.36, 0, 1);
              if (k < 1) {
                g.save();
                g.lineWidth = 4;
                g.strokeStyle = '#fff6dc';
                g.beginPath();
                g.arc(u.x, u.y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
                g.stroke();
                g.restore();
              }
            }
            g.save();
            g.translate(u.x, u.y);
            g.rotate(u.angle);
            if (!miniature(g, u.p ? 'red-tank' : 'teal-tank', 0, 0, 61, 46)) {
              g.fillStyle = '#454d4a';
              g.fillRect(-17, -14, 34, 28);
              g.fillStyle = u.p ? red : blue;
              g.fillRect(-15, -10, 30, 20);
              line(g, 0, 0, 23, 0, cream, 5);
              circle(g, 0, 0, 7, u.p ? '#974e47' : '#316770');
            }
            g.restore();
            if (u === me) a.tag(g, '나', ...a.above(u.x, u.y, 38), 14, '#2a2a1f', '#f3cf7ae6');
            else if (!u.p) a.tag(g, '팀', ...a.above(u.x, u.y, 34), 13, '#e9fbff', '#1d5560dd');
          }
          shots.forEach((b) => disc(g, b));
        },
      };
    },
    true,
  );
arcade(
  46,
  '움직이는 표적을 직접 터치하세요. 중앙을 맞힐수록 높은 점수를 얻습니다. 스무 번 쏜 뒤 총점을 확인합니다.',
  (a) => {
    let n = 0,
      points = 0,
      hit = null;
    const hud = a.hud('shots');
    hud.innerHTML =
      '<p class="tally"><b>0</b><span>점</span><small>남은 20발</small></p>' +
      '<p class="last" aria-hidden="true"><span class="ring"><i></i></span><em>첫 발</em></p>' +
      '<p class="pips"></p>';
    const tally = hud.querySelector('.tally b'),
      left = hud.querySelector('.tally small'),
      lastRing = hud.querySelector('.last'),
      lastText = hud.querySelector('.last em'),
      pips = hud.querySelector('.pips');
    for (const i of range(20)) pips.append(document.createElement('i'));
    function targets() {
      return range(5).map((i) => ({
        x: 55 + ((i * 135 + a.time * (20 + i * 5)) % 500),
        y: 70 + (i % 3) * 87 + Math.sin(i + a.time) * 17,
      }));
    }
    // Touch tolerance on a small field: a tap just outside a target's rim is pulled onto the
    // outer ring (worth 1), so a near miss by a fingertip is not a lost shot. The pull is drawn.
    function steady(pt) {
      if (a.px(1) <= 1 / 0.75) return pt;
      const t = targets().sort((p, q) => dist(p, pt) - dist(q, pt))[0],
        d = dist(t, pt);
      if (d < 30 || d >= 30 + Math.min(16, a.px(8))) return pt;
      const k = 29 / d;
      return { x: t.x + (pt.x - t.x) * k, y: t.y + (pt.y - t.y) * k, from: pt };
    }
    function fire(touch) {
      n++;
      const pt = steady(touch);
      const near = targets().sort((p, q) => dist(p, pt) - dist(q, pt))[0];
      const d = Math.min(...targets().map((t) => dist(t, pt)));
      const got = d < 9 ? 5 : d < 20 ? 3 : d < 30 ? 1 : 0;
      points += got;
      hit = { ...pt, t: a.time, got };
      const pip = pips.children[n - 1];
      if (pip) pip.className = 'p' + got;
      tally.textContent = points;
      left.textContent = '남은 ' + (20 - n) + '발';
      // The last shot on a small paper target: where it landed against the rings.
      const f = Math.min(1.18, d / 30),
        ang = Math.atan2(pt.y - near.y, pt.x - near.x);
      lastRing.style.setProperty('--dx', (Math.cos(ang) * f * 50).toFixed(1) + '%');
      lastRing.style.setProperty('--dy', (Math.sin(ang) * f * 50).toFixed(1) + '%');
      lastRing.className = 'last p' + got;
      lastText.textContent = got === 5 ? '정중앙 +5' : got ? '+' + got : '빗나감';
      a.status(got === 5 ? '정중앙! +5' : got ? '명중 +' + got : '빗나감 · 가운데를 노려요');
      a.score(points + '점 · 남은 ' + (20 - n) + '발');
      if (n === 20) a.finish('사격 종료 · ' + points + '점');
    }
    a.button('조준점에 발사', () => fire(a.aim));
    a.status('움직이는 과녁을 터치하세요');
    a.score('0점 · 20발');
    return {
      tap: fire,
      draw(g) {
        surface(g, '#504337', '#2e353c', true);
        material(g, 'review-range', 1);
        for (const t of targets()) {
          line(g, t.x, t.y + 15, t.x, 316, '#aa8a64', 5);
          if (miniature(g, 'gallery-target', t.x, t.y, 60, 60)) continue;
          for (const [r, c] of [
            [30, cream],
            [22, red],
            [15, cream],
            [8, red],
          ])
            circle(g, t.x, t.y, r, c);
        }
        // Crosshair: where 조준점에 발사 will shoot.
        g.save();
        g.globalAlpha = a.holding ? 0.95 : 0.55;
        circle(g, a.aim.x, a.aim.y, 12, '#fff6dc', true);
        line(g, a.aim.x - 20, a.aim.y, a.aim.x - 6, a.aim.y, '#fff6dc', 2);
        line(g, a.aim.x + 6, a.aim.y, a.aim.x + 20, a.aim.y, '#fff6dc', 2);
        line(g, a.aim.x, a.aim.y - 20, a.aim.x, a.aim.y - 6, '#fff6dc', 2);
        line(g, a.aim.x, a.aim.y + 6, a.aim.x, a.aim.y + 20, '#fff6dc', 2);
        g.restore();
        if (hit?.from && a.time - hit.t < 0.9) {
          // A fingertip near miss pulled onto the rim: show where the touch was and where it counted.
          g.save();
          g.setLineDash([3, 3]);
          line(g, hit.from.x, hit.from.y, hit.x, hit.y, '#fff6dccc', 2);
          g.restore();
          circle(g, hit.from.x, hit.from.y, 3, '#fff6dcaa');
        }
        if (hit && a.time - hit.t < 0.4)
          circle(g, hit.x, hit.y, 10 + 30 * (a.time - hit.t), '#fff', true);
        if (hit && a.time - hit.t < 0.9 && !a.over())
          a.tag(g, hit.got ? '+' + hit.got : '빗나감', hit.x, hit.y - 26, 18, '#fff8dd',
            hit.got === 5 ? '#7a5a18e6' : hit.got ? '#1f6047e6' : '#3b4752e6');
      },
    };
  },
);
