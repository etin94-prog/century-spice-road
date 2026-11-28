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
  element,
} from './ww-core.js';
// Attach a reason to a piece that cannot act. Chrome's touch adjustment hands a tap on an inert
// node to the nearest button, so a no-op click listener keeps the tap on the touched piece and
// ww-core's fallback shows the reason instead of acting on a neighbour.
function why(ui, el, message) {
  ui.why(el, message);
  el.addEventListener('click', () => {});
  return el;
}
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
    // Opponent cells that filled since the last change, so their incoming balls stay visible.
    let preferredGap = 2;
    let miniSnap = null,
      miniMarks = [];
    return () => {
      const p = ui.turn,
        b = fields[p],
        other = fields[1 - p];
      ui.score('제거 나 ' + scores[0] + ' · 상대 ' + scores[1]);
      // Top tray: the opponent's field, the next three balls in drop formation, the two tools.
      const top = ui.row();
      top.classList.add('sixball-top');
      const opp = element('div', 'sixball-opp');
      opp.append(element('span', 'sixball-label', '상대'));
      top.append(opp);
      why(ui, opp, '상대 필드예요. 내 구슬은 아래 판에 떨어져요.');
      const mini = ui.grid(w, 'mini-well');
      opp.append(mini);
      if (miniSnap && fields[1].some((v, i) => v !== miniSnap[i])) {
        miniMarks = range(w * h).filter((i) => fields[1][i] >= 0 && miniSnap[i] < 0);
        if (miniMarks.length > 9) miniMarks = [];
      }
      miniSnap = fields[1].slice();
      fields[1].forEach((v, i) => {
        const el = ui.button(mini, v < 0 ? '' : symbols[v], null, v < 0 ? '' : 'gem' + v);
        if (miniMarks.includes(i)) el.classList.add('last-move');
      });
      // balls[0] lands in the left column, balls[1] in the right, balls[2] on top of one of them.
      const next = element('div', 'sixball-next' + (inverted ? ' inverted' : ''));
      next.setAttribute('aria-label', '다음 구슬 ' + balls.map((v) => symbols[v]).join(' '));
      top.append(next);
      why(ui, next, '다음 세 구슬이에요. 색 회전·좌우 전환으로 모양을 바꿔요.');
      balls.forEach((v, k) => ui.button(next, symbols[v], null, 'ball gem' + v + ' next-' + k));
      const tools = element('div', 'sixball-tools');
      top.append(tools);
      // The tools stay on the table during the AI turn (disabled), so nothing shifts between turns.
      // Their weight is below every drop, so the AI never chooses them.
      ui.button(
        tools,
        '색 회전',
        () => {
          balls.unshift(balls.pop());
          ui.paint();
        },
        'sixball-tool',
        -1,
      );
      ui.button(
        tools,
        '좌우 전환',
        () => {
          inverted = !inverted;
          ui.paint();
        },
        'sixball-tool',
        -1,
      );
      // The well and its drop row share one frame: every drop button also owns a full-height
      // strip over the well (its ::before), one column pitch wide and centred on the gap between
      // the two columns it fills, so a tap anywhere above that gap drops there.
      const play = element('div', 'sixball-play');
      const grid = ui.grid(w, 'board-grid ballwell no-movable');
      why(ui, grid, '두 열 사이를 누르면 그 자리로 떨어져요.');
      const holes = fields[0].map((v) =>
        ui.button(grid, v < 0 ? '·' : symbols[v], null, v < 0 ? 'cell' : 'cell ball gem' + v),
      );
      // One drop button between every pair of columns, centred under the two holes it fills.
      const aim = ui.grid(w - 1, 'sixball-aim');
      play.append(grid, aim);
      document.querySelector('#surface').append(play);
      // Pressing a drop shows the three balls where they will land (ghosts), before letting go.
      let ghosts = [];
      const unghost = () => {
        ghosts.forEach(([el, cls]) => el.classList.remove('ghost', cls));
        ghosts = [];
      };
      const ghost = (cells) => {
        unghost();
        if (ui.turn !== 0 || ui.ended) return;
        cells.forEach(([i, v]) => {
          const el = holes[i];
          if (!el || fields[0][i] >= 0) return;
          el.classList.add('ghost', 'gem' + v);
          ghosts.push([el, 'gem' + v]);
        });
      };
      const placements = [];
      let possible = 0;
      for (const x of range(w - 1)) {
        const left = slot(b, x),
          right = slot(b, x + 1),
          double = inverted ? right : left,
          ok = left >= 0 && right >= 0 && double >= w;
        if (ok) possible++;
        const drop = ui.button(
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
          'drop',
          Math.min(left, right) / w + (b[left + w] === balls[0] ? 3 : 0),
          x + 1 + '·' + (x + 2) + '열에 떨어뜨리기',
        );
        drop.style.setProperty('--x', x);
        if (!ok) why(ui, drop, x + 1 + '·' + (x + 2) + '열에는 세 구슬이 들어갈 자리가 없어요.');
        else if (p === 0) {
          const land = [
            [left, balls[0]],
            [right, balls[1]],
            [double - w, balls[2]],
          ];
          placements.push({x,drop,land});
          drop.addEventListener('pointerdown', () => ghost(land));
          drop.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && ghost(land));
          for (const type of ['pointerup', 'pointercancel', 'pointerleave']) drop.addEventListener(type, unghost);
        }
      }
      if (!p && placements.length && !ui.ended) {
        const controls=element('div','sixball-precise');
        const select=element('select','');select.setAttribute('aria-label','구슬을 떨어뜨릴 열');
        for(const {x} of placements) select.add(new Option((x+1)+'·'+(x+2)+'열',String(x)));
        const selected=placements.find(it=>it.x===preferredGap)||placements[0];
        select.value=String(selected.x);
        const current=()=>placements.find(it=>it.x===Number(select.value));
        select.onchange=()=>{preferredGap=Number(select.value);ghost(current().land);};
        const place=element('button','','이 열에 놓기');place.onclick=()=>current().drop.click();
        controls.append(select,place);opp.append(controls);
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
      sailing = 0,
      moved = -1;
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
    // Tiles the water already reaches from the inlet (display only; path() decides the win).
    function reach() {
      let i = 4,
        incoming = 3;
      const wet = [];
      while (!wet.includes(i) && b[i] >= 0 && dirs[b[i]].includes(incoming)) {
        wet.push(i);
        const out = dirs[b[i]].find((v) => v !== incoming);
        const [j] = neighbors(i, w, w, [d[out]]);
        if (j === undefined) break;
        i = j;
        incoming = (out + 2) % 4;
      }
      return wet;
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
        route = path(),
        wet = route || reach();
      const open = neighbors(hole, w, w, orth);
      for (const i of range(16)) {
        const legal = !route && open.includes(i);
        // A legal tile points toward the hole it will slide into.
        const toward = legal ? { 1: 'e', [-1]: 'w', 4: 's', [-4]: 'n' }[hole - i] : '';
        const el = ui.button(
          grid,
          route?.[sailing] === i ? '⛵' : b[i] < 0 ? '' : pipes[b[i]],
          legal
            ? () => {
                moved = hole;
                slide(i);
                steps++;
                ui.paint();
              }
            : null,
          'pipe waterway-' + b[i] +
            (wet.includes(i) ? ' wet' : '') +
            (route?.includes(i) ? ' route' : '') +
            (route?.[sailing] === i ? ' sailing' : '') +
            (legal ? ' movable slide-' + toward : '') +
            (!route && i === moved ? ' last-move' : ''),
          0,
          b[i] < 0 ? '빈칸' : ['가로', '세로', '오른쪽 아래', '왼쪽 아래', '오른쪽 위', '왼쪽 위'][b[i]] + ' 물길',
        );
        if (!legal && !route)
          why(ui, el, b[i] < 0 ? '빈칸 옆 타일을 누르면 이 자리로 밀려 와요.' : '빈칸 바로 옆(상하좌우) 타일만 밀 수 있어요.');
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
    let selected = null,
      gone = [];
    const at = (x, y, z) => tiles.some((v) => v.live && v.x === x && v.y === y && v.z === z);
    const names = ['萬', '筒', '索'];
    return () => {
      const left = tiles.filter((t) => t.live),
        options = left.filter(free),
        faces = new Map();
      options.forEach((t) => faces.set(t.f, (faces.get(t.f) || 0) + 1));
      const pairs = [...faces.values()].filter((n) => n > 1).length;
      ui.score('남은 ' + left.length + '패 · 열린 짝 ' + pairs);
      const grid = ui.grid(8, 'mahjong-stack' + (left.length ? '' : ' cleared'));
      // A cleared table keeps the empty bed (8×4 below, 6×2 above) and a plaque, not a blank felt.
      if (!left.length) {
        tiles.forEach((t) => {
          const slot = element('span', 'mah-slot layer-' + t.z);
          slot.style.gridColumn = t.x + 1;
          slot.style.gridRow = t.y + 1;
          grid.append(slot);
        });
        const cheer = element('span', 'mah-cheer', '모든 패를 비웠어요');
        cheer.setAttribute('aria-hidden', 'true');
        grid.append(cheer);
      }
      // The last pair taken leaves a faint outline where it lay (only where nothing is left there).
      for (const g of left.length ? gone : []) {
        if (tiles.some((v) => v.live && v.x === g.x && v.y === g.y)) continue;
        const ghost = element('span', 'mah-gone layer-' + g.z);
        ghost.style.gridColumn = g.x + 1;
        ghost.style.gridRow = g.y + 1;
        grid.append(ghost);
      }
      tiles.forEach((t) => {
        if (!t.live) return;
        const f = t.f,
          label = (f % 9) + 1 + names[Math.floor(f / 9)],
          open = free(t),
          partner = open && selected && selected !== t && selected.f === f;
        const el = ui.button(
          grid,
          label,
          open
            ? () => {
                if (selected && selected !== t && selected.f === t.f) {
                  gone = [selected, t];
                  selected.live = t.live = false;
                  selected = null;
                  ui.paint();
                } else if (selected && selected !== t) {
                  selected = t;
                  ui.paint();
                  ui.reject('같은 그림끼리만 짝지어요. 방금 누른 패를 새로 골랐어요.');
                } else {
                  selected = selected === t ? null : t;
                  ui.paint();
                }
              }
            : null,
          'mah-tile layer-' + t.z + (t === selected ? ' selected' : '') + (partner ? ' target' : ''),
          0, (t.z ? '윗단 ' : '아랫단 ') + label,
        );
        el.style.gridColumn = t.x + 1;
        el.style.gridRow = t.y + 1;
        decorateTile(el, 'mps'[Math.floor(f / 9)] + (f % 9 + 1));
        if (!open)
          why(ui, el, at(t.x, t.y, t.z + 1) ? '위에 다른 패가 얹혀 있어서 뺄 수 없어요.' : '왼쪽이나 오른쪽이 비어야 뺄 수 있어요.');
      });
      if (!left.length) ui.finish('모든 짝을 찾았습니다');
      else if (!pairs) ui.finish('열린 패에 짝이 없습니다 · 남은 ' + left.length + '패');
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
        sets = 0,
        landed = null;
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
        landed = null;
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
      const rankName = (r) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][r - 1];
      // Why the picked card cannot go onto a column's top card (display text only).
      function reason(onto) {
        const need = value(onto) - 1;
        if (!need) return 'A 위에는 더 놓을 수 없어요.';
        return (
          face(onto.c) + ' 위에는 ' +
          (spider ? '' : suit(onto.c) % 2 ? '검은 ' : '빨간 ') +
          rankName(need) + '만 놓을 수 있어요.'
        );
      }
      // Print a real card face into a slot; the slot keeps its own aria-label.
      function show(el, c) {
        if (typeof window.card !== 'function') return el;
        el.classList.add('illustrated', 'whole-card');
        el.innerHTML = window.card(c);
        // One large suit (or the court figure) for narrow cards, where the pips would crowd the index.
        el.querySelector('.card > span')?.append(
          element('span', 'sol-big', rank(c) > 10 ? ['♞', '♛', '♚'][rank(c) - 11] : suits[suit(c)]),
        );
        return el;
      }
      return () => {
        const pick = cards(),
          first = pick[0];
        ui.score(
          spider
            ? '완성 ' + sets + ' / 8'
            : '기초 더미 ' + foundation.reduce((a, b) => a + b, 0) + ' / 52',
        );
        // Tray: stock, waste, undo and foundations (completed sets in spider), one slot per column.
        const tray = ui.grid(cols.length, 'sol-tray' + (spider ? ' spider' : ''));
        let stockEl = null;
        const canDeal = stock.length || (!spider && waste.length);
        stockEl = ui.button(
          tray,
          stock.length ? String(spider ? stock.length / 10 : stock.length) : canDeal ? '↻' : '',
          canDeal
            ? () => {
                if (spider && cols.some((c) => !c.length)) {
                  ui.reject('빈 열을 모두 채워야 새 줄을 받을 수 있어요.', stockEl);
                  return;
                }
                selected = null;
                remember();
                if (spider) {
                  cols.forEach((col) => col.push({ c: stock.pop(), up: true }));
                  sweep();
                  landed = { deal: true };
                } else if (stock.length) {
                  waste.push(stock.pop());
                  landed = { waste: true };
                } else {
                  stock.push(...waste.splice(0).reverse());
                  landed = null;
                }
                ui.paint();
              }
            : null,
          (stock.length ? 'card-back' : 'sol-slot') + ' sol-stock' + (stock.length || !canDeal ? '' : ' sol-recycle'),
          0,
          spider
            ? '새 줄 받기 · 남은 ' + stock.length / 10 + '번'
            : stock.length
              ? '더미에서 한 장 넘기기 · ' + stock.length + '장'
              : '넘긴 카드를 다시 더미로',
        );
        if (!canDeal) why(ui, stockEl, spider ? '남은 더미가 없어요.' : '더미와 넘긴 카드가 모두 비었어요.');
        if (!spider) {
          if (waste.length) {
            const top = waste.at(-1);
            const el = ui.button(
              tray,
              face(top),
              () => {
                selected = selected?.col === -1 ? null : { col: -1 };
                ui.paint();
              },
              cardStyle(top) + ' sol-waste' +
                (selected?.col === -1 ? ' selected' : '') +
                (landed?.waste ? ' last-move' : ''),
              0,
              face(top),
            );
            show(el, top);
          } else why(ui, ui.button(tray, '', null, 'sol-slot sol-waste'), '더미를 누르면 카드가 여기로 넘어와요.');
        }
        const undoEl = ui.button(tray, '↶', history.length ? undo : null, 'sol-undo', 0, '한 수 되돌리기');
        if (!history.length) why(ui, undoEl, '아직 되돌릴 수가 없어요.');
        if (spider) {
          const done = element('div', 'sol-sets');
          done.setAttribute('aria-label', '완성한 묶음 ' + sets + ' / 8');
          range(8).forEach((k) => done.append(element('span', 'sol-set' + (k < sets ? ' done' : ''))));
          tray.append(done);
        } else
          foundation.forEach((n, s) => {
            const legal =
              first && pick.length === 1 && suit(first.c) === s && rank(first.c) === n + 1;
            const el = ui.button(
              tray,
              n ? '' : suits[s],
              legal
                ? () => {
                    remember();
                    remove();
                    foundation[s]++;
                    landed = { found: s };
                    ui.paint();
                  }
                : null,
              'foundation sol-found' + (s % 2 ? ' red' : '') +
                (legal ? ' target' : '') +
                (landed?.found === s ? ' last-move' : ''),
              0,
              suits[s] + ' 기초 더미 · ' + (n ? face(s * 13 + n - 1) + '까지' : '비어 있음'),
            );
            if (n) show(el, s * 13 + n - 1);
            if (!legal)
              why(ui, 
                el,
                n === 13
                  ? '완성된 기초 더미예요.'
                  : first && pick.length > 1
                    ? '기초 더미에는 한 장씩만 올려요.'
                    : '이 더미에는 다음으로 ' + face(s * 13 + n) + '만 올라가요.',
              );
          });
        const grid = ui.grid(cols.length, 'solitaire');
        cols.forEach((col, i) => {
          const stack = document.createElement('div');
          stack.className = 'stack';
          // Strip heights shrink with the column length so a long column still fits (CSS).
          stack.style.setProperty('--down', col.filter((o) => !o.up).length);
          stack.style.setProperty('--up', Math.max(0, col.filter((o) => o.up).length - 1));
          grid.append(stack);
          const dest =
            first &&
            selected.col !== i &&
            (col.length ? builds(col.at(-1), first) : spider || rank(first.c) === 13);
          // A legal column is one big target: a tap anywhere in it (its cards or the felt below
          // them) plays the move through the column's top card, the same as tapping that card.
          if (dest) {
            stack.classList.add('dest');
            stack.addEventListener(
              'click',
              (event) => {
                const top = stack.querySelector('.target');
                if (!top || top.contains(event.target) || ui.ended) return;
                event.stopPropagation();
                event.preventDefault();
                top.click();
              },
              true,
            );
          }
          function move() {
            remember();
            const moving = pick.slice(),
              at = col.length;
            remove();
            col.push(...moving);
            sweep();
            landed = { col: i, at };
            ui.paint();
          }
          if (!col.length) {
            const el = ui.button(stack, '', dest ? move : null, 'sol-empty' + (dest ? ' target' : ''), 0, '빈 열');
            if (!dest)
              why(ui, 
                el,
                spider
                  ? '옮길 카드를 먼저 고르세요.'
                  : first
                    ? '빈 열에는 K만 놓을 수 있어요.'
                    : '빈 열이에요. K를 옮겨 올 수 있어요.',
              );
          }
          col.forEach((o, j) => {
            const last = j === col.length - 1,
              target = dest && last,
              movable = o.up && col.slice(j + 1).every((v, k) => builds(col[j + k], v)),
              fresh = (landed?.col === i && j >= landed.at) || (landed?.deal && last);
            const el = ui.button(
              stack,
              o.up ? face(o.c) : '◆',
              target
                ? move
                : movable
                  ? () => {
                      const again = selected?.col === i && selected.at === j;
                      // Picking a card elsewhere switches the selection; say why it did not move there.
                      const refused =
                        first && !again && selected.col !== i
                          ? '새로 골랐어요 · ' + reason(col.at(-1))
                          : '';
                      selected = again ? null : { col: i, at: j };
                      ui.paint();
                      if (refused) ui.reject(refused);
                    }
                  : null,
              (o.up ? cardStyle(o.c) : 'card-back') +
                (selected?.col === i && j >= selected.at ? ' selected' : '') +
                (target ? ' target' : '') +
                (fresh ? ' last-move' : ''),
              0, o.up ? face(o.c) : '뒷면 카드',
            );
            if (o.up && last) show(el, o.c);
            if (dest) return;
            if (!o.up) why(ui, el, '뒤집힌 카드예요. 위 카드를 옮기면 열려요.');
            else if (!movable)
              why(ui, 
                el,
                spider
                  ? '아래 카드가 한 칸씩 내려가야 함께 옮길 수 있어요.'
                  : '아래 카드가 색을 번갈아 한 칸씩 내려가야 함께 옮겨요.',
              );
          });
        });
        if (sets === 8 || foundation.every((n) => n === 13)) ui.finish('모든 카드를 정리했습니다');
      };
    },
  );
