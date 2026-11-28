import { register, range, neighbors, diag, random, shuffle, seats } from './ww-core.js';
// Source/destination selection is shared by movement games. The AI chooses a complete move.
const lineImages = new Map();
function pathsBehind(grid, cols, rows, edges, key) {
  if (!lineImages.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * 40;
    canvas.height = rows * 40;
    const g = canvas.getContext('2d');
    g.strokeStyle = '#765634';
    g.lineWidth = 2.2;
    g.beginPath();
    for (const [i, j] of edges) {
      g.moveTo(((i % cols) + 0.5) * 40, (Math.floor(i / cols) + 0.5) * 40);
      g.lineTo(((j % cols) + 0.5) * 40, (Math.floor(j / cols) + 0.5) * 40);
    }
    g.stroke();
    lineImages.set(key, 'url(' + canvas.toDataURL() + ')');
  }
  grid.style.backgroundImage = lineImages.get(key) + ', var(--maple)';
  grid.style.backgroundSize = '100% 100%, cover';
}
export function moveBoard(ui, cells, w, moves, chosen, setChosen, apply, style = '', extra) {
  const grid = ui.grid(w, 'board-grid ' + style);
  if (style === 'mill') millLines(grid);
  if (style === 'hound') {
    const edges = [];
    cells.forEach((v, i) => {
      if (v === null) return;
      for (const j of neighbors(i, w, 3, [
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ])) {
        if (
          cells[j] !== null &&
          (i % 5 === j % 5 || Math.floor(i / 5) === Math.floor(j / 5) || (i % 2 && j % 2))
        )
          edges.push([i, j]);
      }
    });
    pathsBehind(grid, 5, 3, edges, 'hound');
  }
  cells.forEach((cell, i) => {
    if (cell === null) {
      ui.button(grid, '', null, 'void');
      return;
    }
    const sources = moves.filter((m) => m.from === i);
    const destinations = moves.filter((m) => m.from === chosen && m.to === i);
    let act,
      weight = 0;
    if (ui.turn && sources.length) {
      const best = sources.reduce((a, b) => ((a.weight || 0) > (b.weight || 0) ? a : b));
      weight = best.weight || 0;
      act = () => apply(best);
    } else if (destinations.length) act = () => apply(destinations[0]);
    else if (sources.length)
      act = () => {
        setChosen(chosen === i ? null : i);
        ui.paint();
      };
    ui.button(
      grid,
      cell || '',
      act,
      'cell ' +
        (chosen === i ? 'selected ' : '') +
        (destinations.length ? 'target ' : '') +
        (extra?.(i) || '') + (style === 'hound' && cell === '♘' ? ' hare' : '') +
        ({ '●': ' black-stone', '○': ' white-stone', '♕': ' white-king', '♛': style === 'checker' ? ' black-king' : '' }[cell] || ''),
      weight,
      '칸 ' + (i + 1) + (cell ? ' ' + cell : ''),
    );
  });
}
register(
  8,
  '대각선으로 한 칸 전진합니다. 뛰어넘을 상대 말이 있으면 반드시 잡고, 연속으로 잡을 수 있으면 계속합니다. 끝줄에 도달하면 킹이 됩니다.',
  (ui) => {
    const b = range(64).map((i) =>
      ((i % 8) + Math.floor(i / 8)) % 2 ? (i < 24 ? -1 : i >= 40 ? 1 : 0) : 0,
    );
    let selected = null,
      chain = null,
      quiet = 0;
    function moves(p, only) {
      let jumps = [],
        steps = [];
      b.forEach((v, i) => {
        if (Math.sign(v) !== p || (only !== null && only !== i)) return;
        for (const d of diag) {
          if (Math.abs(v) === 1 && d[1] !== -p) continue;
          const [j] = neighbors(i, 8, 8, [d]);
          if (j === undefined) continue;
          if (!b[j]) steps.push({ from: i, to: j });
          else if (Math.sign(b[j]) === -p) {
            const [k] = neighbors(j, 8, 8, [d]);
            if (k !== undefined && !b[k]) jumps.push({ from: i, to: k, cap: j, weight: 1 });
          }
        }
      });
      return jumps.length || only !== null ? jumps : steps;
    }
    return () => {
      const p = ui.turn ? -1 : 1,
        opts = moves(p, chain);
      if (!opts.length) {
        ui.victor(1 - ui.turn);
        return;
      }
      moveBoard(
        ui,
        b.map((x) => ({ 1: '●', '-1': '○', 2: '♛', '-2': '♕' })[x] || ''),
        8,
        opts,
        selected,
        (v) => (selected = v),
        (m) => {
          const v = b[m.from];
          b[m.from] = 0;
          b[m.to] = v;
          if (m.cap !== undefined) b[m.cap] = 0;
          const promoted = Math.abs(v) === 1 && (m.to < 8 || m.to >= 56);
          if (promoted) b[m.to] = 2 * p;
          quiet = m.cap !== undefined || Math.abs(v) === 1 ? 0 : quiet + 1;
          selected = chain = null;
          if (!promoted && m.cap !== undefined && moves(p, m.to).length) {
            selected = chain = m.to;
            ui.paint();
          } else {
            ui.paint(1 - ui.turn);
            if (quiet >= 80) ui.victor(-1);
          }
        },
        'checker',
        (i) => (((i % 8) + Math.floor(i / 8)) % 2 ? 'dark' : 'light'),
      );
    };
  },
);
register(
  9,
  '사냥개 세 마리는 뒤로 갈 수 없습니다. 토끼를 가두면 승리하며, 토끼는 모든 개를 앞질러 왼쪽으로 탈출하면 이깁니다. 개가 열 번 연속 옆으로 움직여도 토끼가 이깁니다.',
  (ui) => {
    const nodes = [1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13],
      b = Array(15).fill(0);
    for (const i of [1, 5, 11]) b[i] = 1;
    b[9] = 2;
    let selected = null,
      stalls = 0;
    return () => {
      const p = ui.turn + 1,
        opts = [];
      for (const i of nodes.filter((j) => b[j] === p))
        for (const j of nodes) {
          if (b[j]) continue;
          const dx = (j % 5) - (i % 5),
            dy = Math.floor(j / 5) - Math.floor(i / 5);
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (!dx && !dy) || (p === 1 && dx < 0)) continue;
          if (dx && dy && (i % 2 === 0 || j % 2 === 0)) continue;
          opts.push({ from: i, to: j, weight: p === 2 ? -dx : dx });
        }
      if (!opts.length) {
        ui.victor(1 - ui.turn);
        return;
      }
      moveBoard(
        ui,
        b.map((v, i) => (nodes.includes(i) ? ['', '●', '♘'][v] : null)),
        5,
        opts,
        selected,
        (v) => (selected = v),
        (m) => {
          b[m.to] = p;
          b[m.from] = 0;
          selected = null;
          if (p === 1) stalls = m.from % 5 === m.to % 5 ? stalls + 1 : 0;
          ui.paint(1 - ui.turn);
          if (
            stalls >= 10 ||
            nodes.filter((i) => b[i] === 1).every((i) => i % 5 >= b.indexOf(2) % 5)
          )
            ui.victor(1);
        },
        'hound',
      );
    };
  },
);
function millLines(grid) {
  const edges = [
    [0, 6],
    [6, 48],
    [48, 42],
    [42, 0],
    [8, 12],
    [12, 40],
    [40, 36],
    [36, 8],
    [16, 18],
    [18, 32],
    [32, 30],
    [30, 16],
    [3, 17],
    [21, 23],
    [25, 27],
    [31, 45],
  ];
  pathsBehind(grid, 7, 7, edges, 'mill');
}
register(
  6,
  '아홉 말을 차례로 놓고 인접한 자리로 옮깁니다. 세 개를 한 줄로 만들면 상대 말 하나를 제거합니다. 말이 세 개 남으면 빈자리 어디로든 이동할 수 있습니다.',
  (ui) => {
    const rings = [
      [0, 3, 6, 27, 48, 45, 42, 21],
      [8, 10, 12, 26, 40, 38, 36, 22],
      [16, 17, 18, 25, 32, 31, 30, 23],
    ];
    const lines = rings.flatMap((r) =>
      [0, 2, 4, 6].map((k) => [r[k], r[(k + 1) % 8], r[(k + 2) % 8]]),
    );
    for (const i of [1, 3, 5, 7]) lines.push(rings.map((r) => r[i]));
    const nodes = rings.flat(),
      b = Array(49).fill(0),
      remaining = [9, 9],
      adj = new Map(nodes.map((n) => [n, new Set()]));
    lines.forEach((l) => {
      for (let n = 0; n < 2; n++) {
        adj.get(l[n]).add(l[n + 1]);
        adj.get(l[n + 1]).add(l[n]);
      }
    });
    const mill = (i) => lines.some((l) => l.includes(i) && l.every((j) => b[j] === b[i]));
    let capture = false,
      selected = null,
      quiet = 0;
    return () => {
      const p = ui.turn + 1,
        own = nodes.filter((i) => b[i] === p),
        enemy = nodes.filter((i) => b[i] === 3 - p);
      ui.score('남은 배치　나 ' + remaining[0] + ' · 상대 ' + remaining[1]);
      const free = nodes.filter((i) => !b[i]),
        moves = [];
      if (!remaining[p - 1] && !capture)
        for (const i of own)
          for (const j of free)
            if (own.length === 3 || adj.get(i).has(j)) moves.push({ from: i, to: j });
      if (!capture && !remaining[p - 1] && (own.length < 3 || !moves.length)) {
        ui.victor(2 - p);
        return;
      }
      function place(j, i) {
        if (i !== undefined) b[i] = 0;
        else remaining[p - 1]--;
        b[j] = p;
        selected = null;
        quiet++;
        capture = mill(j) && enemy.length > 0;
        ui.paint(capture ? p - 1 : 2 - p);
        if (quiet >= 100) ui.victor(-1);
      }
      const display = b.map((v, i) => (nodes.includes(i) ? ['·', '●', '○'][v] : null));
      if (!capture && !remaining[p - 1]) {
        moveBoard(
          ui,
          display,
          7,
          moves,
          selected,
          (v) => (selected = v),
          (m) => place(m.to, m.from),
          'mill',
        );
        return;
      }
      ui.status(seats[p - 1] + (capture ? ' · 제거할 상대 말' : ' · 말을 놓으세요'));
      const grid = ui.grid(7, 'board-grid mill'),
        outside = enemy.filter((i) => !mill(i));
      millLines(grid);
      display.forEach((v, i) => {
        const legal = capture ? (outside.length ? outside : enemy).includes(i) : free.includes(i);
        ui.button(
          grid,
          v || '',
          legal
            ? () => {
                if (!capture) {
                  place(i);
                  return;
                }
                b[i] = 0;
                quiet = 0;
                capture = false;
                ui.paint(2 - p);
              }
            : null,
          v === null ? 'void' : 'cell ' + (legal ? 'legal ' : '') +
            (v === '●' ? 'black-stone' : v === '○' ? 'white-stone' : ''),
        );
      });
    };
  },
);
register(
  12,
  '내 구슬 열 개를 반대편 삼각형으로 옮기세요. 옆으로 한 칸 이동하거나 다른 구슬을 연속해서 뛰어넘을 수 있습니다.',
  (ui) => {
    const widths = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1],
      nodes = new Set(),
      b = Array(25 * 17).fill(0),
      goals = [[], []];
    widths.forEach((len, y) => {
      for (const k of range(len)) {
        const i = y * 25 + 13 - len + k * 2;
        nodes.add(i);
        if (y < 4) {
          b[i] = 2;
          goals[0].push(i);
        }
        if (y > 12) {
          b[i] = 1;
          goals[1].push(i);
        }
      }
    });
    const dirs = [
      [2, 0],
      [-2, 0],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    function next(i, dx, dy) {
      const x = (i % 25) + dx,
        y = Math.floor(i / 25) + dy;
      return x >= 0 && x < 25 && nodes.has(y * 25 + x) ? y * 25 + x : -1;
    }
    let selected = null;
    return () => {
      const p = ui.turn + 1,
        moves = [];
      for (const i of nodes) {
        if (b[i] !== p) continue;
        const dest = new Set(),
          stack = [i],
          visited = new Set([i]);
        for (const [dx, dy] of dirs) {
          const j = next(i, dx, dy);
          if (j >= 0 && !b[j]) dest.add(j);
        }
        while (stack.length) {
          const at = stack.pop();
          for (const [dx, dy] of dirs) {
            const j = next(at, dx, dy),
              k = next(at, 2 * dx, 2 * dy);
            if (j >= 0 && b[j] && j !== i && k >= 0 && !b[k] && !visited.has(k)) {
              visited.add(k);
              dest.add(k);
              stack.push(k);
            }
          }
        }
        for (const j of dest)
          moves.push({
            from: i,
            to: j,
            weight:
              (p === 1 ? -1 : 1) * (Math.floor(j / 25) - Math.floor(i / 25)) +
              (!goals[p - 1].includes(i) && goals[p - 1].includes(j) ? 2 : 0),
          });
      }
      moveBoard(
        ui,
        b.map((v, i) => (nodes.has(i) ? ['·', '●', '○'][v] : null)),
        25,
        moves,
        selected,
        (v) => (selected = v),
        (m) => {
          b[m.from] = 0;
          b[m.to] = p;
          selected = null;
          ui.paint(2 - p);
          if (goals[p - 1].every((i) => b[i] === p)) ui.victor(p - 1);
        },
        'star',
      );
    };
  },
);
register(
  11,
  '같은 눈끼리 잇도록 도미노를 줄의 한쪽 끝에 놓습니다. 놓을 수 없으면 타일을 뽑습니다. 먼저 비우거나 교착 시 남은 눈의 합이 작으면 승리합니다.',
  (ui) => {
    const bag = shuffle(range(7).flatMap((a) => range(a + 1).map((b) => [a, b]))),
      hands = [bag.splice(0, 7), bag.splice(0, 7)],
      chain = [bag.pop()];
    let passes = 0;
    return () => {
      const p = ui.turn,
        hand = hands[p],
        ends = [chain[0][0], chain.at(-1)[1]];
      ui.score(
        '나 ' + hands[0].length + '장 · 상대 ' + hands[1].length + '장 · 더미 ' + bag.length,
      );
      const track = ui.row();
      const tileClass = (t) => 'domino face-' + t[0] + ' end-' + t[1];
      chain.forEach((t) => ui.button(track, t.join('│'), null, tileClass(t)));
      let count = 0;
      for (const side of [0, 1]) {
        ui.section(side ? '오른쪽 끝 ' + ends[1] : '왼쪽 끝 ' + ends[0]);
        const row = ui.row();
        hand.forEach((tile, i) => {
          const legal = tile.includes(ends[side]);
          if (legal) count++;
          ui.button(
            row,
            p ? '▧' : tile.join('│'),
            legal
              ? () => {
                  const t = hand.splice(i, 1)[0];
                  if (t[side ? 0 : 1] !== ends[side]) t.reverse();
                  if (side) chain.push(t);
                  else chain.unshift(t);
                  passes = 0;
                  ui.paint(1 - p);
                  if (!hand.length) ui.victor(p);
                }
              : null,
            p ? 'domino' : tileClass(tile),
            tile[0] + tile[1],
          );
        });
      }
      if (!count)
        ui.button(ui.row(), bag.length ? '한 장 뽑기' : '패스', () => {
          if (bag.length) {
            hand.push(bag.pop());
            ui.paint();
            return;
          }
          passes++;
          ui.paint(1 - p);
          if (passes === 2) {
            const a = hands.map((h) => h.flat().reduce((s, n) => s + n, 0));
            ui.victor(a[0] === a[1] ? -1 : a[0] < a[1] ? 0 : 1);
          }
        });
    };
  },
);
