import { register } from './ww-core.js';
import { moveBoard } from './ww-paths.js';
import { Chess } from './ww-chess-engine.js';
register(
  16,
  '백으로 시작합니다. 말을 누른 뒤 표시된 칸을 선택하세요. 캐슬링, 앙파상, 승격과 체크메이트가 적용됩니다.',
  (ui) => {
    const game = new Chess(),
      icons = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
      values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const index = (s) => (8 - Number(s[1])) * 8 + s.charCodeAt(0) - 97;
    let selected = null,
      promos = null;
    function play(m) {
      game.move(m);
      selected = null;
      promos = null;
      ui.paint(game.turn() === 'w' ? 0 : 1);
    }
    return () => {
      const board = game.board().flat(),
        opts = game.moves({ verbose: true });
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
      ui.score(game.isCheck() ? '체크' : game.history().slice(-4).join('　') || '백 선공');
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
          (board[i] ? (board[i].color === 'w' ? 'ivory' : 'ebony') + ' man-' + board[i].type : ''),
      );
      if (promos) {
        const row = ui.row();
        for (const c of promos) ui.button(row, icons[c.m.promotion], () => play(c.m));
      }
      if (game.isGameOver()) ui.victor(game.isCheckmate() ? 1 - ui.turn : -1);
    };
  },
);
