import {
  register,
  range,
  shuffle,
  random,
  seats,
  deck,
  rank,
  suit,
  suits,
  face,
  cardStyle,
  element,
} from './ww-core.js';
// Card tables share one layout language (ww-fit-cards.css):
//   .seat-strip  opponents at the top: name, a small fan of backs, the count, the active seat underlined
//   .card-zone   the shared table in the middle (piles, lanes, the trick)
//   .hand        the player's cards at the bottom, under the thumb; .movable = can be played now,
//                .unplayable = cannot, and tapping it says why (data-why through ui.why)
//   .card-actions the primary action under the hand
//   .ai-tray     hidden: the AI's own options. The table picks from them by weight, exactly as before,
//                while the player's hand stays on screen during the AI turn.
function card(ui, row, c, fn, weight = 0, hidden = false) {
  const el = ui.button(
    row,
    hidden ? '◆' : face(c),
    fn,
    hidden ? 'card-back' : cardStyle(c) + ' illustrated',
    weight,
    hidden ? '뒷면 카드' : face(c),
  );
  if (!hidden && typeof window.card === 'function') printedCard(el, c);
  return el;
}
function printedCard(el, c) {
  el.classList.add('illustrated');
  el.setAttribute('aria-label', face(c));
  el.innerHTML = window.card(c);
}
function seasonFace(el, symbol) {
  el.classList.add('season-face');
  el.dataset.mark = symbol;
  el.classList.toggle('long-mark', symbol.length > 2);
}
const rankName = (c) => face(c).slice(0, -1);
// Korean subject particle for a seat: 내가, AI 1이, AI 2가, AI 3이.
const subject = (s) => (s ? seats[s] + (s === 2 ? '가' : '이') : '내가');
const countName = (n) => ['', '한', '두', '세', '네'][n] || String(n);
function add(ui, el) {
  ui.board.append(el);
  return el;
}
const zone = (ui, cls) => add(ui, element('div', 'card-zone ' + cls));
const hand = (ui, cls = '') => add(ui, element('div', 'row hand ' + cls));
const actions = (ui) => add(ui, element('div', 'row card-actions'));
const label = (ui, text) => add(ui, element('h2', 'section-label hand-label', text));
function tray(ui) {
  const el = add(ui, element('div', 'ai-tray'));
  el.hidden = true;
  return el;
}
function caption(parent, text, cls = '') {
  const el = element('p', 'table-caption ' + cls, text);
  parent.append(el);
  return el;
}
const ready = (el) => (el.classList.add('movable'), el);
function deny(ui, el, message) {
  el.classList.add('unplayable');
  return ui.why(el, message);
}
// Ends the round, then paints the final position once more so the table agrees with the
// result: no stale turn marks, no playable glow, no action buttons under the result plaque.
function settle(ui, finish) {
  finish();
  if (!ui.ended) return;
  const result = document.querySelector('#result')?.textContent || '';
  ui.paint();
  if (result) ui.status(result);
  for (const el of ui.board.querySelectorAll('.movable, .unplayable, .selected, .target, .waiting'))
    el.classList.remove('movable', 'unplayable', 'selected', 'target', 'waiting');
  for (const bar of ui.board.querySelectorAll('.card-actions')) bar.replaceChildren();
}
// Tells the short-landscape layout how many cards share a row of the hand (CSS sizes them).
function fitHand(row, units, one = 7) {
  const rows = units > one ? 2 : 1;
  row.style.setProperty('--per-row', Math.max(3, Math.ceil(units / rows)));
  row.dataset.rows = rows;
  return row;
}
// During an AI turn the hand stays on screen, dimmed, and says why it cannot be played.
function waiting(ui, row, p) {
  if (!p || ui.ended) return;
  row.classList.add('waiting');
  for (const el of row.children) ui.why(el, seats[p] + ' 차례예요 · 잠시만요');
}
// A face-down pile with its count printed on the edge (or a short label such as '남은 12').
function deckPile(parent, count, name, tag) {
  const el = element('span', 'deck-pile' + (count ? '' : ' is-empty'));
  el.dataset.count = tag || count + '장';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', name + ' ' + count + '장');
  parent.append(el);
  return el;
}
// Opponents: name, a fan of backs and the count; the seat whose turn it is is underlined.
function seatStrip(ui, list) {
  const strip = add(ui, element('div', 'seat-strip'));
  strip.setAttribute('role', 'list');
  for (const s of list) {
    const chip = element('div', 'seat-chip' + (s.active ? ' is-turn' : '') + (s.out ? ' is-out' : ''));
    chip.setAttribute('role', 'listitem');
    const fan = element('span', 'mini-fan');
    fan.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < Math.min(s.count, 5); k++) fan.append(element('i'));
    chip.append(element('b', '', s.name), fan, element('span', 'seat-count', s.count + '장'));
    if (s.note) chip.append(element('em', 'seat-note' + (s.warn ? ' warn' : ''), s.note));
    strip.append(chip);
  }
  return strip;
}
// Marks the card that just arrived on a pile so the eye follows the last move.
function landing(memory, key, el) {
  if (memory.key !== undefined && memory.key !== key) el.classList.add('landed');
  memory.key = key;
  return el;
}
register(
  21,
  '색·숫자·기호가 같은 카드를 냅니다. 역방향·건너뛰기·두 장·세 장 받기와 색 변경이 있습니다. 두 장 남았을 때 라스트 카드를 선언하고 한 장을 내세요. 먼저 손패를 비우면 승리합니다.',
  (ui) => {
    const colors = ['산호', '비취', '호박', '청옥'],
      toward = ['산호로', '비취로', '호박으로', '청옥으로'],
      names = ['1', '2', '3', '4', '5', '6', '7', '8', '건너뛰기', '역방향', '+2', '+3'];
    let stock = shuffle(range(52)),
      top,
      active,
      dir = 1,
      debt = 0,
      declared = false,
      choosing = false,
      stalls = 0;
    const hands = range(4).map(() => stock.splice(0, 5)),
      pile = [];
    const color = (c) => Math.floor(c / 12),
      kind = (c) => (c >= 48 ? 12 : c % 12);
    const text = (c) => (c >= 48 ? '색 변경' : colors[color(c)] + ' ' + names[kind(c)]);
    do {
      top = stock.pop();
      if (kind(top) > 7) stock.unshift(top);
    } while (kind(top) > 7);
    pile.push(top);
    active = color(top);
    function draw(p, n) {
      let got = 0;
      for (let k = 0; k < n; k++) {
        if (!stock.length && pile.length > 1) stock = shuffle(pile.splice(0, pile.length - 1));
        if (!stock.length) break;
        hands[p].push(stock.pop());
        got++;
      }
      return got;
    }
    const next = (p, steps = 1) => (p + dir * steps + 8) % 4;
    let lastNote = '';
    const seen = {};
    // Skip and reverse print as a large symbol with the word under it (hidden on small cards).
    const icons = { 8: '⊘', 9: '⇄' };
    const tag = (el, c) => {
      const k = kind(c);
      seasonFace(el, icons[k] || names[k] || '✦');
      el.dataset.hue = c >= 48 ? '색 변경' : colors[color(c)];
      el.setAttribute('aria-label', text(c));
      if (icons[k]) el.append(element('small', 'mark-word', names[k]));
      return el;
    };
    return () => {
      const p = ui.turn,
        h = hands[p],
        mine = hands[0];
      ui.score('');
      seatStrip(
        ui,
        [1, 2, 3].map((s) => ({
          name: seats[s],
          count: hands[s].length,
          active: s === p && !ui.ended,
          note: hands[s].length === 1 ? '한 장!' : '',
          warn: hands[s].length === 1,
        })),
      );
      const table = zone(ui, 'lc-table');
      const piles = element('div', 'pile-pair');
      table.append(piles);
      ui.why(deckPile(piles, stock.length, '뽑을 더미'), '카드는 아래 “받고 넘기기”로 받아요.');
      const shown = ui.button(piles, text(top), null, 'last-face pile-top shade' + active);
      tag(shown, top);
      shown.dataset.hue = colors[active];
      landing(seen, pile.length + ':' + top + ':' + active, shown);
      ui.why(shown, '버린 더미예요. 손패에서 낼 카드를 고르세요.');
      const call = element('div', 'lc-call');
      call.append(
        element('span', 'lc-swatch shade' + active),
        element('b', '', colors[active]),
        element('span', 'lc-dir', dir === 1 ? '↻ 시계 방향' : '↺ 반대 방향'),
      );
      if (debt) call.append(element('span', 'lc-debt', '+' + debt + ' 누적'));
      table.append(call);
      if (lastNote) caption(table, lastNote, 'last-note');
      if (choosing) {
        label(ui, p ? subject(p) + ' 색을 고르는 중' : '다음 색 고르기');
        const row = add(ui, element('div', 'row lc-colors'));
        colors.forEach((v, i) => {
          const el = ui.button(
            row,
            v,
            () => {
              active = i;
              choosing = false;
              lastNote = seats[p] + ' · ' + toward[i] + ' 색 변경';
              ui.paint(next(p));
            },
            'last-face shade' + i,
            h.filter((c) => color(c) === i).length,
          );
          seasonFace(el, v);
          if (!p) ready(el);
        });
        const rest = fitHand(hand(ui, 'lc-hand'), mine.length);
        mine.forEach((c) => {
          const el = tag(ui.button(rest, text(c), null, 'last-face shade' + color(c)), c);
          if (!p) deny(ui, el, '먼저 위에서 다음 색을 고르세요.');
        });
        waiting(ui, rest, p);
        return;
      }
      ui.status(
        seats[p] +
          ' · ' +
          colors[active] +
          (dir === 1 ? ' ↻' : ' ↺') +
          (debt ? ' · 누적 ' + debt + '장' : ''),
      );
      const valid = (c) => {
        const k = kind(c);
        return debt ? k === kind(top) : k === 12 || color(c) === active || kind(top) === k;
      };
      const reason = debt
        ? names[kind(top)] + ' 공격 중에는 ' + names[kind(top)] + '만 낼 수 있어요. 아니면 ' + debt + '장 받으세요.'
        : colors[active] + ' 색, ‘' + names[kind(top)] + '’, 색 변경 카드만 낼 수 있어요.';
      let count = 0;
      const ai = p ? tray(ui) : null;
      label(
        ui,
        '내 손패 ' + mine.length + '장' + (declared && !p ? ' · 라스트 카드 선언함' : p && !ui.ended ? ' · ' + seats[p] + ' 차례' : ''),
      );
      const row = fitHand(hand(ui, 'lc-hand'), mine.length);
      const playCard = (c, i) => () => {
        const k = kind(c);
        const penalty = !p && !declared && h.length === 2;
        h.splice(i, 1);
        if (penalty) draw(p, 2);
        stalls = 0;
        declared = false;
        top = c;
        pile.push(c);
        lastNote = seats[p] + ' · ' + text(c) + (penalty ? ' · 선언을 잊어 2장 받음' : '');
        if (!h.length) {
          settle(ui, () => ui.victor(p));
          ui.score(seats[p] + ' · 손패 0장');
          return;
        }
        if (k === 12) {
          choosing = true;
          ui.paint();
          return;
        }
        active = color(c);
        if (k === 9) dir = -dir;
        if (k >= 10) debt += k - 8;
        ui.paint(next(p, k === 8 ? 2 : 1));
      };
      if (p) {
        // The AI's options, in hand order with the original weights.
        h.forEach((c, i) => {
          const k = kind(c),
            ok = valid(c);
          if (ok) count++;
          ui.button(ai, '◆', ok ? playCard(c, i) : null, 'card-back', k === 12 ? -2 : k);
        });
        mine.forEach((c) => tag(ui.button(row, text(c), null, 'last-face shade' + color(c)), c));
        waiting(ui, row, p);
      } else {
        const sorted = h.map((c, i) => [c, i]).sort((a, b) => color(a[0]) - color(b[0]) || kind(a[0]) - kind(b[0]));
        for (const [c, i] of sorted) {
          const k = kind(c),
            ok = valid(c);
          if (ok) count++;
          const el = tag(
            ui.button(row, text(c), ok ? playCard(c, i) : null, 'last-face shade' + color(c), k === 12 ? -2 : k),
            c,
          );
          if (ok) ready(el);
          else deny(ui, el, reason);
        }
      }
      const bar = actions(ui);
      if (!p && h.length === 2 && !declared)
        ui.button(
          bar,
          '라스트 카드 선언',
          () => {
            declared = true;
            ui.paint();
          },
          'primary',
        );
      if (debt || !count)
        ui.button(
          p ? ai : bar,
          (debt || 1) + '장 받고 넘기기',
          () => {
            const got = draw(p, debt || 1);
            debt = 0;
            declared = false;
            stalls = got ? 0 : stalls + 1;
            lastNote = seats[p] + ' · ' + got + '장 받음';
            ui.paint(next(p));
            if (stalls >= 4)
              settle(ui, () =>
                ui.finish('교착 · ' + hands.map((h, i) => seats[i] + ' ' + h.length + '장').join(' · ')),
              );
          },
          p ? '' : 'primary',
          -10,
        );
    };
  },
);
register(
  24,
  '같은 숫자를 한 장 또는 여러 장 냅니다. 직전과 같은 장수로 더 높은 숫자를 내야 합니다. 3이 가장 낮고 2가 가장 높습니다. 먼저 패를 비우면 대부호가 됩니다.',
  (ui) => {
    const pile = deck(),
      hands = range(4).map(() => pile.splice(0, 13)),
      passed = new Set(),
      order = [];
    let top = null,
      last = 0;
    const strength = (c) => (rank(c) + 10) % 13;
    let pick = null,
      lastNote = '';
    const seen = {};
    return () => {
      const p = ui.turn,
        h = hands[p],
        groups = new Map();
      h.forEach((c) => {
        const s = strength(c);
        groups.set(s, [...(groups.get(s) || []), c]);
      });
      ui.score('');
      seatStrip(
        ui,
        [1, 2, 3].map((s) => ({
          name: seats[s],
          count: hands[s].length,
          active: s === p && !ui.ended,
          out: order.includes(s),
          note: order.includes(s) ? order.indexOf(s) + 1 + '위' : passed.has(s) ? '패스' : '',
        })),
      );
      const table = zone(ui, 'trick');
      if (top) {
        const fan = element('div', 'trick-fan');
        table.append(fan);
        top.cards.forEach((c) => card(ui, fan, c));
        landing(seen, top.cards.join(), fan);
        ui.why(fan, '바닥에 놓인 조합이에요. 손패에서 더 높은 조합을 고르세요.');
        caption(table, seats[last] + ' · ' + rankName(top.cards[0]) + ' ' + countName(top.cards.length) + ' 장', 'last-note');
      } else {
        landing(seen, '', table);
        table.append(element('span', 'empty-slot', '새 트릭'));
        if (lastNote) caption(table, lastNote, 'last-note');
      }
      function advance() {
        if (!h.length && !order.includes(p)) order.push(p);
        if (order.length === 3) {
          order.push(range(4).find((s) => !order.includes(s)));
          settle(ui, () => ui.finish(order.map((v, i) => i + 1 + '위 ' + seats[v]).join(' · ')));
          return;
        }
        let n = (p + 1) % 4;
        while (order.includes(n) || passed.has(n)) {
          n = (n + 1) % 4;
          if (n === last) break;
        }
        if (n === last || range(4).every((s) => s === last || passed.has(s) || order.includes(s))) {
          n = last;
          while (order.includes(n)) n = (n + 1) % 4;
          passed.clear();
          top = null;
          lastNote = '모두 패스 · ' + seats[n] + '부터 새 트릭';
        }
        ui.paint(n);
      }
      const play = (s, cards, count) => () => {
        const send = cards.slice(0, count);
        top = { s, cards: send };
        last = p;
        pick = null;
        hands[p].splice(0, h.length, ...h.filter((c) => !send.includes(c)));
        advance();
      };
      const pass = () => {
        passed.add(p);
        pick = null;
        advance();
      };
      const sorted = [...groups].sort((a, b) => a[0] - b[0]);
      const legal = (s, cards) =>
        range(cards.length)
          .map((k) => k + 1)
          .filter((count) => !(top && (count !== top.cards.length || s <= top.s)));
      if (p) {
        ui.status(subject(p) + ' 낼 조합을 고르는 중');
        // The AI's options, in the original order and weights.
        const ai = tray(ui);
        for (const [s, cards] of sorted)
          for (let count = 1; count <= cards.length; count++) {
            if (top && (count !== top.cards.length || s <= top.s)) continue;
            ui.button(ai, '◆ ×' + count, play(s, cards, count), 'playing-card', count * 20 - s);
          }
        if (top) ui.button(ai, '패스', pass, '', -20);
        label(ui, '내 손패 ' + hands[0].length + '장' + (ui.ended ? '' : ' · ' + seats[p] + ' 차례'));
        const row = hand(ui, 'pres-hand');
        const mine = new Map();
        hands[0].forEach((c) => mine.set(strength(c), [...(mine.get(strength(c)) || []), c]));
        for (const [, cards] of [...mine].sort((a, b) => a[0] - b[0])) group(row, cards, null);
        fitHand(row, width(mine));
        waiting(ui, row, p);
        actions(ui);
        return;
      }
      if (pick !== null && !(groups.has(pick) && legal(pick, groups.get(pick)).length > 1)) pick = null;
      ui.status(
        top
          ? rankName(top.cards[0]) + '보다 높은 ' + countName(top.cards.length) + ' 장을 내거나 패스'
          : '새 트릭 · 같은 숫자면 여러 장도 돼요',
      );
      label(ui, '내 손패 ' + h.length + '장 · 숫자별로 묶음');
      const row = fitHand(hand(ui, 'pres-hand'), width(groups));
      let any = false;
      for (const [s, cards] of sorted) {
        const counts = legal(s, cards);
        if (!counts.length) {
          const el = group(row, cards, null);
          deny(
            ui,
            el,
            top && cards.length < top.cards.length
              ? '지금은 같은 숫자 ' + countName(top.cards.length) + ' 장이 필요해요.'
              : rankName(top.cards[0]) + '보다 높은 숫자만 낼 수 있어요. 3이 가장 낮고 2가 가장 높아요.',
          );
          continue;
        }
        any = true;
        const el =
          counts.length === 1
            ? group(row, cards, play(s, cards, counts[0]), counts[0])
            : group(row, cards, () => {
                pick = pick === s ? null : s;
                ui.paint();
              });
        ready(el);
        if (pick === s) el.classList.add('selected');
      }
      const bar = actions(ui);
      if (pick !== null) {
        const cards = groups.get(pick);
        for (const count of legal(pick, cards))
          ui.button(bar, countName(count) + ' 장 내기', play(pick, cards, count), 'primary count-pick', count * 20 - pick);
      } else if (any && !top) caption(bar, '여러 장인 숫자는 누른 뒤 장수를 고르세요.', 'hint');
      if (top) ui.button(bar, any ? '패스' : '낼 수 있는 조합이 없어요 · 패스', pass, any ? '' : 'primary', -20);
      // One button per rank: the cards of that rank fanned, the badge says how many will be played.
      function group(parent, cards, act, count) {
        const el = ui.button(
          parent,
          face(cards[0]) + ' ×' + cards.length,
          act,
          'playing-card pres-group',
          0,
          rankName(cards[0]) + ' ' + cards.length + '장' + (count ? ', ' + count + '장 내기' : ''),
        );
        if (typeof window.card === 'function') {
          el.classList.add('illustrated');
          el.innerHTML = cards.map((c) => window.card(c)).join('');
        }
        el.style.setProperty('--fan', cards.length);
        // A badge only where it tells something: several cards, or a choice of how many.
        if (count && (count > 1 || cards.length > 1)) el.dataset.count = count + '장';
        else if (!count && act) el.dataset.count = '1~' + cards.length + '장';
        return el;
      }
      // A rank group is one card wide plus a strip for each card fanned behind it.
      function width(map) {
        return [...map.values()].reduce((sum, cards) => sum + 1 + 0.38 * (cards.length - 1), 0);
      }
    };
  },
);
register(
  25,
  '무늬마다 7을 중심으로 작은 숫자는 왼쪽, 큰 숫자는 오른쪽에 이어 냅니다. 낼 수 있는 패가 없으면 차례를 넘깁니다. 먼저 손을 비우세요.',
  (ui) => {
    const cards = deck(),
      hands = range(4).map(() => cards.splice(0, 13)),
      lanes = range(4).map(() => [8, 6]);
    let lastCard = null,
      lastNote = '';
    const names = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    return () => {
      const p = ui.turn,
        h = hands[p];
      ui.score('');
      seatStrip(
        ui,
        [1, 2, 3].map((s) => ({ name: seats[s], count: hands[s].length, active: s === p && !ui.ended })),
      );
      const table = zone(ui, 'sevens-table');
      const field = element('div', 'tiles suit-lanes');
      field.style.setProperty('--cols', 4);
      table.append(field);
      lanes.forEach(([lo, hi], s) => {
        const lane = document.createElement('div');
        lane.className = 'suit-lane';
        field.append(lane);
        const stack = element('div', 'lane-cards');
        lane.append(stack);
        const row = element('div','sevens-run');
        row.setAttribute('aria-label',suits[s]+' '+(lo>hi?'아직 비어 있음':names[lo-1]+'부터 '+names[hi-1]+'까지'));
        if (lo>hi) {
          const empty=element('span','run-empty',suits[s]+' 7');
          row.append(empty);
        } else {
          for(let r=lo;r<=hi;r++) {
            const id=s*13+r-1;
            const exposed=element('span','run-card'+(s%2?' red':'')+(id===lastCard?' recent':''),names[r-1]);
            exposed.dataset.suit=suits[s];row.append(exposed);
          }
        }
        stack.append(row);
        lane.append(
          element(
            'span',
            'lane-range',
            lo > hi ? '7부터' : names[lo - 1] + '–' + names[hi - 1],
          ),
        );
        // What this lane takes next, under the range (hidden on short landscape tables).
        if (lo <= hi && (lo > 1 || hi < 13))
          lane.lastChild.append(
            element('small', 'lane-next', [lo > 1 && '◂' + names[lo - 2], hi < 13 && names[hi] + '▸'].filter(Boolean).join(' ')),
          );
      });
      if (lastNote) caption(table, lastNote, 'last-note');
      const row = p ? null : hand(ui, 'sevens-hand');
      let count = 0;
      const playCard = (c, i, r, s, lo, hi) => () => {
        lanes[s] = [Math.min(lo, r), Math.max(hi, r)];
        h.splice(i, 1);
        lastCard = c;
        lastNote = seats[p] + ' · ' + face(c);
        ui.paint((p + 1) % 4);
        if (!h.length) settle(ui, () => ui.victor(p));
      };
      const entries = h.map((c, i) => [c, i]);
      if (!p) entries.sort((a, b) => suit(a[0]) - suit(b[0]) || rank(a[0]) - rank(b[0]));
      const ai = p ? tray(ui) : null;
      for (const [c, i] of entries) {
        const r = rank(c),
          s = suit(c),
          [lo, hi] = lanes[s],
          legal = r === lo - 1 || r === hi + 1;
        if (legal) count++;
        const el = card(ui, ai || row, c, legal ? playCard(c, i, r, s, lo, hi) : null, Math.abs(r - 7), !!p);
        if (p) continue;
        if (legal) ready(el);
        else
          deny(
            ui,
            el,
            lo > hi
              ? suits[s] + ' 줄은 7이 먼저 나와야 해요.'
              : suits[s] + ' 줄에는 ' + [lo > 1 && names[lo - 2], hi < 13 && names[hi]].filter(Boolean).join(' 또는 ') + '만 이을 수 있어요.',
          );
      }
      if (p) {
        ui.status(subject(p) + ' 고르는 중');
        if (!count)
          ui.button(ai, '패스', () => {
            lastNote = seats[p] + ' · 패스';
            ui.paint((p + 1) % 4);
          });
        label(ui, '내 손패 ' + hands[0].length + '장' + (ui.ended ? '' : ' · ' + seats[p] + ' 차례'));
        const mine = fitHand(hand(ui, 'sevens-hand'), hands[0].length);
        hands[0]
          .slice()
          .sort((a, b) => suit(a) - suit(b) || rank(a) - rank(b))
          .forEach((c) => card(ui, mine, c));
        waiting(ui, mine, p);
        actions(ui);
        return;
      }
      fitHand(row, h.length);
      ui.status(count ? '빛나는 카드를 이어 내세요' : '낼 카드가 없어요 · 패스하세요');
      table.after(element('h2', 'section-label hand-label', '내 손패 ' + h.length + '장'));
      const bar = actions(ui);
      if (!count)
        ui.button(
          bar,
          '패스',
          () => {
            lastNote = seats[p] + ' · 패스';
            ui.paint((p + 1) % 4);
          },
          'primary',
        );
    };
  },
);
register(
  26,
  '가운데 두 장 중 하나와 숫자가 하나 차이 나는 카드를 먼저 내세요. A와 K도 이어집니다. 어느 쪽도 낼 수 없으면 가운데 카드를 바꿉니다.',
  (ui) => {
    const cards = deck(),
      stocks = [cards.splice(0, 21), cards.splice(0, 21)],
      h = stocks.map((s) => s.splice(0, 4)),
      center = [cards.pop(), cards.pop()];
    const can = (c, t) => [1, 12].includes(Math.abs(rank(c) - rank(t)));
    function options(p) {
      return h[p].flatMap((c, i) => center.flatMap((t, j) => (can(c, t) ? [{ i, j }] : [])));
    }
    const by = [-1, -1],
      seen = [{}, {}];
    function put(p, i, j) {
      center[j] = h[p].splice(i, 1)[0];
      if (stocks[p].length) h[p].push(stocks[p].pop());
      by[j] = p;
      ui.paint();
      if (!h[p].length) settle(ui, () => ui.victor(p));
    }
    return () => {
      ui.score('');
      const opp = options(1),
        me = options(0);
      // The note line is always there, so the piles never move when the AI starts aiming.
      seatStrip(ui, [
        {
          name: seats[1],
          count: h[1].length + stocks[1].length,
          active: !!opp.length && !ui.ended,
          note: ui.ended ? '판 끝' : opp.length ? '노리는 중' : '낼 카드 없음',
        },
      ]);
      let pick = null;
      const table = zone(ui, 'speed-table');
      const piles = center.map((t, j) => {
        const slot = element('div', 'speed-pile');
        table.append(slot);
        const el = card(ui, slot, t, () => {
          if (pick !== null) {
            const i = h[0].indexOf(pick);
            if (can(pick, center[j])) return put(0, i, j);
            return ui.reject('고른 카드는 이 더미에 이어지지 않아요.', el);
          }
          const fits = h[0].filter((c) => can(c, center[j]));
          if (fits.length === 1) return put(0, h[0].indexOf(fits[0]), j);
          ui.reject(fits.length ? '어느 카드를 낼지 먼저 손패에서 고르세요.' : '이 더미에 이어질 카드가 손패에 없어요.', el);
        });
        el.classList.add('pile-top');
        landing(seen[j], t, el);
        caption(slot, by[j] < 0 ? '가운데 ' + (j + 1) : subject(by[j]) + ' 냄', 'last-note');
        return el;
      });
      const mineLeft = stocks[0].length;
      label(ui, '내 손패 · 더미 ' + mineLeft + '장 남음');
      const row = fitHand(hand(ui, 'speed-hand'), h[0].length);
      h[0].forEach((c, i) => {
        const fits = center.flatMap((t, j) => (can(c, t) ? [j] : []));
        if (!fits.length) {
          deny(
            ui,
            card(ui, row, c),
            '가운데 카드(' + rankName(center[0]) + '·' + rankName(center[1]) + ')보다 1 크거나 작은 숫자만 낼 수 있어요.',
          );
          return;
        }
        const el = card(ui, row, c, () => {
          if (fits.length === 1) return put(0, i, fits[0]);
          // Fits both piles: pick it up, then tap the pile.
          pick = pick === c ? null : c;
          row.querySelectorAll('.selected').forEach((b) => b.classList.remove('selected'));
          if (pick !== null) el.classList.add('selected');
          piles.forEach((b) => b.classList.toggle('target', pick !== null));
          ui.status(pick !== null ? face(c) + ' · 놓을 더미를 누르세요' : '내 차례');
        });
        ready(el);
      });
      const bar = actions(ui);
      if (!opp.length && !me.length)
        ui.button(
          bar,
          '가운데 두 장 교체',
          () => {
            if (cards.length < 2) {
              const pool = range(52).filter(
                (c) => ![...h.flat(), ...stocks.flat(), ...center].includes(c),
              );
              cards.splice(0, cards.length, ...shuffle(pool));
            }
            if (cards.length >= 2) {
              center[0] = cards.pop();
              center[1] = cards.pop();
            } else center.reverse();
            by[0] = by[1] = -1;
            ui.paint();
          },
          'primary',
        );
      ui.status(
        me.length ? '빛나는 카드를 가운데 더미에 내세요' : opp.length ? '낼 카드가 없어요 · 상대가 먼저 냅니다' : '둘 다 막혔어요 · 가운데 카드를 바꾸세요',
      );
      if (opp.length && !ui.ended) {
        const o = opp[random(opp.length)];
        ui.later(() => put(1, o.i, o.j), 1050);
      }
    };
  },
);
register(
  27,
  '같은 숫자의 카드 두 장을 찾으면 한 쌍을 얻고 한 번 더 뒤집습니다. 가장 많은 쌍을 모으세요.',
  (ui) => {
    const cards = shuffle(range(10).flatMap((i) => [i, i + 13])),
      open = new Set(),
      memory = new Map(),
      points = [0, 0];
    let picks = [],
      note = '';
    return () => {
      const p = ui.turn;
      ui.score('나 ' + points[0] + '쌍 · 상대 ' + points[1] + '쌍');
      if (!ui.ended)
        ui.status(p ? seats[p] + '의 차례' : picks.length === 1 ? '같은 숫자를 하나 더 찾으세요' : '카드 두 장을 뒤집으세요');
      // The last pair's verdict stays on the table until the next pair is checked.
      add(ui, element('p', 'table-caption last-note memory-note' + (note ? '' : ' is-quiet'), note || '같은 숫자 두 장을 찾으세요'));
      const grid = ui.grid(5, 'memory-grid');
      cards.forEach((c, i) => {
        const hidden = !picks.includes(i) && !open.has(i);
        const pair = [...memory.entries()].some(
          ([j, v]) => j !== i && !open.has(j) && v === memory.get(i),
        );
        const el = ui.button(
          grid,
          open.has(i) ? '' : hidden ? '◆' : face(c),
          hidden && picks.length < 2
            ? () => {
                picks.push(i);
                memory.set(i, rank(c));
                ui.paint();
                if (picks.length === 2) {
                  ui.later(() => {
                    const ok = rank(cards[picks[0]]) === rank(cards[picks[1]]);
                    if (ok) {
                      picks.forEach((j) => open.add(j));
                      points[p]++;
                    }
                    note = seats[p] + (ok ? ' · 짝! 한 번 더' : ' · 짝이 아니에요');
                    picks = [];
                    ui.paint(ok ? p : 1 - p);
                    if (open.size === cards.length)
                      settle(ui, () => ui.victor(points[0] === points[1] ? -1 : points[0] > points[1] ? 0 : 1));
                  }, 720);
                }
              }
            : null,
          open.has(i) ? 'gone' : hidden ? 'card-back' : cardStyle(c),
          picks.length
            ? memory.get(i) === rank(cards[picks[0]])
              ? 8
              : memory.has(i)
                ? 0
                : 2
            : pair
              ? 6
              : memory.has(i)
                ? 0
                : 2,
        );
        if (!open.has(i) && !hidden) {
          printedCard(el, c);
          el.classList.add('selected');
          ui.why(el, '이미 뒤집은 카드예요. 다른 카드를 고르세요.');
        } else if (hidden && picks.length >= 2) ui.why(el, '두 장을 확인하는 중이에요.');
        else if (open.has(i)) el.setAttribute('aria-label', '가져간 자리');
      });
    };
  },
);
register(
  28,
  '각자 한 장씩 뒤집어 높은 숫자를 낸 쪽이 가운데 카드를 가져갑니다. A가 가장 높고 동률이면 다음 승부로 누적됩니다. 더미를 모두 펼친 뒤 획득한 장수를 비교합니다.',
  (ui) => {
    const cards = deck(),
      h = [cards.splice(0, 26), cards],
      won = [0, 0];
    let pot = 0,
      shown = [],
      note = '첫 두 장을 펼치세요.';
    const seen = [{}, {}];
    return () => {
      ui.score('획득　나 ' + won[0] + '장 · 상대 ' + won[1] + '장');
      ui.status(note);
      const table = zone(ui, 'war-table');
      const r = shown.map((c) => (rank(c) === 1 ? 14 : rank(c)));
      // Each side: the deck still to flip, the card in play, and the pile of cards won so far.
      for (const side of [1, 0]) {
        const lane = element('div', 'war-side ' + (side ? 'theirs' : 'mine'));
        table.append(lane);
        lane.append(element('b', 'war-name', side ? seats[1] : '나'));
        ui.why(deckPile(lane, h[side].length, seats[side] + ' 남은 더미', '남은 ' + h[side].length), '아래 “두 장 펼치기”를 누르세요.');
        const slot = element('div', 'war-slot');
        lane.append(slot);
        const prize = deckPile(lane, won[side], seats[side] + ' 획득', '획득 ' + won[side]);
        prize.classList.add('won-pile');
        ui.why(prize, (side ? seats[1] + '이' : '내가') + ' 이겨서 가져온 카드 ' + won[side] + '장이에요.');
        if (shown.length) {
          const el = card(ui, slot, shown[side]);
          el.classList.add(r[0] === r[1] ? 'tie' : r[side] > r[1 - side] ? 'won' : 'lost');
          landing(seen[side], h[0].length, el);
          ui.why(el, '아래 “두 장 펼치기”를 누르세요.');
        } else ui.why(card(ui, slot, 0, null, 0, true), '아래 “두 장 펼치기”를 누르세요.');
      }
      if (pot) caption(table, '가운데 ' + pot + '장 · 다음 승부가 모두 가져가요', 'pot');
      const bar = actions(ui);
      if (h[0].length)
        ui.button(
          bar,
          '두 장 펼치기 · 남은 ' + h[0].length + '번',
          () => {
            shown = h.map((s) => s.pop());
            pot += 2;
            const r = shown.map((c) => (rank(c) === 1 ? 14 : rank(c)));
            if (r[0] === r[1]) note = '동점 · 가운데 ' + pot + '장';
            else {
              const p = r[0] > r[1] ? 0 : 1;
              won[p] += pot;
              note = seats[p] + ' ' + pot + '장 획득';
              pot = 0;
            }
            ui.paint();
            if (!h[0].length) settle(ui, () => ui.victor(won[0] === won[1] ? -1 : won[0] > won[1] ? 0 : 1));
          },
          'primary',
        );
    };
  },
);
register(
  29,
  'A부터 10까지를 자기 자리 열 곳에 채웁니다. 뽑은 카드의 숫자 자리를 뒤집고, 거기서 나온 카드로 계속합니다. J·Q·K나 이미 열린 숫자가 나오면 차례가 끝납니다.',
  (ui) => {
    const bag = deck(),
      boards = [bag.splice(0, 10), bag.splice(0, 10)],
      open = [new Set(), new Set()],
      discard = [];
    let current = null;
    const seen = {};
    return () => {
      const p = ui.turn;
      ui.score('나 ' + open[0].size + '/10 · 상대 ' + open[1].size + '/10');
      const dead = current !== null && (rank(current) > 10 || open[p].has(rank(current) - 1));
      const slots = {};
      for (const side of [1, 0]) {
        const head = element('h2', 'section-label tk-label' + (side === p && !ui.ended ? ' is-turn' : ''), (side ? seats[side] : '내 자리') + ' · ' + open[side].size + '/10');
        const grid = element('div', 'tiles tk-board ' + (side ? 'theirs' : 'mine'));
        grid.style.setProperty('--cols', 5);
        slots[side] = [head, grid];
        boards[side].forEach((c, i) => {
          const playable =
            side === p && current !== null && rank(current) === i + 1 && !open[p].has(i);
          const el = ui.button(
            grid,
            open[side].has(i) ? face(c) : String(i + 1),
            playable
              ? () => {
                  boards[p][i] = current;
                  current = c;
                  open[p].add(i);
                  ui.paint();
                  if (open[p].size === 10) settle(ui, () => ui.victor(p));
                }
              : null,
            open[side].has(i) ? cardStyle(c) : 'card-back ' + (playable ? 'target' : ''),
          );
          if (open[side].has(i)) printedCard(el, c);
          else el.dataset.slot = i + 1;
          if (playable) ready(el);
          else if (side)
            ui.why(el, '상대의 자리예요.');
          else if (open[0].has(i)) ui.why(el, '이미 채운 자리예요.');
          else
            ui.why(
              el,
              current === null
                ? '먼저 카드를 뽑으세요.'
                : dead
                  ? '뽑은 ' + face(current) + ' · 놓을 자리가 없어요. 버리고 넘기세요.'
                  : '뽑은 ' + face(current) + ' · ' + rank(current) + '번 자리에만 놓을 수 있어요.',
            );
        });
      }
      ui.board.append(...slots[1]);
      const middle = zone(ui, 'tk-middle');
      ui.why(deckPile(middle, bag.length, '뽑을 더미'), current === null ? '아래 “카드 뽑기”를 누르세요.' : '손에 든 카드를 먼저 놓으세요.');
      const held = element('div', 'tk-held');
      middle.append(held);
      if (ui.ended) {
        // The round is over: the last drawn card is no longer in anyone's hand.
        const done = open[0].size === 10 ? 0 : open[1].size === 10 ? 1 : -1;
        held.append(element('span', 'empty-slot', '끝'));
        caption(middle, done < 0 ? '판 끝' : (done ? seats[done] : '내 자리') + ' 10/10 완성', 'last-note');
      } else if (current !== null) {
        const el = card(ui, held, current);
        landing(seen, current, el);
        el.classList.add(dead ? 'lost' : 'won');
        ui.why(el, dead ? '놓을 자리가 없어요. 버리고 넘기세요.' : '빛나는 ' + rank(current) + '번 자리를 누르세요.');
        caption(middle, (p ? seats[p] : '내') + ' 손 · ' + face(current) + (dead ? ' · 놓을 곳 없음' : ' → ' + rank(current) + '번'), 'last-note');
      } else {
        landing(seen, null, held);
        held.append(element('span', 'empty-slot', '손'));
        caption(middle, p ? subject(p) + ' 뽑는 중' : '카드를 뽑아 시작하세요', 'last-note');
      }
      if (discard.length) {
        const el = card(ui, middle, discard.at(-1));
        el.classList.add('tk-discard');
        ui.why(el, '버린 카드예요.');
      }
      ui.board.append(...slots[0]);
      const bar = actions(ui);
      if (ui.ended) return;
      if (current === null) {
        ui.button(
          bar,
          '카드 뽑기',
          () => {
            if (!bag.length) bag.push(...shuffle(discard.splice(0)));
            current = bag.pop();
            ui.paint();
          },
          'primary',
        );
        return;
      }
      ui.status(seats[p] + ' · ' + face(current));
      if (dead)
        ui.button(
          bar,
          '버리고 차례 넘기기',
          () => {
            discard.push(current);
            current = null;
            ui.paint(1 - p);
          },
          'primary',
        );
    };
  },
);
// Two concentric rings of 52 places on a w×h grid (outer ring first, clockwise from the top left).
function ringSpots(w, h) {
  const spots = [];
  for (const inset of [0, 1]) {
    const right = w - 1 - inset,
      bottom = h - 1 - inset;
    for (let x = inset; x <= right; x++) spots.push([x, inset]);
    for (let y = inset + 1; y <= bottom; y++) spots.push([right, y]);
    for (let x = right - 1; x >= inset; x--) spots.push([x, bottom]);
    for (let y = bottom - 1; y > inset; y--) spots.push([inset, y]);
  }
  return spots;
}
// Portrait phones lay the ring out 7×10, landscape and wide screens 12×5; both leave a hole
// in the middle for the pile and the penalty cards.
// Distribute the backs by distance around the oval so the ends offer the same
// finger spacing as the long sides. In upright portrait the roomy grid remains available.
function ovalSpots(count) {
  const points = [], samples = 520;
  let length=0, previous;
  for (let i=0;i<=samples;i++) {
    const a=2*Math.PI*i/samples-Math.PI/2, x=.44*Math.cos(a), y=.37*Math.sin(a);
    if(previous) length+=Math.hypot(x-previous.x,(y-previous.y)/2.45);
    points.push({x,y,length,a});previous=points[i];
  }
  return range(count).map(i=>{
    const p=points.find(point=>point.length>=length*i/count);
    return {x:(.5+p.x)*100,y:(.5+p.y)*100,
      angle:Math.atan2(.37*Math.cos(p.a)/2.45,-.44*Math.sin(p.a))*180/Math.PI};
  });
}
const ovalRing = ovalSpots(52);
const tallRing = ringSpots(7, 10),
  wideRing = ringSpots(12, 5);
register(
  30,
  '고리에서 카드 한 장을 골라 가운데에 놓습니다. 직전 카드와 무늬가 같으면 가운데 카드를 모두 가져갑니다. 자신이 받은 벌점 카드를 다시 내도 됩니다. 고리가 비면 벌점 카드가 가장 적은 사람이 승리합니다.',
  (ui) => {
    const ring = deck(),
      pen = [[], []],
      pile = [];
    let lastNote = '';
    const seen = {};
    return () => {
      const p = ui.turn;
      ui.score('벌점　나 ' + pen[0].length + '장 · 상대 ' + pen[1].length + '장');
      function put(c) {
        const same = pile.length && suit(pile.at(-1)) === suit(c);
        pile.push(c);
        lastNote = seats[p] + ' · ' + face(c) + (same ? ' · 같은 무늬! 벌점 ' + pile.length + '장' : '');
        if (same) pen[p].push(...pile.splice(0));
        ui.paint(1 - p);
        if (ring.every((v) => v === null))
          settle(ui, () => ui.victor(pen[0].length === pen[1].length ? -1 : pen[0].length < pen[1].length ? 0 : 1));
      }
      const grid = ui.grid(12, 'ring-cards');
      const center = element('div', 'ring-center');
      grid.append(center);
      const pileBox = element('div', 'ring-pile');
      center.append(pileBox);
      if (pile.length) {
        const el = card(ui, pileBox, pile.at(-1));
        landing(seen, pile.length + ':' + pile.at(-1), el);
        ui.why(el, '고리에서 뒷면 카드를 한 장 고르세요.');
      } else {
        landing(seen, 0, pileBox);
        ui.why(ui.button(pileBox, '빈 더미', null, 'empty-slot'), '고리에서 뒷면 카드를 한 장 고르세요.');
      }
      const info = element('div', 'ring-info');
      center.append(info);
      info.append(element('b', '', '가운데 ' + pile.length + '장'));
      if (pile.length) info.append(element('span', 'ring-warn', '같은 무늬 ' + suits[suit(pile.at(-1))] + ' 주의'));
      if (lastNote) info.append(element('span', 'last-note', lastNote));
      const remaining = range(ring.length).filter(i => ring[i] !== null);
      if (!p && !ui.ended && remaining.length) {
        const pick=ui.button(info,'한 장 뽑기',()=>{
          const index=remaining[random(remaining.length)], value=ring[index];
          ring[index]=null; put(value);
        },'ring-draw');
        pick.setAttribute('aria-label','남은 뒷면 카드 중 한 장 뽑기');
      }
      ring.forEach((c, i) => {
        if (c === null) return;
        const el = card(
          ui,
          grid,
          c,
          () => {
            ring[i] = null;
            put(c);
          },
          0,
          true,
        );
        const [px, py] = tallRing[i],
          [lx, ly] = wideRing[i];
        const spot = ovalRing[i];
        el.style.setProperty('--oval-x',spot.x+'%');
        el.style.setProperty('--oval-y',spot.y+'%');
        el.style.setProperty('--tangent',spot.angle+'deg');
        el.style.setProperty('--px', px + 1);
        el.style.setProperty('--py', py + 1);
        el.style.setProperty('--lx', lx + 1);
        el.style.setProperty('--ly', ly + 1);
        el.style.setProperty('--fan-angle', ((i * 37) % 7) - 3 + 'deg');
        el.setAttribute('aria-label', i + 1 + '번 뒷면 카드');
      });
      // My penalty cards have their own strip in the ring, never under the ring cards.
      // Safe cards first; cards that would match the pile (red '!') at the end.
      const risky = (c) => !!pile.length && suit(pile.at(-1)) === suit(c);
      const strip = element('div', 'ring-pen-strip');
      grid.append(strip);
      strip.append(
        element('span', 'ring-pen-label', !pen[0].length ? '내 벌점 카드 없음' : '내 벌점 카드 ' + pen[0].length + '장' + (ui.ended ? '' : ' · 다시 낼 수 있어요')),
      );
      const box = element('div', 'ring-pen');
      strip.append(box);
      if (p && pen[p].length) {
        // The AI's options, in its own order with the original weights.
        const ai = tray(ui);
        pen[p].forEach((c, i) =>
          card(
            ui,
            ai,
            c,
            () => {
              pen[p].splice(i, 1);
              put(c);
            },
            risky(c) ? -1 : 1,
            true,
          ),
        );
      }
      const shown = pen[0].map((c, i) => [c, i]).sort((a, b) => risky(a[0]) - risky(b[0]) || suit(a[0]) - suit(b[0]) || rank(a[0]) - rank(b[0]));
      for (const [c, i] of shown) {
        const el = card(
          ui,
          box,
          c,
          p
            ? null
            : () => {
                pen[0].splice(i, 1);
                put(c);
              },
          0,
        );
        if (p || ui.ended) continue;
        if (risky(c)) {
          el.classList.add('danger');
          el.setAttribute('aria-label', face(c) + ', 가운데와 같은 무늬');
        } else el.classList.add('movable');
      }
      waiting(ui, box, p);
      if (!pen[0].length) box.append(element('span', 'ring-pen-empty', '같은 무늬를 내면 가운데 카드를 모두 받아요'));
      else if (box.scrollWidth > box.clientWidth + 2) {
        strip.classList.add('scrolls');
        strip.firstChild.textContent += ' · 옆으로 밀기';
      }
    };
  },
);
