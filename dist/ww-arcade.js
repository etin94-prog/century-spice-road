import { range, random } from './ww-core.js';
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
  cream = '#f4e1ba';
for (const id of [36, 37, 41])
  sport(
    id,
    id === 36
      ? '코트 왼쪽을 터치하거나 끌어서 라켓을 움직이세요. 공을 받아 상대 라켓 너머로 보내세요. 7점 이상에서 두 점 앞서면 타이브레이크 승리입니다.'
      : id === 37
        ? '터치한 높이로 내 선수 줄을 옮기세요. 공을 밀어 상대 골대에 5골을 먼저 넣으면 승리합니다.'
        : '왼쪽 절반에서 손가락으로 말렛을 움직여 퍽을 칩니다. 상대 골대에 5골을 먼저 넣으세요.',
    (a) => {
      const hockey = id === 41,
        football = id === 37,
        score = [0, 0],
        b = ball(300, 180, football ? 8 : 7, hockey ? '#223b49' : cream);
      const me = { x: 65, y: 180 },
        ai = { x: 535, y: 180 };
      let started = false,
        pause = 0;
      a.aim = { ...me };
      a.status('터치해서 시작하세요');
      function info() {
        a.score('나 ' + score[0] + '　·　상대 ' + score[1]);
      }
      function serve(side) {
        Object.assign(b, { x: 300, y: 180, vx: side * 205, vy: random(140) - 70 });
        pause = 0.55;
        info();
      }
      function start() {
        if (!started) {
          started = true;
          serve(-1);
          a.status('화면을 눌러 위치를 바꾸세요');
        }
      }
      a.button('서브 · 시작', start);
      info();
      function goal(p) {
        score[p]++;
        info();
        if (score[p] >= (id === 36 ? 7 : 5) && (id !== 36 || score[p] - score[1 - p] >= 2)) {
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
          if (b.y < b.r || b.y > 360 - b.r) {
            b.y = clamp(b.y, b.r, 360 - b.r);
            b.vy *= -1;
          }
          for (const p of [0, 1])
            for (const o of players(p)) {
              const direction = p ? -1 : 1,
                dy = b.y - o.y,
                dx = b.x - o.x;
              const hits =
                id === 36
                  ? Math.abs(dx) < 13 && Math.abs(dy) < 37
                  : Math.hypot(dx, dy) < (hockey ? 26 : 21);
              if (hits && b.vx * direction < 0) {
                b.x = o.x + direction * (id === 36 ? 13 : 24);
                b.vx = direction * clamp(Math.abs(b.vx) * 1.08 + 12, 200, 460);
                b.vy = clamp(dy * (id === 36 ? 6 : 13), -240, 240);
              }
            }
          if (b.x < 0 || b.x > 600) {
            if (id === 36 || Math.abs(b.y - 180) < 62) goal(b.x < 0 ? 1 : 0);
            else {
              b.vx *= -1;
              b.x = clamp(b.x, 1, 599);
            }
          }
        },
        draw(g) {
          surface(
            g,
            ...(hockey
              ? ['#ccdfe2', '#8cb3c2']
              : football
                ? ['#4b9265', '#256348']
                : ['#3b877b', '#205b63']),
          );
          if (football)
            for (const i of range(6)) {
              g.fillStyle = '#ffffff0b';
              g.fillRect(i * 100, 0, 50, 360);
            }
          g.strokeStyle = hockey ? '#60899b' : '#e7e4c9aa';
          g.lineWidth = 2;
          g.strokeRect(10, 10, 580, 340);
          line(g, 300, 10, 300, 350, g.strokeStyle, 3);
          if (football || hockey) {
            circle(g, 300, 180, 48, g.strokeStyle, true);
            for (const x of [0, 556]) g.strokeRect(x, 112, 44, 136);
          } else {
            g.strokeRect(95, 53, 410, 254);
            line(g, 95, 180, 505, 180, '#e7e4c9aa');
          }
          for (const p of [0, 1])
            for (const o of players(p)) {
              if (id === 36) {
                g.fillStyle = p ? red : cream;
                g.beginPath();
                g.roundRect(o.x - 5, o.y - 32, 10, 64, 5);
                g.fill();
              } else {
                disc(g, ball(o.x, o.y, hockey ? 20 : 14, p ? red : blue));
                circle(g, o.x, o.y, hockey ? 9 : 5, p ? '#784b45' : '#246372');
              }
            }
          disc(g, b);
        },
      };
    },
  );
sport(
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
    const info = () =>
      a.score('나 ' + Math.max(0, hp[0]) + ' HP · 상대 ' + Math.max(0, hp[1]) + ' HP');
    function start() {
      if (!begun) {
        begun = true;
        ready = a.time + 0.7;
      }
    }
    function punch(n) {
      start();
      if (a.time - last < 0.43) return;
      last = a.time;
      mySwing = a.time + 0.25;
      if (n !== aiGuard) {
        hp[1] -= 2;
        a.status(gloves[n] + ' 적중');
      } else a.status('상대 가드');
      aiGuard = n;
      info();
      if (hp[1] <= 0) {
        done = true;
        a.finish('나 · KO 승리');
      }
    }
    for (const [n, name] of gloves.entries()) a.button(name + ' 펀치', () => punch(n));
    a.button('가드 높이 전환', () => {
      start();
      guard = 1 - guard;
      a.status(gloves[guard] + ' 가드');
    });
    info();
    a.status('펀치를 눌러 시작하세요');
    return {
      step() {
        if (!begun || done) return;
        if (!strike && a.time > ready) {
          tell = random(2);
          strike = a.time + 0.65;
          a.status('상대 ' + gloves[tell] + ' 펀치 준비');
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
          if (hp[0] <= 0) {
            done = true;
            a.finish('상대 · KO 승리');
          }
        }
      },
      draw(g) {
        surface(g, '#3f4858', '#252e40');
        g.fillStyle = '#798aa2';
        g.fillRect(25, 155, 550, 150);
        for (const y of [125, 166, 205]) line(g, 25, y, 575, y, y === 125 ? red : cream, 4);
        for (const p of [0, 1]) {
          const s = p ? -1 : 1,
            x = p ? 372 : 228,
            y = 223,
            c = p ? red : blue,
            reach = (p ? aiSwing : mySwing) > a.time ? 76 : 0,
            high = p ? (strike ? tell : aiGuard) : guard;
          g.fillStyle = '#26343c';
          g.fillRect(x - 23, y + 17, 16, 33);
          g.fillRect(x + 7, y + 17, 16, 33);
          disc(g, ball(x, y - 50, 22, '#c79870'));
          disc(g, ball(x, y, 34, c));
          disc(g, ball(x + s * (30 + reach), y - (high ? 5 : 35), 18, c));
          disc(g, ball(x - s * 18, y - 28, 15, c));
        }
        if (strike) label(g, gloves[tell], 375, 105, 18);
      },
    };
  },
);
sport(
  40,
  '3이닝 동안 공격과 수비를 번갈아 합니다. 공격에서는 공이 타석의 띠에 닿을 때 스윙하세요. 수비에서는 완급을 골라 던집니다. 3스트라이크는 아웃이고 3아웃이면 공수가 교대됩니다.',
  (a) => {
    let pitch = -1,
      outs = 0,
      strikes = 0,
      inning = 1,
      batting = 0,
      bases = [0, 0, 0],
      speed = 1,
      note = '투구를 불러 타석에 서세요',
      cpuSwing = 1;
    const runs = [0, 0],
      target = 465;
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
    }
    function start(fast = false) {
      if (pitch >= 0) return;
      pitch = 0;
      speed = batting ? (fast ? 1.45 : 0.78) : 0.75 + Math.random() * 0.55;
      cpuSwing = (target - 85) / 355 + (Math.random() - 0.5) * (fast ? 0.58 : 0.45);
      note = batting ? '상대 타석' : '공을 보고 스윙하세요';
      info();
    }
    function swing() {
      if (pitch < 0) {
        if (!batting) start();
        return;
      }
      const accuracy = Math.abs(85 + pitch * 355 - target);
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
        bases = [0, 0, 0];
        runners.forEach((v, i) => {
          if (!v) return;
          if (i + steps >= 4) runs[batting]++;
          else bases[i + steps - 1] = 1;
        });
      }
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
    a.button('투구 / 직구', () => start(true));
    a.button('느린 공', () => {
      if (batting) start(false);
    });
    a.button('스윙', () => {
      if (!batting) swing();
    });
    info();
    return {
      tap: () => {
        if (batting) {
          if (pitch < 0) start();
        } else swing();
      },
      step(dt) {
        if (pitch >= 0) {
          pitch += dt * speed;
          if ((batting && pitch >= cpuSwing) || pitch > 1.48) swing();
        }
      },
      draw(g) {
        surface(g, '#326b55', '#1e453c');
        g.save();
        g.translate(300, 250);
        g.rotate(-Math.PI / 4);
        g.fillStyle = '#bd9471';
        g.fillRect(0, 0, 125, 125);
        g.fillStyle = '#608766';
        g.fillRect(12, 12, 101, 101);
        g.restore();
        for (const [i, pt] of [
          [0, [389, 162]],
          [1, [300, 73]],
          [2, [211, 162]],
        ])
          disc(g, ball(...pt, 8, bases[i] ? red : cream));
        line(g, 75, 290, 535, 290, '#d2dfcaaa', 2);
        g.fillStyle = '#e5ce8466';
        g.fillRect(target - 18, 265, 36, 50);
        if (pitch >= 0)
          disc(g, ball(85 + pitch * 355, 290 - 20 * Math.sin(pitch * Math.PI), 9, cream));
      },
    };
  },
);
sport(
  42,
  '가속 버튼을 눌러 속도를 올리고 다시 눌러 감속합니다. 커브에서 너무 빠르면 미끄러져 시간을 잃습니다. 세 바퀴를 먼저 완주하세요.',
  (a) => {
    let go = false,
      fast = false,
      s = 0,
      cpu = 0,
      v = 0.03,
      skid = 0;
    function toggle() {
      fast = !fast;
      go = true;
      a.status(fast ? '가속 중 · 커브 전에 감속' : '감속 중');
    }
    a.button('가속 / 감속', toggle);
    a.status('가속을 눌러 출발');
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
            a.status('미끄러짐 · 다시 가속하세요');
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
        [s, cpu].forEach((n, i) => {
          const angle = n * Math.PI * 2;
          g.save();
          g.translate(
            300 + (225 + i * 18) * Math.cos(angle),
            180 + (100 + i * 15) * Math.sin(angle),
          );
          g.rotate(Math.atan2(100 * Math.cos(angle), -225 * Math.sin(angle)));
          g.fillStyle = i ? red : cream;
          g.fillRect(-12, -7, 24, 14);
          g.fillStyle = '#263b43';
          g.fillRect(-3, -5, 8, 10);
          g.restore();
        });
        label(g, '3 LAPS', 300, 188, 25);
      },
    };
  },
);
sport(
  43,
  '수면을 터치해 찌를 던지세요. 물고기가 다가와 찌가 잠기면 챔질하세요. 여덟 번의 캐스팅 동안 잡은 물고기의 무게를 합산합니다.',
  (a) => {
    let phase = 'idle',
      count = 0,
      weight = 0,
      at = { x: 320, y: 180 },
      bite = 0,
      note = '수면을 터치해 던지세요';
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
        note = ok ? fish + 'g 낚았습니다' : '물고기가 달아났습니다';
        phase = 'idle';
        if (count === 8) a.finish('낚시 종료 · 총 ' + (weight / 1000).toFixed(2) + 'kg');
      }
      a.status(note);
      a.score(count + ' / 8회　' + (weight / 1000).toFixed(2) + 'kg');
    }
    a.button('던지기 / 챔질', () => cast(a.aim));
    a.status(note);
    return {
      tap: cast,
      step() {
        if (phase === 'wait' && a.time >= bite) {
          phase = 'bite';
          a.status('지금 챔질!');
        }
        if (phase === 'bite' && a.time > bite + 0.92) {
          phase = 'wait';
          cast(at);
        }
      },
      draw(g) {
        surface(g, '#4b9796', '#214c60');
        for (const i of range(22)) {
          const x = ((i * 83 + a.time * 8) % 660) - 30,
            y = 30 + ((i * 53) % 300);
          line(g, x, y, x + 20, y, '#c3e7d32e');
        }
        if (phase !== 'idle') {
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.ellipse(
              at.x,
              at.y,
              9 + i * 10 + Math.sin(a.time * 4) * 2,
              4 + i * 4,
              0,
              0,
              2 * Math.PI,
            );
            g.strokeStyle = '#cae8d966';
            g.stroke();
          }
          if (phase === 'wait') {
            line(g, at.x, at.y, at.x, at.y - 18, cream, 4);
            circle(g, at.x, at.y - 17, 4, red);
          }
        } else {
          g.fillStyle = '#36545c88';
          for (const i of [1, 2, 3]) {
            g.beginPath();
            g.ellipse((i * 115 + a.time * 12) % 580, 70 + i * 60, 19, 6, -0.3, 0, Math.PI * 2);
            g.fill();
          }
        }
      },
    };
  },
);
for (const [id, team] of [
  [44, false],
  [45, true],
])
  sport(
    id,
    '미니어처 전차를 움직여 상대 팀에 페인트를 맞히세요. 빈 곳을 누르면 이동하고 상대 말을 누르면 그쪽으로 발사합니다. 먼저 ' +
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
        blocks = [
          { x: 220, y: 110, r: 32 },
          { x: 390, y: 250, r: 35 },
        ];
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
      function tap(pt) {
        ready = true;
        if (units.some((u) => u.p && dist(u, pt) < 45)) {
          if (a.time - last > 0.36) {
            fire(me, pt);
            last = a.time;
          }
        } else target = pt;
      }
      a.button('가장 가까운 상대에 발사', () => {
        ready = true;
        if (a.time - last > 0.36) {
          const e = units.filter((u) => u.p).sort((a, b) => dist(a, me) - dist(b, me))[0];
          fire(me, e);
          last = a.time;
        }
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
          blocks.forEach((t) => disc(g, ball(t.x, t.y, t.r, '#778779')));
          for (const u of units) {
            g.save();
            g.translate(u.x, u.y);
            g.rotate(u.angle);
            g.fillStyle = '#454d4a';
            g.fillRect(-17, -14, 34, 28);
            g.fillStyle = u.p ? red : blue;
            g.fillRect(-15, -10, 30, 20);
            line(g, 0, 0, 23, 0, cream, 5);
            circle(g, 0, 0, 7, u.p ? '#974e47' : '#316770');
            g.restore();
          }
          shots.forEach((b) => disc(g, b));
        },
      };
    },
  );
sport(
  46,
  '움직이는 표적을 직접 터치하세요. 중앙을 맞힐수록 높은 점수를 얻습니다. 스무 번 쏜 뒤 총점을 확인합니다.',
  (a) => {
    let n = 0,
      points = 0,
      hit = null;
    function targets() {
      return range(5).map((i) => ({
        x: 55 + ((i * 135 + a.time * (20 + i * 5)) % 500),
        y: 70 + (i % 3) * 87 + Math.sin(i + a.time) * 17,
      }));
    }
    function fire(pt) {
      n++;
      const d = Math.min(...targets().map((t) => dist(t, pt)));
      points += d < 9 ? 5 : d < 20 ? 3 : d < 30 ? 1 : 0;
      hit = { ...pt, t: a.time };
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
        for (const t of targets()) {
          line(g, t.x, t.y + 15, t.x, 335, '#aa8a64', 5);
          for (const [r, c] of [
            [30, cream],
            [22, red],
            [15, cream],
            [8, red],
          ])
            circle(g, t.x, t.y, r, c);
        }
        if (hit && a.time - hit.t < 0.4)
          circle(g, hit.x, hit.y, 10 + 30 * (a.time - hit.t), '#fff', true);
      },
    };
  },
);
