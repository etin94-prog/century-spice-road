import { register, range, random, seats } from './ww-core.js';
register(
  13,
  '6을 굴려 말을 출발시킵니다. 상대 말을 잡으면 시작점으로 돌려보냅니다. 정확한 눈으로 네 말을 모두 완주시키세요. 6이 나오면 한 번 더 굴립니다.',
  (ui) => {
    const pos = [Array(4).fill(-1), Array(4).fill(-1)],
      safe = [0, 8, 13, 21, 26, 34, 39, 47];
    const ring = (p, n) => (n + p * 26) % 52;
    let die = 0;
    return () => {
      const p = ui.turn;
      ui.score(
        '완주　나 ' +
          pos[0].filter((n) => n === 57).length +
          ' · 상대 ' +
          pos[1].filter((n) => n === 57).length,
      );
      const track = ui.grid(15, 'ludo-board'),
        cells = range(225).map(() => ({ cls: 'blank', text: '' }));
      const quadrant = (x, y, c) => {
        for (let dy = 0; dy < 6; dy++)
          for (let dx = 0; dx < 6; dx++) cells[(y + dy) * 15 + x + dx].cls = c;
      };
      quadrant(0, 0, 'jade');
      quadrant(9, 0, 'gold');
      quadrant(0, 9, 'blue');
      quadrant(9, 9, 'coral');
      const quarter = [
        [1, 6],
        [2, 6],
        [3, 6],
        [4, 6],
        [5, 6],
        [6, 5],
        [6, 4],
        [6, 3],
        [6, 2],
        [6, 1],
        [6, 0],
        [7, 0],
        [8, 0],
      ];
      function rotate(x, y, n) {
        for (let i = 0; i < n; i++) [x, y] = [14 - y, x];
        return y * 15 + x;
      }
      const route = range(4).flatMap((i) => quarter.map(([x, y]) => rotate(x, y, i)));
      route.forEach((i, k) => (cells[i] = { cls: 'road', text: safe.includes(k) ? '◇' : '' }));
      [0, 1].forEach((s) => {
        const offset = s ? 2 : 0;
        for (let j = 1; j < 7; j++)
          cells[rotate(j, 7, offset)] = { cls: s ? 'coral' : 'jade', text: '' };
        pos[s].forEach((n, i) => {
          const idx =
            n < 0
              ? rotate(2 + (i % 2) * 2, 2 + Math.floor(i / 2) * 2, offset)
              : n < 52
                ? route[ring(s, n)]
                : rotate(1 + n - 52, 7, offset);
          const c = cells[idx];
          if (!c.pieces) c.pieces = [];
          c.pieces.push(s ? '○' : '●');
        });
      });
      cells.forEach((c) =>
        ui.button(track, c.pieces ? c.pieces.join('') : c.text, null, 'ludo-cell ' + c.cls),
      );
      if (!die) {
        ui.button(
          ui.row(),
          '주사위 굴리기',
          () => {
            die = 1 + random(6);
            ui.paint();
          },
          'primary',
        );
        return;
      }
      ui.status(seats[p] + ' · 주사위 ' + die);
      const row = ui.row();
      let count = 0;
      pos[p].forEach((n, i) => {
        const dest = n < 0 ? (die === 6 ? 0 : -1) : n + die;
        const legal = dest >= 0 && dest <= 57;
        count += legal ? 1 : 0;
        ui.button(
          row,
          i + 1 + '번 · ' + (n < 0 ? '대기' : n === 57 ? '완주' : n + '칸'),
          legal
            ? () => {
                const d = die;
                die = 0;
                pos[p][i] = dest;
                if (dest < 52 && !safe.includes(ring(p, dest)))
                  pos[1 - p] = pos[1 - p].map((o) =>
                    o >= 0 && o < 52 && ring(1 - p, o) === ring(p, dest) ? -1 : o,
                  );
                ui.paint(d === 6 ? p : 1 - p);
                if (pos[p].every((v) => v === 57)) ui.victor(p);
              }
            : null,
          '',
          dest === 57 ? 100 : n < 0 ? 60 : dest,
        );
      });
      if (!count)
        ui.button(row, '차례 넘기기', () => {
          die = 0;
          ui.paint(1 - p);
        });
    };
  },
);
register(
  14,
  '주사위 눈으로 말을 옮기고, 상대 말 하나만 있는 지점에 착지하면 잡습니다. 잡힌 말을 먼저 복귀시켜야 합니다. 말 열다섯 개를 모두 홈에서 빼면 승리합니다.',
  (ui) => {
    const start = Array(24).fill(0);
    for (const [i, n] of [
      [23, 2],
      [12, 5],
      [7, 3],
      [5, 5],
    ]) {
      start[i] = n;
      start[23 - i] = -n;
    }
    let points = start,
      bar = [0, 0],
      off = [0, 0],
      dice = [],
      opening = true;
    function advances(b, captured, p, d) {
      const s = p ? -1 : 1,
        options = [],
        home = (i) => (p ? 23 - i : i);
      const allHome = !captured[p] && b.every((v, j) => v * s <= 0 || home(j) < 6);
      for (const from of captured[p] ? [p ? -1 : 24] : range(24).filter((i) => b[i] * s > 0)) {
        const to = from - s * d;
        if (to >= 0 && to < 24) {
          if (b[to] * s >= -1) options.push({ from, to, d });
        } else if (
          allHome &&
          (home(from) + 1 === d || !b.some((v, j) => v * s > 0 && home(j) > home(from)))
        )
          options.push({ from, to: p ? 24 : -1, d });
      }
      return options;
    }
    function apply(b, c, o, p, m) {
      const s = p ? -1 : 1;
      if (m.from < 0 || m.from > 23) c[p]--;
      else b[m.from] -= s;
      if (m.to < 0 || m.to > 23) o[p]++;
      else {
        if (b[m.to] === -s) {
          b[m.to] = 0;
          c[1 - p]++;
        }
        b[m.to] += s;
      }
    }
    // Keep only moves that allow the maximum usable dice, including the higher-die rule.
    function sequences(b, c, p, ds) {
      if (!ds.length) return [[]];
      const all = [];
      for (const d of new Set(ds))
        for (const m of advances(b, c, p, d)) {
          const a = b.slice(),
            k = c.slice(),
            rest = ds.slice();
          rest.splice(rest.indexOf(d), 1);
          apply(a, k, [0, 0], p, m);
          for (const path of sequences(a, k, p, rest)) all.push([m, ...path]);
        }
      if (!all.length) return [[]];
      const len = Math.max(...all.map((v) => v.length));
      return all.filter((v) => v.length === len);
    }
    return () => {
      const p = ui.turn;
      ui.score('완주 ' + off.join(' : ') + '　바 ' + bar.join(' : '));
      const grid = ui.grid(12, 'backgammon');
      [...range(12).map((n) => 12 + n), ...range(12).reverse()].forEach((i) => {
        const el = ui.button(grid, '', null, 'point');
        el.dataset.place = i + 1;
        const n = Math.abs(points[i]);
        for (let k = 0; k < Math.min(5, n); k++) {
          const chip = document.createElement('i');
          chip.className = points[i] > 0 ? 'light-chip' : 'dark-chip';
          if (k === 4 && n > 5) chip.textContent = n;
          el.append(chip);
        }
      });
      if (!dice.length) {
        ui.button(
          ui.row(),
          '주사위 굴리기',
          () => {
            let a = 1 + random(6),
              b = 1 + random(6);
            if (opening) {
              while (a === b) b = 1 + random(6);
              opening = false;
              dice = [a, b];
              ui.paint(a > b ? 0 : 1);
            } else {
              dice = a === b ? [a, a, a, a] : [a, b];
              ui.paint();
            }
          },
          'primary',
        );
        return;
      }
      ui.status(seats[p] + ' · 남은 눈 ' + dice.join(' · '));
      const row = ui.row();
      const paths = sequences(points, bar, p, dice);
      let moves = paths.map((path) => path[0]).filter(Boolean);
      if (paths[0].length === 1 && moves.length) {
        const high = Math.max(...moves.map((m) => m.d));
        moves = moves.filter((m) => m.d === high);
      }
      const seen = new Set();
      for (const m of moves) {
        const key = m.from + ',' + m.d;
        if (seen.has(key)) continue;
        seen.add(key);
        ui.button(
          row,
          (m.from < 0 || m.from > 23 ? '바' : m.from + 1) +
            ' → ' +
            (m.to < 0 || m.to > 23 ? '완주' : m.to + 1),
          () => {
            apply(points, bar, off, p, m);
            dice.splice(dice.indexOf(m.d), 1);
            ui.paint(dice.length ? p : 1 - p);
            if (off[p] === 15) ui.victor(p);
          },
          '',
          m.to < 0 || m.to > 23 ? 8 : Math.abs(points[m.to]) === 1 ? 3 : 0,
        );
      }
      if (!moves.length)
        ui.button(row, '차례 넘기기', () => {
          dice = [];
          ui.paint(1 - p);
        });
    };
  },
);
