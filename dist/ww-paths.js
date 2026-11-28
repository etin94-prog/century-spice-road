import { register, range, neighbors, diag, random, shuffle, seats, element } from './ww-core.js';
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
    const slot = ui.button(
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
    if (style === 'star') {
      // Positions are stored on half-columns in the staggered star lattice.
      slot.style.gridColumn = (i % w + 1) + ' / span 2';
      slot.style.gridRow = Math.floor(i / w) + 1;
    }
  });
  return grid;
}
// Fingers are wider than small holes and narrow points. A tap that lands on nothing playable resolves
// to the nearest playable spot within reach (legal destinations first once a piece is picked up).
// A tap well inside an occupied spot is left alone, so a piece that cannot act still says why.
export function snapTaps(root, occupied = () => false, reach = 22) {
  let down = null;
  root.addEventListener('pointerdown', (e) => {
    down = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, el: e.target } : null;
  });
  root.addEventListener('pointerup', (e) => {
    const start = down;
    down = null;
    if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
    const { x, y } = start,
      hit = start.el.closest?.('button, .piece');
    if (hit?.matches('button:enabled')) return;
    // How deep the tap sits inside an occupied spot; a snap has to come closer than that.
    let depth = Infinity;
    if (hit && root.contains(hit) && occupied(hit)) {
      const r = hit.getBoundingClientRect();
      depth = Math.max(0, Math.min(x - r.left, r.right - x, y - r.top, r.bottom - y));
    }
    const live = (sel) => [...root.querySelectorAll(sel)].filter((b) => b.matches('button:enabled'));
    const tiers = root.querySelector('.selected') ? [live('.target'), live('button')] : [live('button')];
    for (const tier of tiers) {
      let best = null,
        bestGap = Infinity;
      for (const el of tier) {
        const r = el.getBoundingClientRect(),
          gap = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom)),
          // Small spots reach further; a 44px square needs almost no help.
          limit = Math.min(reach, Math.max(6, (48 - Math.min(r.width, r.height)) / 1.5 + 4));
        if (gap <= limit && gap < bestGap) {
          best = el;
          bestGap = gap;
        }
      }
      if (best && bestGap < depth) {
        e.stopPropagation();
        best.click();
        return;
      }
    }
  });
  return root;
}
const figure = (el) => el.matches('.black-stone, .white-stone, .black-king, .white-king, .hare');
// Score text that only breaks between its parts, so "나 8 · 상대 9" never splits inside a part.
export function scoreParts(ui, ...parts) {
  ui.score(parts.join(' · '));
  document
    .querySelector('#score')
    .replaceChildren(
      ...parts.flatMap((t, k) => [...(k ? [' '] : []), element('span', 'score-part', (k ? '· ' : '') + t)]),
    );
}
// Give every own piece that cannot act now a reason, so a tap on it explains itself in #status.
function explain(ui, grid, owned, why) {
  if (ui.turn) return;
  [...grid.children].forEach((cell, i) => {
    if (owned(i) && !cell.matches('button')) ui.why(cell, why(i));
  });
}
// Off-board reserve: the stones still waiting to be placed, laid out on a wooden rail.
function reserveTray(label, count, tone) {
  const tray = element('div', 'stone-tray ' + tone);
  tray.setAttribute('aria-label', label + ' 남은 말 ' + count);
  // "상대 남은 말" in portrait; the narrow landscape rail keeps only "상대" / "나".
  const name = element('span', 'tray-label', label);
  name.append(element('span', 'tray-long', ' 남은 말'));
  tray.append(name);
  const rail = element('span', 'tray-rail');
  for (let k = 0; k < count; k++) rail.append(element('i', 'tray-stone'));
  tray.append(rail, element('b', 'tray-count', String(count)));
  return tray;
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
        opts = moves(p, chain),
        // No move left: the final position stays on the table under the result.
        over = !opts.length;
      const forced = opts.some((m) => m.cap !== undefined);
      scoreParts(ui, '남은 말 나 ' + b.filter((v) => v > 0).length, '상대 ' + b.filter((v) => v < 0).length);
      if (!ui.turn && !over)
        ui.status(
          chain !== null
            ? '한 번 더 잡을 수 있어요. 같은 말로 계속 뛰어넘으세요.'
            : selected !== null
              ? forced
                ? '점이 찍힌 칸으로 뛰어넘어 잡으세요.'
                : '갈 칸(점 표시)을 고르세요.'
              : forced
                ? '잡을 수 있는 말이 있어요. 잡기는 의무예요.'
                : '움직일 말을 고르세요',
        );
      const grid = moveBoard(
        ui,
        b.map((x) => ({ 1: '●', '-1': '○', 2: '♛', '-2': '♕' })[x] || ''),
        8,
        over ? [] : opts,
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
      if (over) {
        ui.victor(1 - ui.turn);
        return;
      }
      snapTaps(grid, figure);
      explain(
        ui,
        grid,
        (i) => Math.sign(b[i]) === p,
        () =>
          chain !== null
            ? '연속 잡기 중이에요. 표시된 말로 계속 잡으세요.'
            : forced
              ? '잡을 수 있는 다른 말이 있어요. 잡기는 의무예요.'
              : '이 말은 지금 움직일 수 없어요.',
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
      const over = !opts.length;
      ui.score('옆걸음 ' + stalls + '/10');
      if (!ui.turn && !over)
        ui.status(selected === null ? '사냥개로 토끼를 가두세요' : '갈 자리(점 표시)를 고르세요');
      const grid = moveBoard(
        ui,
        b.map((v, i) => (nodes.includes(i) ? ['', '●', '♘'][v] : null)),
        5,
        over ? [] : opts,
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
      if (over) {
        ui.victor(1 - ui.turn);
        return;
      }
      snapTaps(grid, figure);
      explain(
        ui,
        grid,
        (i) => b[i] > 0,
        (i) =>
          b[i] === 2
            ? '토끼는 AI가 움직여요. 사냥개로 토끼를 가두세요.'
            : '이 사냥개는 갈 수 있는 빈 자리가 없어요. 뒤로는 못 가요.',
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
      scoreParts(
        ui,
        '판 위 나 ' + nodes.filter((i) => b[i] === 1).length,
        '상대 ' + nodes.filter((i) => b[i] === 2).length,
      );
      const free = nodes.filter((i) => !b[i]),
        moves = [];
      if (!remaining[p - 1] && !capture)
        for (const i of own)
          for (const j of free)
            if (own.length === 3 || adj.get(i).has(j)) moves.push({ from: i, to: j });
      const over = !capture && !remaining[p - 1] && (own.length < 3 || !moves.length);
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
      // Stones still to be placed wait on rails above (AI) and below (me) the board.
      const trays = (grid) => {
        if (!remaining[0] && !remaining[1]) return;
        grid.before(reserveTray('상대', remaining[1], 'white'));
        grid.after(reserveTray('내', remaining[0], 'black'));
      };
      if (!capture && !remaining[p - 1]) {
        if (!ui.turn && !over)
          ui.status(
            selected !== null
              ? '옮길 자리(점 표시)를 고르세요.'
              : own.length === 3
                ? '말이 셋뿐이라 빈 자리 어디로든 날 수 있어요.'
                : '옮길 말을 고르세요',
          );
        const grid = moveBoard(
          ui,
          display,
          7,
          over ? [] : moves,
          selected,
          (v) => (selected = v),
          (m) => place(m.to, m.from),
          'mill',
          (i) => (b[i] ? '' : 'empty'),
        );
        trays(grid);
        if (over) {
          ui.victor(2 - p);
          return;
        }
        snapTaps(grid, figure);
        explain(ui, grid, (i) => b[i] === p, () => '이 말은 옮길 수 있는 빈 자리가 없어요.');
        return;
      }
      ui.status(
        (ui.turn ? seats[p - 1] + ' · ' : '') +
          (capture
            ? ui.turn
              ? '밀 완성! 내 말 하나를 가져가요'
              : '밀 완성! 제거할 상대 말을 고르세요'
            : ui.turn
              ? '말을 놓는 중'
              : '빈 자리에 말을 놓으세요'),
      );
      const grid = ui.grid(7, 'board-grid mill' + (capture ? ' removing' : '')),
        outside = enemy.filter((i) => !mill(i));
      millLines(grid);
      trays(grid);
      display.forEach((v, i) => {
        const legal = capture ? (outside.length ? outside : enemy).includes(i) : free.includes(i);
        const cell = ui.button(
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
          v === null
            ? 'void'
            : 'cell ' +
                (legal ? 'legal ' : '') +
                (capture && legal ? 'capture ' : '') +
                (v === '●' ? 'black-stone' : v === '○' ? 'white-stone' : 'empty'),
        );
        if (v === null || legal || ui.turn) return;
        if (capture)
          ui.why(
            cell,
            b[i] === 3 - p
              ? '세 줄(밀)에 든 말은 다른 말이 남아 있으면 제거할 수 없어요.'
              : '제거할 상대 말(표시된 말)을 고르세요.',
          );
        else ui.why(cell, '빈 자리에만 놓을 수 있어요.');
      });
      snapTaps(grid, figure);
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
      const home = (q) => goals[q - 1].filter((i) => b[i] === q).length;
      if (!ui.turn) ui.status(selected === null ? '파란 구슬을 골라 위쪽 별끝으로' : '금색 고리로 옮기세요');
      scoreParts(ui, '도착 나 ' + home(1), '상대 ' + home(2) + '/10');
      const grid = moveBoard(
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
        (i) =>
          (b[i] ? '' : 'empty ') +
          (goals[0].includes(i) ? 'goal-mine' : goals[1].includes(i) ? 'goal-theirs' : ''),
      );
      snapTaps(grid, figure);
      explain(ui, grid, (i) => b[i] === p, () => '이 구슬은 지금 갈 수 있는 자리가 없어요.');
    };
  },
);
// The line of play runs like a snake: left to right, then right to left on the next row, so
// every tile touches the one it matches. Odd rows show their tiles mirrored to keep pips joined.
let snakeWatch = null;
function snake(track) {
  const layout = () => {
    const tiles = [...track.children];
    if (!tiles.length || !track.isConnected) return;
    const w = tiles[0].offsetWidth,
      gap = 3,
      room = track.clientWidth - 8,
      cols = Math.max(1, Math.floor((room + gap) / (w + gap)));
    track.style.setProperty('--snake-cols', Math.min(cols, tiles.length));
    tiles.forEach((tile, k) => {
      const row = Math.floor(k / cols),
        back = row % 2 === 1,
        col = back ? cols - 1 - (k % cols) : k % cols;
      tile.style.gridRow = row + 1;
      tile.style.gridColumn = Math.min(cols, tiles.length) > col ? col + 1 : 'auto';
      const [a, b] = back ? [tile.dataset.b, tile.dataset.a] : [tile.dataset.a, tile.dataset.b];
      tile.className = tile.className.replace(/\bface-\d\b/, 'face-' + a).replace(/\bend-\d\b/, 'end-' + b);
      tile.classList.toggle('turned', back);
    });
  };
  track.classList.add('snake');
  layout();
  if (typeof ResizeObserver === 'undefined') return;
  snakeWatch?.disconnect();
  let width = track.clientWidth;
  snakeWatch = new ResizeObserver(() => {
    if (track.clientWidth === width) return;
    width = track.clientWidth;
    layout();
  });
  snakeWatch.observe(track);
}
register(
  11,
  '같은 눈끼리 잇도록 도미노를 줄의 한쪽 끝에 놓습니다. 놓을 수 없으면 타일을 뽑습니다. 먼저 비우거나 교착 시 남은 눈의 합이 작으면 승리합니다.',
  (ui) => {
    const bag = shuffle(range(7).flatMap((a) => range(a + 1).map((b) => [a, b]))),
      hands = [bag.splice(0, 7), bag.splice(0, 7)],
      chain = [bag.pop()];
    let passes = 0,
      picked = null,
      placed = null,
      drawn = null;
    return () => {
      const p = ui.turn,
        hand = hands[p],
        ends = [chain[0][0], chain.at(-1)[1]];
      scoreParts(ui, '나 ' + hands[0].length + '장', '상대 ' + hands[1].length + '장', '더미 ' + bag.length);
      const tileClass = (t) => 'domino face-' + t[0] + ' end-' + t[1];
      function play(i, side) {
        const t = hand.splice(i, 1)[0];
        if (t[side ? 0 : 1] !== ends[side]) t.reverse();
        if (side) chain.push(t);
        else chain.unshift(t);
        passes = 0;
        picked = drawn = null;
        placed = side;
        ui.paint(1 - p);
        if (!hand.length) ui.victor(p);
      }
      const fits = (t) => [0, 1].filter((side) => t.includes(ends[side]));
      // The opponent's tiles lie face down at the far edge of the table.
      const theirs = ui.row();
      theirs.classList.add('domino-rack', 'theirs');
      theirs.setAttribute('aria-label', '상대 도미노 ' + hands[1].length + '장');
      hands[1].forEach(() => theirs.append(element('i', 'domino-back')));
      const track = ui.row();
      track.classList.add('domino-line');
      chain.forEach((t, k) => {
        const tile = ui.button(track, t.join('│'), null, tileClass(t), 0, t[0] + '-' + t[1]);
        tile.dataset.a = t[0];
        tile.dataset.b = t[1];
        if (placed !== null && k === (placed ? chain.length - 1 : 0)) tile.classList.add('last-move');
      });
      snake(track);
      const count = hand.reduce((n, t) => n + fits(t).length, 0);
      const choice = picked !== null && !p ? hands[0][picked] : null;
      // End pickers: active only when the chosen tile fits both open ends.
      const endRow = ui.row();
      endRow.classList.add('domino-ends');
      [0, 1].forEach((side) => {
        const open = choice && fits(choice).includes(side);
        const end = ui.button(
          endRow,
          (side ? '오른쪽 끝 ' : '왼쪽 끝 ') + ends[side],
          open ? () => play(picked, side) : null,
          'domino-end ' + (side ? 'right' : 'left') + (open ? ' target' : ''),
        );
        if (!open && !p)
          ui.why(end, count ? '손에서 놓을 도미노를 먼저 고르세요.' : '맞는 도미노가 없어요. 아래 버튼으로 한 장 뽑으세요.');
      });
      // My hand is always face up; on the AI turn its moves are offered off-table.
      const mine = ui.row();
      mine.classList.add('domino-rack', 'mine');
      const offTable = element('div');
      hands[0].forEach((tile, i) => {
        const sides = p ? [] : fits(tile);
        let act = null;
        if (sides.length === 1 || (sides.length === 2 && ends[0] === ends[1]))
          act = () => play(i, sides.at(-1));
        else if (sides.length === 2)
          act = () => {
            picked = picked === i ? null : i;
            ui.paint();
          };
        const el = ui.button(
          mine,
          tile.join('│'),
          act,
          tileClass(tile) +
            (picked === i && !p ? ' selected' : sides.length ? ' movable' : '') +
            (drawn === i ? ' last-move' : ''),
          tile[0] + tile[1],
          tile[0] + '-' + tile[1],
        );
        if (!act && !p)
          ui.why(el, '이 도미노는 양 끝(' + ends[0] + ', ' + ends[1] + ')에 맞지 않아요.');
      });
      if (p)
        hand.forEach((tile, i) => {
          for (const side of fits(tile))
            ui.button(offTable, '', () => play(i, side), 'domino', tile[0] + tile[1]);
        });
      if (!p) ui.status(picked !== null ? '어느 쪽 끝에 놓을까요? 끝 버튼을 누르세요.' : '테두리가 빛나는 도미노를 눌러 놓으세요');
      if (!count) {
        if (!p) ui.status('맞는 도미노가 없어요. ' + (bag.length ? '한 장 뽑으세요.' : '패스하세요.'));
        const drawRow = ui.row();
        drawRow.classList.add('domino-draw');
        ui.button(drawRow, bag.length ? '한 장 뽑기' : '패스', () => {
          if (bag.length) {
            hand.push(bag.pop());
            drawn = p ? null : hand.length - 1;
            picked = null;
            ui.paint();
            return;
          }
          passes++;
          picked = drawn = null;
          ui.paint(1 - p);
          if (passes === 2) {
            const a = hands.map((h) => h.flat().reduce((s, n) => s + n, 0));
            ui.victor(a[0] === a[1] ? -1 : a[0] < a[1] ? 0 : 1);
          }
        }, 'primary');
      }
    };
  },
);
