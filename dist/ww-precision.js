import { miniature, material } from './ww-scenery.js';
import { range, random } from './ww-core.js';
import {
  sport,
  ball,
  shoot,
  disc,
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
  red = '#d36247';
sport(
  31,
  '코스에서 보낼 방향을 누르면 샷을 합니다. 힘을 조절해 세 홀을 가능한 한 적은 타수로 홀아웃하세요.',
  (a) => {
    const holes = [
        { x: 488, y: 121 },
        { x: 469, y: 235 },
        { x: 500, y: 173 },
      ],
      sand = [
        { x: 320, y: 155, r: 48 },
        { x: 394, y: 240, r: 36 },
      ];
    let hole = 0,
      count = 0,
      moving = false;
    const b = ball(75, 245, 6, cream);
    function score() {
      a.score(hole + 1 + ' / 3홀　' + count + '타');
    }
    score();
    a.status('힘을 정하고 목표 지점을 터치하세요');
    a.force();
    function hit(pt) {
      if (moving) return;
      shoot(b, pt, Math.min(660 * a.power, dist(b, pt) * 2.15));
      count++;
      moving = true;
      score();
    }
    a.button('샷', () => hit(a.aim));
    return {
      tap: hit,
      step(dt) {
        if (!moving) return;
        advance(b, dt, sand.some((s) => dist(b, s) < s.r) ? 0.935 : 0.967);
        bounds(b, 12, 12, 588, 348, 0.45);
        if (dist(b, holes[hole]) < 13 && Math.hypot(b.vx, b.vy) < 155) {
          moving = false;
          if (hole === 2) {
            a.finish('3홀 완료 · 총 ' + count + '타');
            return;
          }
          hole++;
          Object.assign(b, { x: 68, y: hole === 1 ? 74 : 265, vx: 0, vy: 0 });
          score();
        } else if (!b.vx && !b.vy) moving = false;
      },
      draw(g) {
        surface(g, '#285c47', '#15392f');
        g.save();
        g.translate(300, 180);
        g.rotate(-0.15);
        g.scale(1, 0.58);
        circle(g, 0, 0, 266, '#73a668');
        g.clip();
        material(g, 'grass', 0.54, -266, -266, 532, 532);
        g.restore();
        for (const s of sand) {
          g.save();
          g.translate(s.x, s.y);
          g.scale(1, 0.52);
          circle(g, 0, 0, s.r, '#d5b679');
          g.restore();
        }
        const cup = holes[hole];
        circle(g, cup.x, cup.y, 30, '#8bb77a');
        circle(g, cup.x, cup.y, 8, '#15312d');
        line(g, cup.x, cup.y, cup.x, cup.y - 43, cream);
        g.fillStyle = red;
        g.beginPath();
        g.moveTo(cup.x, cup.y - 43);
        g.lineTo(cup.x + 25, cup.y - 36);
        g.lineTo(cup.x, cup.y - 29);
        g.fill();
        disc(g, b);
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
        pockets = (carrom ? [150, 450] : [25, 300, 575]).flatMap((x) =>
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
        rail = false;
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
      function info() {
        a.score(
          carrom
            ? '남은 원반　나 ' +
                pieces.filter((v) => v.live && v.side === 0).length +
                ' · 상대 ' +
                pieces.filter((v) => v.live && v.side === 1).length
            : '남은 공 ' + pieces.filter((v) => v.live).length + '개',
        );
        a.status((turn ? '상대' : '나') + '의 샷');
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
        let keeps = false;
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
                a.finish((side ? '상대' : '나') + ' 승리');
                return;
              }
              restore(pieces.find((v) => v.side === side));
            }
        } else {
          const target = Math.min(...[...pieces.filter((b) => b.live), ...down].map((b) => b.n)),
            foul = scratch || first !== target || (!down.length && !rail);
          freeCue = foul;
          const nine = pieces[8];
          if (down.includes(nine)) {
            if (!foul) {
              a.finish((turn ? '상대' : '나') + ' · 9번 포켓 승리');
              return;
            }
            restore(nine);
          }
          keeps = down.length && !foul;
        }
        if (!keeps) turn = 1 - turn;
        if (carrom || scratch) resetCue();
        info();
        if (turn) a.after(0.65, ai);
      }
      if (carrom) resetCue();
      a.force();
      info();
      const where = carrom
        ? null
        : a.button('흰 공 놓기', () => {
            if (!turn && !moving && freeCue) {
              placing = true;
              a.status('흰 공을 놓을 빈 곳을 누르세요');
            }
          });
      if (where) where.disabled = true;
      const hit = (pt) => {
        if (turn || moving) return;
        if (placing) {
          const pos = { x: clamp(pt.x, 35, 565), y: clamp(pt.y, 35, 325) };
          if (
            pieces.some((v) => v.live && dist(v, pos) < v.r + cue.r + 1) ||
            pockets.some((v) => dist(v, pos) < 20)
          ) {
            a.status('공과 포켓에서 떨어진 자리를 고르세요');
            return;
          }
          Object.assign(cue, pos);
          placing = false;
          info();
          return;
        }
        shot(pt, a.power);
      };
      a.button('샷', () => hit(a.aim));
      return {
        tap: hit,
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
          if (where) where.disabled = moving || turn !== 0 || !freeCue;
          surface(g, '#af8459', '#674a35', true);
          g.fillStyle = carrom ? '#dfa974' : '#25725d';
          g.fillRect(carrom ? 136 : 17, 17, carrom ? 328 : 566, 326);
          material(g, carrom ? 'maple' : 'felt', 0.67, carrom ? 136 : 17, 17, carrom ? 328 : 566, 326);
          if (carrom) {
            circle(g, 300, 180, 62, '#9a553a', true);
            line(g, 173, 67, 427, 67, '#9a553a', 3);
            line(g, 173, 293, 427, 293, '#9a553a', 3);
          }
          pockets.forEach((p) => circle(g, p.x, p.y, 15, '#142a26'));
          for (const b of pieces.filter((v) => v.live)) {
            disc(g, b);
            if (!carrom) label(g, b.n, b.x, b.y + 3, 9, '#181c20');
          }
          if (!scratch) disc(g, cue);
        },
      };
    },
  );
sport(
  33,
  '레인에서 공을 보낼 지점을 누르세요. 프레임마다 두 번 굴리고 스트라이크·스페어에는 다음 투구 점수가 더해집니다. 열 번째 프레임의 보너스 투구까지 진행합니다.',
  (a) => {
    const rolls = [],
      frames = [];
    let n = 1,
      frame = [],
      flight = false,
      b,
      pins;
    function rack() {
      pins = range(10).map((i) => {
        const row = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2),
          col = i - (row * (row + 1)) / 2;
        return ball(455 + row * 20, 180 + (col - row / 2) * 26, 9, cream, { live: true });
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
    a.force();
    function info() {
      a.score(n + ' / 10 프레임　' + total() + '점');
      a.status('핀을 향해 터치하세요');
    }
    info();
    function hit(pt) {
      if (flight || pt.x <= b.x) return;
      flight = true;
      shoot(b, pt, 300 + 500 * a.power);
    }
    a.button('굴리기', () => hit(a.aim));
    function settle() {
      flight = false;
      const knocked = pins.filter((v) => v.live && v.hit);
      knocked.forEach((v) => (v.live = false));
      rolls.push(knocked.length);
      frame.push(knocked.length);
      const sum = frame.reduce((s, t) => s + t, 0),
        done =
          n < 10
            ? frame[0] === 10 || frame.length === 2
            : frame.length === 3 || (frame.length === 2 && sum < 10);
      if (done) {
        frames.push(frame);
        frame = [];
        if (n === 10) {
          a.finish('10프레임 · ' + total() + '점');
          return;
        }
        n++;
        rack();
      } else if (pins.every((v) => !v.live)) rack();
      reset();
      info();
    }
    return {
      tap: hit,
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
        surface(g, '#664831', '#322b2d');
        g.fillStyle = '#d9aa70';
        g.fillRect(12, 52, 576, 256);
        material(g, 'maple', 0.76, 12, 52, 576, 256);
        for (let y = 60; y < 308; y += 13) line(g, 12, y, 588, y, '#995d303d');
        for (let i = 0; i < 7; i++)
          label(g, '▸', 260 + Math.abs(i - 3) * 8, 112 + i * 24, 14, '#805c3f');
        for (const p of pins.filter((v) => v.live)) {
          if (!miniature(g, 'pin', p.x, p.y - 4, 17, 27)) disc(g, p);
        }
        if (!miniature(g, 'bowling-ball', b.x, b.y, b.r * 2, b.r * 2)) disc(g, b);
      },
    };
  },
);
sport(
  34,
  '다트판을 눌러 조준하고 던지기를 누르세요. 흔들림을 감안해 3발씩 던집니다. 301점을 정확히 0으로 만들면 승리하며, 초과하면 그 차례의 점수가 취소됩니다.',
  (a) => {
    const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
      left = [301, 301];
    let p = 0,
      n = 0,
      start = 301,
      last = null;
    a.aim = { x: 300, y: 180 };
    function info() {
      a.score('나 ' + left[0] + ' · 상대 ' + left[1]);
      a.status((p ? '상대' : '나') + ' · ' + (n + 1) + '번째 다트');
    }
    info();
    const wobble = () => ({
      x: a.aim.x + Math.sin(a.time * 3) * 5,
      y: a.aim.y + Math.cos(a.time * 4) * 5,
    });
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
      left[p] -= val;
      n++;
      if (left[p] === 0) {
        a.finish((p ? '상대' : '나') + ' · 301 체크아웃');
        return;
      }
      if (left[p] < 0 || n === 3) {
        if (left[p] < 0) left[p] = start;
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
    a.button('던지기', () => {
      if (!p) toss(wobble());
    });
    return {
      tap: () => {},
      draw(g) {
        surface(g, '#493b3a', '#24282b', true);
        circle(g, 300, 180, 174, '#202c2c');
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
        circle(g, 300, 180, 13, '#397655');
        circle(g, 300, 180, 6, red);
        if (last) disc(g, ball(last.x, last.y, 4, '#34343c'));
        if (!p) {
          const q = wobble();
          circle(g, q.x, q.y, 8, '#efd676', true);
          line(g, q.x - 11, q.y, q.x + 11, q.y, '#fff');
        }
      },
    };
  },
);
sport(
  38,
  '번갈아 스톤 네 개씩 던집니다. 버튼에 가까운 팀의 스톤 중 상대 최선의 스톤보다 안쪽에 있는 개수만큼 득점합니다.',
  (a) => {
    const stones = [],
      target = { x: 465, y: 180 };
    let turn = 0,
      busy = false;
    const team = [red, blue];
    function launch(pt, power) {
      const b = ball(65, 180, 12, team[turn], { p: turn });
      shoot(b, pt, 100 + power * 650);
      stones.push(b);
      busy = true;
    }
    a.force();
    a.status('하우스를 향해 던지세요');
    const hit = (pt) => {
      if (!turn && !busy) launch(pt, a.power);
    };
    a.button('던지기', () => hit(a.aim));
    return {
      tap: hit,
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
          a.score('투구 ' + stones.length + ' / 8');
          if (stones.length === 8) {
            const all = stones
              .filter((b) => dist(b, target) <= 86)
              .sort((x, y) => dist(x, target) - dist(y, target));
            if (!all.length) {
              a.finish('무승부');
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
            );
          } else if (turn)
            a.after(0.5, () =>
              launch({ x: 460, y: 155 + random(50) }, 0.59 + Math.random() * 0.12),
            );
        }
      },
      draw(g) {
        surface(g, '#d3e8e5', '#8fb8c6');
        line(g, 200, 0, 200, 360, red, 3);
        line(g, 0, 180, 600, 180, '#6d9399');
        for (const [r, c] of [
          [78, blue],
          [54, cream],
          [30, red],
          [10, cream],
        ])
          circle(g, target.x, target.y, r, c);
        stones.forEach((b) => {
          if (!miniature(g, b.p ? 'blue-curling' : 'red-curling', b.x, b.y, 26, 26)) disc(g, b);
        });
      },
    };
  },
);
