import { register, element } from './ww-core.js';
import { material } from './ww-scenery.js';
const surfaces = {31:'grass',32:'walnut',33:'walnut',34:'walnut',35:'walnut',36:'felt',37:'grass',38:'ice',39:'felt',40:'grass',41:'ice',42:'grass',43:'water',44:'terrain',45:'terrain',46:'walnut'};
export const W = 600,
  H = 360,
  clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function ball(x, y, r, color, extra = {}) {
  return { x, y, r, color, vx: 0, vy: 0, ...extra };
}
export function disc(g, o) {
  const { x, y, r, color } = o;
  g.save();
  g.shadowColor = '#06191899';
  g.shadowBlur = r * 0.45;
  g.shadowOffsetY = r * 0.35;
  const fill = g.createRadialGradient(x - r * 0.35, y - r * 0.45, 0, x, y, r);
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
export function line(g, x, y, xx, yy, color, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(xx, yy);
  g.stroke();
}
export function circle(g, x, y, r, color, stroke = false) {
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  if (stroke) {
    g.lineWidth = 2;
    g.strokeStyle = color;
    g.stroke();
  } else {
    g.fillStyle = color;
    g.fill();
  }
}
export function label(g, str, x, y, size = 15, color = '#fff8dd') {
  g.fillStyle = color;
  g.font = '600 ' + size + 'px system-ui';
  g.textAlign = 'center';
  g.fillText(str, x, y);
}
export function surface(g, light, dark, grain = false) {
  const shade = g.createLinearGradient(0, 0, 600, 360);
  shade.addColorStop(0, light);
  shade.addColorStop(1, dark);
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
  const texture = surfaces[g.canvas?.dataset?.game];
  if (texture) material(g, texture, 0.59);
  else if (grain) for (let x = 0; x < 600; x += 24) line(g, x, 0, x - 25, H, '#fff2ca20', 1);
}
export function advance(o, dt, drag = 1) {
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  const friction = drag ** (dt * 60);
  o.vx *= friction;
  o.vy *= friction;
  if (Math.hypot(o.vx, o.vy) < 2) o.vx = o.vy = 0;
}
export function bounds(o, x0 = 0, y0 = 0, x1 = W, y1 = H, elasticity = 0.85) {
  if ((o.x < x0 + o.r && o.vx < 0) || (o.x > x1 - o.r && o.vx > 0)) o.vx *= -elasticity;
  if ((o.y < y0 + o.r && o.vy < 0) || (o.y > y1 - o.r && o.vy > 0)) o.vy *= -elasticity;
  o.x = clamp(o.x, x0 + o.r, x1 - o.r);
  o.y = clamp(o.y, y0 + o.r, y1 - o.r);
}
export function collide(a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    d = Math.hypot(dx, dy) || 0.001,
    min = a.r + b.r;
  if (d >= min) return false;
  const nx = dx / d,
    ny = dy / d,
    shift = (min - d) / 2;
  a.x -= nx * shift;
  a.y -= ny * shift;
  b.x += nx * shift;
  b.y += ny * shift;
  const v = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (v > 0) {
    a.vx -= v * nx;
    a.vy -= v * ny;
    b.vx += v * nx;
    b.vy += v * ny;
  }
  return true;
}
export function shoot(o, to, speed) {
  const angle = Math.atan2(to.y - o.y, to.x - o.x);
  o.vx = Math.cos(angle) * speed;
  o.vy = Math.sin(angle) * speed;
}
export function sport(id, rules, setup) {
  register(id, rules, (ui) => {
    let mounted = false;
    return () => {
      if (mounted) return;
      mounted = true;
      const canvas = element('canvas', 'arena');
      canvas.dataset.game = id;
      canvas.width = 900;
      canvas.height = 540;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', rules);
      ui.board.append(canvas);
      const g = canvas.getContext('2d'),
        controls = ui.row();
      let frame = 0,
        last = 0,
        elapsed = 0,
        pressed = null,
        scheduled = null;
      const A = {
        g,
        canvas,
        aim: { x: 405, y: 180 },
        power: 0.7,
        get time() {
          return elapsed;
        },
        status: ui.status,
        score: ui.score,
        finish: ui.finish,
        button(name, fn) {
          const b = element('button', 'studio-key', name);
          b.onclick = () => {
            if (!ui.ended) fn();
          };
          controls.append(b);
          return b;
        },
        force() {
          const field = element('label', 'force', '힘 '),
            slider = element('input');
          slider.type = 'range';
          slider.min = '15';
          slider.max = '100';
          slider.value = '70';
          slider.oninput = () => (A.power = +slider.value / 100);
          field.append(slider);
          controls.append(field);
        },
        after(seconds, fn) {
          scheduled = { time: elapsed + seconds, fn };
        },
      };
      const game = setup(A);
      function point(e) {
        const r = canvas.getBoundingClientRect();
        if (
          document.documentElement.classList.contains('card-landscape') &&
          matchMedia('(orientation: portrait)').matches
        )
          return {
            x: clamp(((e.clientY - r.top) / r.height) * W, 0, W),
            y: clamp(((r.right - e.clientX) / r.width) * H, 0, H),
          };
        return {
          x: clamp(((e.clientX - r.left) / r.width) * W, 0, W),
          y: clamp(((e.clientY - r.top) / r.height) * H, 0, H),
        };
      }
      canvas.onpointerdown = (e) => {
        if (ui.ended) return;
        canvas.setPointerCapture(e.pointerId);
        pressed = point(e);
        A.aim = pressed;
        game.down?.(pressed);
      };
      canvas.onpointermove = (e) => {
        if (!pressed || ui.ended) return;
        A.aim = point(e);
        game.move?.(A.aim);
      };
      canvas.onpointerup = (e) => {
        if (!pressed || ui.ended) return;
        const end = point(e);
        A.aim = end;
        if (typeof cardAudio !== 'undefined') cardAudio.cue('chip');
        game.tap?.(end, pressed);
        pressed = null;
      };
      canvas.onpointercancel = () => {
        pressed = null;
        game.cancel?.();
      };
      canvas.onkeydown = (e) => {
        if (ui.ended) return;
        const offsets = {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, -10],
          ArrowDown: [0, 10],
        };
        if (offsets[e.key]) {
          e.preventDefault();
          const [dx, dy] = offsets[e.key];
          A.aim = { x: clamp(A.aim.x + dx, 0, W), y: clamp(A.aim.y + dy, 0, H) };
          game.move?.(A.aim);
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          game.tap?.(A.aim, A.aim);
        }
      };
      function draw(now) {
        if (ui.signal.aborted) return;
        if (document.hidden || document.querySelector('dialog[open]')) {
          last = 0;
          frame = requestAnimationFrame(draw);
          return;
        }
        const dt = last ? Math.min(0.033, (now - last) / 1000) : 0;
        last = now;
        elapsed += dt;
        if (scheduled && scheduled.time <= elapsed) {
          const cb = scheduled.fn;
          scheduled = null;
          cb();
        }
        if (!ui.ended) game.step?.(dt);
        g.setTransform(1.5, 0, 0, 1.5, 0, 0);
        g.clearRect(0, 0, W, H);
        g.save();
        game.draw(g);
        g.restore();
        if (!ui.ended) frame = requestAnimationFrame(draw);
      }
      frame = requestAnimationFrame(draw);
      ui.signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
    };
  });
}
