import { decorateTile } from './ww-tile-art.js';
import { register, range, seats, element } from './ww-core.js';
import { Mahjong, MahjongAI } from './ww-mahjong-engine.js';
const zNames = ['', '東', '南', '西', '北', '白', '發', '中'];
const winds = ['동', '남', '서', '북'];
function tile(p) {
  return p[0] === 'z'
    ? zNames[p[1]]
    : (p[1] === '0' ? '赤5' : p[1]) + ({ m: '萬', s: '索', p: '筒' }[p[0]] || '');
}
// A meld string such as "p555=" or "m1-23" as tile codes.
function meldTiles(m) {
  const s = m[0];
  return [...m.slice(1).replace(/[^0-9]/g, '')].map((d) => s + d);
}
// A shoupai string such as "m123p406z11m5*,s555=" as concealed tile codes plus melds.
// The engine appends the drawn (winning) tile last, so it is the last concealed code.
function parseHand(str) {
  const [conc = '', ...melds] = String(str || '').split(',');
  const tiles = [];
  let suit = '';
  for (const ch of conc) {
    if (/[mpsz]/.test(ch)) suit = ch;
    else if (/\d/.test(ch) && suit) tiles.push(suit + ch);
  }
  return { tiles, melds: melds.filter(Boolean) };
}
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
register(
  20,
  '동장 네 국을 AI 세 명과 진행합니다. 패를 눌러 버리고, 가능한 차례에 리치·치·퐁·깡·론·쯔모를 선택하세요. 연장과 점수는 리치 마작 규칙을 따릅니다.',
  (ui) => {
    let choices = [],
      message = '패를 섞는 중',
      human;
    // Display only: which seat discarded last, whether riichi is armed, the last hand's result.
    // start: points by player id when the hand ended (for the +/- chips); final: the
    // closing totals from the engine's result, which the seats show once the game is over.
    let lastDiscard = -1,
      riichiArmed = false,
      outcome = null,
      start = null,
      final = null,
      rank = null;
    function ask(player, opts, text) {
      choices = opts;
      message = text;
      riichiArmed = false;
      if (!ui.signal.aborted) ui.paint();
    }
    class Human extends MahjongAI {
      discardOptions() {
        const opts = [];
        for (const p of this.get_dapai(this.shoupai)) {
          opts.push([tile(p), { dapai: p }]);
          if (this.allow_lizhi(this.shoupai, p)) opts.push(['리치 ' + tile(p), { dapai: p + '*' }]);
        }
        return opts;
      }
      action_zimo(data, gang) {
        if (data.l !== this._menfeng) return this._callback();
        const opts = this.discardOptions();
        if (this.select_hule(null, gang)) opts.unshift(['쯔모', { hule: '-' }]);
        for (const m of this.get_gang_mianzi(this.shoupai) || [])
          opts.push(['깡 ' + m, { gang: m }]);
        if (this.allow_pingju(this.shoupai)) opts.push(['구종구패', { daopai: '-' }]);
        ask(this, opts, '내 차례 · 버릴 패를 누르세요');
      }
      action_dapai(data) {
        // Every discard redraws the table so the rivers stay current between my turns.
        lastDiscard = data.l;
        if (!ui.signal.aborted && !choices.length) ui.paint();
        if (data.l === this._menfeng) return super.action_dapai(data);
        const d = ['', '+', '=', '-'][(4 + data.l - this._menfeng) % 4],
          p = data.p.slice(0, 2) + d,
          opts = [];
        if (this.select_hule(data)) opts.push(['론', { hule: '-' }]);
        for (const [fn, label] of [
          ['get_peng_mianzi', '퐁'],
          ['get_chi_mianzi', '치'],
          ['get_gang_mianzi', '깡'],
        ])
          for (const m of this[fn](this.shoupai, p) || [])
            opts.push([label + ' ' + m, { fulou: m }]);
        if (!opts.length) return this._callback(this.select_daopai() ? { daopai: '-' } : undefined);
        opts.push(['넘기기', {}]);
        const calls = [...new Set(opts.slice(0, -1).map(([label]) => label.split(' ')[0]))].join('·');
        ask(this, opts, seats[this.model.player_id[data.l]] + '의 ' + tile(p) + ' — ' + calls + ' 할까요? (넘기기 가능)');
      }
      action_fulou(data) {
        if (data.l !== this._menfeng || /^[mpsz]\d{4}/.test(data.m)) return this._callback();
        ask(this, this.discardOptions(), '내 차례 · 버릴 패를 누르세요');
      }
      action_gang(data) {
        if (data.l !== this._menfeng && this.select_hule(data, true))
          ask(
            this,
            [
              ['론', { hule: '-' }],
              ['넘기기', {}],
            ],
            '창깡 — 론 할까요? (넘기기 가능)',
          );
        else this._callback();
      }
      action_qipai(data) {
        // A new hand: the last hand's result and score chips leave the table.
        outcome = null;
        start = null;
        lastDiscard = -1;
        this._callback();
      }
      action_hule(data) {
        const m = this.model,
          who = seats[m.player_id[data.l]] ?? '',
          hand = parseHand(data.shoupai);
        if (!start) start = m.defen.slice();
        const han = (data.hupai || []).reduce((a, h) => a + (h.fanshu > 0 ? h.fanshu : 0), 0);
        outcome = {
          winner: data.l,
          title: who + ' ' + (data.baojia == null ? '쯔모' : '론'),
          from: data.baojia == null ? '' : seats[m.player_id[data.baojia]] + '에게서',
          points: data.defen,
          size: data.damanguan ? '역만' : (han ? han + '판' : '') + (data.fu ? ' ' + data.fu + '부' : ''),
          yaku: (data.hupai || []).map((h) => h.name + (h.fanshu > 0 ? ' ' + h.fanshu : ' 역만')),
          win: hand.tiles.pop(),
          tiles: hand.tiles,
          melds: hand.melds,
        };
        ask(this, [['계속', {}]], who + ' 화료 · ' + data.defen + '점');
      }
      action_pingju(data) {
        if (!start) start = this.model.defen.slice();
        outcome = { title: '유국', yaku: data?.name ? [data.name] : [], size: '', points: 0 };
        ask(this, [['계속', {}]], '유국 · ' + (data?.name || '패가 다 떨어졌어요'));
      }
    }
    human = new Human();
    const engine = new Mahjong.Game(
      [human, ...range(3).map(() => new MahjongAI())],
      (result) => {
        if (ui.signal.aborted) return;
        // The seats show the closing totals, the same numbers the result line reports.
        final = result.defen.slice();
        rank = result.rank.slice();
        choices = [];
        ui.paint();
        ui.finish('내 순위 ' + result.rank[0] + '위 · ' + result.defen[0] + '점');
      },
      Mahjong.rule({ 場数: 1 }),
    );
    engine.speed = 1;
    ui.signal.addEventListener('abort', () => engine.stop(), { once: true });
    queueMicrotask(() => {
      if (!ui.signal.aborted) engine.kaiju(0);
    });
    const face = (parent, code, cls) => {
      const t = element('span', 'mah-tile ' + cls, tile(code));
      decorateTile(t, code);
      t.setAttribute('aria-label', tile(code));
      parent.append(t);
      return t;
    };
    // Where each seat sits around my table: across on top, 상가 (plays before me) on the
    // left, 하가 (plays after me) on the right, my own river just above my hand.
    const places = ['me', 'right', 'top', 'left'];
    return () => {
      const m = human.model;
      ui.status(riichiArmed ? '리치 · 빛나는 패 중 하나를 버리세요' : message);
      if (!m.shoupai?.[human._menfeng] || !m.he?.[0]) {
        ui.section('동장 시작 · 패를 나누는 중');
        return;
      }
      const me = human._menfeng,
        settling = !final && outcome && m._fenpei;
      const points = (l) => {
        const id = m.player_id[l];
        return final ? final[id] : m.defen[id] + (settling ? m._fenpei[l] : 0);
      };
      ui.score(
        '동' + (m.jushu + 1) + '국' + (m.changbang ? ' ' + m.changbang + '본장' : '') +
          ' · 패 ' + (m.shan?.paishu ?? '-'),
      );
      const table = element('div', 'mj-table' + (outcome || final ? ' settled' : ''));
      ui.board.append(table);
      // The centre plaque: round, dora indicators, tiles left in the wall, riichi sticks.
      const plaque = element('div', 'mj-center');
      plaque.append(
        element('b', 'mj-round', '동' + (m.jushu + 1) + '국' + (m.changbang ? '·' + m.changbang + '본' : '')),
      );
      const dora = element('span', 'mj-dora');
      dora.setAttribute('aria-label', '도라 표시패');
      dora.append(element('small', '', '도라'));
      for (const p of m.shan?.baopai || []) if (p) face(dora, p, 'dora-tile');
      plaque.append(dora, element('span', 'mj-wall', '패 ' + (m.shan?.paishu ?? '-')));
      if (m.lizhibang) plaque.append(element('span', 'mj-sticks', '리치봉 ' + m.lizhibang));
      table.append(plaque);
      for (const rel of [2, 3, 1, 0]) {
        const l = (me + rel) % 4,
          id = m.player_id[l],
          river = m.he[l]._pai,
          block = element(
            'div',
            'mj-seat seat-' + places[rel] + (rel ? '' : ' mine') +
              (m.lunban === l && !outcome && !final ? ' to-move' : '') +
              (outcome && outcome.winner === l ? ' winner' : ''),
          ),
          head = element('div', 'mj-seat-head');
        head.append(element('span', 'mj-wind', winds[l]), element('b', 'mj-name', seats[id]));
        if (river.some((p) => p.includes('*'))) head.append(element('span', 'mj-riichi', '리치'));
        head.append(element('span', 'mj-points', String(points(l))));
        const delta = final && start ? final[id] - start[id] : settling ? m._fenpei[l] : 0;
        if ((settling || final) && delta)
          head.append(element('span', 'mj-delta ' + (delta > 0 ? 'up' : 'down'), signed(delta)));
        if (final && rank) head.append(element('span', 'mj-rank', rank[id] + '위'));
        block.append(head);
        if (rel && m.shoupai[l]) {
          // The model uses "_" for concealed tiles; render only anonymous backs.
          const counts=m.shoupai[l]._bingpai;
          const held=(counts._ || 0) + [...'mpsz'].reduce((sum,suit) =>
            sum + counts[suit].slice(1).reduce((a,b)=>a+b,0),0);
          const backs=element('div','mj-concealed');
          backs.setAttribute('aria-label','상대 손패 '+held+'장');
          for(let i=0;i<Math.min(14,held);i++) backs.append(element('i',''));
          block.append(backs);
        }
        const pond = element('div', 'mj-river');
        const shown = river.slice(-18);
        if (river.length > shown.length) pond.append(element('span', 'mj-more', '+' + (river.length - shown.length)));
        shown.forEach((p, k) =>
          face(
            pond,
            p,
            'river-tile' +
              (p.includes('*') ? ' riichi-tile' : '') +
              (/[-+=]$/.test(p) ? ' called' : '') +
              (l === lastDiscard && k === shown.length - 1 && !outcome ? ' latest' : ''),
          ),
        );
        block.append(pond);
        const melds = m.shoupai[l]?._fulou || [];
        if (melds.length) {
          const open = element('div', 'mj-melds');
          for (const meld of melds) {
            const g = element('span', 'mj-meld');
            for (const c of meldTiles(meld)) face(g, c, 'meld-tile');
            open.append(g);
          }
          block.append(open);
        }
        table.append(block);
      }
      // The result of the hand lies on the table: who won, from whom, the value, the yaku
      // and the winning hand with the winning tile set apart.
      if (outcome) {
        const panel = element('div', 'mj-outcome');
        panel.append(
          element('b', 'mj-outcome-title', outcome.title + (outcome.points ? ' · ' + outcome.points + '점' : '')),
        );
        const sub = [outcome.from, outcome.size].filter(Boolean).join(' · ');
        if (sub) panel.append(element('span', 'mj-outcome-sub', sub));
        if (outcome.tiles?.length) {
          const shown = element('div', 'mj-win-hand');
          for (const c of outcome.tiles) face(shown, c, 'win-tile');
          if (outcome.win) face(shown, outcome.win, 'win-tile winning');
          for (const meld of outcome.melds) {
            const g = element('span', 'mj-meld');
            for (const c of meldTiles(meld)) face(g, c, 'win-tile');
            shown.append(g);
          }
          panel.append(shown);
        }
        if (outcome.yaku.length) panel.append(element('span', 'mj-yaku', outcome.yaku.join(' · ')));
        table.append(panel);
      }
      // My hand: tap a tile to discard it. The drawn tile sits apart at the right.
      const hand = element('div', 'mj-hand');
      ui.board.append(hand);
      const shoupai = human.shoupai,
        counts = shoupai._bingpai,
        codes = [];
      for (const s of 'mpsz')
        for (let n = 1; n < counts[s].length; n++)
          for (let i = 0; i < counts[s][n]; i++)
            // The engine includes red fives in both the rank-five total and index zero.
            codes.push(s + (s !== 'z' && n === 5 && i < counts[s][0] ? 0 : n));
      const zimo = typeof shoupai._zimo === 'string' && shoupai._zimo.length === 2 ? shoupai._zimo : null;
      if (zimo && codes.includes(zimo)) codes.splice(codes.lastIndexOf(zimo), 1);
      const discards = choices.filter(([, r]) => r.dapai),
        others = choices.filter(([, r]) => !r.dapai),
        canRiichi = discards.some(([, r]) => r.dapai.endsWith('*'));
      if (!canRiichi) riichiArmed = false;
      const answer = (reply) => () => {
        const callback = human._callback;
        choices = [];
        riichiArmed = false;
        message = '다른 사람 차례';
        ui.paint();
        callback(reply);
      };
      const handTile = (code, drawn) => {
        const want = riichiArmed ? '*' : '';
        const option =
          discards.find(([, r]) => r.dapai === code + (drawn ? '_' : '') + want) ||
          discards.find(([, r]) => r.dapai === code + want) ||
          (drawn ? null : discards.find(([, r]) => r.dapai === code + '_' + want && zimo === code));
        const el = ui.button(
          hand,
          tile(code),
          option ? answer(option[1]) : null,
          'mah-tile hand-tile' + (drawn ? ' drawn' : '') + (option && riichiArmed ? ' riichi-ok' : ''),
          0,
          tile(code) + (drawn ? ' (뽑은 패)' : '') + (option ? ' · 버리기' : ''),
        );
        decorateTile(el, code);
        if (!option)
          ui.why(
            el,
            outcome
              ? '이번 국은 끝났어요. 아래 계속을 누르세요.'
              : !choices.length
                ? '다른 사람 차례예요. 잠시 기다려 주세요.'
                : !discards.length
                  ? '지금은 버릴 차례가 아니에요. 아래에서 선언하거나 넘기기를 누르세요.'
                  : riichiArmed
                    ? '리치하려면 빛나는 패 중 하나를 버려야 해요.'
                    : shoupai.lizhi
                      ? '리치 중에는 뽑은 패만 버릴 수 있어요.'
                      : '방금 울어서 가져온 패와 같은 패는 바로 버릴 수 없어요.',
          );
      };
      codes.forEach((c) => handTile(c, false));
      if (zimo) handTile(zimo, true);
      // Declarations sit by the hand, where the thumb rests.
      const row = element('div', 'row mj-actions');
      ui.board.append(row);
      if (canRiichi)
        ui.button(
          row,
          riichiArmed ? '리치 취소' : '리치',
          () => {
            riichiArmed = !riichiArmed;
            ui.paint();
          },
          'mj-call riichi-toggle' + (riichiArmed ? ' selected' : ''),
          0,
          riichiArmed ? '리치 취소' : '리치 선언 후 버릴 패 고르기',
        );
      for (const [label, reply] of others) {
        const [word, meld] = label.split(' ');
        const el = ui.button(
          row,
          word,
          answer(reply),
          'mj-call' + (/^(론|쯔모)$/.test(word) ? ' primary win' : word === '계속' ? ' primary' : ''),
          0,
          label,
        );
        if (meld) {
          const g = element('span', 'mj-meld');
          for (const c of meldTiles(meld)) face(g, c, 'meld-tile');
          el.append(g);
        }
      }
    };
  },
);
