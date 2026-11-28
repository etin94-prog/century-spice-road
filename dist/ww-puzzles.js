import { decorateTile } from './ww-tile-art.js';
import {
  register,
  range,
  random,
  shuffle,
  deck,
  rank,
  suit,
  suits,
  face,
  cardStyle,
  neighbors,
  orth,
} from './ww-core.js';
register(
  47,
  '세 구슬의 색을 회전하고 떨어뜨릴 열을 고르세요. 같은 색 여섯 개를 연결하면 사라집니다. 직선·삼각형·고리를 완성하면 상대 필드에 구슬을 보냅니다. 먼저 넘치는 쪽이 패배합니다.',
  (ui) => {
    const w = 7,
      h = 10,
      fields = range(2).map(() => Array(w * h).fill(-1));
    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, -1],
        [-1, 1],
      ],
      symbols = ['●', '◆', '▲', '■'],
      scores = [0, 0];
    let balls = range(3).map(() => random(4)),
      inverted = false;
    function slot(b, x) {
      for (let y = h - 1; y >= 0; y--) if (b[y * w + x] < 0) return y * w + x;
      return -1;
    }
    function shape(group) {
      const set = new Set(group);
      function fits(i, offsets) {
        const x = i % w,
          y = Math.floor(i / w);
        return offsets.every(
          ([dx, dy]) =>
            x + dx >= 0 &&
            x + dx < w &&
            y + dy >= 0 &&
            y + dy < h &&
            set.has((y + dy) * w + x + dx),
        );
      }
      if (
        group.some((i) =>
          fits(i, [
            [0, 0],
            [1, -1],
            [2, -1],
            [2, 0],
            [1, 1],
            [0, 1],
          ]),
        )
      )
        return 6;
      if (
        group.some((i) =>
          fits(i, [
            [0, 0],
            [1, 0],
            [2, 0],
            [0, 1],
            [1, 1],
            [0, 2],
          ]),
        )
      )
        return 4;
      if (
        group.some((i) =>
          dirs.some(([dx, dy]) =>
            fits(
              i,
              range(6).map((k) => [dx * k, dy * k]),
            ),
          ),
        )
      )
        return 3;
      return 0;
    }
    function clear(b) {
      const seen = new Set(),
        remove = [];
      let attack = 0;
      for (let i = 0; i < b.length; i++) {
        if (b[i] < 0 || seen.has(i)) continue;
        const stack = [i];
        seen.add(i);
        for (const j of stack)
          for (const k of neighbors(j, w, h, dirs))
            if (!seen.has(k) && b[k] === b[i]) {
              seen.add(k);
              stack.push(k);
            }
        if (stack.length >= 6) {
          remove.push(...stack);
          attack += shape(stack);
        }
      }
      remove.forEach((i) => (b[i] = -1));
      if (remove.length)
        for (let x = 0; x < w; x++) {
          const col = range(h)
            .map((y) => b[y * w + x])
            .filter((v) => v >= 0);
          for (let y = h - 1; y >= 0; y--) b[y * w + x] = col.pop() ?? -1;
        }
      return [remove.length, attack];
    }
    return () => {
      const p = ui.turn,
        b = fields[p],
        other = fields[1 - p];
      ui.score('제거　나 ' + scores[0] + ' · 상대 ' + scores[1]);
      const mini = ui.grid(w, 'mini-well');
      for (const v of fields[1])
        ui.button(mini, v < 0 ? '' : symbols[v], null, v < 0 ? '' : 'gem' + v);
      const row = ui.row();
      balls.forEach((v) => ui.button(row, symbols[v], null, 'ball gem' + v));
      if (!p) {
        ui.button(row, '색 회전', () => {
          balls.unshift(balls.pop());
          ui.paint();
        });
        ui.button(row, '좌우 전환', () => {
          inverted = !inverted;
          ui.paint();
        });
      }
      const grid = ui.grid(w, 'board-grid ballwell');
      fields[0].forEach((v) =>
        ui.button(grid, v < 0 ? '·' : symbols[v], null, v < 0 ? 'cell' : 'cell ball gem' + v),
      );
      const aim = ui.grid(w - 1);
      let possible = 0;
      for (const x of range(w - 1)) {
        const left = slot(b, x),
          right = slot(b, x + 1),
          double = inverted ? right : left,
          ok = left >= 0 && right >= 0 && double >= w;
        if (ok) possible++;
        ui.button(
          aim,
          '↓',
          ok
            ? () => {
                b[left] = balls[0];
                b[right] = balls[1];
                b[double - w] = balls[2];
                for (;;) {
                  const [n, atk] = clear(b);
                  if (!n) break;
                  scores[p] += n;
                  for (let k = 0; k < atk; k++) {
                    const j = slot(other, random(w));
                    if (j < 0) {
                      ui.victor(p);
                      return;
                    }
                    other[j] = random(4);
                  }
                }
                balls = range(3).map(() => random(4));
                inverted = !!random(2);
                ui.paint(1 - p);
              }
            : null,
          '',
          Math.min(left, right) / w + (b[left + w] === balls[0] ? 3 : 0),
          x + 1 + '열에 놓기',
        );
      }
      if (!possible) ui.victor(1 - p);
    };
  },
);
register(
  48,
  '빈자리 옆의 타일을 밀어 왼쪽 입구에서 오른쪽 출구까지 이어지는 물길을 만드세요. 물길이 이어지면 배가 도착합니다.',
  (ui) => {
    const pipes = ['━', '┃', '┏', '┓', '┗', '┛'],
      dirs = [
        [1, 3],
        [0, 2],
        [1, 2],
        [2, 3],
        [0, 1],
        [0, 3],
      ],
      d = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ];
    const w = 4,
      b = [2, 1, 5, 3, 0, 3, 2, 0, 2, 4, 5, 1, 4, 0, 3, -1];
    // Solved channel from left of row 2: east, south, east, north, east.
    b[9] = 4;
    b[10] = 5;
    b[6] = 2;
    let hole = 15,
      steps = 0,
      sailing = 0;
    function path() {
      let i = 4,
        incoming = 3;
      const visit = new Set();
      while (!visit.has(i) && b[i] >= 0 && dirs[b[i]].includes(incoming)) {
        visit.add(i);
        const out = dirs[b[i]].find((v) => v !== incoming);
        if (i === 7 && out === 1) return [...visit];
        const [j] = neighbors(i, w, w, [d[out]]);
        if (j === undefined) break;
        i = j;
        incoming = (out + 2) % 4;
      }
      return null;
    }
    function slide(i) {
      b[hole] = b[i];
      b[i] = -1;
      hole = i;
    }
    do {
      for (let n = 0; n < 65; n++) {
        const adj = neighbors(hole, w, w, orth);
        slide(adj[random(adj.length)]);
      }
    } while (path());
    return () => {
      ui.score(steps + '수 · 둘째 줄 왼쪽 → 오른쪽');
      const grid = ui.grid(4, 'pipe-board'),
        route = path();
      for (const i of range(16)) {
        const legal = !route && neighbors(hole, w, w, orth).includes(i);
        ui.button(
          grid,
          route?.[sailing] === i ? '⛵' : b[i] < 0 ? '' : pipes[b[i]],
          legal
            ? () => {
                slide(i);
                steps++;
                ui.paint();
              }
            : null,
          'pipe waterway-' + b[i] + (route?.includes(i) ? ' selected' : '') +
            (route?.[sailing] === i ? ' sailing' : ''),
          0,
          b[i] < 0 ? '빈칸' : ['가로', '세로', '오른쪽 아래', '왼쪽 아래', '오른쪽 위', '왼쪽 위'][b[i]] + ' 물길',
        );
      }
      if (route) {
        ui.status('물길을 따라 항해 중');
        if (sailing === route.length - 1) ui.finish('물길 완성 · ' + steps + '수');
        else
          ui.later(
            () => {
              sailing++;
              ui.paint();
            },
            matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 185,
          );
      }
    };
  },
);
register(
  49,
  '위에 다른 패가 없고 왼쪽이나 오른쪽 한쪽이 열린 같은 패 두 개를 제거하세요. 모든 패를 제거하면 성공합니다.',
  (ui) => {
    const tiles = [];
    for (const [z, w, h] of [
      [0, 8, 4],
      [1, 6, 2],
    ])
      for (const y of range(h))
        for (const x of range(w)) tiles.push({ x: x + z, y: y + z, z, live: true });
    function free(t) {
      const touch = (x, y, z) => tiles.some((v) => v.live && v.x === x && v.y === y && v.z === z);
      return (
        t.live &&
        !touch(t.x, t.y, t.z + 1) &&
        (!touch(t.x - 1, t.y, t.z) || !touch(t.x + 1, t.y, t.z))
      );
    }
    // Deal identical pairs in a legal removal order so every initial layout is solvable.
    const faces = shuffle(range(tiles.length / 2));
    while (faces.length) {
      const options = shuffle(tiles.filter(free)),
        a = options[0],
        b = options.find((t) => t.z === a.z && t.y === a.y && t !== a),
        f = faces.pop();
      for (const t of [a, b]) {
        t.live = false;
        t.f = f;
      }
    }
    tiles.forEach((t) => (t.live = true));
    let selected = null;
    return () => {
      const left = tiles.filter((t) => t.live);
      ui.score('남은 ' + left.length + '패');
      const grid = ui.grid(8, 'mahjong-stack');
      tiles.forEach((t) => {
        if (!t.live) return;
        const f = t.f,
          label = (f % 9) + 1 + ['萬', '筒', '索'][Math.floor(f / 9)];
        const el = ui.button(
          grid,
          label,
          free(t)
            ? () => {
                if (selected && selected !== t && selected.f === t.f) {
                  selected.live = t.live = false;
                  selected = null;
                } else selected = selected === t ? null : t;
                ui.paint();
              }
            : null,
          'mah-tile layer-' + t.z + (t === selected ? ' selected' : ''),
          0, (t.z ? '윗단 ' : '아랫단 ') + label,
        );
        el.style.gridColumn = t.x + 1;
        el.style.gridRow = t.y + 1;
        decorateTile(el, 'mps'[Math.floor(f / 9)] + (f % 9 + 1));
      });
      if (!left.length) ui.finish('모든 짝을 찾았습니다');
      else {
        const options = left.filter(free);
        if (!options.some((t, i) => options.slice(i + 1).some((v) => v.f === t.f)))
          ui.finish('열린 패에 짝이 없습니다 · 남은 ' + left.length + '패');
      }
    };
  },
);
for (const [id, spider] of [
  [50, false],
  [51, true],
])
  register(
    id,
    spider
      ? '스페이드 한 무늬 104장입니다. 한 칸 낮은 숫자를 이어 놓거나 내림차순 묶음을 빈 열로 옮기세요. K부터 A까지 여덟 묶음을 완성하면 성공합니다. 빈 열이 없을 때 새 줄을 받습니다.'
      : '열의 노출된 카드를 선택한 뒤 색이 다르고 한 단계 높은 카드 위에 쌓습니다. 빈 열에는 K만 놓을 수 있습니다. A부터 무늬별 기초 더미를 완성하세요.',
    (ui) => {
      const stock = spider ? shuffle(range(104).map((i) => i % 13)) : deck(),
        cols = range(spider ? 10 : 7).map((_, i) =>
          stock
            .splice(0, spider ? (i < 4 ? 6 : 5) : i + 1)
            .map((c, j, a) => ({ c, up: j === a.length - 1 })),
        );
      const foundation = [0, 0, 0, 0],
        waste = [];
      let selected = null,
        sets = 0;
      const history = [];
      function remember() {
        history.push(JSON.stringify({ cols, stock, waste, foundation, sets }));
        if (history.length > 48) history.shift();
      }
      function undo() {
        const prior = JSON.parse(history.pop());
        cols.splice(0, cols.length, ...prior.cols);
        stock.splice(0, stock.length, ...prior.stock);
        waste.splice(0, waste.length, ...prior.waste);
        foundation.splice(0, 4, ...prior.foundation);
        sets = prior.sets;
        selected = null;
        ui.paint();
      }
      const value = (o) => rank(o.c);
      const builds = (a, b) =>
        value(a) === value(b) + 1 && (spider || suit(a.c) % 2 !== suit(b.c) % 2);
      function cards() {
        if (!selected) return [];
        return selected.col < 0
          ? [{ c: waste.at(-1), up: true }]
          : cols[selected.col].slice(selected.at);
      }
      function remove() {
        if (selected.col < 0) waste.pop();
        else {
          const col = cols[selected.col];
          col.splice(selected.at);
          if (col.length) col.at(-1).up = true;
        }
        selected = null;
      }
      function sweep() {
        if (!spider) return;
        for (const col of cols) {
          const tail = col.slice(-13);
          if (tail.length === 13 && tail.every((o, i) => o.up && rank(o.c) === 13 - i)) {
            col.splice(-13);
            sets++;
            if (col.length) col.at(-1).up = true;
          }
        }
      }
      return () => {
        const pick = cards(),
          first = pick[0];
        ui.score(
          spider
            ? '완성 ' + sets + ' / 8'
            : '기초 더미 ' + foundation.reduce((a, b) => a + b, 0) + ' / 52',
        );
        const tray = ui.row();
        ui.button(
          tray,
          '더미 ' + stock.length,
          stock.length || (!spider && waste.length)
            ? () => {
                selected = null;
                if (spider) {
                  if (cols.some((c) => !c.length)) {
                    ui.status('빈 열을 먼저 채워 주세요.');
                    return;
                  }
                  remember();
                  cols.forEach((col) => col.push({ c: stock.pop(), up: true }));
                  sweep();
                } else {
                  remember();
                  if (stock.length) waste.push(stock.pop());
                  else stock.push(...waste.splice(0).reverse());
                }
                ui.paint();
              }
            : null,
          'card-back',
        );
        if (!spider) {
          if (waste.length)
            ui.button(
              tray,
              face(waste.at(-1)),
              () => {
                selected = selected?.col === -1 ? null : { col: -1 };
                ui.paint();
              },
              cardStyle(waste.at(-1)) + (selected?.col === -1 ? ' selected' : ''),
            );
          const row = ui.row();
          foundation.forEach((n, s) => {
            const legal =
              first && pick.length === 1 && suit(first.c) === s && rank(first.c) === n + 1;
            ui.button(
              row,
              suits[s] + ' ' + (n || 'A'),
              legal
                ? () => {
                    remember();
                    remove();
                    foundation[s]++;
                    ui.paint();
                  }
                : null,
              'foundation ' + (legal ? 'target' : ''),
            );
          });
        }
        const grid = ui.grid(cols.length, 'solitaire');
        cols.forEach((col, i) => {
          const stack = document.createElement('div');
          stack.className = 'stack';
          grid.append(stack);
          const dest =
            first &&
            selected.col !== i &&
            (col.length ? builds(col.at(-1), first) : spider || rank(first.c) === 13);
          function move() {
            remember();
            const moving = pick.slice();
            remove();
            col.push(...moving);
            sweep();
            ui.paint();
          }
          if (!col.length) ui.button(stack, '＋', dest ? move : null, 'foundation');
          col.forEach((o, j) => {
            const movable = o.up && col.slice(j + 1).every((v, k) => builds(col[j + k], v));
            const el = ui.button(
              stack,
              o.up ? face(o.c) : '◆',
              dest && j === col.length - 1
                ? move
                : movable
                  ? () => {
                      selected =
                        selected?.col === i && selected.at === j ? null : { col: i, at: j };
                      ui.paint();
                    }
                  : null,
              (o.up ? cardStyle(o.c) : 'card-back') +
                (selected?.col === i && j >= selected.at ? ' selected' : '') +
                (dest && j === col.length - 1 ? ' target' : ''),
              0, o.up ? face(o.c) : '뒷면 카드',
            );
            if (o.up && j === col.length - 1) {
              el.classList.add('illustrated','whole-card');
              el.innerHTML = window.card(o.c);
            }
          });
        });
        if (history.length) ui.button(ui.row(), '한 수 되돌리기', undo);
        if (sets === 8 || foundation.every((n) => n === 13)) ui.finish('모든 카드를 정리했습니다');
      };
    },
  );
