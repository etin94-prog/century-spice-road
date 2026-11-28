import { register, range, neighbors, orth, diag } from './ww-core.js';
import { moveBoard } from './ww-paths.js';
const names = {
  K: '玉',
  R: '飛',
  B: '角',
  G: '金',
  S: '銀',
  N: '桂',
  L: '香',
  P: '歩',
  r: '龍',
  b: '馬',
  s: '全',
  n: '圭',
  l: '杏',
  p: 'と',
};
for (const [id, w] of [
  [17, 9],
  [18, 5],
])
  register(
    id,
    '기물을 선택한 뒤 목적지를 누릅니다. 잡은 기물은 자기 차례에 빈칸에 놓을 수 있습니다. 적진에 들어가거나 나올 때 승격할 수 있고, 상대 왕을 외통수로 만들면 승리합니다.',
    (ui) => {
      let board = Array(w * w).fill(null),
        hands = [[], []],
        selected = null,
        promos = null;
      const init = w === 5 ? ['RBSGK', '....P'] : ['LNSGKGSNL', '.R.....B.', 'PPPPPPPPP'];
      init.forEach((line, y) =>
        [...line].forEach((r, x) => {
          if (r === '.') return;
          const j = y * w + x;
          board[j] = { r, p: 1 };
          board[w * w - 1 - j] = { r, p: 0 };
        }),
      );
      const seen = new Map();
      function targets(b, i) {
        const { r, p } = b[i],
          f = p ? 1 : -1,
          steps = [],
          rays = [];
        const gold = [
          [0, f],
          [1, f],
          [-1, f],
          [1, 0],
          [-1, 0],
          [0, -f],
        ];
        if (r === 'K') steps.push(...orth, ...diag);
        if ('Gsnlp'.includes(r)) steps.push(...gold);
        if (r === 'S') steps.push([0, f], ...diag);
        if (r === 'P') steps.push([0, f]);
        if (r === 'N') steps.push([1, 2 * f], [-1, 2 * f]);
        if (r === 'L') rays.push([0, f]);
        if ('Rr'.includes(r)) rays.push(...orth);
        if ('Bb'.includes(r)) rays.push(...diag);
        if (r === 'r') steps.push(...diag);
        if (r === 'b') steps.push(...orth);
        const result = neighbors(i, w, w, steps).filter((j) => b[j]?.p !== p);
        for (const dir of rays) {
          let at = i;
          while (true) {
            const [j] = neighbors(at, w, w, [dir]);
            if (j === undefined || b[j]?.p === p) break;
            result.push(j);
            if (b[j]) break;
            at = j;
          }
        }
        return result;
      }
      function inCheck(b, p) {
        const king = b.findIndex((v) => v?.p === p && v.r === 'K');
        return b.some((v, i) => v && v.p !== p && targets(b, i).includes(king));
      }
      function depth(j, p) {
        return p ? w - 1 - Math.floor(j / w) : Math.floor(j / w);
      }
      function dead(r, d) {
        return (d === 0 && 'PL'.includes(r)) || (r === 'N' && d < 2);
      }
      function generate(b, h, p, checkPawnMate = true) {
        const moves = [];
        function add(from, to, r, promote = false) {
          const nb = b.slice(),
            capt = nb[to];
          if (capt?.r === 'K') return;
          if (typeof from === 'number') nb[from] = null;
          nb[to] = { r: promote ? r.toLowerCase() : r, p };
          if (inCheck(nb, p)) return;
          if (
            from === 'P' &&
            checkPawnMate &&
            inCheck(nb, 1 - p) &&
            !generate(nb, h, 1 - p, false).length
          )
            return;
          const worth = { R: 10, B: 8, G: 5, S: 4, N: 3, L: 2, P: 1 };
          moves.push({
            from,
            to,
            r,
            promote,
            weight:
              (capt ? worth[capt.r.toUpperCase()] || 1 : 0) * 5 + (promote ? 2 : 0) + Math.random(),
          });
        }
        b.forEach((v, i) => {
          if (v?.p !== p) return;
          for (const j of targets(b, i)) {
            const d = depth(j, p),
              zone = w === 5 ? 1 : 3;
            if (!dead(v.r, d)) add(i, j, v.r);
            if ('RBSNLP'.includes(v.r) && (depth(i, p) < zone || d < zone)) add(i, j, v.r, true);
          }
        });
        for (const r of new Set(h[p]))
          for (const j of range(w * w)) {
            if (b[j] || dead(r, depth(j, p))) continue;
            if (r === 'P' && b.some((v, i) => i % w === j % w && v?.p === p && v.r === 'P'))
              continue;
            add(r, j, r);
          }
        return moves;
      }
      function play(m) {
        const p = ui.turn;
        if (board[m.to]) hands[p].push(board[m.to].r.toUpperCase());
        if (typeof m.from === 'number') board[m.from] = null;
        else hands[p].splice(hands[p].indexOf(m.from), 1);
        board[m.to] = { r: m.promote ? m.r.toLowerCase() : m.r, p };
        selected = null;
        promos = null;
        const key = JSON.stringify([board, hands.map((h) => h.slice().sort()), 1 - p]);
        seen.set(key, (seen.get(key) || 0) + 1);
        ui.paint(1 - p);
        if (seen.get(key) >= 4) ui.finish('동일 국면 네 번 · 무승부');
      }
      return () => {
        const p = ui.turn,
          moves = generate(board, hands, p);
        ui.score(
          inCheck(board, p)
            ? '왕수'
            : (w === 5 ? '5 × 5' : '9 × 9') + ' · ' + (p ? '후수' : '선수'),
        );
        const hand = ui.row();
        for (const r of new Set(hands[p])) {
          const list = moves.filter((m) => m.from === r);
          ui.button(
            hand,
            names[r] + ' ×' + hands[p].filter((x) => x === r).length,
            list.length && !promos
              ? () => {
                  if (p) play(list.reduce((a, b) => (a.weight > b.weight ? a : b)));
                  else {
                    selected = r;
                    ui.paint();
                  }
                }
              : null,
            'tile ' + (selected === r ? 'selected' : ''),
            list.length ? Math.max(...list.map((m) => m.weight)) : 0,
          );
        }
        moveBoard(
          ui,
          board.map((v) => (v ? names[v.r] : '')),
          w,
          promos ? [] : moves,
          selected,
          (v) => (selected = v),
          (m) => {
            const choices = moves.filter((a) => a.from === m.from && a.to === m.to);
            if (!p && choices.length > 1) {
              promos = choices;
              ui.paint();
            } else play(m);
          },
          'shogi',
          (i) => (board[i] ? 'engraved ' + (board[i].p === 1 ? 'rotated' : '') : ''),
        );
        if (promos) {
          const row = ui.row();
          for (const m of promos) ui.button(row, m.promote ? '승격' : '그대로', () => play(m));
        }
        if (!moves.length) ui.victor(1 - p);
      };
    },
  );
