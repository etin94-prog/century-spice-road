import { register, range, shuffle, seats, element } from './ww-core.js';
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
const kindNames = { L: '광', A: '열끗', R: '띠', C: '피' };
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
    // Display only: the card picked up from my hand, what the last turn did, cards that just landed.
    let chosen = null,
      lastTurn = null,
      note = '';
    const fresh = new Set();
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
      chosen = null;
      lastTurn = null;
      fresh.clear();
    }
    deal();
    const label = (c) => months[c >> 2] + ' ' + kindNames[kinds[c]];
    const sameMonth = (c) => field.filter((v) => v >> 2 === c >> 2);
    // A card face: the art fills the card; month and kind sit on a small band so they never
    // cover the picture or wrap.
    const picture = (ui, row, c, fn, weight = 0, extra = '') => {
      const button = ui.button(
        row,
        '',
        fn,
        'flower hana-card kind' + kinds[c] + (fresh.has(c) ? ' fresh' : '') + extra,
        weight,
        label(c),
      );
      button.style.backgroundImage = 'url(art/worldwide/hana-' + c + '.svg)';
      button.append(
        element('span', 'hana-kind', kindNames[kinds[c]]),
        element('span', 'hana-month', months[c >> 2]),
      );
      return button;
    };
    function endRound(p, points) {
      if (p >= 0) {
        total[p] += points;
        opener = p;
      }
      note = p >= 0 ? round + '월 · ' + seats[p] + ' ' + points + '점' : round + '월 · 무승부';
      if (round === 3) {
        prompt = false;
        pending = null;
        ui.score('나 ' + total[0] + ' : ' + total[1] + ' AI');
        ui.paint(0);
        ui.victor(total[0] === total[1] ? -1 : total[0] > total[1] ? 0 : 1);
        const result = document.querySelector('#result');
        result.textContent = '3월 합계 ' + total[0] + ' : ' + total[1] + ' · ' + result.textContent;
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
      lastTurn?.log.push(
        (fromDeck ? '더미 ' : '') +
          label(c) +
          (matches.length ? ' → ' + matches.map(label).join(', ') + ' 획득' : ' → 바닥'),
      );
      fresh.add(c);
      matches.forEach((m) => fresh.add(m));
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
    // Playing a hand card. With two same-month cards on the field, a field card the player
    // already tapped is the one taken (the same choice the pending step asks for).
    function playHand(p, c, pick) {
      lastTurn = { p, log: [] };
      note = '';
      fresh.clear();
      chosen = null;
      hand[p].splice(hand[p].indexOf(c), 1);
      if (pick !== undefined && sameMonth(c).length === 2) capture(p, c, [pick], false);
      else resolve(p, c, false);
    }
    // One seat: hand (backs for the AI), captured cards grouped by kind, and current points.
    function seat(owner, p) {
      const strip = element(
        'div',
        'hana-seat ' + (owner ? 'theirs' : 'mine') + (owner === p && !ui.ended ? ' to-move' : ''),
      );
      ui.board.append(strip);
      const head = element('div', 'hana-who');
      head.append(
        element('b', '', owner ? seats[1] : seats[0]),
        element('span', 'hana-points', '역 ' + yaku(won[owner]) + '점'),
      );
      strip.append(head);
      if (owner) {
        const backs = element('div', 'hana-backs');
        backs.setAttribute('aria-label', 'AI 손패 ' + hand[1].length + '장');
        strip.append(backs);
        hand[1].forEach((c) => {
          if (p === 1 && !pending && !prompt)
            ui.button(backs, '◆', () => playHand(1, c), 'card-back hana-back', sameMonth(c).length ? 1 : 0);
          else backs.append(element('span', 'card-back hana-back'));
        });
      }
      const pile = element('div', 'hana-won');
      for (const k of 'LARC') {
        const cards = won[owner].filter((c) => kinds[c] === k);
        const group = element('span', 'hana-group' + (cards.length ? '' : ' none'));
        group.setAttribute('aria-label', kindNames[k] + ' ' + cards.length + '장');
        for (const c of cards.slice(-5)) {
          const mini = element('i', fresh.has(c) ? 'fresh' : '');
          mini.style.backgroundImage = 'url(art/worldwide/hana-' + c + '.svg)';
          group.append(mini);
        }
        group.append(element('small', '', kindNames[k] + ' ' + cards.length));
        pile.append(group);
      }
      strip.append(pile);
    }
    return () => {
      const p = ui.turn;
      ui.score(round + '/3월 · ' + total[0] + ':' + total[1]);
      if (chosen !== null && (p !== 0 || !hand[0].includes(chosen) || pending || prompt)) chosen = null;
      seat(1, p);
      const head = element('div', 'hana-head');
      head.append(element('b', 'hana-title', '바닥패'), element('span', 'hana-stock', '더미 ' + stock.length));
      const log = lastTurn && lastTurn.p !== p ? seats[lastTurn.p] + ': ' + lastTurn.log.join(' · ') : note;
      if (log) head.append(element('span', 'hana-log', log));
      ui.board.append(head);
      const table = element('div', 'row hana-field');
      ui.board.append(table);
      const pickable = chosen !== null ? sameMonth(chosen) : [];
      for (const c of field) {
        let card;
        if (pending?.matches.includes(c))
          card = picture(ui, table, c, () => capture(p, pending.c, [c], pending.fromDeck), kinds[c] === 'L' ? 4 : 0, ' match');
        else if (pickable.includes(c))
          card = picture(ui, table, c, () => playHand(0, chosen, c), 0, ' match');
        else card = picture(ui, table, c, null);
        if (card.tagName === 'SPAN')
          ui.why(
            card,
            pending
              ? '표시된 같은 달 패 중에서 가져올 한 장을 고르세요.'
              : chosen !== null
                ? months[chosen >> 2] + ' 패만 가져올 수 있어요. 손패를 다시 골라도 돼요.'
                : '먼저 아래 손패를 고르세요. 같은 달 바닥패를 가져와요.',
          );
      }
      if (pending) {
        ui.status(
          p
            ? seats[p] + ' 차례 · ' + (pending.fromDeck ? '더미 ' : '') + label(pending.c) + '의 짝을 고르는 중'
            : '내 차례 · ' + (pending.fromDeck ? '더미 ' : '') + label(pending.c) + ' — 가져올 바닥패를 고르세요',
        );
      } else if (chosen !== null) {
        ui.status(
          pickable.length
            ? label(chosen) + ' · 「잡기」 바닥패를 고르거나 한 번 더 누르세요'
            : label(chosen) + ' · 짝이 없어요. 한 번 더 누르면 바닥에 내요',
        );
      }
      if (prompt) {
        const v = yaku(won[p]),
          row = element('div', 'row hana-prompt');
        ui.board.append(row);
        row.append(element('p', 'hana-prompt-title', (p ? seats[p] + ' ' : '') + '역 완성 · ' + v + '점'));
        ui.button(row, v + '점으로 멈추기', () => endRound(p, v), 'primary', 2);
        if (hand[p].length)
          ui.button(row, '코이코이 · 계속', () => {
            previous[p] = v;
            prompt = false;
            ui.paint(1 - p);
          });
        if (!p) ui.status('역 완성! 멈출지 코이코이할지 고르세요');
      }
      // My hand lies on its own wooden rail with a small header, so it never reads as field.
      const rail = element('div', 'hana-rail');
      ui.board.append(rail);
      rail.append(element('div', 'hana-rail-head', '내 손패 ' + hand[0].length + '장'));
      const mine = element('div', 'row hana-hand');
      rail.append(mine);
      for (const c of hand[0]) {
        const open = p === 0 && !pending && !prompt && !ui.ended;
        const card = picture(
          ui,
          mine,
          c,
          open
            ? () => {
                if (chosen === c) playHand(0, c);
                else {
                  chosen = c;
                  ui.paint();
                }
              }
            : null,
          0,
          (chosen === c ? ' selected' : '') + (open && sameMonth(c).length ? ' has-match' : ''),
        );
        if (!open)
          ui.why(
            card,
            prompt ? '멈출지 코이코이할지 먼저 고르세요.' : pending ? '가져올 바닥패를 먼저 고르세요.' : 'AI 차례예요.',
          );
      }
      seat(0, p);
    };
  },
);
