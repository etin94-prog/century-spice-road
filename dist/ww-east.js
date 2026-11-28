import { register, range, shuffle, seats } from './ww-core.js';
const months = [
  '송학',
  '매조',
  '벚꽃',
  '등나무',
  '난초',
  '모란',
  '홍싸리',
  '억새',
  '국화',
  '단풍',
  '비',
  '오동',
];
// Month × four cards. L=bright, A=animal, R=ribbon, C=plain.
const kinds = [
  'LRCC',
  'ARCC',
  'LRCC',
  'ARCC',
  'ARCC',
  'ARCC',
  'ARCC',
  'LACC',
  'ARCC',
  'ARCC',
  'LARC',
  'LCCC',
].join('');
function yaku(cards) {
  const count = (k) => cards.filter((c) => kinds[c] === k).length,
    all = (a) => a.every((c) => cards.includes(c));
  const lights = count('L'),
    rain = cards.includes(40);
  let n = lights === 5 ? 10 : lights === 4 ? (rain ? 7 : 8) : lights === 3 && !rain ? 5 : 0;
  if (all([20, 24, 36])) n += 5;
  if (all([1, 5, 9])) n += 5;
  if (all([21, 33, 37])) n += 5;
  n +=
    Math.max(0, count('A') - 4) +
    Math.max(0, count('R') - 4) +
    Math.max(0, count('C') + Number(cards.includes(32)) - 9);
  if (all([8, 32])) n += 5;
  if (all([28, 32])) n += 5;
  return n;
}
register(
  19,
  '같은 달의 손패와 바닥패를 짝지어 획득합니다. 손패 한 장과 더미 한 장을 차례로 냅니다. 광·띠·열끗 조합을 만들면 멈춰 점수를 얻거나 코이코이를 선언할 수 있습니다. 3월전입니다.',
  (ui) => {
    let stock,
      hand,
      field,
      won,
      previous,
      round = 0,
      pending = null,
      prompt = false,
      opener = 0;
    const total = [0, 0];
    function deal() {
      round++;
      do {
        stock = shuffle(range(48));
        hand = [stock.splice(0, 8), stock.splice(0, 8)];
        field = stock.splice(0, 8);
      } while (months.some((_, m) => field.filter((c) => c >> 2 === m).length === 4));
      won = [[], []];
      previous = [0, 0];
      pending = null;
      prompt = false;
    }
    deal();
    const label = (c) => months[c >> 2] + ' ' + { L: '광', A: '열끗', R: '띠', C: '피' }[kinds[c]];
    const picture = (ui, row, c, fn, weight = 0) => {
      const button = ui.button(row, label(c), fn, 'flower kind' + kinds[c], weight);
      button.style.backgroundImage =
        'linear-gradient(transparent 55%,#132b25dd),url(art/worldwide/hana-' + c + '.svg)';
    };
    function endRound(p, points) {
      if (p >= 0) {
        total[p] += points;
        opener = p;
      }
      if (round === 3) {
        ui.score(total.join(' : '));
        ui.victor(total[0] === total[1] ? -1 : total[0] > total[1] ? 0 : 1);
      } else {
        deal();
        ui.paint(opener);
      }
    }
    function resolve(p, c, fromDeck) {
      const matches = field.filter((v) => v >> 2 === c >> 2);
      if (matches.length === 2) {
        pending = { c, matches, fromDeck };
        ui.paint();
        return;
      }
      capture(p, c, matches, fromDeck);
    }
    function capture(p, c, matches, fromDeck) {
      if (matches.length) {
        won[p].push(c, ...matches);
        field = field.filter((v) => !matches.includes(v));
      } else field.push(c);
      pending = null;
      if (!fromDeck) {
        resolve(p, stock.pop(), true);
        return;
      }
      if (yaku(won[p]) > previous[p]) {
        prompt = true;
        ui.paint();
        return;
      }
      if (!hand[1 - p].length) {
        endRound(-1, 0);
        return;
      }
      ui.paint(1 - p);
    }
    return () => {
      const p = ui.turn;
      ui.score(round + ' / 3월　나 ' + total[0] + ' · 상대 ' + total[1]);
      ui.section('바닥패');
      const table = ui.row();
      for (const c of field)
        picture(
          ui,
          table,
          c,
          pending?.matches.includes(c) ? () => capture(p, pending.c, [c], pending.fromDeck) : null,
          kinds[c] === 'L' ? 4 : 0,
        );
      if (pending) {
        ui.status(label(pending.c) + ' · 가져올 바닥패 선택');
        return;
      }
      if (prompt) {
        const v = yaku(won[p]),
          row = ui.row();
        ui.button(row, v + '점으로 멈추기', () => endRound(p, v), 'primary', 2);
        if (hand[p].length)
          ui.button(row, '코이코이 · 계속', () => {
            previous[p] = v;
            prompt = false;
            ui.paint(1 - p);
          });
        return;
      }
      ui.section(p ? '상대 손패' : '내 손패');
      const row = ui.row();
      hand[p].forEach((c, i) => {
        const fn = () => {
          hand[p].splice(i, 1);
          resolve(p, c, false);
        };
        if (p) ui.button(row, '◆', fn, 'card-back', field.some((v) => v >> 2 === c >> 2) ? 1 : 0);
        else picture(ui, row, c, fn);
      });
      ui.section('내가 모은 패');
      const taken = ui.row();
      won[0].forEach((c) => picture(ui, taken, c, null));
    };
  },
);
