export const games = new Map();
export function register(id, rules, start) {
  if (games.has(id)) throw Error('Duplicate game ' + id);
  games.set(id, { rules, start });
}
export const range = (n) => Array.from({ length: n }, (_, i) => i);
export const random = (n) => Math.floor(Math.random() * n);
export function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export const seats = ['나', 'AI 1', 'AI 2', 'AI 3'];
export const deck = () => shuffle(range(52));
export const rank = (c) => (c % 13) + 1;
export const suit = (c) => Math.floor(c / 13);
export const suits = ['♠', '♥', '♣', '♦'];
export const face = (c) =>
  ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c % 13] + suits[suit(c)];
export const cardStyle = (c) => 'playing-card ' + (suit(c) % 2 ? 'red' : 'black') +
  (rank(c) >= 11 ? ' portrait-' + ['jack', 'queen', 'king'][rank(c) - 11] : '');
export function element(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls || '';
  if (text !== undefined) el.textContent = text;
  return el;
}
export function runTable(def, signal) {
  const board = document.querySelector('#surface'),
    status = document.querySelector('#status'),
    score = document.querySelector('#score');
  let turn = 0,
    ended = false,
    pending = 0,
    generation = 0,
    draw,
    options = [];
  const zoom = document.querySelector('#boardZoom');
  let magnified = false;
  function wrapBoard(left = 0, top = 0) {
    const grid = board.querySelector('.board-grid');
    if (!grid || !zoom) return;
    zoom.hidden = Number(grid.style.getPropertyValue('--cols')) < 7;
    if (zoom.hidden || !magnified) return;
    const frame = element('div', 'zoom-frame');
    grid.replaceWith(frame);
    frame.append(grid);
    grid.style.setProperty('--zoom-cols', grid.style.getPropertyValue('--cols'));
    frame.scrollTo(left, top);
  }
  if (zoom) {
    zoom.hidden = true;
    zoom.setAttribute('aria-pressed', 'false');
    zoom.onclick = () => {
      magnified = !magnified;
      zoom.setAttribute('aria-pressed', String(magnified));
      zoom.textContent = magnified ? '축소' : '확대';
      const frame = board.querySelector('.zoom-frame');
      if (frame) {
        const grid = frame.firstElementChild;
        frame.replaceWith(grid);
      } else wrapBoard();
    };
  }
  function later(fn, ms) {
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (!signal.aborted) fn();
    }, ms);
  }
  signal.addEventListener('abort', () => clearTimeout(pending), { once: true });
  const ui = {
    signal,
    board,
    get turn() {
      return turn;
    },
    get ended() {
      return ended;
    },
    status(message) {
      status.textContent = message;
    },
    score(message) {
      score.textContent = message;
    },
    section(label) {
      if (label) board.append(element('h2', 'section-label', label));
    },
    grid(cols, cls = '') {
      const grid = element('div', 'tiles ' + cls);
      grid.style.setProperty('--cols', cols);
      board.append(grid);
      return grid;
    },
    row() {
      const row = element('div', 'row');
      board.append(row);
      return row;
    },
    button(parent, label, act, style = '', weight = 0, description) {
      const el = element(act ? 'button' : 'span', 'piece ' + style, label);
      if (description) el.setAttribute('aria-label', description);
      if (act && !ended) {
        const ticket = generation;
        const play = () => {
          if (ended || signal.aborted || ticket !== generation) return;
          if (typeof cardAudio !== 'undefined') cardAudio.cue('land');
          act();
        };
        options.push({ play, weight });
        el.disabled = turn !== 0;
        el.onclick = (event) => {
          if (turn === 0) {
            if (typeof confirmCardTouch === 'function') confirmCardTouch(event);
            play();
          }
        };
      } else if (act) el.disabled = true;
      parent.append(el);
      return el;
    },
    paint(next = turn) {
      const oldFrame = board.querySelector('.zoom-frame'),
        left = oldFrame?.scrollLeft || 0,
        top = oldFrame?.scrollTop || 0;
      generation++;
      clearTimeout(pending);
      turn = next;
      options = [];
      board.replaceChildren();
      status.textContent = ended ? '' : turn ? seats[turn] + '의 차례' : '내 차례';
      draw();
      wrapBoard(left, top);
      board.setAttribute('aria-busy', String(turn !== 0 && !ended));
      if (turn && !ended && options.length) {
        const best = Math.max(...options.map((o) => o.weight));
        const candidates = options.filter((o) => o.weight === best);
        later(candidates[random(candidates.length)].play, 480);
      }
    },
    later,
    finish(message) {
      ended = true;
      turn = 0;
      generation++;
      clearTimeout(pending);
      board.querySelectorAll('button').forEach((b) => (b.disabled = true));
      status.textContent = message;
      document.querySelector('#result').textContent = message;
      document.querySelector('#result').hidden = false;
    },
    victor(p) {
      if (typeof cardAudio !== 'undefined')
        cardAudio.result(p < 0 ? 'draw' : p === 0 ? 'win' : 'loss');
      ui.finish(p < 0 ? '무승부' : seats[p] + ' 승리');
    },
  };
  score.textContent = '';
  document.querySelector('#result').hidden = true;
  document.querySelector('#result').textContent = '';
  draw = def.start(ui);
  ui.paint();
  return ui;
}
export function coords(i, w) {
  return [i % w, Math.floor(i / w)];
}
export function neighbors(i, w, h, directions) {
  const [x, y] = coords(i, w);
  return directions
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([a, b]) => a >= 0 && b >= 0 && a < w && b < h)
    .map(([a, b]) => b * w + a);
}
export const orth = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export const diag = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
export function stones(ui, board, w, actions, style = '', symbols = ['', '●', '○']) {
  const grid = ui.grid(w, 'board-grid ' + style);
  board.forEach((v, i) => {
    const m = actions.get(i);
    const cell = ui.button(
      grid,
      symbols[v] ?? v,
      m?.play,
      'cell ' + (v ? 'occupied tone' + v : 'empty') + (m ? ' legal' : ''),
      m?.weight || 0,
      Math.floor(i / w) + 1 + '행 ' + ((i % w) + 1) + '열 ' + (style === 'drop' && v ? (v === 1 ? '빨강 원반' : '노랑 원반') : symbols[v] || '빈칸'),
    );
    if (style === 'hex') {
      cell.style.gridRow = Math.floor(i / w) + 1;
      cell.style.gridColumn = (2 * (i % w) + Math.floor(i / w) + 1) + ' / span 2';
    }
  });
}
