import { clamp, disc, ball, line } from './ww-studio.js';
import { miniature, material } from './ww-scenery.js';

function oval(g, x, y, rx, ry, fill) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

function figure(g, x, y, scale, side, swing = 0, tool = '') {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  oval(g, 4, 1, 13, 4, '#231c2352');
  const dark = side ? '#7c2535' : '#164864';
  const cloth = side ? '#dc5450' : '#48a5b5';
  for (const dx of [-5, 5]) {
    line(g, dx * .7, -12, dx, -3, '#eee1c7', 5);
    oval(g, dx, -2, 4.3, 2.6, '#38363c');
  }
  const enamel = g.createLinearGradient(-9, -15, 9, -12);
  enamel.addColorStop(0, dark);
  enamel.addColorStop(.44, cloth);
  enamel.addColorStop(1, dark);
  oval(g, 0, -15, 8, 10, enamel);
  oval(g, -1, -29, 6.6, 7.5, '#eebd8a');
  oval(g, -1, -34, 7.5, 4.2, cloth);
  line(g, -2, -33, 8, -32, dark, 2.6);
  g.translate(5, -20);
  g.rotate(swing);
  g.lineCap = 'round';
  line(g, 0, 0, 9, 4, '#e8b785', 4);
  if (tool === 'racket') {
    line(g, 9, 4, 18, -1, '#ede2cc', 3);
    g.translate(23, -5);
    g.rotate(.65);
    oval(g, 0, 0, 6.3, 9.5, '#ddd8ba');
    oval(g, 0, 0, 4.6, 7.5, '#485951');
    for (const n of [-3, 0, 3]) {
      line(g, n, -5, n, 5, '#e5e8ca', .7);
      line(g, -3.5, n, 3.5, n, '#e5e8ca', .7);
    }
  } else if (tool === 'bat') {
    line(g, 8, 4, 22, -4, '#c19a6e', 3.2);
    line(g, 19, -2, 36, -13, '#f5ca87', 6.4);
  }
  g.restore();
}

// Position on the court is lateral (-1..1) and depth (0 near baseline, 1 far).
function court(x, z, h = 0) {
  const scale = 1 / (1 + .93 * z);
  return { x: 300 + 236 * x * scale, y: 317 - 325 * z * scale - h * scale, scale };
}

function courtLine(g, x, z, xx, zz, color, width) {
  const from = court(x, z), to = court(xx, zz);
  line(g, from.x, from.y, to.x, to.y, color, width);
}

export function tennis(a) {
  const score = [0, 0], players = [0, 0], swingAt = [-10, -10];
  let active = false, flight = null, wait = .4, receiver = 0, rallies = 0, lob = false;
  let destination = 0, lastPoint = '', bounceAt = -10, bounce = court(0, .5);
  const status = () => a.score('나 ' + score[0] + ' · 상대 ' + score[1]);
  function send(from, to, high = false) {
    const z = from ? 1 : 0;
    flight = { from, x: players[from], z, to, age: 0,
      duration: high ? 1.36 : Math.max(.78, 1.09 - rallies * .025), high };
    if (typeof cardAudio !== 'undefined') cardAudio.cue('racket');
    receiver = 1 - from;
    swingAt[from] = a.time;
    rallies++;
  }
  function point(winner) {
    score[winner]++;
    status();
    lastPoint = winner ? '상대 득점' : '내 득점';
    flight = null;
    if (score[winner] >= 7 && score[winner] - score[1 - winner] >= 2) {
      a.finish((winner ? '상대' : '나') + ' 승리 · ' + score.join(' : '));
      return;
    }
    wait = .9;
    a.status(lastPoint + ' · 다음 서브');
  }
  function start() {
    if (active) return;
    active = true;
    serveKey.hidden = true;
    a.status('좌우로 끌어 공을 받고, 라켓 가장자리로 방향을 바꾸세요');
  }
  const serveKey = a.button('서브 · 시작', start);
  const shot = a.button('샷 · 드라이브', () => {
    lob = !lob;
    shot.textContent = lob ? '샷 · 로브' : '샷 · 드라이브';
    shot.setAttribute('aria-pressed', String(lob));
  });
  shot.setAttribute('aria-pressed', 'false');
  // Keep the ball visible on a small upright phone while the thumb moves below the court.
  const pad = document.createElement('label');
  pad.className = 'tennis-steer';
  pad.textContent = '선수 이동';
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '-105'; slider.max = '105'; slider.value = '0';
  slider.addEventListener('input', () => { start(); destination = Number(slider.value)/100; });
  pad.append(slider);
  a.canvas.after(pad);
  function steer(p) {
    destination = clamp((p.x - 300) / 236, -1.05, 1.05);
    slider.value = String(Math.round(destination*100));
  }
  function sample(t) {
    const f = flight, q = t / .71;
    const h = t < .71 ? 17 * (1 - q) + (f.high ? 119 : 66) * 4 * q * (1 - q)
      : 28 * Math.sin(Math.PI * Math.min(1, (t - .71) / .44));
    return court(f.x + (f.to - f.x) * t, f.z + (f.from ? -1 : 1) * t, h);
  }
  function player(g, i) {
    const p = court(players[i], i ? 1.04 : -.025);
    const t = clamp((a.time - swingAt[i]) / .34, 0, 1);
    figure(g, p.x - 11 * p.scale, p.y, p.scale * 1.32, i,
      -.45 + 2.2 * Math.sin(Math.PI * t), 'racket');
  }
  function net(g) {
    const left = court(-1.14, .5), right = court(1.14, .5);
    const y = left.y;
    g.fillStyle = '#1b302c78';
    g.fillRect(left.x, y - 13, right.x - left.x, 13);
    for (let x = left.x; x < right.x; x += 5) line(g, x, y, x, y - 13, '#dae2d477', .6);
    for (const h of [3, 7, 11]) line(g, left.x, y-h, right.x, y-h, '#dae2d488', .7);
    line(g, left.x, y-14, right.x, y-14, '#fff6dd', 2.4);
    for (const x of [left.x, right.x]) line(g, x, y+1, x, y-17, '#234a43', 3);
  }
  status();
  a.status('서브 후 화면을 좌우로 끌어 리턴하세요');
  return {
    down(p) { start(); steer(p); }, move: steer, tap(p) { start(); steer(p); },
    step(dt) {
      const move = (x, target, speed) => x + clamp(target-x, -speed*dt, speed*dt);
      players[0] = move(players[0], destination, 3.2);
      if (!active) return;
      if (!flight) {
        wait -= dt;
        if (wait <= 0) {
          rallies = 0;
          const n = score[0] + score[1];
          const server = n < 12 ? Math.floor((n + 1) / 2) % 2 : (n + 1) % 2;
          send(server, (n % 2 ? -.7 : .7));
          a.status('공의 그림자가 닿는 쪽으로 이동하세요');
        }
        return;
      }
      const f = flight;
      const prev = f.age / f.duration;
      f.age += dt;
      const t = f.age / f.duration;
      if (receiver === 1 && t > .23)
        players[1] = move(players[1], f.to + .13 * Math.sin(a.time*3), 1.32);
      if (prev < .71 && t >= .71) {
        if (typeof cardAudio !== 'undefined') cardAudio.cue('bounce');
        bounce = sample(.71);
        bounceAt = a.time;
      }
      if (t < 1) return;
      const offset = f.to - players[receiver];
      if (Math.abs(offset) > .255) return point(f.from);
      const target = receiver ? .93 * Math.sin(rallies * 2.26 + score[0] * .9) :
        clamp(offset * 4.4 - players[0] * .42, -.98, .98);
      send(receiver, target, receiver === 0 && lob);
    },
    draw(g) {
      g.fillStyle = '#a76442'; g.fillRect(0, 0, 600, 360);
      material(g, 'sport-court', 1);
      for (const x of [-1.13, -1, 1, 1.13]) courtLine(g, x, 0, x, 1, '#fdf1d9', 1.8);
      for (const z of [0, 1]) courtLine(g, -1.13, z, 1.13, z, '#fff4df', 2);
      for (const z of [.22, .78]) courtLine(g, -1, z, 1, z, '#fff4df', 1.6);
      courtLine(g, 0, .22, 0, .78, '#fff4df', 1.5);
      player(g, 1);
      let pos, floor, depth;
      if (flight) {
        const f = flight, t = Math.min(1, f.age / f.duration);
        depth = f.z + (f.from ? -1 : 1) * t;
        floor = court(f.x + (f.to - f.x) * t, depth);
        pos = sample(t);
        oval(g, floor.x+2, floor.y+1, 7*floor.scale, 2.5*floor.scale, '#36232077');
      }
      const age = a.time - bounceAt;
      if (age < .25) oval(g, bounce.x, bounce.y, 7+age*24, 2, '#fce0a9aa');
      const paintBall = () => disc(g, ball(pos.x, pos.y, 4.3+2*pos.scale, '#eaf644'));
      if (pos && depth > .5) paintBall();
      net(g);
      player(g, 0);
      if (pos && depth <= .5) paintBall();
      if (!flight && active && !a.over()) a.tag(g, lastPoint || '서브', 300, 64, 18);
    },
  };
}

const basesXY = [[300, 294], [464, 200], [300, 152], [135, 200]];
export function baseballField(g, a, bases, pitch, contactAt, play, batting) {
  g.fillStyle = '#52805b'; g.fillRect(0, 0, 600, 360);
  material(g, 'sport-park', 1);
  const home = basesXY[0], mound = [300, 209];
  const elapsed = a.time - contactAt;
  for (const [x,y] of [[192,170],[400,172],[286,118],[118,134],[486,138]])
    figure(g, x, y, .53, 1-batting);
  figure(g, mound[0], mound[1], .73, 1-batting, pitch >= 0 ? -.9 + Math.min(pitch*6,1)*2 : 0);
  const progress = play ? clamp((a.time-play.start)/play.duration,0,1) : 0;
  if (play && progress < 1) {
    play.runners.forEach((on, i) => {
      if (!on) return;
      const distance = Math.min(4-i, play.steps);
      const travel = Math.min(distance, progress * play.steps);
      if (i + travel >= 4) return;
      const j = Math.floor(i + travel), k = i + travel - j;
      const p = basesXY[j], q = basesXY[(j+1)%4];
      figure(g, p[0]+(q[0]-p[0])*k, p[1]+(q[1]-p[1])*k, .72, batting);
    });
  } else bases.forEach((on,i) => { if(on) figure(g, ...basesXY[i+1], .72, batting); });
  const near = pitch >= 0 ? clamp(1-Math.abs(pitch-1)/.23,0,1) : 0;
  oval(g, home[0],home[1],17+4*near,5,near>.4?'#ffe38fc9':'#ffefcb66');
  figure(g, home[0]-21, home[1]+2, 1.05, batting, -1.42 + 2.85 * (elapsed < .34 ? Math.sin(Math.PI*elapsed/.34) : 0), 'bat');
  let x,y,height,size;
  if (play && progress < 1) {
    x = home[0] + (play.x-home[0])*progress;
    y = home[1] + (play.y-home[1])*progress;
    height = Math.sin(progress*Math.PI) * (27+play.steps*13);
    size = 6-2*progress;
  } else if (pitch >= 0) {
    x = 306-6*pitch;
    y = mound[1] + (home[1]-mound[1])*pitch;
    height = 16*(1-Math.min(pitch,1)) + 10*Math.sin(Math.min(1,pitch)*Math.PI) + 8;
    size = 4+2.9*pitch;
  } else return;
  oval(g,x+2,y+1,size+1,2.5,'#192f2f77');
  if (!miniature(g,'baseball',x,y-height,size*2.4,size*2.4)) disc(g,ball(x,y-height,size,'#f9eac9'));
}
