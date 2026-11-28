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
} from './ww-core.js';
function card(ui, row, c, fn, weight = 0, hidden = false) {
  const el = ui.button(
    row,
    hidden ? '◆' : face(c),
    fn,
    hidden ? 'card-back' : cardStyle(c) + ' illustrated',
    weight,
    hidden ? '뒷면 카드' : face(c),
  );
  if (!hidden && typeof window.card === 'function') el.innerHTML = window.card(c);
  return el;
}
function handScore(ui, hands) {
  ui.score(hands.map((h, i) => seats[i] + ' ' + h.length + '장').join('　'));
}
register(
  21,
  '색·숫자·기호가 같은 카드를 냅니다. 역방향·건너뛰기·두 장·세 장 받기와 색 변경이 있습니다. 두 장 남았을 때 라스트 카드를 선언하고 한 장을 내세요. 먼저 손패를 비우면 승리합니다.',
  (ui) => {
    const colors = ['산호', '비취', '호박', '청옥'],
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
    return () => {
      const p = ui.turn,
        h = hands[p];
      handScore(ui, hands);
      const table = ui.row();
      ui.button(table, text(top), null, 'last-face shade' + active);
      if (choosing) {
        ui.section('다음 색 선택');
        const row = ui.row();
        colors.forEach((v, i) =>
          ui.button(
            row,
            v,
            () => {
              active = i;
              choosing = false;
              ui.paint(next(p));
            },
            'last-face shade' + i,
            h.filter((c) => color(c) === i).length,
          ),
        );
        return;
      }
      ui.status(
        seats[p] +
          ' · ' +
          colors[active] +
          (dir === 1 ? ' ↻' : ' ↺') +
          (debt ? ' · 누적 ' + debt + '장' : ''),
      );
      if (!p && h.length === 2 && !declared)
        ui.button(
          ui.row(),
          '라스트 카드 선언',
          () => {
            declared = true;
            ui.paint();
          },
          'primary',
        );
      const row = ui.row();
      let count = 0;
      h.forEach((c, i) => {
        const k = kind(c),
          valid = debt ? k === kind(top) : k === 12 || color(c) === active || kind(top) === k;
        if (valid) count++;
        ui.button(
          row,
          p ? '◆' : text(c),
          valid
            ? () => {
                const penalty = !p && !declared && h.length === 2;
                h.splice(i, 1);
                if (penalty) draw(p, 2);
                stalls = 0;
                declared = false;
                top = c;
                pile.push(c);
                if (!h.length) {
                  ui.score(seats[p] + ' · 손패 0장');
                  ui.victor(p);
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
              }
            : null,
          p ? 'card-back' : 'last-face shade' + color(c),
          k === 12 ? -2 : k,
        );
      });
      if (debt || !count)
        ui.button(
          ui.row(),
          (debt || 1) + '장 받고 넘기기',
          () => {
            const got = draw(p, debt || 1);
            debt = 0;
            declared = false;
            stalls = got ? 0 : stalls + 1;
            ui.paint(next(p));
            if (stalls >= 4)
              ui.finish(
                '교착 · ' + hands.map((h, i) => seats[i] + ' ' + h.length + '장').join(' · '),
              );
          },
          '',
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
    return () => {
      const p = ui.turn,
        h = hands[p],
        groups = new Map();
      h.forEach((c) => {
        const s = strength(c);
        groups.set(s, [...(groups.get(s) || []), c]);
      });
      handScore(ui, hands);
      const middle = ui.row();
      if (top) top.cards.forEach((c) => card(ui, middle, c));
      else ui.section('새 트릭');
      function advance() {
        if (!h.length && !order.includes(p)) order.push(p);
        if (order.length === 3) {
          order.push(range(4).find((s) => !order.includes(s)));
          ui.finish(order.map((v, i) => i + 1 + '위 ' + seats[v]).join(' · '));
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
        }
        ui.paint(n);
      }
      ui.section(p ? '상대가 낼 조합을 고르는 중' : '낼 카드 조합');
      const row = ui.row();
      for (const [s, cards] of [...groups].sort((a, b) => a[0] - b[0])) {
        for (let count = 1; count <= cards.length; count++) {
          if (top && (count !== top.cards.length || s <= top.s)) continue;
          const send = cards.slice(0, count);
          ui.button(
            row,
            p ? '◆ ×' + count : face(send[0]) + ' ×' + count,
            () => {
              top = { s, cards: send };
              last = p;
              hands[p].splice(0, h.length, ...h.filter((c) => !send.includes(c)));
              advance();
            },
            'playing-card',
            count * 20 - s,
          );
        }
      }
      if (top)
        ui.button(
          row,
          '패스',
          () => {
            passed.add(p);
            advance();
          },
          '',
          -20,
        );
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
    return () => {
      const p = ui.turn,
        h = hands[p];
      handScore(ui, hands);
      const field = ui.grid(4);
      lanes.forEach(([lo, hi], s) =>
        ui.button(
          field,
          suits[s] + ' ' + (lo > hi ? '–' : lo + ' … ' + hi),
          null,
          'playing-card ' + (s % 2 ? 'red' : ''),
        ),
      );
      const row = ui.row();
      let count = 0;
      h.forEach((c, i) => {
        const r = rank(c),
          s = suit(c),
          [lo, hi] = lanes[s],
          legal = r === lo - 1 || r === hi + 1;
        if (legal) count++;
        card(
          ui,
          row,
          c,
          legal
            ? () => {
                lanes[s] = [Math.min(lo, r), Math.max(hi, r)];
                h.splice(i, 1);
                ui.paint((p + 1) % 4);
                if (!h.length) ui.victor(p);
              }
            : null,
          Math.abs(r - 7),
          !!p,
        );
      });
      if (!count) ui.button(row, '패스', () => ui.paint((p + 1) % 4));
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
    function put(p, i, j) {
      center[j] = h[p].splice(i, 1)[0];
      if (stocks[p].length) h[p].push(stocks[p].pop());
      ui.paint();
      if (!h[p].length) ui.victor(p);
    }
    return () => {
      handScore(
        ui,
        h.map((v, i) => v.concat(stocks[i])),
      );
      const opp = options(1),
        me = options(0);
      center.forEach((t, j) => {
        const row = ui.row();
        card(ui, row, t);
        ui.section('이 더미에 낼 카드');
        const hand = ui.row();
        h[0].forEach((c, i) => card(ui, hand, c, can(c, t) ? () => put(0, i, j) : null));
      });
      if (!opp.length && !me.length)
        ui.button(ui.row(), '가운데 두 장 교체', () => {
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
          ui.paint();
        });
      if (opp.length) {
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
    let picks = [];
    return () => {
      const p = ui.turn;
      ui.score('나 ' + points[0] + '쌍 · 상대 ' + points[1] + '쌍');
      const grid = ui.grid(5);
      cards.forEach((c, i) => {
        const hidden = !picks.includes(i) && !open.has(i);
        const pair = [...memory.entries()].some(
          ([j, v]) => j !== i && !open.has(j) && v === memory.get(i),
        );
        ui.button(
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
                    picks = [];
                    ui.paint(ok ? p : 1 - p);
                    if (open.size === cards.length)
                      ui.victor(points[0] === points[1] ? -1 : points[0] > points[1] ? 0 : 1);
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
    return () => {
      ui.score('획득　나 ' + won[0] + '장 · 상대 ' + won[1] + '장');
      ui.status(note);
      const row = ui.row();
      if (shown.length) shown.forEach((c) => card(ui, row, c));
      else [0, 1].forEach(() => card(ui, row, 0, null, 0, true));
      if (h[0].length)
        ui.button(
          ui.row(),
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
            if (!h[0].length) ui.victor(won[0] === won[1] ? -1 : won[0] > won[1] ? 0 : 1);
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
    return () => {
      const p = ui.turn;
      ui.score('나 ' + open[0].size + '/10 · 상대 ' + open[1].size + '/10');
      for (const side of [1, 0]) {
        ui.section(seats[side]);
        const grid = ui.grid(5);
        boards[side].forEach((c, i) => {
          const playable =
            side === p && current !== null && rank(current) === i + 1 && !open[p].has(i);
          ui.button(
            grid,
            open[side].has(i) ? face(c) : String(i + 1),
            playable
              ? () => {
                  boards[p][i] = current;
                  current = c;
                  open[p].add(i);
                  ui.paint();
                  if (open[p].size === 10) ui.victor(p);
                }
              : null,
            open[side].has(i) ? cardStyle(c) : 'card-back ' + (playable ? 'selected' : ''),
          );
        });
      }
      if (current === null) {
        ui.button(
          ui.row(),
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
      if (rank(current) > 10 || open[p].has(rank(current) - 1))
        ui.button(ui.row(), '버리고 차례 넘기기', () => {
          discard.push(current);
          current = null;
          ui.paint(1 - p);
        });
    };
  },
);
register(
  30,
  '고리에서 카드 한 장을 골라 가운데에 놓습니다. 직전 카드와 무늬가 같으면 가운데 카드를 모두 가져갑니다. 자신이 받은 벌점 카드를 다시 내도 됩니다. 고리가 비면 벌점 카드가 가장 적은 사람이 승리합니다.',
  (ui) => {
    const ring = deck(),
      pen = [[], []],
      pile = [];
    return () => {
      const p = ui.turn;
      ui.score('벌점　나 ' + pen[0].length + '장 · 상대 ' + pen[1].length + '장');
      function put(c) {
        const same = pile.length && suit(pile.at(-1)) === suit(c);
        pile.push(c);
        if (same) pen[p].push(...pile.splice(0));
        ui.paint(1 - p);
        if (ring.every((v) => v === null))
          ui.victor(pen[0].length === pen[1].length ? -1 : pen[0].length < pen[1].length ? 0 : 1);
      }
      ui.section('가운데 ' + pile.length + '장');
      const row = ui.row();
      if (pile.length) card(ui, row, pile.at(-1));
      else ui.button(row, '빈 더미', null, 'card-back');
      const grid = ui.grid(8, 'ring-cards');
      ring.forEach((c, i) => {
        if (c === null) {
          ui.button(grid, '', null, 'gone');
          return;
        }
        card(
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
      });
      if (pen[p].length) {
        ui.section('다시 낼 벌점 카드');
        const hand = ui.row();
        pen[p].forEach((c, i) =>
          card(
            ui,
            hand,
            c,
            () => {
              pen[p].splice(i, 1);
              put(c);
            },
            pile.length && suit(pile.at(-1)) === suit(c) ? -1 : 1,
            !!p,
          ),
        );
      }
    };
  },
);
