import { register, element, seats } from './ww-core.js';
import { moveBoard } from './ww-paths.js';
import { Chess } from './ww-chess-engine.js';
const files = 'abcdefgh',
  names = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };
register(
  16,
  '백으로 시작합니다. 말을 누른 뒤 표시된 칸을 선택하세요. 캐슬링, 앙파상, 승격과 체크메이트가 적용됩니다.',
  (ui) => {
    const game = new Chess(),
      icons = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
      values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const index = (s) => (8 - Number(s[1])) * 8 + s.charCodeAt(0) - 97;
    const square = (i) => files[i % 8] + (8 - Math.floor(i / 8));
    let selected = null,
      promos = null;
    function play(m) {
      game.move(m);
      selected = null;
      promos = null;
      ui.paint(game.turn() === 'w' ? 0 : 1);
    }
    // Captured men sit in a tray beside the side that took them, with the material balance.
    function tray(side, taken, balance) {
      const me = side === 'w',
        row = element('div', 'chess chess-tray ' + (me ? 'mine' : 'theirs'));
      if (game.turn() === side && !game.isGameOver()) row.classList.add('to-move');
      row.append(element('span', 'tray-seat', me ? seats[0] + ' · 백' : seats[1] + ' · 흑'));
      const men = element('span', 'tray-men');
      men.setAttribute('aria-label', (me ? '내가' : 'AI가') + ' 잡은 말 ' + taken.length + '개');
      const color = me ? 'ebony' : 'ivory';
      for (const t of 'qrbnp') {
        const n = taken.filter((x) => x === t).length;
        if (!n) continue;
        const group = element('span', 'tray-group');
        for (let k = 0; k < n; k++) group.append(element('i', color + ' man-' + t));
        men.append(group);
      }
      row.append(men, element('b', 'tray-balance', balance > 0 ? '+' + balance : ''));
      ui.board.append(row);
    }
    return () => {
      const board = game.board().flat(),
        opts = game.moves({ verbose: true }),
        past = game.history({ verbose: true }),
        check = game.isCheck();
      const moves = opts.map((m) => ({
        from: index(m.from),
        to: index(m.to),
        m,
        weight:
          (values[m.captured] || 0) * 10 +
          (m.san.includes('#') ? 1000 : m.san.includes('+') ? 2 : 0) +
          (values[m.promotion] || 0) +
          Math.random(),
      }));
      const byWhite = past.filter((m) => m.captured && m.color === 'w').map((m) => m.captured),
        byBlack = past.filter((m) => m.captured && m.color === 'b').map((m) => m.captured),
        worth = (list) => list.reduce((a, t) => a + values[t], 0),
        balance = worth(byWhite) - worth(byBlack);
      ui.score(
        check
          ? '체크!'
          : past.length
            ? Math.ceil(past.length / 2) + '수 · ' + game.history().slice(-2).join(' ')
            : '백 선공',
      );
      tray('b', byBlack, -balance);
      moveBoard(
        ui,
        board.map((pc) => (pc ? icons[pc.type] : '')),
        8,
        promos ? [] : moves,
        selected,
        (v) => (selected = v),
        (m) => {
          if (m.m.promotion && !ui.turn) {
            promos = moves.filter((o) => o.from === m.from && o.to === m.to);
            ui.paint();
          } else play(m.m);
        },
        'checker chess',
        (i) =>
          (((i % 8) + Math.floor(i / 8)) % 2 ? 'dark ' : 'light ') +
          (board[i] ? (board[i].color === 'w' ? 'ivory' : 'ebony') + ' man-' + board[i].type : 'empty'),
      );
      const grid = [...ui.board.querySelectorAll('.board-grid.chess')].pop(),
        cells = [...grid.children],
        last = past[past.length - 1],
        mine = new Set(moves.map((m) => m.from));
      // File letters and rank numbers ride on an overlay that never takes a tap.
      const coords = element('div', 'chess-coords');
      coords.setAttribute('aria-hidden', 'true');
      for (let k = 0; k < 8; k++) {
        // a1 is a dark square: label colours follow the square they sit on.
        const f = element('i', 'file' + (k % 2 ? '' : ' on-dark'), files[k]),
          r = element('i', 'rank' + (k % 2 ? ' on-dark' : ''), String(8 - k));
        f.style.gridArea = '8 / ' + (k + 1);
        r.style.gridArea = k + 1 + ' / 1';
        coords.append(f, r);
      }
      grid.append(coords);
      if (last) {
        cells[index(last.from)]?.classList.add('last-move');
        cells[index(last.to)]?.classList.add('last-move');
      } else grid.classList.add('no-last-move');
      cells.forEach((cell, i) => {
        const pc = board[i];
        cell.setAttribute(
          'aria-label',
          square(i) + (pc ? ' ' + (pc.color === 'w' ? '백 ' : '흑 ') + names[pc.type] : ''),
        );
        if (pc?.type === 'k' && pc.color === game.turn() && check) cell.classList.add('in-check');
        if (promos) return void ui.why(cell, '승격할 말을 아래에서 먼저 고르세요.');
        if (cell.matches('button')) return;
        if (pc && pc.color === 'b')
          ui.why(
            cell,
            selected !== null
              ? '그 말은 지금 잡을 수 없어요. 표시된 칸을 고르세요.'
              : '검은 말은 AI의 말이에요. 흰 말을 골라 주세요.',
          );
        else if (pc && !mine.has(i))
          ui.why(
            cell,
            check
              ? '체크예요! 킹을 지키는 수만 둘 수 있어요.'
              : names[pc.type] + '은(는) 지금 움직일 수 있는 칸이 없어요.',
          );
        else if (!pc && selected === null)
          ui.why(cell, check ? '체크예요! 킹을 지킬 말을 먼저 고르세요.' : '먼저 움직일 흰 말을 고르세요.');
      });
      tray('w', byWhite, balance);
      if (promos) {
        ui.status('승격할 말을 고르세요');
        cells[promos[0].to]?.classList.add('target');
        const row = element('div', 'row chess chess-promo');
        ui.board.append(row);
        for (const c of promos.slice().sort((x, y) => values[y.m.promotion] - values[x.m.promotion]))
          ui.button(
            row,
            icons[c.m.promotion],
            () => play(c.m),
            'promo-choice ivory man-' + c.m.promotion,
            0,
            names[c.m.promotion] + '(으)로 승격',
          );
      } else if (!ui.turn && check) ui.status('체크! 킹을 지키세요');
      if (game.isGameOver()) {
        const why = game.isCheckmate()
          ? '체크메이트'
          : game.isStalemate()
            ? '스테일메이트'
            : game.isInsufficientMaterial()
              ? '기물 부족'
              : game.isThreefoldRepetition()
                ? '같은 국면 세 번'
                : '50수 규칙';
        ui.victor(game.isCheckmate() ? 1 - ui.turn : -1);
        const result = document.querySelector('#result');
        result.textContent = why + ' · ' + result.textContent;
        ui.status(result.textContent);
      }
    };
  },
);
