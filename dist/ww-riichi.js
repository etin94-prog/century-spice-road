import { decorateTile } from './ww-tile-art.js';
import { register, range, seats } from './ww-core.js';
import { Mahjong, MahjongAI } from './ww-mahjong-engine.js';
const zNames = ['', '東', '南', '西', '北', '白', '發', '中'];
function tile(p) {
  return p[0] === 'z'
    ? zNames[p[1]]
    : (p[1] === '0' ? '赤5' : p[1]) + ({ m: '萬', s: '索', p: '筒' }[p[0]] || '');
}
register(
  20,
  '동장 네 국을 AI 세 명과 진행합니다. 패를 눌러 버리고, 가능한 차례에 리치·치·퐁·깡·론·쯔모를 선택하세요. 연장과 점수는 리치 마작 규칙을 따릅니다.',
  (ui) => {
    let choices = [],
      message = '패를 섞는 중',
      human;
    function ask(player, opts, text) {
      choices = opts;
      message = text;
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
        ask(this, opts, '내 차례 · 버릴 패 또는 선언');
      }
      action_dapai(data) {
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
        ask(this, opts, tile(p) + ' 버림 · 선언 선택');
      }
      action_fulou(data) {
        if (data.l !== this._menfeng || /^[mpsz]\d{4}/.test(data.m)) return this._callback();
        ask(this, this.discardOptions(), '내 차례 · 버릴 패');
      }
      action_gang(data) {
        if (data.l !== this._menfeng && this.select_hule(data, true))
          ask(
            this,
            [
              ['론', { hule: '-' }],
              ['넘기기', {}],
            ],
            '창깡',
          );
        else this._callback();
      }
      action_hule(data) {
        ask(this, [['계속', {}]], '화료　' + data.defen + '점');
      }
      action_pingju() {
        ask(this, [['계속', {}]], '유국');
      }
    }
    human = new Human();
    const engine = new Mahjong.Game(
      [human, ...range(3).map(() => new MahjongAI())],
      (result) => {
        if (!ui.signal.aborted)
          ui.finish('내 순위 ' + result.rank[0] + '위 · ' + result.defen[0] + '점');
      },
      Mahjong.rule({ 場数: 1 }),
    );
    engine.speed = 1;
    ui.signal.addEventListener('abort', () => engine.stop(), { once: true });
    queueMicrotask(() => {
      if (!ui.signal.aborted) engine.kaiju(0);
    });
    return () => {
      const m = human.model;
      ui.status(message);
      if (!m.shoupai?.[human._menfeng] || !m.he?.[0]) {
        ui.section('동장 시작 · 패를 나누는 중');
        return;
      }
      ui.score(
        '동' + (m.jushu + 1) + '국　' + m.defen.map((n, i) => seats[i] + ' ' + n).join(' · '),
      );
      m.he.forEach((river, i) => {
        const row = ui.row();
        ui.button(row, seats[m.player_id[i]], null, 'seat-label');
        river._pai.slice(-10).forEach((p) => decorateTile(ui.button(row, tile(p), null, 'river-tile'), p));
      });
      ui.section('내 패');
      const hand = ui.row(),
        counts = human.shoupai._bingpai;
      for (const s of 'mpsz') {
        for (let n = 1; n < counts[s].length; n++) {
          for (let i = 0; i < counts[s][n]; i++) {
            // The engine includes red fives in both the rank-five total and index zero.
            const code = s + (s !== 'z' && n === 5 && i < counts[s][0] ? 0 : n);
            decorateTile(ui.button(hand, tile(code), null, 'mah-tile'), code);
          }
        }
      }
      if (human.shoupai._fulou.length) ui.section('공개 묶음　' + human.shoupai._fulou.join(' · '));
      ui.section(message);
      const row = ui.row();
      for (const [label, reply] of choices) {
        const el = ui.button(
          row,
          label,
          () => {
            const callback = human._callback;
            choices = [];
            message = '상대 차례';
            ui.paint();
            callback(reply);
          },
          'mah-tile',
        );
        if (reply.dapai && label === tile(reply.dapai)) decorateTile(el, reply.dapai);
      }
    };
  },
);
