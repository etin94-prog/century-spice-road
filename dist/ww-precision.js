import { miniature, material } from './ww-scenery.js';
import { range, random } from './ww-core.js';
import {
  sport,
  ball,
  shoot,
  bounds,
  advance,
  collide,
  dist,
  circle,
  line,
  label,
  surface,
  clamp,
} from './ww-studio.js';
const cream = '#fff0cc',
  blue = '#349eab',
  red = '#d36247',
  gold = '#f3cf7a';

/* ---------------------------------------------------------------------------------------------
   Phone table helpers. Game geometry always stays in the 600x360 table space; only the view
   changes. On a portrait phone a long table turns a quarter (the shot travels up the screen) and
   a round target is cropped to a square, so the play area is about 1.5x larger than the 5:3 strip.
   Landscape, wide screens and the rotated 가로 view keep the original view.
   --------------------------------------------------------------------------------------------- */
const root = document.documentElement,
  phone = matchMedia('(orientation: portrait) and (max-width: 699px)'),
  calm = matchMedia('(prefers-reduced-motion: reduce)');
const views = {
  // matrix maps table units to bitmap pixels; down/right are table vectors that point down/right on screen
  wide: { size: [900, 540], m: [1.5, 0, 0, 1.5, 0, 0], down: [0, 1], right: [1, 0] },
  turn: { size: [540, 900], m: [0, -1.5, 1.5, 0, 0, 900], down: [-1, 0], right: [0, 1] },
  square: { size: [540, 540], m: [1.5, 0, 0, 1.5, -180, 0], down: [0, 1], right: [1, 0] },
};

// table(a, kind, fire, opts): view + input + feedback for one precision table.
// fire(pt) shoots at a table point and returns a reason string when the shot is refused.
// A short tap fires; a drag only aims (release does not shoot) and the shot key fires.
// opts: aimed (drag note), rolling (status while the shot travels), wait() (why the shot keys rest
// right now, or ''), dragPlaces() (a drag-release also fires, e.g. while placing the cue ball).
function table(a, kind, fire, opts = {}) {
  const canvas = a.canvas,
    status = document.querySelector('#status'),
    scoreLine = document.querySelector('#score');
  let mode = 'wide',
    base = '',
    timer = 0,
    start = null,
    travel = 0;
  const v = {
    ended: false,
    pressing: false,
    flash: null,
    keys: [],
    get turned() {
      return mode === 'turn';
    },
    get below() {
      return views[mode].down;
    },
    get across() {
      return views[mode].right;
    },
    sync() {
      const next = kind && phone.matches && !root.classList.contains('card-landscape') ? kind : 'wide';
      if (next === mode) return;
      mode = next;
      [canvas.width, canvas.height] = views[mode].size;
      canvas.classList.toggle('pv-turn', mode === 'turn');
      canvas.classList.toggle('pv-square', mode === 'square');
    },
    begin(g) {
      v.sync();
      g.setTransform(...views[mode].m);
      // shot keys rest while the table is busy; a tap on a resting key says why (core data-why)
      if (v.ended) return;
      const why = opts.wait?.() || '';
      for (const k of v.keys) {
        k.disabled = !!why;
        if (why) k.dataset.why = why;
        else delete k.dataset.why;
      }
    },
    // studio reports pointer points as fractions of the 5:3 box; convert them for the active view
    map(p) {
      if (mode === 'turn') return { x: 600 * (1 - p.y / 360), y: (p.x / 600) * 360 };
      if (mode === 'square') return { x: 120 + p.x * 0.6, y: p.y };
      return { x: p.x, y: p.y };
    },
    // draw fn() around (x, y) so it stays upright on screen (sprites, numbers, flags)
    upright(g, x, y, fn) {
      g.save();
      g.translate(x, y);
      if (mode === 'turn') g.rotate(Math.PI / 2);
      fn();
      g.restore();
    },
    note(message, refused = false) {
      if (!status || !canvas.isConnected) return;
      clearTimeout(timer);
      message = glue(message);
      status.textContent = message;
      status.classList.remove('is-rejected');
      if (refused) {
        void status.offsetWidth;
        status.classList.add('is-rejected');
      }
      timer = setTimeout(() => {
        if (!canvas.isConnected) return;
        status.classList.remove('is-rejected');
        if (status.textContent === message) status.textContent = glue(base);
      }, 2600);
    },
    reject(message, pt) {
      if (pt) v.flash = { x: pt.x, y: pt.y, t: a.time };
      if (typeof a.reject === 'function') return a.reject(message);
      v.note(message, true);
    },
    // a shot left the hand: drop any pending aim note and say what the table is doing
    fired(message = opts.rolling) {
      clearTimeout(timer);
      status?.classList.remove('is-rejected');
      if (message) say(message);
    },
    shoot() {
      if (v.ended) return;
      const why = fire?.({ ...a.aim });
      if (why) v.reject(why, a.aim);
      else if (why === undefined) v.fired();
    },
    down(p) {
      a.aim = v.map(p);
    },
    move(p) {
      a.aim = v.map(p);
    },
    tap(p) {
      const pt = (a.aim = v.map(p));
      if (!fire) return;
      if (travel > 8 && !opts.dragPlaces?.()) {
        v.note(opts.aimed || '조준했어요 · 샷 버튼으로 쳐요');
        return;
      }
      const why = fire(pt);
      if (why) v.reject(why, pt);
      else if (why === undefined) v.fired();
    },
  };
  // ' · ' joins short phrases; a no-break space keeps the dot on the line it closes,
  // so a wrapped line never starts with '·'.
  const glue = (m) => String(m ?? '').replace(/ · /g, '\u00a0· ');
  const studioStatus = a.status,
    say = (m) => studioStatus(glue(m)),
    close = a.finish;
  a.status = (message) => {
    clearTimeout(timer);
    status?.classList.remove('is-rejected');
    base = message;
    say(message);
  };
  // Score as short chunks that never break inside: one per line in portrait, in a row elsewhere.
  // textContent keeps the ' · ' separators, so the line still reads as one string.
  a.score = (parts) => {
    if (!scoreLine) return;
    const list = [].concat(parts).filter((s) => s !== '' && s != null);
    const nodes = [];
    list.forEach((s, i) => {
      if (i) nodes.push(Object.assign(document.createElement('span'), { className: 'pv-sep', textContent: ' · ' }));
      nodes.push(Object.assign(document.createElement('span'), { className: 'pv-seg', textContent: s }));
    });
    scoreLine.replaceChildren(...nodes);
  };
  // finish(message, detail): result box with a one-line summary and a 새 판 key under the thumb.
  a.finish = (message, detail = '') => {
    v.ended = true;
    clearTimeout(timer);
    close(message);
    const box = document.querySelector('#result');
    if (box) {
      const text = document.createElement('span'),
        title = document.createElement('strong'),
        again = document.createElement('button');
      text.className = 'pv-result-text';
      title.textContent = message;
      text.append(title);
      if (detail) text.append(Object.assign(document.createElement('small'), { textContent: detail }));
      again.type = 'button';
      again.className = 'pv-again';
      again.textContent = '새 판';
      again.setAttribute('aria-label', '새 판 시작');
      // the game is over, so nothing is lost: run the header's confirm flow in one tap
      again.onclick = () => {
        const restart = document.querySelector('#restart'),
          confirm = document.querySelector('#confirm');
        restart?.click();
        if (confirm && !confirm.hidden) confirm.click();
      };
      box.replaceChildren(text, again);
    }
    base = '판이 끝났어요 · 새\u00a0판으로 다시 시작해요';
    say(base);
    // disabled keys and the lever explain themselves through the core's data-why fallback
    for (const key of document.querySelectorAll('#surface .studio-key')) {
      key.disabled = true;
      key.dataset.why = '끝';
    }
    const field = document.querySelector('#surface .force'),
      slider = field?.querySelector('input');
    if (slider) slider.disabled = true;
    if (field) field.dataset.why = '끝';
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.isPrimary === false) return;
    start = { x: e.clientX, y: e.clientY };
    travel = 0;
    v.pressing = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (start && e.isPrimary !== false)
      travel = Math.max(travel, Math.hypot(e.clientX - start.x, e.clientY - start.y));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.isPrimary === false) return;
    v.pressing = false;
    start = null;
    if (v.ended) v.reject('판이 끝났어요 · 새\u00a0판을 누르세요');
  });
  canvas.addEventListener('pointercancel', () => {
    v.pressing = false;
    start = null;
    travel = 99;
  });
  // In a turned or cropped view the studio's arrow keys would move the aim sideways; steer in screen terms.
  canvas.addEventListener('keydown', (e) => {
    if (mode === 'wide' || v.ended) return;
    const step = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (!step && e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!step) return v.shoot();
    const [rx, ry] = v.across,
      [dx, dy] = v.below;
    a.aim = {
      x: clamp(a.aim.x + step[0] * rx + step[1] * dx, 0, 600),
      y: clamp(a.aim.y + step[0] * ry + step[1] * dy, 0, 360),
    };
  });
  v.sync();
  return v;
}

// Power slider with a readable percentage; the studio owns the value.
function meter(a) {
  const field = document.querySelector('#surface .force'),
    slider = field?.querySelector('input');
  if (!field || !slider) return;
  slider.setAttribute('aria-label', '샷 힘');
  const out = document.createElement('output');
  out.className = 'force-value';
  const show = () => {
    out.textContent = slider.value + '%';
    field.style.setProperty('--fill', ((slider.value - slider.min) / (slider.max - slider.min)) * 100 + '%');
  };
  slider.addEventListener('input', show);
  show();
  field.append(out);
}
// A chalk scoreboard above a square board on a portrait phone, in the felt that would stay empty
// (CSS shows it only next to .arena.pv-square). rows: [{ name, big, sub, on }].
function scoreboard(a) {
  const el = document.createElement('div');
  el.className = 'pv-tally';
  el.setAttribute('aria-hidden', 'true');
  a.canvas.before(el);
  return (rows) => {
    el.replaceChildren(
      ...rows.map((r) => {
        const cell = document.createElement('div');
        cell.className = 'pv-tally-side' + (r.on ? ' is-on' : '');
        const name = document.createElement('span'),
          big = document.createElement('b'),
          sub = document.createElement('small');
        name.textContent = r.name;
        big.textContent = r.big;
        sub.textContent = r.sub || '\u00a0';
        cell.append(name, big, sub);
        return cell;
      }),
    );
  };
}
function key(a, name, fn, v) {
  const el = a.button(name, fn);
  el.classList.add('pv-shot');
  v?.keys.push(el);
  return el;
}

// Shading, always lit from the upper left of the screen whatever the view.
function orb(g, v, o) {
  const { x, y, r, color } = o,
    [dx, dy] = v.below,
    [rx, ry] = v.across;
  g.save();
  g.shadowColor = '#06191899';
  g.shadowBlur = r * 0.7;
  g.shadowOffsetX = r * 0.25;
  g.shadowOffsetY = r * 0.55;
  const fill = g.createRadialGradient(
    x - (rx * 0.35 + dx * 0.45) * r,
    y - (ry * 0.35 + dy * 0.45) * r,
    0,
    x,
    y,
    r,
  );
  fill.addColorStop(0, '#fff9dd');
  fill.addColorStop(0.3, color);
  fill.addColorStop(0.72, color);
  fill.addColorStop(1, '#233031');
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = '#081a254d';
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}
function contact(g, v, x, y, r, strength = 0.42) {
  const [dx, dy] = v.below,
    [rx, ry] = v.across,
    cx = x + (dx * 0.35 + rx * 0.18) * r,
    cy = y + (dy * 0.35 + ry * 0.18) * r;
  const fill = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.25);
  fill.addColorStop(0, '#05100c' + Math.round(strength * 255).toString(16).padStart(2, '0'));
  fill.addColorStop(1, '#05100c00');
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(cx, cy, r * 1.25, r * 1.25, 0, 0, Math.PI * 2);
  g.fill();
}
function sprite(g, v, name, x, y, w, h) {
  let drawn = false;
  v.upright(g, x, y, () => (drawn = miniature(g, name, 0, 0, w, h)));
  return drawn;
}
// soft upper-left light across the whole table, in screen space
function wash(g, a) {
  const w = a.canvas.width,
    h = a.canvas.height;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const light = g.createLinearGradient(0, 0, w, h);
  light.addColorStop(0, '#fff3d42e');
  light.addColorStop(0.42, '#fff3d400');
  light.addColorStop(1, '#00000033');
  g.fillStyle = light;
  g.fillRect(0, 0, w, h);
  g.restore();
}
function dash(g, x, y, xx, yy, color, width = 2, pattern = [7, 6]) {
  g.save();
  g.setLineDash(pattern);
  g.lineCap = 'round';
  line(g, x, y, xx, yy, color, width);
  g.restore();
}
function ring(g, x, y, r, color, width = 2, pattern) {
  g.save();
  if (pattern) g.setLineDash(pattern);
  g.lineWidth = width;
  g.strokeStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}
function reticle(g, x, y, color = gold) {
  ring(g, x, y, 11, '#10201ccc', 4);
  ring(g, x, y, 11, color, 2);
  line(g, x - 16, y, x - 6, y, color, 2);
  line(g, x + 6, y, x + 16, y, color, 2);
  line(g, x, y - 16, x, y - 6, color, 2);
  line(g, x, y + 6, x, y + 16, color, 2);
}
// Render the actual pixels around the finger, after painting the table. Board physics
// and the touch map remain in table space even when the precision view is turned.
function aimLens(g, a, v) {
  if (!v.pressing || v.ended) return;
  const canvas = a.canvas;
  const transform = g.getTransform();
  const sx=transform.a*a.aim.x + transform.c*a.aim.y + transform.e;
  const sy=transform.b*a.aim.x + transform.d*a.aim.y + transform.f;
  const pixelRatio=canvas.width/Math.max(1,canvas.clientWidth);
  const radius=Math.min(42*pixelRatio,canvas.width*.15,canvas.height*.19);
  const x=sx>canvas.width/2 ? radius+9 : canvas.width-radius-9, y=radius+9;
  g.save();
  g.setTransform(1,0,0,1,0,0);
  g.beginPath();g.arc(x,y,radius,0,Math.PI*2);g.clip();
  g.drawImage(canvas,sx-radius/2,sy-radius/2,radius,radius,x-radius,y-radius,2*radius,2*radius);
  line(g,x-7,y,x+7,y,'#ffe6a9',2);
  line(g,x,y-7,x,y+7,'#ffe6a9',2);
  g.restore();
  g.save();g.setTransform(1,0,0,1,0,0);ring(g,x,y,radius,'#f2d69a',3);g.restore();
}
function flash(g, a, v) {
  const f = v.flash;
  if (!f) return;
  const age = a.time - f.t;
  if (age > 0.5 || age < 0) return void (v.flash = null);
  g.save();
  g.globalAlpha = calm.matches ? 0.9 : 1 - age * 1.6;
  ring(g, f.x, f.y, calm.matches ? 14 : 12 + age * 14, '#d9553f', 3);
  line(g, f.x - 6, f.y - 6, f.x + 6, f.y + 6, '#d9553f', 3);
  line(g, f.x - 6, f.y + 6, f.x + 6, f.y - 6, '#d9553f', 3);
  g.restore();
}
// first thing a ball rolling from o along unit dir would touch: another ball or a cushion
function cast(o, dir, bodies, box) {
  let t = Infinity,
    hit = null;
  for (const b of bodies) {
    const fx = o.x - b.x,
      fy = o.y - b.y,
      reach = o.r + b.r,
      bb = fx * dir.x + fy * dir.y,
      d = bb * bb - (fx * fx + fy * fy - reach * reach);
    if (d < 0) continue;
    const k = -bb - Math.sqrt(d);
    if (k > 0.5 && k < t) {
      t = k;
      hit = b;
    }
  }
  const [x0, y0, x1, y1] = box,
    tx = dir.x > 0 ? (x1 - o.r - o.x) / dir.x : dir.x < 0 ? (x0 + o.r - o.x) / dir.x : Infinity,
    ty = dir.y > 0 ? (y1 - o.r - o.y) / dir.y : dir.y < 0 ? (y0 + o.r - o.y) / dir.y : Infinity,
    wall = Math.max(0, Math.min(tx, ty));
  if (wall < t) return { t: wall, ball: null };
  return { t, ball: hit };
}
function heading(from, to) {
  const len = dist(from, to) || 1;
  return { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
}

sport(
  31,
  '코스에서 보낼 방향을 누르면 샷을 합니다. 힘을 조절해 세 홀을 가능한 한 적은 타수로 홀아웃하세요.',
  (a) => {
    const v = table(a, 'turn', (pt) => hit(pt), {
      aimed: '조준했어요 · 샷 버튼으로 쳐요',
      rolling: '샷 진행 중 · 착지 후 다음 샷',
      wait: () => (moving ? '공이 멈추면 칠 수 있어요' : ''),
    });
    const holes = [
      { x: 518, y: 46, tee: [66, 314], art: 'course', wind: [8, 3], par: 4, name: '해안 링크스', bunkers: [[332, 125, 29]] },
      { x: 469, y: 240, tee: [72, 82], art: 'alpine', wind: [-9, 4], par: 4, name: '알프스 호반', bunkers: [[542, 197, 23], [544, 316, 31]], naturalSand: true },
      { x: 500, y: 145, tee: [64, 312], art: 'orchard', wind: [5, -8], par: 3, name: '단풍 골짜기', bunkers: [[362, 206, 34]] },
    ];
    let hole = 0, count = 0, teed = 0, moving = false, flight = null, height = 0;
    const cards = [];
    const b = ball(...holes[0].tee, 6, cream);
    const cup = () => holes[hole];
    const inSand = () => cup().bunkers.some(([x,y,r]) => ((b.x-x)/r)**2 + ((b.y-y)/(r*.47))**2 < 1);
    const club = () => dist(b,cup()) < 62 ? '퍼터' : inSand() ? '웨지' : '아이언';
    a.aim = { x: cup().x, y: cup().y };
    function score() { a.score([hole + 1 + ' / 3홀', cup().name + ' · PAR ' + cup().par, count + '타']); }
    function prompt() { a.status(club() + ' · 바람 ' + (cup().wind[0] < 0 ? '↙' : cup().wind[1] < 0 ? '↗' : '↘') + ' · 눌러서 샷'); }
    score(); prompt(); a.force(); meter(a);
    function plan(pt) {
      const dx = pt.x-b.x, dy = pt.y-b.y, distance = Math.hypot(dx,dy);
      const putt = club() === '퍼터' || distance < 52;
      const reach = Math.min(distance, (putt ? 110 : inSand() ? 295 : 615) * a.power);
      const carry = putt ? 0 : .86;
      const duration = putt ? 0 : .47 + reach/690;
      const ratio = reach / Math.max(1,distance);
      const x = clamp(b.x + dx*ratio + cup().wind[0]*duration*duration, 10, 590);
      const y = clamp(b.y + dy*ratio + cup().wind[1]*duration*duration, 10, 350);
      return { x, y, landX:b.x+(x-b.x)*carry, landY:b.y+(y-b.y)*carry, duration,
        peak: putt ? 0 : Math.min(68, 15 + reach*.115), originX:b.x, originY:b.y, age:0 };
    }
    function roll(f) {
      b.vx = (f.x-b.x)*2.15;
      b.vy = (f.y-b.y)*2.15;
    }
    function hit(pt) {
      if (moving) return '공이 멈추면 칠 수 있어요';
      if (dist(b,pt)<1) return '공을 보낼 지점을 눌러 주세요';
      if (typeof cardAudio !== 'undefined') cardAudio.cue(club() === '퍼터' ? 'putt' : 'iron');
      flight = plan(pt);
      moving = true; count++; score();
      if (!flight.duration) { roll(flight); flight=null; }
    }
    key(a, '샷', v.shoot, v);
    return {
      tap:v.tap, down:v.down, move:v.move,
      step(dt) {
        if (!moving) return;
        if (flight) {
          const f = flight, t = Math.min(1,(f.age+=dt)/f.duration);
          b.x = f.originX + (f.landX-f.originX)*t;
          b.y = f.originY + (f.landY-f.originY)*t;
          height = 4*t*(1-t)*f.peak;
          if (t<1) return;
          flight=null; roll(f);
        }
        advance(b,dt,inSand() ? .915 : .965);
        bounds(b,4,4,596,356,.28);
        if (dist(b,cup()) < 10 && Math.hypot(b.vx,b.vy)<112) {
          moving=false;
          if (typeof cardAudio !== 'undefined') cardAudio.cue('cup');
          cards.push(count-teed);
          if (hole === holes.length-1) {
            a.finish('3홀 완료 · 총 '+count+'타',cards.map((s,i)=>(i+1)+'번 '+s+'타').join(' · '));
            return;
          }
          teed=count; hole++;
          Object.assign(b,{x:cup().tee[0],y:cup().tee[1],vx:0,vy:0});
          a.aim={x:cup().x,y:cup().y}; score(); prompt();
        } else if (!b.vx && !b.vy) { moving=false; prompt(); }
      },
      draw(g) {
        v.begin(g);
        const h=cup(), [dx,dy]=v.below;
        g.fillStyle='#567540'; g.fillRect(0,0,600,360);
        material(g,'sport-'+h.art,1);
        for (const [x,y,r] of h.bunkers) {
          if (h.naturalSand) continue;
          g.save(); g.translate(x,y); g.scale(r,r*.47);
          g.beginPath(); g.moveTo(-.98,.16);
          g.bezierCurveTo(-1.12,-.52,-.57,-1.04,-.12,-.78);
          g.bezierCurveTo(.34,-.46,.49,-1.05,.89,-.57);
          g.bezierCurveTo(1.24,-.1,.88,.82,.23,.85);
          g.bezierCurveTo(-.32,1.02,-.83,.75,-.98,.16);
          const sand = g.createLinearGradient(-.2,-1,.3,.8);
          sand.addColorStop(0,'#6e6539'); sand.addColorStop(.17,'#b99d67');
          sand.addColorStop(.46,'#e2c891'); sand.addColorStop(1,'#d4b178');
          g.fillStyle=sand; g.fill(); g.clip();
          material(g,'sisal',.13,-1,-1,2,2); g.restore();
        }
        v.upright(g,h.x,h.y,()=>{
          g.fillStyle='#252d18'; g.beginPath(); g.ellipse(0,0,6,3,0,0,Math.PI*2); g.fill();
          line(g,0,0,0,-29,'#fff5d4',2);
          g.fillStyle='#b73437'; g.beginPath(); g.moveTo(0,-30); g.lineTo(20,-26);
          g.lineTo(0,-19); g.fill(); label(g,hole+1,6,-23,7,'#fff');
        });
        if (!moving && !v.ended) {
          const f=plan(a.aim);
          dash(g,b.x,b.y,f.landX,f.landY,'#fff6cdbb',1.6,[2,6]);
          reticle(g,f.x,f.y);
        }
        if (flight && flight.age > 0) {
          const t = flight.age/flight.duration;
          const prev = Math.max(0,t-.045);
          const prevHeight = 4*prev*(1-prev)*flight.peak;
          const tailX = flight.originX+(flight.landX-flight.originX)*prev-dx*prevHeight;
          const tailY = flight.originY+(flight.landY-flight.originY)*prev-dy*prevHeight;
          line(g,tailX,tailY,b.x-dx*height,b.y-dy*height,'#fff7dcc9',2);
        }
        contact(g,v,b.x,b.y,b.r+height*.06,.52-height*.004);
        const size=12+height*.07;
        if (!sprite(g,v,'golf-ball',b.x-dx*height,b.y-dy*height,size,size))
          orb(g,v,{...b,x:b.x-dx*height,y:b.y-dy*height});
        flash(g,a,v);
      },
    };
  },
);
for (const id of [32, 35])
  sport(
    id,
    id === 32
      ? '나인볼입니다. 흰 공으로 남은 가장 낮은 번호를 먼저 맞혀야 합니다. 올바른 샷으로 9번을 넣으면 승리합니다. 파울 뒤에는 흰 공 위치를 고를 수 있습니다.'
      : '스트라이커로 내 색 원반을 네 모서리 포켓에 넣으세요. 퀸을 넣으면 다음 한 수 안에 내 돌을 넣어 커버합니다. 내 돌을 먼저 마무리하면 승리합니다.',
    (a) => {
      const carrom = id === 35,
        stillMoving = carrom ? '원반이 멈추면 칠 수 있어요' : '공이 멈추면 칠 수 있어요';
      const v = table(a, carrom ? 'square' : 'turn', (pt) => hit(pt), {
        dragPlaces: () => placing,
        rolling: carrom ? '스트라이커가 미끄러지는 중…' : '공이 굴러가는 중…',
        wait: () => (turn ? '상대 차례예요 · 잠시만요' : moving ? stillMoving : ''),
      });
      const pockets = (carrom ? [150, 450] : [25, 300, 575]).flatMap((x) =>
        [25, 335].map((y) => ({ x, y })),
      );
      const pieces = [],
        cue = ball(130, 180, carrom ? 10 : 8, cream);
      let turn = 0,
        moving = false,
        first = null,
        down = [],
        scratch = false,
        queenOwner = null,
        cover = null,
        freeCue = false,
        placing = false,
        rail = false,
        recap = '';
      const sunk = [0, 0];
      const palette = [
        '#efb841',
        '#4c81ba',
        '#e36155',
        '#945e9d',
        '#ed903a',
        '#449369',
        '#a85447',
        '#2e343c',
        '#ebbe54',
      ];
      for (let i = 0; i < (carrom ? 19 : 9); i++) {
        let x, y;
        if (carrom) {
          const t = i === 0 ? 0 : (((i - 1) % (i <= 6 ? 6 : 12)) * Math.PI * 2) / (i <= 6 ? 6 : 12),
            r = i === 0 ? 0 : i <= 6 ? 20 : 40;
          x = 300 + r * Math.cos(t);
          y = 180 + r * Math.sin(t);
        } else {
          const slots = [
            [0, 0],
            [1, -0.5],
            [1, 0.5],
            [2, -1],
            [2, 1],
            [3, -0.5],
            [3, 0.5],
            [4, 0],
            [2, 0],
          ];
          x = 395 + slots[i][0] * 15;
          y = 180 + slots[i][1] * 17;
        }
        pieces.push(
          ball(
            x,
            y,
            carrom ? 9 : 8,
            carrom ? (i === 0 ? red : i % 2 ? cream : '#272738') : palette[i],
            { n: i + 1, side: i === 0 ? 2 : i % 2 ? 0 : 1, live: true },
          ),
        );
      }
      const resetCue = () => {
        cue.x = carrom ? 300 : turn ? 470 : 130;
        cue.y = carrom ? (turn ? 67 : 293) : 180;
        cue.vx = cue.vy = 0;
        for (let i = 0; i < 50 && pieces.some((v) => v.live && dist(v, cue) < v.r + cue.r + 1); i++)
          cue.y = 35 + ((i * 23) % 285);
      };
      const lowest = () => pieces.filter((b) => b.live).reduce((m, b) => (!m || b.n < m.n ? b : m), null);
      const left = (side) => pieces.filter((v) => v.live && v.side === side).length,
        board = carrom ? scoreboard(a) : null;
      function tally(final = false) {
        const goal = lowest();
        board?.(
          [0, 1].map((q) => ({
            name: q ? '상대 · 검은 원반' : '나 · 흰 원반',
            big: String(left(q)),
            sub: queenOwner === q ? '퀸 획득' : cover === q ? '퀸 커버 차례' : '',
            on: !final && turn === q,
          })),
        );
        a.score(
          carrom
            ? ['남은 원반', '나 ' + left(0) + ' · 상대 ' + left(1)]
            : ['남은 공 ' + pieces.filter((v) => v.live).length + '개', goal && !final ? '목표 ' + goal.n + '번' : ''],
        );
      }
      function info() {
        tally();
        const hint = turn
          ? ''
          : !carrom && freeCue
            ? '흰 공 옮기기 가능'
            : carrom && cover === 0
              ? '퀸 커버 · 내 원반을 넣으세요'
              : '';
        a.status((turn ? '상대' : '나') + '의 샷' + [recap, hint].filter(Boolean).map((s) => ' · ' + s).join(''));
      }
      function shot(pt, power) {
        if (moving) return;
        down = [];
        first = null;
        scratch = false;
        rail = false;
        freeCue = placing = false;
        moving = true;
        shoot(cue, pt, 130 + power * 600);
      }
      function ai() {
        const obj = carrom
          ? pieces.find((b) => b.live && b.side === turn)
          : pieces.find((b) => b.live);
        if (!obj) return;
        const pocket = pockets.reduce((b, p) => (dist(obj, b) < dist(obj, p) ? b : p)),
          len = dist(obj, pocket);
        shot(
          {
            x: obj.x + ((obj.x - pocket.x) * 16) / len + (random(7) - 3),
            y: obj.y + ((obj.y - pocket.y) * 16) / len,
          },
          0.77,
        );
      }
      function restore(b) {
        b.live = true;
        b.x = 300;
        b.y = 180;
        b.vx = b.vy = 0;
        for (
          let i = 0;
          i < 40 && pieces.some((v) => v !== b && v.live && dist(v, b) < v.r + b.r);
          i++
        ) {
          b.x = 275 + ((i * 31) % 110);
          b.y = 120 + ((i * 19) % 110);
        }
      }
      function settle() {
        moving = false;
        let keeps = false,
          foul = scratch;
        if (carrom) {
          const own = down.some((b) => b.side === turn),
            queen = pieces[0];
          if (scratch) {
            const penalty = pieces.find((v) => !v.live && v.side === turn);
            if (penalty) restore(penalty);
          }
          if (down.includes(queen) || cover === turn) {
            if (own && !scratch) {
              queenOwner = turn;
              cover = null;
            } else if (down.includes(queen) && !scratch) {
              cover = turn;
            } else {
              restore(queen);
              cover = null;
            }
          }
          keeps = !scratch && (own || cover === turn);
          for (const side of [0, 1])
            if (!pieces.some((v) => v.live && v.side === side)) {
              if (queenOwner !== null) {
                tally(true);
                a.finish(
                  (side ? '상대' : '나') + ' 승리',
                  '남은 원반 나 ' + left(0) + ' · 상대 ' + left(1) + ' · 퀸은 ' + (queenOwner ? '상대' : '나'),
                );
                return;
              }
              restore(pieces.find((v) => v.side === side));
            }
        } else {
          const target = Math.min(...[...pieces.filter((b) => b.live), ...down].map((b) => b.n));
          foul = scratch || first !== target || (!down.length && !rail);
          freeCue = foul;
          const nine = pieces[8];
          sunk[turn] += down.filter((b) => b !== nine || !foul).length;
          if (down.includes(nine)) {
            if (!foul) {
              tally(true);
              a.finish(
                (turn ? '상대' : '나') + ' · 9번 포켓 승리',
                '넣은 공 나 ' + sunk[0] + ' · 상대 ' + sunk[1],
              );
              return;
            }
            restore(nine);
          }
          keeps = down.length && !foul;
        }
        const who = turn ? '상대' : '내';
        recap = scratch
          ? who + ' 스크래치'
          : foul
            ? who + ' 파울'
            : down.length
              ? (carrom ? '원반 ' + down.length + '개' : down.map((b) => b.n + '번').join('·')) + ' 포켓'
              : '';
        if (!keeps) turn = 1 - turn;
        if (carrom || scratch) resetCue();
        info();
        if (turn) a.after(0.65, ai);
      }
      if (carrom) resetCue();
      a.aim = carrom ? { x: 300, y: 180 } : { x: 395, y: 180 };
      a.force();
      meter(a);
      info();
      const where = carrom
        ? null
        : a.button('흰 공 놓기', () => {
            if (placing) {
              // second press cancels the mode
              placing = false;
              info();
            } else if (!turn && !moving && freeCue) {
              placing = true;
              a.status('흰 공 놓을 곳을 누르세요 · 끌면 미리보기');
            }
          });
      if (where) {
        where.disabled = true;
        where.classList.add('pv-place');
        where.setAttribute('aria-pressed', 'false');
      }
      const hit = (pt) => {
        if (turn) return '상대 차례예요 · 잠시만요';
        if (moving) return stillMoving;
        if (placing) {
          const pos = { x: clamp(pt.x, 35, 565), y: clamp(pt.y, 35, 325) };
          if (
            pieces.some((v) => v.live && dist(v, pos) < v.r + cue.r + 1) ||
            pockets.some((v) => dist(v, pos) < 20)
          )
            return '공·포켓과 떨어진 곳을 고르세요';
          Object.assign(cue, pos);
          placing = false;
          recap = '';
          info();
          return false;
        }
        shot(pt, a.power);
      };
      key(a, '샷', v.shoot, v);
      const felt = carrom ? [136, 17, 328, 326] : [17, 17, 566, 326],
        box = carrom ? [138, 19, 462, 341] : [19, 19, 581, 341];
      function cushions(g) {
        const [x, y, w, h] = felt;
        // inner cushion bevel: dark lip toward the play field, light edge on top
        g.save();
        g.lineWidth = 5;
        g.strokeStyle = carrom ? '#5a321f99' : '#0d3d2fcc';
        g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
        g.lineWidth = 1.2;
        g.strokeStyle = carrom ? '#ffe2b366' : '#7fc7a155';
        g.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
        g.restore();
        if (carrom) return;
        // diamond sights on the rails
        g.fillStyle = '#f1e2bd';
        const gem = (cx, cy) => {
          g.beginPath();
          g.moveTo(cx, cy - 3);
          g.lineTo(cx + 2.2, cy);
          g.lineTo(cx, cy + 3);
          g.lineTo(cx - 2.2, cy);
          g.fill();
        };
        for (let k = 1; k < 8; k++) if (k !== 4) [8.5, 351.5].forEach((yy) => gem(17 + (566 * k) / 8, yy));
        for (let k = 1; k < 4; k++) [8.5, 591.5].forEach((xx) => gem(xx, 17 + (326 * k) / 4));
      }
      function pocket(g, p) {
        ring(g, p.x, p.y, 17.5, carrom ? '#3b2416' : '#2a1a10', 3.5);
        ring(g, p.x, p.y, 19.2, '#d9b47744', 1);
        const hole = g.createRadialGradient(p.x - 3, p.y - 4, 2, p.x, p.y, 15);
        hole.addColorStop(0, '#000');
        hole.addColorStop(0.7, '#0a1512');
        hole.addColorStop(1, '#2b3a33');
        circle(g, p.x, p.y, 15, hole);
      }
      // carrom is flicked with a finger: a fingertip behind the striker, cocked further for more power,
      // with short flick strokes. Drawn with ellipses and lines (the arcade QA reads arc radii).
      function flick(g, dir) {
        const pull = cue.r + 5 + a.power * 20,
          fx = cue.x - dir.x * pull,
          fy = cue.y - dir.y * pull,
          ang = Math.atan2(dir.y, dir.x);
        g.save();
        g.translate(fx, fy);
        g.rotate(ang);
        g.fillStyle = '#0b1a1440';
        g.beginPath();
        g.ellipse(-3, 3, 9, 7, 0, 0, Math.PI * 2);
        g.fill();
        const skin = g.createLinearGradient(0, -7, 0, 7);
        skin.addColorStop(0, '#f6cfa6');
        skin.addColorStop(1, '#c98b62');
        g.fillStyle = skin;
        g.beginPath();
        g.ellipse(-4, 0, 9, 6.5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fbe6d2';
        g.beginPath();
        g.ellipse(-1, 0, 4, 3.6, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        // flick strokes between fingertip and striker, more of them for a harder flick
        const n = 1 + Math.round(a.power * 2);
        for (let k = 0; k < n; k++) {
          const off = (k - (n - 1) / 2) * 5,
            px = -dir.y * off,
            py = dir.x * off,
            s0 = cue.r + 3,
            s1 = pull - 8;
          if (s1 > s0)
            line(g, cue.x - dir.x * s0 + px, cue.y - dir.y * s0 + py, cue.x - dir.x * s1 + px, cue.y - dir.y * s1 + py, '#fff7df99', 1.4);
        }
      }
      function guide(g) {
        if (moving || turn || v.ended) return;
        if (placing) {
          // a see-through cue ball under the finger: green where it may go, red on a ball or pocket
          const pos = { x: clamp(a.aim.x, 35, 565), y: clamp(a.aim.y, 35, 325) },
            ok =
              !pieces.some((b) => b.live && dist(b, pos) < b.r + cue.r + 1) &&
              !pockets.some((p) => dist(p, pos) < 20),
            tone = ok ? '#7fe0a0' : '#ff6a52';
          dash(g, cue.x, cue.y, pos.x, pos.y, '#fff7df66', 1.4, [3, 5]);
          g.save();
          g.globalAlpha = 0.6;
          g.fillStyle = '#fff6e6';
          g.beginPath();
          g.ellipse(pos.x, pos.y, cue.r, cue.r, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
          ring(g, pos.x, pos.y, cue.r + 2.5, '#0b1a14aa', 4);
          ring(g, pos.x, pos.y, cue.r + 2.5, tone, 2);
          if (!ok) {
            line(g, pos.x - 4, pos.y - 4, pos.x + 4, pos.y + 4, tone, 2);
            line(g, pos.x - 4, pos.y + 4, pos.x + 4, pos.y - 4, tone, 2);
          }
          return;
        }
        if (dist(cue, a.aim) < 1) return;
        const dir = heading(cue, a.aim),
          lit = pieces.filter((b) => b.live),
          hitAt = cast(cue, dir, lit, box),
          gx = cue.x + dir.x * hitAt.t,
          gy = cue.y + dir.y * hitAt.t;
        if (carrom) flick(g, dir);
        else {
          // cue stick behind the ball, drawn back further for a harder shot
          const pull = cue.r + 7 + a.power * 26,
            sx = cue.x - dir.x * pull,
            sy = cue.y - dir.y * pull;
          line(g, sx + 2, sy + 3, sx - dir.x * 230 + 2, sy - dir.y * 230 + 3, '#0b1a1455', 7);
          line(g, sx, sy, sx - dir.x * 230, sy - dir.y * 230, '#6b4325', 6);
          line(g, sx, sy, sx - dir.x * 150, sy - dir.y * 150, '#e2c08a', 4.5);
          line(g, sx, sy, sx - dir.x * 5, sy - dir.y * 5, '#f6f1e4', 4.5);
          line(g, sx, sy, sx - dir.x * 1.5, sy - dir.y * 1.5, '#3c6f8e', 4.5);
        }
        dash(g, cue.x, cue.y, gx, gy, '#fff7dfd9', 1.6, [4, 5]);
        ring(g, gx, gy, cue.r - 0.4, '#fff7dfd9', 1.5);
        if (hitAt.ball) {
          const o = hitAt.ball,
            od = heading({ x: gx, y: gy }, o);
          line(g, o.x, o.y, o.x + od.x * 42, o.y + od.y * 42, '#fff7dfaa', 1.5);
        }
        reticle(g, a.aim.x, a.aim.y, '#fff2c4');
      }
      return {
        tap: v.tap,
        down: v.down,
        move: v.move,
        step(dt) {
          if (!moving) return;
          for (let k = 0; k < 3; k++) {
            const bodies = [...(scratch ? [] : [cue]), ...pieces.filter((v) => v.live)];
            for (const b of bodies) {
              advance(b, dt / 3, 0.976);
              if (pockets.some((p) => dist(p, b) < 16)) {
                b.vx = b.vy = 0;
                if (b === cue) scratch = true;
                else {
                  b.live = false;
                  down.push(b);
                }
                continue;
              }
              if (
                first !== null &&
                (b.x - b.r <= 19 || b.x + b.r >= 581 || b.y - b.r <= 19 || b.y + b.r >= 341)
              )
                rail = true;
              bounds(b, carrom ? 138 : 19, 19, carrom ? 462 : 581, 341, 0.85);
            }
            const live = bodies.filter((b) => (b === cue ? !scratch : b.live));
            for (let i = 0; i < live.length; i++)
              for (let j = i + 1; j < live.length; j++)
                if (collide(live[i], live[j]) && live[i] === cue && first === null)
                  first = live[j].n;
          }
          if (![cue, ...pieces].some((b) => b.vx || b.vy)) settle();
        },
        draw(g) {
          v.begin(g);
          if (where && !v.ended) {
            where.disabled = moving || turn !== 0 || !freeCue;
            if (!where.disabled) delete where.dataset.why;
            else
              where.dataset.why = turn
                ? '상대 차례예요 · 잠시만요'
                : moving
                  ? '공이 멈추면 옮길 수 있어요'
                  : '흰 공은 상대 파울 뒤에만 옮겨요';
            const label = placing ? '놓기 취소' : '흰 공 놓기';
            if (where.textContent !== label) where.textContent = label;
            if (where.getAttribute('aria-pressed') !== String(placing))
              where.setAttribute('aria-pressed', String(placing));
          }
          surface(g, '#af8459', '#674a35', true);
          g.fillStyle = carrom ? '#dfa974' : '#25725d';
          g.fillRect(...felt);
          material(g, carrom ? 'maple' : 'felt', 0.67, ...felt);
          if (carrom) {
            circle(g, 300, 180, 62, '#9a553a', true);
            line(g, 173, 67, 427, 67, '#9a553a', 3);
            line(g, 173, 293, 427, 293, '#9a553a', 3);
            for (const yy of [67, 293]) for (const xx of [173, 427]) ring(g, xx, yy, 7, '#9a553a', 2);
            g.beginPath();
            for (let j = 0; j <= 16; j++) {
              const angle = (j * Math.PI) / 8,
                radius = j % 2 ? 8 : 26;
              const x = 300 + Math.cos(angle) * radius,
                y = 180 + Math.sin(angle) * radius;
              if (j === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.strokeStyle = '#9a553a';
            g.stroke();
          } else {
            // head string and foot spot
            line(g, 158, 23, 158, 337, '#d9f1e01f', 1);
            ring(g, 395, 180, 2.5, '#d9f1e055', 1.5);
          }
          cushions(g);
          wash(g, a);
          pockets.forEach((p) => pocket(g, p));
          const goal = !carrom && !turn && !moving && !v.ended ? lowest() : null;
          for (const b of pieces.filter((v) => v.live)) {
            orb(g, v, b);
            if (carrom) {
              sprite(g, v, ['pale-checker', 'dark-checker', 'red-disc'][b.side], b.x, b.y, b.r * 2, b.r * 2);
            } else {
              v.upright(g, b.x, b.y, () => {
                g.fillStyle = '#fff6e6';
                g.beginPath();
                g.ellipse(0, 0, 4.6, 4.6, 0, 0, Math.PI * 2);
                g.fill();
                label(g, b.n, 0, 3.2, 8.5, '#181c20');
              });
            }
          }
          // own pieces (carrom) or the ball that must be hit first (nine-ball)
          if (goal) ring(g, goal.x, goal.y, goal.r + 4, gold, 2, [3, 3]);
          if (carrom && !turn && !moving && !v.ended)
            for (const b of pieces.filter((p) => p.live && (p.side === 0 || (cover === 0 && p.side === 2))))
              ring(g, b.x, b.y, b.r + 2.5, '#fff2c48c', 1.2);
          guide(g);
          if (!scratch) orb(g, v, cue);
          aimLens(g,a,v);
          flash(g, a, v);
        },
      };
    },
  );
// Physical tables run along world X. One camera maps both the painted pieces and touch input.
function laneCamera(front, back, width, perspective) {
  function project(x, y) {
    const depth = x / 600;
    const scale = width / (1 + perspective * depth);
    return { x: 300 + (y - 180) * scale,
      y: front - (front - back) * depth * (1 + perspective) / (1 + perspective * depth), scale };
  }
  function unproject(pt) {
    const t = clamp((front - pt.y) / (front - back), 0, 1);
    const depth = t / (1 + perspective - perspective * t);
    return { x: 600 * depth, y: 180 + (pt.x-300) * (1+perspective*depth)/width };
  }
  function segment(g, x, y, xx, yy, color, weight) {
    const a = project(x,y), b = project(xx,yy);
    line(g,a.x,a.y,b.x,b.y,color,weight);
  }
  return { project, unproject, segment };
}

sport(
  33,
  '레인에서 공을 보낼 지점을 누르세요. 프레임마다 두 번 굴리고 스트라이크·스페어에는 다음 투구 점수가 더해집니다. 열 번째 프레임의 보너스 투구까지 진행합니다.',
  (a) => {
    const camera = laneCamera(357,140,2.1,1.85);
    const v = table(a, null, (pt) => hit(camera.unproject(pt)), {
      aimed: '방향을 정했어요 · 굴리기로 굴려요',
      rolling: '공이 레인을 굴러가는 중…',
      wait: () => (flight ? '공이 굴러가는 중이에요' : ''),
    });
    const rolls = [],
      frames = [],
      marks = { strike: 0, spare: 0 };
    let n = 1,
      frame = [],
      flight = false,
      b,
      pins;
    function rack() {
      pins = range(10).map(i => {
        const row = Math.floor((Math.sqrt(8*i+1)-1)/2), col=i-row*(row+1)/2;
        const x=455+row*20,y=180+(col-row/2)*26;
        return ball(x,y,9,cream,{live:true,homeX:x,homeY:y});
      });
    }
    function total() {
      let score = 0,
        at = 0;
      frames.forEach((f, i) => {
        if (i === 9) {
          score += f.reduce((s, v) => s + v, 0);
          return;
        }
        const v = f.reduce((s, t) => s + t, 0);
        score += v;
        if (v === 10)
          score += (rolls[at + f.length] || 0) + (f.length === 1 ? rolls[at + 2] || 0 : 0);
        at += f.length;
      });
      return score;
    }
    function reset() {
      b = ball(75, 180, 14, '#3979a5');
    }
    rack();
    reset();
    a.aim = camera.project(480,180);
    a.force();
    meter(a);
    // score: frame, pins of the open frame, and the running total of finished frames
    function tally() {
      const open = frame.reduce((s, t) => s + t, 0);
      a.score([n + ' / 10 프레임', (frame.length ? '이번 ' + open + '핀 · ' : '') + '합계 ' + total() + '점']);
    }
    function info(note = '') {
      tally();
      a.status((note ? note + ' · ' : '') + (frame.length ? frame.length + 1 + '구째 · ' : '') + '핀 쪽을 누르세요');
    }
    info();
    function hit(pt) {
      if (flight) return '공이 굴러가는 중이에요';
      if (pt.x <= b.x) return '공보다 핀 쪽을 누르세요';
      flight = true;
      shoot(b, pt, 300 + 500 * a.power);
    }
    key(a, '굴리기', v.shoot, v);
    function settle() {
      flight = false;
      const knocked = pins.filter((v) => v.live && v.hit);
      knocked.forEach((v) => (v.live = false));
      rolls.push(knocked.length);
      frame.push(knocked.length);
      const last = frame.length,
        spare =
          last >= 2 &&
          frame[last - 2] < 10 &&
          frame[last - 2] + frame[last - 1] === 10 &&
          (last === 2 || frame[0] === 10),
        note =
          knocked.length === 10 && !spare
            ? '스트라이크!'
            : spare
              ? '스페어!'
              : knocked.length
                ? knocked.length + '핀'
                : '거터';
      if (spare) marks.spare++;
      else if (knocked.length === 10) marks.strike++;
      const sum = frame.reduce((s, t) => s + t, 0),
        done =
          n < 10
            ? frame[0] === 10 || frame.length === 2
            : frame.length === 3 || (frame.length === 2 && sum < 10);
      if (done) {
        frames.push(frame);
        frame = [];
        if (n === 10) {
          const final = total();
          a.score(['10 / 10 프레임', '합계 ' + final + '점']);
          a.finish(
            '10프레임 · ' + final + '점' + (final === 300 ? ' 퍼펙트!' : ''),
            '스트라이크 ' + marks.strike + ' · 스페어 ' + marks.spare,
          );
          return;
        }
        n++;
        rack();
      } else if (pins.every((v) => !v.live)) rack();
      reset();
      info(note);
    }
    return {
      tap: v.tap,
      down: v.down,
      move: v.move,
      step(dt) {
        if (!flight) return;
        advance(b, dt);
        for (const v of pins.filter((v) => v.live)) {
          if (!v.hit && dist(b, v) < b.r + v.r) {
            v.hit = true;
            shoot(v, { x: v.x + 50, y: v.y + (v.y - b.y) * 3 }, 260);
          }
          if (v.hit) {
            advance(v, dt, 0.982);
            for (const j of pins.filter((j) => j.live && !j.hit))
              if (dist(v, j) < 19) {
                j.hit = true;
                shoot(j, { x: j.x + 45, y: j.y + (j.y - v.y) * 2 }, 195);
              }
          }
        }
        if (b.x > 625 || b.y < 40 || b.y > 320) settle();
      },
      draw(g) {
        v.begin(g);
        surface(g, '#b99365', '#684534');
        material(g, 'review-lane', 1);
        const start = camera.project(b.x,b.y);
        if (!flight && !v.ended) {
          dash(g,start.x,start.y,a.aim.x,a.aim.y,'#fff5d9dc',2,[4,6]);
          reticle(g,a.aim.x,a.aim.y);
        }
        for (const pin of pins.filter(p=>p.live).sort((p,q)=>q.x-p.x)) {
          const s=camera.project(pin.x,pin.y);
          g.save(); g.translate(s.x,s.y);
          contact(g,v,0,0,8*s.scale);
          g.rotate(pin.hit ? Math.min(1.36,Math.hypot(pin.x-pin.homeX,pin.y-pin.homeY)/25) : 0);
          if (!miniature(g,'pin',0,-20*s.scale,23*s.scale,42*s.scale)) orb(g,v,{...pin,x:0,y:-8,r:7});
          g.restore();
        }
        contact(g,v,start.x,start.y,b.r*start.scale);
        const diameter=b.r*2*start.scale;
        if (!miniature(g,'bowling-ball',start.x,start.y-diameter*.36,diameter,diameter))
          orb(g,v,{...b,x:start.x,y:start.y-diameter*.36,r:diameter/2});
        flash(g,a,v);
      },
    };
  },
);
sport(
  34,
  '다트판을 눌러 조준하고 던지기를 누르세요. 흔들림을 감안해 3발씩 던집니다. 301점을 정확히 0으로 만들면 승리하며, 초과하면 그 차례의 점수가 취소됩니다.',
  (a) => {
    const v = table(a, 'square', null, {
      wait: () => (p ? '상대가 던지는 중이에요' : ''),
    });
    const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
      left = [301, 301];
    let p = 0,
      n = 0,
      start = 301,
      last = null,
      marks = [],
      note = '';
    a.aim = { x: 300, y: 180 };
    const board = scoreboard(a),
      recent = [[], []];
    function tally(done = false) {
      a.score(['나 ' + left[0], '상대 ' + left[1]]);
      board(
        [0, 1].map((q) => ({
          name: q ? '상대' : '나',
          big: String(left[q]),
          sub: recent[q].bust ? '버스트 · 점수 취소' : [0, 1, 2].map((k) => recent[q][k] || '–').join('  '),
          on: !done && p === q,
        })),
      );
    }
    function info() {
      tally();
      a.status((note ? note + ' · ' : '') + (p ? '상대 ' : '내 ') + (n + 1) + '번째 다트');
    }
    info();
    const wobble = () => ({
      x: a.aim.x + Math.sin(a.time * 3) * 5,
      y: a.aim.y + Math.cos(a.time * 4) * 5,
    });
    // same scoring as toss(), returned with a short ring name for the board
    function worth(point) {
      const dx = point.x - 300,
        dy = point.y - 180,
        r = Math.hypot(dx, dy);
      const idx = Math.floor(
        ((Math.atan2(dx, -dy) + Math.PI / 20 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 10),
      );
      if (r < 6) return { val: 50, tag: '불' };
      if (r < 13) return { val: 25, tag: '25' };
      if (r > 146) return { val: 0, tag: '밖' };
      const mul = r > 136 ? 2 : r > 83 && r < 94 ? 3 : 1;
      return { val: order[idx] * mul, tag: (mul === 2 ? 'D' : mul === 3 ? 'T' : '') + order[idx] };
    }
    function toss(point) {
      last = point;
      const dx = point.x - 300,
        dy = point.y - 180,
        r = Math.hypot(dx, dy);
      const idx = Math.floor(
        ((Math.atan2(dx, -dy) + Math.PI / 20 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 10),
      );
      const val =
        r < 6
          ? 50
          : r < 13
            ? 25
            : r > 146
              ? 0
              : order[idx] * (r > 136 ? 2 : r > 83 && r < 94 ? 3 : 1);
      if (n === 0) {
        marks = [];
        recent[p] = [];
      }
      const tag = worth(point).tag;
      marks.push({ ...point, p, tag, val });
      recent[p].push(val ? tag : '0');
      left[p] -= val;
      n++;
      // '방금 18점', '방금 T20 · 60점', '상대 D16 · 32점', '방금 빗나감'
      const hitText = val === 0 ? '빗나감' : String(val) === tag ? val + '점' : tag + ' · ' + val + '점';
      note = (p ? '상대 ' : '방금 ') + hitText;
      if (left[p] === 0) {
        tally(true);
        a.finish(
          (p ? '상대' : '나') + ' 승리 · 301 체크아웃',
          '마지막 ' + hitText + ' · 남은 점수 ' + (p ? '나 ' + left[0] : '상대 ' + left[1]),
        );
        return;
      }
      if (left[p] < 0 || n === 3) {
        if (left[p] < 0) {
          left[p] = start;
          note = (p ? '상대' : '내') + ' 버스트 · 점수 취소';
          recent[p].bust = true;
        }
        p = 1 - p;
        n = 0;
        start = left[p];
      }
      info();
      if (p)
        a.after(0.55, () => {
          const goal = left[1] <= 20 ? left[1] : 20,
            i = order.indexOf(goal),
            ang = (i * Math.PI) / 10 + Math.random() * 0.23 - 0.115,
            r = left[1] <= 20 ? 107 + random(20) : 80 + random(26);
          toss({ x: 300 + Math.sin(ang) * r, y: 180 - Math.cos(ang) * r });
        });
    }
    // the key rests while the opponent throws; a tap on it explains why (core data-why fallback)
    key(
      a,
      '던지기',
      () => {
        if (!p) toss(wobble());
        else v.reject('상대가 던지는 중이에요');
      },
      v,
    );
    return {
      tap: v.tap,
      down: v.down,
      move: v.move,
      draw(g) {
        v.begin(g);
        surface(g, '#493b3a', '#24282b', true);
        for(const x of [65,535]) {
          const halo=g.createRadialGradient(x,85,5,x,95,145);
          halo.addColorStop(0,'#efd0a248');halo.addColorStop(1,'#45285700');
          g.fillStyle=halo;g.fillRect(x-145,0,290,250);
        }
        wash(g, a);
        // cork surround with a soft cast shadow below-right
        g.save();
        g.shadowColor = '#0a0d0c99';
        g.shadowBlur = 18;
        g.shadowOffsetX = 5;
        g.shadowOffsetY = 9;
        circle(g, 300, 180, 174, '#202c2c');
        g.restore();
        for (const i of range(20)) {
          const mid = ((i - 5) * Math.PI) / 10,
            l = mid - Math.PI / 20,
            u = mid + Math.PI / 20;
          for (const [outer, inner, fill] of [
            [146, 136, i % 2 ? '#37745c' : red],
            [136, 94, i % 2 ? cream : '#273331'],
            [94, 83, i % 2 ? '#37745c' : red],
            [83, 13, i % 2 ? cream : '#273331'],
          ]) {
            g.beginPath();
            g.arc(300, 180, outer, l, u);
            g.arc(300, 180, inner, u, l, true);
            g.closePath();
            g.fillStyle = fill;
            g.fill();
          }
          label(g, order[i], 300 + Math.cos(mid) * 160, 185 + Math.sin(mid) * 160, 14);
        }
        g.save();
        g.beginPath();
        g.arc(300, 180, 146, 0, 2 * Math.PI);
        g.clip();
        material(g, 'sisal', 0.18, 154, 34, 292, 292);
        const sheen = g.createLinearGradient(154, 34, 446, 326);
        sheen.addColorStop(0, '#fff6dc26');
        sheen.addColorStop(0.5, '#fff6dc00');
        sheen.addColorStop(1, '#0000002a');
        g.fillStyle = sheen;
        g.fillRect(154, 34, 292, 292);
        g.restore();
        ring(g, 300, 180, 146, '#c9cfcf88', 1);
        ring(g, 300, 180, 94, '#c9cfcf66', 0.8);
        circle(g, 300, 180, 13, '#397655');
        circle(g, 300, 180, 6, red);
        // this turn's darts with their scores
        for (const m of marks) {
          if (m !== marks[marks.length - 1] || !miniature(g, 'dart', m.x + 14, m.y - 16, 34, 36)) {
            circle(g, m.x + 1, m.y + 2, 4, '#0007');
            circle(g, m.x, m.y, 4, m.p ? '#6cb4c4' : '#34343c');
          }
          g.fillStyle = '#10201ccc';
          g.beginPath();
          g.ellipse(m.x - 1, m.y + 12, 12, 7.5, 0, 0, Math.PI * 2);
          g.fill();
          label(g, m.tag, m.x - 1, m.y + 15.5, 9.5, m.p ? '#bfe6ee' : '#fff1c4');
        }
        if (!p && !v.ended) {
          const q = wobble(),
            preview = worth(a.aim);
          circle(g, q.x, q.y, 8, '#efd676', true);
          line(g, q.x - 11, q.y, q.x + 11, q.y, '#fff');
          line(g, q.x, q.y - 11, q.x, q.y + 11, '#fff');
          g.fillStyle = '#10201cdd';
          g.beginPath();
          g.ellipse(a.aim.x, a.aim.y - 23, 17, 9.5, 0, 0, Math.PI * 2);
          g.fill();
          label(g, preview.tag, a.aim.x, a.aim.y - 18.5, 12, gold);
        }
        aimLens(g,a,v);
        flash(g, a, v);
      },
    };
  },
);
sport(
  38,
  '번갈아 스톤 네 개씩 던집니다. 버튼에 가까운 팀의 스톤 중 상대 최선의 스톤보다 안쪽에 있는 개수만큼 득점합니다.',
  (a) => {
    const camera = laneCamera(341,39,1.55,.98);
    const v = table(a, null, (pt) => hit(camera.unproject(pt)), {
      aimed: '방향을 정했어요 · 던지기로 던져요',
      rolling: '스톤이 미끄러지는 중…',
      wait: () => (turn ? '상대가 던지는 중이에요' : busy ? '스톤이 멈추면 던질 수 있어요' : ''),
    });
    const stones = [],
      target = { x: 465, y: 180 };
    let turn = 0,
      busy = false,
      leader = null;
    const team = [red, blue];
    a.aim = camera.project(target.x,target.y);
    function launch(pt, power) {
      const b = ball(65, 180, 12, team[turn], { p: turn });
      shoot(b, pt, 100 + power * 650);
      stones.push(b);
      busy = true;
    }
    const shotRock = () =>
      stones
        .filter((b) => dist(b, target) <= 86)
        .sort((x, y) => dist(x, target) - dist(y, target))[0];
    function tally() {
      const mine = stones.filter((b) => !b.p).length,
        theirs = stones.length - mine;
      a.score(['투구 ' + stones.length + '/8', '남은 스톤 나 ' + (4 - mine) + ' · 상대 ' + (4 - theirs)]);
    }
    a.force();
    meter(a);
    tally();
    a.status('하우스 쪽을 누르면 던져요 · 끌면 조준만');
    const hit = (pt) => {
      if (turn) return '상대가 던지는 중이에요';
      if (busy) return '스톤이 멈추면 던질 수 있어요';
      launch(pt, a.power);
    };
    key(a, '던지기', v.shoot, v);
    return {
      tap: v.tap,
      down: v.down,
      move: v.move,
      step(dt) {
        if (!busy) return;
        stones.forEach((b) => {
          advance(b, dt, 0.98);
          bounds(b);
        });
        for (let i = 0; i < stones.length; i++)
          for (let j = i + 1; j < stones.length; j++) collide(stones[i], stones[j]);
        if (stones.every((b) => !b.vx && !b.vy)) {
          busy = false;
          turn = 1 - turn;
          leader = shotRock() || null;
          tally();
          if (stones.length === 8) {
            const all = stones
              .filter((b) => dist(b, target) <= 86)
              .sort((x, y) => dist(x, target) - dist(y, target));
            const inHouse = (q) => all.filter((b) => b.p === q).length,
              house = '하우스 안 스톤 나 ' + inHouse(0) + ' · 상대 ' + inHouse(1);
            if (!all.length) {
              a.finish('무승부', house);
              return;
            }
            const p = all[0].p,
              other = all.find((b) => b.p !== p);
            a.finish(
              (p ? '상대' : '나') +
                ' ' +
                all.filter((b) => b.p === p && (!other || dist(b, target) < dist(other, target)))
                  .length +
                '점 승리',
              house,
            );
          } else {
            const lead = leader;
            a.status(
              (turn ? '상대가 던져요' : '내 차례 · 하우스로 던지세요') +
                (lead ? ' · ' + (lead.p ? '상대' : '내') + ' 스톤이 가장 가까워요' : ''),
            );
            if (turn)
              a.after(0.5, () =>
                launch({ x: 460, y: 155 + random(50) }, 0.59 + Math.random() * 0.12),
              );
          }
        }
      },
      draw(g) {
        v.begin(g);
        surface(g,'#875c39','#472f21');
        material(g,'walnut',.88);
        const corners=[[0,4],[600,4],[600,356],[0,356]].map(([x,y])=>camera.project(x,y));
        g.beginPath();corners.forEach((p,i)=>i ? g.lineTo(p.x,p.y) : g.moveTo(p.x,p.y));g.closePath();
        g.save();g.shadowColor='#24190bcc';g.shadowBlur=8;g.shadowOffsetY=5;
        g.fillStyle='#bedbdf';g.fill();g.restore();
        g.strokeStyle='#5f4442';g.lineWidth=8;g.stroke();
        g.save();g.clip(); material(g,'ice',.65);
        for(const x of [140,380,565]) camera.segment(g,x,0,x,360,'#b0524c',2);
        camera.segment(g,0,180,600,180,'#718e9566',1.2);
        for(const [r,c] of [[86,'#426c97'],[63,'#e9eff0'],[43,'#b5574d'],[19,'#e5e4cf']]){
          g.beginPath();
          for(let j=0;j<=64;j++){
            const angle=j*Math.PI/32, p=camera.project(target.x+r*Math.cos(angle),target.y+r*Math.sin(angle));
            if(!j)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
          }
          g.closePath();g.fillStyle=c;g.fill();
        }
        if(!turn && !busy && !v.ended) {
          const from=camera.project(65,180);
          dash(g,from.x,from.y,a.aim.x,a.aim.y,'#344c60cc',1.8,[4,5]);
          reticle(g,a.aim.x,a.aim.y);
        }
        const shown=[...stones];
        if(!turn && !busy && !v.ended) shown.push({x:65,y:180,p:0});
        for(const stone of shown.sort((p,q)=>q.x-p.x)){
          const p=camera.project(stone.x,stone.y), size=31*p.scale;
          contact(g,v,p.x,p.y,size*.46);
          if(stone===leader) ring(g,p.x,p.y,size*.56,gold,2);
          if(!miniature(g,stone.p?'blue-curling':'red-curling',p.x,p.y-size*.2,size,size))
            orb(g,v,{x:p.x,y:p.y,r:size*.45,color:team[stone.p]});
        }
        g.restore();
        flash(g,a,v);
      },
    };
  },
);
