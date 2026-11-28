import {
  register,
  range,
  random,
  shuffle,
  stones,
  neighbors,
  orth,
  diag,
  seats,
  element,
} from './ww-core.js';
const hexDirections = [...orth, [1, -1], [-1, 1]];
function connected(board, start, w, h, directions, player) {
  const seen = new Set(start.filter((i) => board[i] === player)),
    queue = [...seen];
  for (let n = 0; n < queue.length; n++)
    for (const j of neighbors(queue[n], w, h, directions)) {
      if (board[j] === player && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  return queue;
}
// Display helpers. They only dress the cells that stones() drew; the rules stay in the
// closures below.
// A finger tap on a cell narrower than this (CSS px) only aims; a second tap places the stone.
const AIM_BELOW = 32;
function aimTracker(ui) {
  const state = { touch: false };
  ui.board.addEventListener(
    'pointerdown',
    (e) => {
      const cell = e.target.closest?.('.board-grid .cell');
      const r = cell?.getBoundingClientRect();
      state.touch = !!cell && e.pointerType === 'touch' && Math.min(r.width, r.height) < AIM_BELOW;
    },
    { capture: true, signal: ui.signal },
  );
  return state;
}
// Chrome's touch adjustment moves a finger tap that lands on a plain <span> to the nearest
// button, so a tap on an occupied cell could play the empty cell beside it. A click listener
// makes every span answer for itself (the core then explains why it cannot act).
const stay = () => {};
function holdTaps(ui) {
  for (const el of ui.board.querySelectorAll('span.piece')) el.addEventListener('click', stay);
}
const where = (i, w) => Math.floor(i / w) + 1 + '행 ' + ((i % w) + 1) + '열';
for (const [id, w, h, k] of [
  [4, 7, 6, 4],
  [7, 9, 9, 0],
  [10, 15, 15, 5],
]) {
  register(
    id,
    k
      ? (id === 4 ? '열을 눌러 아래로 돌을 떨어뜨리세요. ' : '빈 교차점에 돌을 놓으세요. ') +
          k +
          '개를 가로·세로·대각선으로 이으면 승리합니다.'
      : '나(흑)는 검게 칠한 두 변을, 상대(백)는 희게 칠한 두 변을 연속된 돌로 먼저 연결하면 승리합니다.',
    (ui) => {
      const board = Array(w * h).fill(0);
      // Display state only: the last stone, the winning line and the aimed cell.
      let last = -1,
        winCells = [],
        aim = -1;
      const pointer = id === 4 ? null : aimTracker(ui);
      function line(i, p) {
        return Math.max(
          ...[
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1],
          ].map(([dx, dy]) => {
            let length = 1;
            for (const sign of [-1, 1]) {
              let at = i;
              while (true) {
                const [j] = neighbors(at, w, h, [[dx * sign, dy * sign]]);
                if (j === undefined || board[j] !== p) break;
                length++;
                at = j;
              }
            }
            return length;
          }),
        );
      }
      function wins(i, p) {
        if (k) return line(i, p) >= k;
        const start = range(w).map((n) => (p === 1 ? n : n * w));
        return connected(board, start, w, h, hexDirections, p).some((j) =>
          p === 1 ? j >= w * (h - 1) : j % w === w - 1,
        );
      }
      // The stones to light up after a win: the line through the last stone, or its chain.
      function winning(i, p) {
        if (!k) return connected(board, [i], w, h, hexDirections, p);
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ]) {
          const cells = [i];
          for (const sign of [-1, 1]) {
            let at = i;
            while (true) {
              const [j] = neighbors(at, w, h, [[dx * sign, dy * sign]]);
              if (j === undefined || board[j] !== p) break;
              cells.push(j);
              at = j;
            }
          }
          if (cells.length >= k) return cells;
        }
        return [i];
      }
      function dress() {
        const grid = ui.board.querySelector('.board-grid');
        if (!grid) return;
        const cells = [...grid.children],
          mine = ui.turn === 0 && !ui.ended;
        if (cells[last]) {
          cells[last].classList.add('last-move');
          cells[last].style.setProperty('--row', Math.floor(last / w));
        } else grid.classList.add('no-last-move');
        for (const j of winCells) cells[j]?.classList.add('win');
        cells.forEach((cell, i) => {
          const x = i % w,
            y = Math.floor(i / w);
          if (id === 7) {
            // Portrait lays the rhombus out as a diamond: row q+r, half-column q-r.
            cell.style.setProperty('--dr', x + y + 1);
            cell.style.setProperty('--dc', x - y + w);
          }
          if (id === 10) {
            if (x === 0) cell.classList.add('gx0');
            if (x === w - 1) cell.classList.add('gxn');
            if (y === 0) cell.classList.add('gy0');
            if (y === h - 1) cell.classList.add('gyn');
            if ((x === 7 && y === 7) || ([3, 11].includes(x) && [3, 11].includes(y)))
              cell.classList.add('hoshi');
          }
          if (board[i] && id !== 4)
            ui.why(
              cell,
              id === 7
                ? '이미 돌이 놓인 칸이에요. 빈 칸을 고르세요.'
                : '이미 돌이 있는 자리예요. 빈 교차점을 고르세요.',
            );
        });
        if (id === 4)
          for (let x = 0; x < w; x++) {
            let land = -1;
            for (let y = h - 1; y >= 0 && land < 0; y--) if (!board[y * w + x]) land = y * w + x;
            if (land >= 0 && mine) cells[land].classList.add('landing');
            for (let y = 0; y < h; y++) {
              const cell = cells[y * w + x];
              if (!board[y * w + x]) continue;
              if (land < 0) {
                ui.why(cell, '이 열은 가득 찼어요. 다른 열을 고르세요.');
                continue;
              }
              // Any square of a column drops into that column, as on the real rack.
              const slot = cells[land];
              cell.classList.add('column-proxy');
              cell.addEventListener('pointerup', (e) => {
                if (ui.turn === 0 && !ui.ended) e.stopPropagation();
              });
              cell.addEventListener('click', () => {
                if (ui.turn === 0 && !ui.ended) slot.click();
              });
            }
          }
        if (cells[aim] && mine) {
          cells[aim].classList.add('selected', 'aim');
          grid.classList.add('aiming');
          grid.style.setProperty('--aim-x', aim % w);
          grid.style.setProperty('--aim-y', Math.floor(aim / w));
          ui.status(where(aim, w) + ' · 한 번 더 누르면 둡니다');
        } else if (mine)
          ui.status(
            id === 4
              ? '내 차례 · 누른 열로 떨어집니다'
              : id === 7
                ? '내 차례 · 검은 두 변을 이으세요'
                : '내 차례 · 빈 교차점을 고르세요',
          );
      }
      return () => {
        const p = ui.turn + 1,
          actions = new Map();
        board.forEach((v, i) => {
          if (v) return;
          let landing = i;
          if (id === 4) while (landing + w < w * h && !board[landing + w]) landing += w;
          const place = () => {
            board[landing] = p;
            const win = wins(landing, p);
            last = landing;
            aim = -1;
            winCells = win ? winning(landing, p) : [];
            ui.paint(win ? ui.turn : 1 - ui.turn);
            if (win) ui.victor(p - 1);
            else if (board.every(Boolean)) ui.victor(-1);
          };
          actions.set(i, {
            weight:
              line(landing, p) * 2 +
              line(landing, 3 - p) +
              (line(landing, 3 - p) >= k && k ? 80 : 0) +
              (line(landing, p) >= k && k ? 100 : 0) -
              Math.abs((landing % w) - (w - 1) / 2) * 0.1,
            play: () => {
              // A finger on a tiny intersection first aims (ghost stone and cross hairs).
              if (pointer?.touch && ui.turn === 0 && aim !== i) {
                pointer.touch = false;
                aim = i;
                ui.paint();
                return;
              }
              if (pointer) pointer.touch = false;
              place();
            },
          });
        });
        stones(ui, board, w, actions, id === 7 ? 'hex' : id === 4 ? 'drop' : 'goban');
        ui.score(id === 4 ? '나 빨강 · AI 노랑' : '나 흑 · AI 백');
        dress();
        holdTaps(ui);
      };
    },
  );
}
register(
  15,
  '자신의 돌 사이에 상대 돌이 끼도록 놓으면 그 줄을 뒤집습니다. 양쪽 모두 둘 수 없으면 돌이 많은 쪽이 승리합니다.',
  (ui) => {
    const b = Array(64).fill(0);
    b[27] = b[36] = 2;
    b[28] = b[35] = 1;
    // Display state only: the disc just placed, the discs it turned and a skipped turn.
    let last = -1,
      turned = [],
      skipped = 0;
    function moves(p) {
      const result = new Map();
      for (const i of range(64)) {
        if (b[i]) continue;
        const flips = [];
        for (const d of [...orth, ...diag]) {
          let at = i,
            ray = [];
          while (true) {
            const [j] = neighbors(at, 8, 8, [d]);
            if (j === undefined || !b[j]) break;
            if (b[j] === p) {
              flips.push(...ray);
              break;
            }
            ray.push(j);
            at = j;
          }
        }
        if (flips.length) result.set(i, flips);
      }
      return result;
    }
    return () => {
      const p = ui.turn + 1,
        actions = new Map();
      for (const [i, flips] of moves(p))
        actions.set(i, {
          weight: flips.length + ([0, 7, 56, 63].includes(i) ? 30 : 0),
          play: () => {
            for (const j of [i, ...flips]) b[j] = p;
            const next = moves(3 - p).size ? 3 - p : p;
            last = i;
            turned = flips;
            skipped = next === p ? 3 - p : 0;
            ui.paint(next - 1);
            if (!moves(next).size) {
              const a = b.filter((v) => v === 1).length,
                c = b.filter((v) => v === 2).length;
              ui.victor(a === c ? -1 : a > c ? 0 : 1);
            }
          },
        });
      ui.score(
        '나(흑) ' + b.filter((v) => v === 1).length + ' · AI(백) ' + b.filter((v) => v === 2).length,
      );
      stones(ui, b, 8, actions, 'reversi');
      const grid = ui.board.querySelector('.board-grid'),
        cells = [...grid.children];
      if (cells[last]) cells[last].classList.add('last-move');
      else grid.classList.add('no-last-move');
      for (const j of turned) cells[j].classList.add('flipped');
      cells.forEach((cell, i) => {
        if (actions.has(i)) return;
        ui.why(
          cell,
          b[i]
            ? '이미 돌이 있는 칸이에요. 점이 찍힌 칸에 두세요.'
            : '여기에 두면 뒤집을 돌이 없어요. 점이 찍힌 칸에 두세요.',
        );
      });
      if (skipped && !ui.ended)
        ui.status(
          skipped === 2 ? 'AI 1은 둘 곳이 없어 건너뜁니다 · 내 차례' : '둘 곳이 없어 건너뜁니다 · AI 1의 차례',
        );
      else if (!ui.turn && !ui.ended) ui.status('내 차례 · 점 찍힌 칸에 두세요');
      holdTaps(ui);
    };
  },
);
register(
  1,
  '내 쪽 구덩이를 골라 반시계 방향으로 씨앗을 한 알씩 놓습니다. 내 창고에서 끝나면 한 번 더 둡니다. 내 빈 구덩이에서 끝나면 맞은편 씨앗을 잡습니다.',
  (ui) => {
    const pits = Array(14).fill(4);
    pits[6] = pits[13] = 0;
    // Display state only: what the last sowing changed, and a line about it.
    let changed = new Map(),
      note = '',
      noteByAi = false;
    const gems = ['amber', 'emerald', 'sapphire', 'turquoise'];
    return () => {
      const p = ui.turn,
        offset = p * 7,
        store = offset + 6;
      ui.score('나 ' + pits[6] + '  ·  상대 ' + pits[13]);
      const grid = ui.grid(6, 'mancala');
      for (const i of [13, ...range(6).map((n) => 12 - n), 6, ...range(6)]) {
        const isStore = i === 6 || i === 13;
        const legal = !isStore && i >= offset && i < store && pits[i] > 0;
        const el = ui.button(
          grid,
          pits[i],
          legal
            ? () => {
                const before = pits.slice();
                let n = pits[i],
                  at = i;
                pits[i] = 0;
                while (n) {
                  at = (at + 1) % 14;
                  if (at === (store + 7) % 14) continue;
                  pits[at]++;
                  n--;
                }
                let caught = 0;
                if (at >= offset && at < store && pits[at] === 1 && pits[12 - at]) {
                  caught = pits[12 - at];
                  pits[store] += 1 + pits[12 - at];
                  pits[12 - at] = pits[at] = 0;
                }
                const over = [0, 7].some((o) => pits.slice(o, o + 6).every((v) => !v));
                if (over)
                  for (const o of [0, 7])
                    for (let j = o; j < o + 6; j++) {
                      pits[o + 6] += pits[j];
                      pits[j] = 0;
                    }
                changed = new Map();
                pits.forEach((v, j) =>
                  changed.set(j, j === i ? 'origin' : v > before[j] ? 'sown' : v < before[j] ? 'taken' : ''),
                );
                noteByAi = !!p;
                note = over
                  ? ''
                  : caught
                    ? (p ? seats[1] + '이 ' : '') + '맞은편 씨앗 ' + caught + '개를 잡았어요'
                    : at === store
                      ? p
                        ? seats[1] + '이 창고에서 끝나 한 번 더 둡니다'
                        : '창고에서 끝났어요 · 한 번 더 두세요'
                      : '';
                ui.paint(at === store ? p : 1 - p);
                if (over) ui.victor(pits[6] === pits[13] ? -1 : pits[6] > pits[13] ? 0 : 1);
              }
            : null,
          isStore ? 'pit mancala-store ' + (i === 6 ? 'mine' : 'theirs') : 'pit ' + (i < 6 ? 'mine' : 'theirs'),
          (i + pits[i]) % 14 === store ? 10 : 0,
          (isStore ? (i === 6 ? '내 창고 ' : '상대 창고 ') : (i < 6 ? '내 구덩이 ' : '상대 구덩이 ')) +
            pits[i] +
            '개',
        );
        const mark = changed.get(i);
        if (mark) el.classList.add(mark);
        if (legal && !p && !ui.ended) el.classList.add('movable');
        if (!legal)
          ui.why(
            el,
            isStore
              ? '창고에서는 씨앗을 뿌릴 수 없어요. 아래 줄 내 구덩이를 고르세요.'
              : i > 6
                ? '상대 구덩이예요. 아래 줄 내 구덩이를 고르세요.'
                : '빈 구덩이는 고를 수 없어요. 씨앗이 있는 구덩이를 고르세요.',
          );
        const count = document.createElement('b');
        count.textContent = pits[i];
        el.replaceChildren(count);
        if (isStore) el.append(element('em', '', i === 6 ? '내 창고' : '상대 창고'));
        // Store seeds sit in their own area, clear of the label and the count.
        const bed = isStore ? element('span', 'seeds') : el;
        if (isStore) el.append(bed);
        const seeds = Math.min(isStore ? 18 : 9, pits[i]);
        for (let n = 0; n < seeds; n++) {
          const seed = document.createElement('i'),
            angle = n * 2.4;
          const radius = (isStore ? 10 : 12) * Math.sqrt(n);
          seed.style.left = (isStore ? 50 : 48) + Math.cos(angle) * radius + '%';
          seed.style.top = (isStore ? 50 : 52) + Math.sin(angle) * radius + '%';
          seed.className = gems[(n + i) % gems.length];
          bed.append(seed);
        }
      }
      // The note about the last sowing is shown for one paint; on my turn it also says so.
      const shown = note;
      note = '';
      if (shown && !ui.ended) ui.status(shown + (!p && noteByAi ? ' · 내 차례' : ''));
      else if (!p && !ui.ended) ui.status('내 차례 · 아래 줄 구덩이를 고르세요');
      holdTaps(ui);
    };
  },
);
register(
  2,
  '점 사이에 선을 그으세요. 상자의 네 번째 변을 그은 사람이 한 점을 얻고 다시 둡니다.',
  (ui) => {
    const side = 7,
      edges = new Set(),
      owners = new Map(),
      scores = [0, 0];
    // Display state only: who drew each line, the latest line and a line about it.
    const drawnBy = new Map();
    let lastEdge = -1,
      note = '';
    const edgesOf = (i) => [i - 1, i + 1, i - side, i + side];
    return () => {
      ui.score('나 ' + scores[0] + '  ·  상대 ' + scores[1]);
      const grid = ui.grid(side, 'dots');
      for (const i of range(side * side)) {
        const x = i % side,
          y = Math.floor(i / side);
        if (x % 2 === y % 2) {
          const owner = owners.get(i);
          const el = ui.button(
            grid,
            x % 2 ? (owners.has(i) ? (owner ? 'AI' : '나') : '') : '•',
            null,
            x % 2 ? 'box' + (owners.has(i) ? ' own' + owner : '') : 'dot',
            0,
            x % 2 ? (owners.has(i) ? (owner ? '상대 상자' : '내 상자') : '빈 상자') : '점',
          );
          ui.why(el, '두 점 사이의 점선을 누르세요.');
          continue;
        }
        const boxes = (x % 2 ? [i - side, i + side] : [i - 1, i + 1]).filter(
          (j) => j >= 0 && j < 49 && (j % side) % 2 === 1,
        );
        const counts = boxes.map((j) => edgesOf(j).filter((k) => edges.has(k)).length);
        const el = ui.button(
          grid,
          x % 2 ? '━' : '┃',
          edges.has(i)
            ? null
            : () => {
                const p = ui.turn;
                edges.add(i);
                drawnBy.set(i, p);
                lastEdge = i;
                let got = 0;
                for (const j of boxes)
                  if (edgesOf(j).every((k) => edges.has(k))) {
                    owners.set(j, p);
                    scores[p]++;
                    got++;
                  }
                note =
                  got && owners.size < 9
                    ? (p ? seats[1] + ': 상자를 닫아 한 번 더 긋습니다' : '상자를 닫았어요 · 한 번 더 그으세요')
                    : '';
                ui.paint(got ? p : 1 - p);
                if (owners.size === 9) ui.victor(scores[0] > scores[1] ? 0 : 1);
              },
          (edges.has(i) ? 'ink by' + drawnBy.get(i) + (i === lastEdge ? ' last' : '') : 'guide') +
            (x % 2 ? ' h' : ' v'),
          counts.includes(3) ? 4 : counts.includes(2) ? -1 : 1,
          (x % 2 ? '가로 선 ' : '세로 선 ') + (Math.floor(y / 2) + 1) + '-' + (Math.floor(x / 2) + 1),
        );
        if (edges.has(i)) ui.why(el, '이미 그은 선이에요. 점선을 고르세요.');
      }
      if (note && !ui.ended) ui.status(note);
      else if (!ui.turn && !ui.ended) ui.status('내 차례 · 두 점 사이의 점선을 누르세요');
      holdTaps(ui);
    };
  },
);
const dice = '⚀⚁⚂⚃⚄⚅';
register(
  3,
  '주사위 다섯 개를 최대 세 번 굴립니다. 보관할 주사위를 누른 뒤 다시 굴리거나 이번 점수를 기록할 항목을 선택하세요. 모든 항목을 채워 총점을 겨룹니다.',
  (ui) => {
    const names = [
      '에이스',
      '듀스',
      '트레이',
      '포',
      '파이브',
      '식스',
      '초이스',
      '포 다이스',
      '풀하우스',
      '스몰 스트레이트',
      '라지 스트레이트',
      '요트',
    ];
    const sheets = [{}, {}];
    let rolls = 0,
      values = [],
      hold = new Set();
    function value(i) {
      const counts = range(6).map((n) => values.filter((v) => v === n + 1).length),
        sum = values.reduce((a, b) => a + b, 0);
      if (i < 6) return counts[i] * (i + 1);
      if (i === 6) return sum;
      if (i === 7) return Math.max(...counts) >= 4 ? sum : 0;
      if (i === 8) return counts.includes(3) && counts.includes(2) ? sum : 0;
      if (i === 9 || i === 10)
        return counts
          .map((x) => (x ? '1' : '0'))
          .join('')
          .includes('1'.repeat(i - 5))
          ? i === 9
            ? 15
            : 30
          : 0;
      return counts.includes(5) ? 50 : 0;
    }
    const total = (s) =>
      Object.values(s).reduce((a, b) => a + b, 0) +
      (range(6).reduce((a, i) => a + (s[i] || 0), 0) >= 63 ? 35 : 0);
    const upper = (s) => range(6).reduce((a, i) => a + (s[i] || 0), 0);
    return () => {
      const p = ui.turn;
      ui.score('나 ' + total(sheets[0]) + '  ·  상대 ' + total(sheets[1]));
      // Score sheet: both players' columns, the open potential of the player to move.
      const grid = ui.grid(2, 'yacht-sheet');
      names.forEach((n, i) => {
        const open = rolls && sheets[p][i] === undefined;
        const el = ui.button(
          grid,
          n,
          open
            ? () => {
                sheets[p][i] = value(i);
                rolls = 0;
                values = [];
                hold = new Set();
                ui.paint(1 - p);
                if (Object.keys(sheets[1]).length === names.length) {
                  const a = total(sheets[0]),
                    b = total(sheets[1]);
                  ui.victor(a === b ? -1 : a > b ? 0 : 1);
                }
              }
            : null,
          'score-cell' + (open ? ' open' : '') + (open && !value(i) ? ' zero' : ''),
          rolls ? value(i) : 0,
          n +
            ' · 나 ' +
            (sheets[0][i] ?? (open && !p ? value(i) + '점 가능' : '미기록')) +
            ' · 상대 ' +
            (sheets[1][i] ?? '미기록'),
        );
        const seat = (s) => {
          const recorded = sheets[s][i] !== undefined;
          const live = !recorded && open && p === s;
          return element(
            'span',
            'mark ' + (s ? 'ai' : 'me') + (recorded ? ' done' : live ? ' potential' : ''),
            recorded ? sheets[s][i] : live ? value(i) : '–',
          );
        };
        el.replaceChildren(element('span', 'name', n), seat(0), seat(1));
        if (!open)
          ui.why(
            el,
            !rolls ? '먼저 굴리기 버튼으로 주사위를 굴리세요.' : '이미 기록한 항목이에요. 빈 칸을 고르세요.',
          );
      });
      grid.append(
        element(
          'p',
          'yacht-bonus',
          '상단 합 ' + upper(sheets[0]) + ' / 63 · 상대 ' + upper(sheets[1]) + ' / 63 → 보너스 +35',
        ),
      );
      // Dice tray: five places always, so nothing moves when the first roll lands.
      const tray = ui.row();
      tray.classList.add('dice-tray');
      range(5).forEach((i) => {
        const v = values[i];
        if (!v) {
          ui.why(ui.button(tray, '', null, 'die die-empty', 0, '빈 주사위 자리'), '먼저 굴리기 버튼을 누르세요.');
          return;
        }
        const el = ui.button(
          tray,
          dice[v - 1],
          rolls < 3 && !p
            ? () => {
                hold.has(i) ? hold.delete(i) : hold.add(i);
                ui.paint();
              }
            : null,
          'die face-' + v + (hold.has(i) ? ' selected held' : ''),
          0,
          '주사위 ' + v + (hold.has(i) ? ' 보관 중' : ''),
        );
        if (rolls >= 3 && !p) ui.why(el, '세 번 다 굴렸어요. 점수 칸을 골라 기록하세요.');
      });
      const bar = ui.row();
      bar.classList.add('roll-bar');
      if (rolls < 3)
        ui.button(
          bar,
          '굴리기 ' + (3 - rolls) + '회',
          () => {
            values = range(5).map((i) => (hold.has(i) ? values[i] : 1 + random(6)));
            rolls++;
            ui.paint();
          },
          'primary roll',
          rolls ? 1 : 100,
        );
      else
        ui.why(
          ui.button(bar, '점수 칸을 고르세요', null, 'primary roll spent'),
          '굴리기 세 번을 다 썼어요. 점수 칸을 고르세요.',
        );
      if (!p && !ui.ended)
        ui.status(
          !rolls
            ? '내 차례 · 굴리기를 누르세요'
            : rolls < 3
              ? '보관할 주사위나 점수 칸을 고르세요'
              : '내 차례 · 점수 칸을 고르세요',
        );
      holdTaps(ui);
    };
  },
);
register(
  5,
  '서로 다른 네 색의 암호를 맞혀 보세요. 히트는 색과 자리가 모두 맞은 수, 블로는 색만 맞은 수입니다. 기회는 열 번입니다.',
  (ui) => {
    const colors = ['진주', '산호', '호박', '비취', '청옥', '자수정'],
      answer = shuffle(range(6)).slice(0, 4),
      history = [];
    // Four fixed places; removing a gem leaves its place empty instead of shifting the rest.
    const empty = () => [null, null, null, null];
    let guess = empty();
    const filled = () => guess.filter((x) => x !== null).length;
    // Display state only: every guess with its pins, and whether the code is shown.
    const log = [];
    let open = false;
    const peg = (x, cls = '') => element('i', 'peg ' + (x === undefined ? 'hole' : 'gem' + x) + cls);
    return () => {
      ui.score(Math.min(10, history.length + 1) + ' / 10');
      // The decoding board: the hidden code, then ten rows of guesses with hit/blow pins.
      const record = element('div', 'peg-history');
      const code = element('div', 'peg-line code' + (open ? ' open' : ''));
      code.setAttribute('aria-label', open ? '정답 ' + answer.map((x) => colors[x]).join(' · ') : '숨겨진 암호');
      code.append(element('b', '', open ? '정답' : '암호'));
      const codePegs = element('span', 'pegs');
      for (const x of answer) codePegs.append(open ? peg(x) : element('i', 'peg cover', '?'));
      code.append(codePegs, element('span', 'keys'));
      record.append(code);
      for (const n of range(10)) {
        const row = log[n],
          now = !row && n === log.length && !open;
        const line = element('div', 'peg-line' + (now ? ' now' : '') + (row ? ' done' : ''));
        line.append(element('b', '', n + 1));
        const pegs = element('span', 'pegs');
        for (const j of range(4)) pegs.append(peg(row ? row.guess[j] : now ? (guess[j] ?? undefined) : undefined));
        const keys = element('span', 'keys');
        if (row) {
          line.setAttribute(
            'aria-label',
            row.guess.map((x) => colors[x]).join(' · ') + ' ' + row.hit + '히트 ' + row.blow + '블로',
          );
          for (const j of range(4))
            keys.append(element('i', 'pin' + (j < row.hit ? ' hit' : j < row.hit + row.blow ? ' blow' : '')));
          keys.append(element('small', '', row.hit + 'H ' + row.blow + 'B'));
        }
        line.append(pegs, keys);
        record.append(line);
      }
      ui.board.append(record);
      const entry = ui.grid(4, 'peg-rack'),
        next = guess.indexOf(null);
      for (const i of range(4)) {
        const has = guess[i] !== null;
        const el = ui.button(
          entry,
          has ? colors[guess[i]] : '·',
          has
            ? () => {
                guess[i] = null;
                ui.paint();
              }
            : null,
          has ? 'gem gem' + guess[i] : 'gem slot' + (i === next && !ui.ended ? ' next' : ''),
          0,
          i + 1 + '번 자리 ' + (has ? colors[guess[i]] + ' · 눌러서 빼기' : '비어 있음'),
        );
        if (!has) ui.why(el, '아래 보석을 누르면 ' + (next + 1) + '번 자리부터 채워져요.');
      }
      const palette = ui.grid(6, 'peg-palette');
      colors.forEach((c, i) => {
        const free = filled() < 4 && !guess.includes(i);
        const el = ui.button(
          palette,
          c,
          free
            ? () => {
                guess[guess.indexOf(null)] = i;
                ui.paint();
              }
            : null,
          'gem gem' + i + (guess.includes(i) ? ' used' : ''),
        );
        if (!free)
          ui.why(
            el,
            guess.includes(i)
              ? '이미 고른 색이에요. 위 자리를 누르면 뺄 수 있어요.'
              : '네 자리가 찼어요. 정답 확인을 누르세요.',
          );
      });
      const bar = ui.row();
      bar.classList.add('peg-bar');
      if (filled() === 4)
        ui.button(
          bar,
          '정답 확인',
          () => {
            const hit = guess.filter((x, i) => answer[i] === x).length,
              blow = guess.filter((x) => answer.includes(x)).length - hit;
            history.unshift(
              guess.map((x) => colors[x]).join(' · ') + '　 ' + hit + 'H ' + blow + 'B',
            );
            log.push({ guess: guess.slice(), hit, blow });
            open = hit === 4 || history.length === 10;
            guess = empty();
            ui.paint();
            if (hit === 4) ui.finish('암호 해독 성공');
            else if (history.length === 10)
              ui.finish('정답　' + answer.map((x) => colors[x]).join(' · '));
          },
          'primary',
        );
      else
        ui.why(
          ui.button(bar, '보석 ' + filled() + ' / 4', null, 'primary pending'),
          '보석 네 개를 먼저 고르세요.',
        );
      if (!ui.ended)
        ui.status(
          filled() < 4
            ? '보석을 골라 네 자리를 채우세요'
            : '정답 확인을 누르세요',
        );
      holdTaps(ui);
    };
  },
);
