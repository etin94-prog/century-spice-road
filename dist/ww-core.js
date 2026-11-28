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
// Touch press feedback for the world tables. board-press.js only knows the card tables'
// selectors, so every control and board piece here gets the same [data-table-pressed] cue.
// It never captures the pointer and never performs an action.
const pressable = 'main button, main a[href], main summary, #surface .piece, #surface [role="button"]';
let pressed;
function release() {
  pressed?.el.removeAttribute('data-table-pressed');
  pressed = undefined;
}
if (typeof document !== 'undefined' && !('wwPress' in document.documentElement.dataset)) {
  document.documentElement.dataset.wwPress = '';
  const opts = { capture: true, passive: true };
  document.addEventListener('pointerdown', (e) => {
    release();
    if (!e.isPrimary || e.pointerType !== 'touch') return;
    const el = e.target.closest?.(pressable);
    if (!el || el.matches(':disabled,[aria-disabled="true"]') || el.closest('[inert]')) return;
    pressed = { el, id: e.pointerId, x: e.clientX, y: e.clientY };
    el.setAttribute('data-table-pressed', '');
  }, opts);
  document.addEventListener('pointermove', (e) => {
    if (pressed?.id === e.pointerId && Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > 8) release();
  }, opts);
  for (const type of ['pointerup', 'pointercancel', 'scroll', 'visibilitychange']) document.addEventListener(type, release, opts);
  window.addEventListener('blur', release);
}
// Classes that describe interaction state, not the piece standing on a cell.
const stateClasses = /^(selected|target|legal|movable|last-move|refused|hint)$/;
function signature(cell) {
  return cell.textContent + '|' + [...cell.classList].filter((c) => !stateClasses.test(c)).sort().join(' ');
}
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
  let baseStatus = '',
    rejectTimer = 0,
    previous = null,
    lastMove = [];
  function setStatus(message) {
    clearTimeout(rejectTimer);
    status.classList.remove('is-rejected');
    baseStatus = message;
    status.textContent = message;
  }
  // Rejected input always explains itself in #status, then the turn line comes back.
  function reject(message, el) {
    if (!message || signal.aborted) return;
    clearTimeout(rejectTimer);
    status.textContent = message;
    status.classList.remove('is-rejected');
    void status.offsetWidth;
    status.classList.add('is-rejected');
    if (el instanceof Element) {
      el.classList.remove('refused');
      void el.offsetWidth;
      el.classList.add('refused');
      setTimeout(() => el.classList.remove('refused'), 450);
    }
    rejectTimer = setTimeout(() => {
      status.classList.remove('is-rejected');
      if (!signal.aborted && status.textContent === message) status.textContent = baseStatus;
    }, 2600);
  }
  signal.addEventListener('abort', () => {
    clearTimeout(rejectTimer);
    status.classList.remove('is-rejected');
  }, { once: true });
  // A tap on something that cannot act right now (span pieces, disabled buttons) gets a reason.
  // Disabled buttons fire pointer events but no click, so taps are recognised from pointerup.
  let down = null;
  board.addEventListener('pointerdown', (e) => {
    down = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, el: e.target } : null;
  }, { signal, capture: true });
  board.addEventListener('pointerup', (e) => {
    const start = down;
    down = null;
    if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
    const piece = start.el.closest?.('.piece,[data-why]');
    if (!piece || !board.contains(piece)) return;
    const why = piece.closest('[data-why]')?.dataset.why;
    if (piece.matches('button:enabled') && !why) return;
    if (piece.matches('.void,.gone')) return;
    if (ended) return reject('이번 판은 끝났어요. 새 판을 눌러 다시 시작하세요.', piece);
    if (turn !== 0) return reject(seats[turn] + '의 차례예요. 잠시 기다려 주세요.', piece);
    if (why) return reject(why, piece);
    if (!piece.closest('.board-grid')) return;
    const selected = board.querySelector('.board-grid .selected');
    if (selected && selected !== piece)
      return reject('그 칸으로는 갈 수 없어요. 표시된 칸을 고르세요.', piece);
    if (board.querySelector('.board-grid button:enabled'))
      reject('지금은 고를 수 없는 칸이에요. 표시된 칸을 누르세요.', piece);
    else reject('지금은 둘 수 있는 곳이 없어요.', piece);
  }, { signal });
  // Remember which cells changed between paints so the last move stays visible,
  // and mark the player's pieces that can act now.
  function markBoard() {
    const grids = [...board.querySelectorAll('.board-grid')];
    const now = grids.map((g) => [...g.querySelectorAll('.cell')]);
    const snap = now.map((cells) => cells.map(signature));
    if (previous && previous.length === snap.length) {
      const changed = [];
      snap.forEach((cells, g) => {
        if (cells.length !== previous[g].length) return;
        const diff = cells.flatMap((v, i) => (v !== previous[g][i] ? [i] : []));
        if (diff.length && diff.length <= Math.max(4, cells.length * 0.3)) changed.push([g, diff]);
      });
      if (changed.length) lastMove = changed;
    } else lastMove = [];
    previous = snap;
    grids.forEach((grid, g) => {
      if (grid.classList.contains('no-last-move') || grid.querySelector('.last-move')) return;
      for (const [gi, list] of lastMove) if (gi === g) for (const i of list) now[g][i]?.classList.add('last-move');
    });
    if (turn !== 0 || ended) return;
    grids.forEach((grid, g) => {
      if (grid.classList.contains('no-movable')) return;
      for (const cell of now[g]) {
        if (!cell.matches('button:enabled') || cell.matches('.target,.legal,.selected,.empty,.movable')) continue;
        if (cell.textContent.trim() || /man-|stone|king|tone|occupied|hare|engraved|men/.test(cell.className))
          cell.classList.add('movable');
      }
    });
  }
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
      setStatus(message);
    },
    // Explain why a move was refused: the reason shows in #status for 2.6 s, then the turn line returns.
    reject,
    // Attach a reason to a piece that cannot act now; tapping it shows the reason through reject().
    why(el, message) {
      if (el) el.dataset.why = message;
      return el;
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
      setStatus(ended ? '' : turn ? seats[turn] + '의 차례' : '내 차례');
      draw();
      markBoard();
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
      board.querySelectorAll('.movable').forEach((b) => b.classList.remove('movable'));
      setStatus(message);
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
