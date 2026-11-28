import { register, range, random, seats, element } from './ww-core.js';
import { snapTaps, scoreParts } from './ww-paths.js';
register(
  13,
  '6을 굴려 말을 출발시킵니다. 상대 말을 잡으면 시작점으로 돌려보냅니다. 정확한 눈으로 네 말을 모두 완주시키세요. 6이 나오면 한 번 더 굴립니다.',
  (ui) => {
    const pos = [Array(4).fill(-1), Array(4).fill(-1)],
      safe = [0, 8, 13, 21, 26, 34, 39, 47];
    const ring = (p, n) => (n + p * 26) % 52;
    let die = 0,
      moved = null;
    return () => {
      const p = ui.turn;
      // Every pawn's move for the current roll; the pawn list and the board share it.
      const plans = pos[p].map((n, i) => {
        const dest = n < 0 ? (die === 6 ? 0 : -1) : n + die;
        return { i, n, dest, legal: !!die && dest >= 0 && dest <= 57 };
      });
      const count = plans.filter((m) => m.legal).length;
      function advance(i, dest) {
        const d = die;
        die = 0;
        pos[p][i] = dest;
        moved = { s: p, i };
        if (dest < 52 && !safe.includes(ring(p, dest)))
          pos[1 - p] = pos[1 - p].map((o) =>
            o >= 0 && o < 52 && ring(1 - p, o) === ring(p, dest) ? -1 : o,
          );
        ui.paint(d === 6 ? p : 1 - p);
        if (pos[p].every((v) => v === 57)) ui.victor(p);
      }
      scoreParts(
        ui,
        '완주 나 ' + pos[0].filter((n) => n === 57).length,
        '상대 ' + pos[1].filter((n) => n === 57).length,
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
      for (let side = 0; side < 4; side++) {
        for (const x of [2,4]) for (const y of [2,4]) cells[rotate(x,y,side)].home = true;
      }
      const route = range(4).flatMap((i) => quarter.map(([x, y]) => rotate(x, y, i)));
      route.forEach((i, k) => (cells[i] = { cls: 'road', text: safe.includes(k) ? '◇' : '' }));
      // The middle 3x3 is the shared home: four coloured triangles, one per arm.
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++)
          cells[(6 + dy) * 15 + 6 + dx] = { cls: 'centre', text: '', spot: dx * 50 + '% ' + dy * 50 + '%' };
      const where = (s, n, i) => {
        const offset = s ? 2 : 0;
        return n < 0
          ? rotate(2 + (i % 2) * 2, 2 + Math.floor(i / 2) * 2, offset)
          : n < 52
            ? route[ring(s, n)]
            : rotate(1 + n - 52, 7, offset);
      };
      [0, 1].forEach((s) => {
        const offset = s ? 2 : 0;
        // The last step of the home column (j = 6) lies in the centre triangle.
        for (let j = 1; j < 6; j++)
          cells[rotate(j, 7, offset)] = { cls: s ? 'coral' : 'jade', text: '' };
        pos[s].forEach((n, i) => {
          const c = cells[where(s, n, i)];
          if (!c.pieces) c.pieces = [];
          c.pieces.push(s ? '○' : '●');
          (c.who ||= []).push({ s, i });
        });
      });
      // Where each movable pawn would land, and whether it would send a rival home.
      if (die && !ui.turn)
        for (const m of plans) {
          if (!m.legal) continue;
          const c = cells[where(p, m.dest, m.i)];
          c.dest ||= m;
          if (m.dest < 52 && !safe.includes(ring(p, m.dest)) && c.who?.some((w) => w.s !== p))
            c.hit = true;
        }
      const idle = !die
        ? '먼저 주사위를 굴리세요.'
        : count
          ? '빛나는 말이나 금색 점이 찍힌 칸을 누르세요.'
          : '움직일 말이 없어요. 차례 넘기기를 누르세요.';
      cells.forEach((c) => {
        const own = c.who?.filter((w) => w.s === p).map((w) => plans[w.i]) || [];
        const ready = !ui.turn && own.find((m) => m.legal);
        // A pawn that can move, or the square where one would land: either tap moves it.
        const go = ready || (!ui.turn && c.dest);
        const cell = ui.button(
          track,
          c.pieces ? c.pieces.join('') : c.text,
          go ? () => advance(go.i, go.dest) : null,
          'ludo-cell ' +
            c.cls +
            (c.home ? ' pawn-socket' : '') +
            (ready ? ' movable' : '') +
            (c.dest ? ' ludo-dest' + (c.hit ? ' ludo-hit' : '') : '') +
            (moved && c.who?.some((w) => w.s === moved.s && w.i === moved.i) ? ' last-move' : ''),
          0,
          c.who
            ? c.who.map((w) => (w.s ? '상대 ' : '내 ') + (w.i + 1) + '번 말').join(', ')
            : c.dest
              ? c.dest.i + 1 + '번 말이 갈 칸'
              : undefined,
        );
        if (c.spot) cell.style.backgroundPosition = c.spot;
        if (c.pieces) {
          cell.classList.add('ludo-men');
          // One full-size pawn per side; a stack shows its size, a single pawn its number.
          for (const s of [0, 1]) {
            const list = c.who.filter((w) => w.s === s);
            if (!list.length) continue;
            const pawn = element('i', s ? 'red-pawn' : 'jade-pawn');
            if (list.length > 1) pawn.dataset.stack = '×' + list.length;
            else if (!s) pawn.dataset.n = list[0].i + 1;
            cell.append(pawn);
          }
          if (c.who.some((w) => w.s === 0) && c.who.some((w) => w.s === 1)) cell.classList.add('ludo-shared');
        }
        if (go || ui.turn) return;
        const mine = own[0];
        ui.why(
          cell,
          !c.pieces
            ? idle
            : !mine
              ? '빨간 말은 AI의 말이에요. 초록 말을 움직이세요.'
              : !die
                ? '먼저 주사위를 굴리세요.'
                : mine.n === 57
                  ? '이미 완주한 말이에요.'
                  : mine.n < 0
                    ? '6이 나와야 출발할 수 있어요.'
                    : '정확한 눈으로만 완주할 수 있어요. ' + (57 - mine.n) + '칸 남았어요.',
        );
      });
      snapTaps(track, (el) => el.matches('.ludo-men'));
      // Die and controls share one tray, so the primary action stays in one place.
      const tray = ui.row();
      tray.classList.add('ludo-tray');
      ui.button(
        tray,
        die ? String(die) : '?',
        null,
        'die ' + (die ? 'face-' + die : 'idle'),
        0,
        die ? '주사위 ' + die : '주사위 굴리기 전',
      );
      if (!die) {
        if (!ui.turn) ui.status('주사위를 굴리세요');
        ui.button(
          tray,
          '주사위 굴리기',
          () => {
            die = 1 + random(6);
            ui.paint();
          },
          'primary',
        );
      } else
        ui.status(
          (ui.turn ? seats[p] + ' · ' : '') +
            '주사위 ' +
            die +
            (ui.turn ? '' : count ? ' · 빛나는 말을 누르세요' : ' · 움직일 말이 없어요'),
        );
      // The four pawn buttons are always on the table (dimmed before the roll), so rolling never
      // moves the board under the finger. They are the tap equivalent of the board pawns.
      const row = ui.row();
      row.classList.add('ludo-pawns');
      for (const { i, n, dest, legal } of plans) {
        const now = n < 0 ? '대기' : n === 57 ? '완주' : n + '칸',
          next = legal ? ' → ' + (dest === 57 ? '완주' : dest ? dest + '칸' : '출발') : '';
        const pick = ui.button(
          row,
          '',
          legal ? () => advance(i, dest) : null,
          'pawn-pick ' + (p ? 'red' : 'jade') + (legal ? ' movable' : ''),
          dest === 57 ? 100 : n < 0 ? 60 : dest,
          (p ? '상대 ' : '내 ') + (i + 1) + '번 말 · ' + now + next,
        );
        pick.append(element('b', 'pick-no', String(i + 1)), element('span', 'pick-way', now + next));
        if (!legal && !ui.turn)
          ui.why(
            pick,
            !die
              ? '먼저 주사위를 굴리세요.'
              : n === 57
                ? '이미 완주한 말이에요.'
                : n < 0
                  ? '6이 나와야 출발할 수 있어요.'
                  : '정확한 눈으로만 완주할 수 있어요.',
          );
      }
      if (die && !count)
        ui.button(
          tray,
          '차례 넘기기',
          () => {
            die = 0;
            ui.paint(1 - p);
          },
          'primary',
        );
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
    // Board selection is view state only: a picked source point and the last move to mark.
    // `trail` keeps every step of the last player's turn until that player's next roll or the
    // other side's first move, so the AI's whole move stays readable when my turn starts.
    let pick = null,
      trail = [],
      trailBy = -1;
    const spot = (k) => (k === 'bar' ? '바' : k === 'off' ? '완주' : k + 1);
    return () => {
      const p = ui.turn,
        me = !ui.turn;
      scoreParts(
        ui,
        '완주 나 ' + off[0],
        '상대 ' + off[1],
        ...(bar[0] || bar[1] ? ['바 ' + bar[0] + ':' + bar[1]] : []),
      );
      let moves = [];
      if (dice.length) {
        const paths = sequences(points, bar, p, dice);
        moves = paths.map((path) => path[0]).filter(Boolean);
        if (paths[0].length === 1 && moves.length) {
          const high = Math.max(...moves.map((m) => m.d));
          moves = moves.filter((m) => m.d === high);
        }
      }
      function play(m) {
        apply(points, bar, off, p, m);
        dice.splice(dice.indexOf(m.d), 1);
        if (trailBy !== p) trail = [];
        trailBy = p;
        trail.push({ from: fromKey(m), to: toKey(m) });
        pick = null;
        ui.paint(dice.length ? p : 1 - p);
        if (off[p] === 15) ui.victor(p);
      }
      const fromKey = (m) => (m.from < 0 || m.from > 23 ? 'bar' : m.from),
        toKey = (m) => (m.to < 0 || m.to > 23 ? 'off' : m.to);
      // Tap a point with your checkers, then a highlighted point (or the bear-off tray).
      const sources = new Set(me ? moves.map(fromKey) : []);
      if (pick !== null && !sources.has(pick)) pick = null;
      if (pick === null && sources.size === 1) pick = [...sources][0];
      const targets = new Map();
      if (pick !== null)
        for (const m of moves) {
          if (fromKey(m) !== pick) continue;
          const k = toKey(m);
          if (!targets.has(k) || m.d < targets.get(k).d) targets.set(k, m);
        }
      const select = (k) => () => {
        pick = pick === k ? null : k;
        ui.paint();
      };
      // Last turn's steps: the checker that arrived gets a cool ring, the point it left a ghost.
      const arrived = (k) => trail.some((t) => t.to === k),
        left = (k) => !arrived(k) && trail.some((t) => t.from === k);
      const marks = (k, s = p) =>
        (pick === k ? ' selected' : sources.has(k) ? ' movable' : '') +
        (targets.has(k) && (k !== 'off' || s === p) ? ' target' : '') +
        (arrived(k) ? ' last-move moved-to' : left(k) ? ' moved-from' : '') +
        (trailBy === 1 ? ' by-ai' : '');
      const reason = (k, own) =>
        !dice.length
          ? '먼저 주사위를 굴리세요.'
          : !moves.length
            ? '움직일 수 있는 말이 없어요. 차례 넘기기를 누르세요.'
            : bar[p] && own && k !== 'bar'
              ? '바에 있는 말을 먼저 들여보내야 해요.'
              : own
                ? '이 말은 남은 눈(' + dice.join(', ') + ')으로 움직일 수 없어요.'
                : pick !== null
                  ? '그 지점으로는 갈 수 없어요. 표시된 지점을 고르세요.'
                  : '흰 말이 있는 지점을 먼저 고르세요.';
      const grid = ui.grid(12, 'backgammon');
      // `outer` is the end of the stack toward the middle of the board: the checker on top.
      const chips = (el, n, light, outer = 'end', mark = false, ghost = false) => {
        const list = [];
        for (let k = 0; k < Math.min(5, n); k++) {
          const chip = document.createElement('i');
          chip.className = light ? 'light-chip' : 'dark-chip';
          if (k === 4 && n > 5) chip.textContent = n;
          list.push(chip);
        }
        if (mark && list.length) (outer === 'end' ? list.at(-1) : list[0]).classList.add('moved');
        if (ghost && n < 5) list[outer === 'end' ? 'push' : 'unshift'](element('i', 'ghost-chip'));
        el.append(...list);
      };
      [...range(12).map((n) => 12 + n), ...range(12).reverse()].forEach((i, slot) => {
        const n = Math.abs(points[i]),
          act =
            targets.has(i) ? () => play(targets.get(i)) : sources.has(i) ? select(i) : null;
        const el = ui.button(
          grid,
          '',
          act,
          'point' + marks(i),
          0,
          i + 1 + '번 지점' + (n ? (points[i] > 0 ? ' 흰 말 ' : ' 검은 말 ') + n : ''),
        );
        el.dataset.place = i + 1;
        el.style.gridArea = (slot < 12 ? 1 : 2) + ' / ' + ((slot % 12) + 1 + (slot % 12 >= 6));
        chips(el, n, points[i] > 0, slot < 12 ? 'end' : 'start', arrived(i), left(i));
        if (me && !act) ui.why(el, reason(i, points[i] > 0));
      });
      // The bar holds hit checkers between the two halves of the board.
      const barSlot = ui.button(
        grid,
        '',
        sources.has('bar') ? select('bar') : null,
        'bar-slot' + marks('bar'),
        0,
        '바 · 흰 말 ' + bar[0] + ' · 검은 말 ' + bar[1],
      );
      chips(barSlot, bar[1], false);
      chips(barSlot, bar[0], true);
      if (me && !sources.has('bar'))
        ui.why(barSlot, bar[0] ? reason('bar', true) : '바에 내 말이 없어요.');
      // Bear-off trays at the right edge: the AI's at the top, mine at the bottom (my home side).
      for (const s of [1, 0]) {
        const open = me && s === 0 && targets.has('off');
        const tray = ui.button(
          grid,
          '',
          open ? () => play(targets.get('off')) : null,
          'bear-off ' +
            (s ? 'dark' : 'light') +
            (open ? ' target' : '') +
            (trailBy === s && arrived('off') ? ' last-move moved-to' : ''),
          0,
          (s ? '상대' : '나') + ' 완주 ' + off[s],
        );
        tray.dataset.count = off[s];
        for (let k = 0; k < off[s]; k++) tray.append(element('i', s ? 'dark-slab' : 'light-slab'));
        if (me && !open && s === 0)
          ui.why(tray, '모든 말이 홈(1~6번)에 모여야 완주시킬 수 있어요.');
      }
      snapTaps(grid, (el) => el.matches('.point, .bar-slot') && !!el.querySelector('i:not(.ghost-chip)'));
      const tray = ui.row();
      tray.classList.add('dice-tray');
      for (const d of dice) ui.button(tray, String(d), null, 'die face-' + d, 0, '남은 눈 ' + d);
      // The move chips sit in a box of fixed height that is always there, so the board never
      // moves when the dice are rolled or the chips change.
      const row = ui.row();
      row.classList.add('move-list');
      const recap =
        trailBy === 1 && trail.length
          ? seats[1] + ': ' + trail.map((t) => spot(t.from) + '→' + spot(t.to)).join(', ') + ' · '
          : '';
      if (!dice.length) {
        // Word joiners keep "19→22," and "주사위를" whole, so the 2-line status breaks only at spaces.
        const glue = (t) => t.split(' ').map((w) => [...w].join('⁠')).join(' ');
        if (me) ui.status(recap ? glue(recap + '주사위를 굴리세요') : '주사위를 굴리세요');
        ui.button(
          tray,
          '주사위 굴리기',
          () => {
            let a = 1 + random(6),
              b = 1 + random(6);
            if (trailBy === p) trail = [];
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
      ui.status(
        me
          ? !moves.length
            ? '움직일 말이 없어요 · 눈 ' + dice.join(' ')
            : (pick === null ? '말을 고르세요' : '갈 곳을 고르세요') + ' · 눈 ' + dice.join(' ')
          : seats[p] + ' · 눈 ' + dice.join(' '),
      );
      // Every legal move as a one-tap chip, too: the tap equivalent of the two-step board move.
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
          () => play(m),
          pick !== null && fromKey(m) === pick ? 'move-chip picked' : 'move-chip',
          m.to < 0 || m.to > 23 ? 8 : Math.abs(points[m.to]) === 1 ? 3 : 0,
        );
      }
      if (!moves.length)
        ui.button(
          tray,
          '차례 넘기기',
          () => {
            dice = [];
            pick = null;
            ui.paint(1 - p);
          },
          'primary',
        );
    };
  },
);
