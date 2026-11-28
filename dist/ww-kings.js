import { register, range, neighbors, orth, diag, element, seats } from './ww-core.js';
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
const ko = { K: '왕', R: '비차', B: '각', G: '금', S: '은', N: '계마', L: '향차', P: '보' };
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
        promos = null,
        last = null;
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
        last = { from: m.from, to: m.to };
        selected = null;
        promos = null;
        const key = JSON.stringify([board, hands.map((h) => h.slice().sort()), 1 - p]);
        seen.set(key, (seen.get(key) || 0) + 1);
        ui.paint(1 - p);
        if (seen.get(key) >= 4) ui.finish('동일 국면 네 번 · 무승부');
      }
      // Each player's captured pieces sit on a stand (komadai) on their own side of the board.
      // Only the side to move gets buttons, so the AI still chooses from the same options.
      function komadai(owner, p, moves) {
        const stand = element(
          'div',
          'row komadai ' + (owner ? 'theirs' : 'mine') + (owner === p && moves.length ? ' to-move' : ''),
        );
        ui.board.append(stand);
        stand.append(element('span', 'komadai-seat', owner ? seats[1] + ' · 후수' : seats[0] + ' · 선수'));
        const kinds = [...new Set(hands[owner])].sort(
          (a, b) => 'RBGSNLP'.indexOf(a) - 'RBGSNLP'.indexOf(b),
        );
        if (!kinds.length) stand.append(element('span', 'komadai-empty', '잡은 기물 없음'));
        for (const r of kinds) {
          const count = hands[owner].filter((x) => x === r).length,
            look = 'koma-hand koma-' + r + (owner ? ' rotated' : ''),
            label = names[r];
          // How many of a kind: a small round badge at the wedge's corner, not under the kanji.
          const badge = () =>
            count > 1 && stand.lastElementChild.append(element('span', 'koma-count', '×' + count));
          if (owner !== p) {
            const piece = ui.button(stand, label, null, look, 0, ko[r] + ' ' + count + '개');
            badge();
            ui.why(
              piece,
              owner ? '상대가 잡아 둔 기물이에요.' : '내 차례가 되면 이 기물을 빈칸에 놓을 수 있어요.',
            );
            continue;
          }
          const list = moves.filter((m) => m.from === r);
          const piece = ui.button(
            stand,
            label,
            list.length && !promos
              ? () => {
                  if (p) play(list.reduce((a, b) => (a.weight > b.weight ? a : b)));
                  else {
                    selected = selected === r ? null : r;
                    ui.paint();
                  }
                }
              : null,
            look + (selected === r ? ' selected' : ''),
            list.length ? Math.max(...list.map((m) => m.weight)) : 0,
            ko[r] + ' ' + count + '개 · 놓기',
          );
          badge();
          if (!list.length)
            ui.why(
              piece,
              promos ? '승격 여부를 먼저 고르세요.' : ko[r] + '을(를) 놓을 수 있는 칸이 없어요.',
            );
        }
      }
      return () => {
        const p = ui.turn,
          moves = generate(board, hands, p),
          check = inCheck(board, p);
        ui.score(check ? '왕수!' : (w === 5 ? '5 × 5' : '9 × 9') + ' · ' + (p ? '후수' : '선수'));
        komadai(1, p, moves);
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
          (i) =>
            board[i]
              ? 'engraved koma-' +
                board[i].r.toUpperCase() +
                (board[i].r === board[i].r.toLowerCase() ? ' promoted' : '') +
                (board[i].p === 1 ? ' rotated' : '')
              : 'empty',
        );
        const grid = [...ui.board.querySelectorAll('.board-grid.shogi')].pop(),
          cells = [...grid.children],
          sources = new Set(moves.map((m) => m.from));
        if (last) {
          if (typeof last.from === 'number') cells[last.from]?.classList.add('last-move');
          cells[last.to]?.classList.add('last-move');
        } else grid.classList.add('no-last-move');
        cells.forEach((cell, i) => {
          const v = board[i],
            kind = v && ko[v.r.toUpperCase()];
          cell.setAttribute(
            'aria-label',
            w - (i % w) + '筋 ' + (Math.floor(i / w) + 1) + '段' +
              (v ? ' ' + (v.p ? '상대 ' : '내 ') + kind + (v.r === v.r.toLowerCase() ? '(승격)' : '') : ''),
          );
          if (v?.r === 'K' && v.p === p && check) cell.classList.add('in-check');
          if (promos) return void ui.why(cell, '승격 여부를 아래에서 먼저 고르세요.');
          if (cell.matches('button')) return;
          if (v && v.p !== p)
            ui.why(
              cell,
              selected !== null
                ? '그 기물은 지금 잡을 수 없어요. 표시된 칸을 고르세요.'
                : '상대 기물이에요. 아래쪽 내 기물을 골라 주세요.',
            );
          else if (v && !sources.has(i))
            ui.why(
              cell,
              check ? '왕수예요! 왕을 지키는 수만 둘 수 있어요.' : kind + '은(는) 지금 움직일 수 있는 칸이 없어요.',
            );
          else if (!v && selected === null)
            ui.why(
              cell,
              check ? '왕수예요! 왕을 지킬 기물을 먼저 고르세요.' : '먼저 움직일 기물이나 잡은 기물을 고르세요.',
            );
        });
        komadai(0, p, moves);
        if (typeof selected === 'string' && !promos && !p)
          ui.status((check ? '왕수! ' : '') + names[selected] + '(' + ko[selected] + ') · 놓을 빈칸을 고르세요');
        if (promos) {
          // The square the piece lands on stays marked while the choice is open.
          cells[promos[0].to]?.classList.add('target');
          ui.status('승격할까요?');
          const row = element('div', 'row shogi-promo');
          ui.board.append(row);
          for (const m of promos)
            ui.button(
              row,
              (m.promote ? '승격 · ' : '그대로 · ') + names[m.promote ? m.r.toLowerCase() : m.r],
              () => play(m),
              m.promote ? 'primary' : '',
            );
        } else if (!p && check && typeof selected !== 'string') ui.status('왕수! 왕을 지키세요');
        if (!moves.length) {
          ui.victor(1 - p);
          const result = document.querySelector('#result');
          result.textContent = (check ? '외통수' : '둘 수 있는 수 없음') + ' · ' + result.textContent;
          ui.status(result.textContent);
        }
      };
    },
  );
