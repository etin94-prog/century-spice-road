const assert = require('node:assert/strict');
const C = require('../dist/cept-engine');

const ids = new Map(C.cards.flatMap((card, id) => card.catalog ? [[C.combo.key(card), id]] : []));
function id(name) {
  assert.ok(ids.has(name), `Unknown card ${name}`);
  return ids.get(name);
}

const gold = 5000;
const at = 1;
function battle({ attacker, defender, attackGear, defendGear, terrain = 0, level = 1, base = 80, enchant, support = false, cash = [gold, gold], recordReplay = false }) {
  const state = C.start(2, 2, 12000, 'classic');
  for (const [seat, player] of state.players.entries()) {
    player.cash = cash[seat];
    player.hand = [];
    player.book = [id('fighter')];
  }
  const land = state.tiles[at];
  Object.assign(land, { owner: 1, type: terrain, level, base, unit: { id: id(defender), hp: C.cards[id(defender)].hp } });
  if (enchant) land.unit.enchant = enchant;
  if (support) {
    const neighbor = C.board(state).links[at].find(index => index !== 0);
    Object.assign(state.tiles[neighbor], { owner: 0, type: 0, unit: { id: id('goblin'), hp: 20 } });
  }
  state.players[0].pos = at;
  state.players[0].hand.push(id(attacker));
  state.phase = 'land';
  if (recordReplay) C.configureMatch(state, { recordReplay });
  assert.ok(C.play(state, ['invade', 0]), `${attacker} can invade this land`);
  const ground = C.battleGround(state, state.battle);
  for (const [seat, gear] of [attackGear, defendGear].entries()) {
    if (gear) state.players[seat].hand.push(id(gear));
    const action = gear ? ['equip', 0] : ['bare'];
    assert.ok(C.play(state, action), `${attacker} against ${defender}, seat ${seat}: ${gear ?? 'bare'}`);
  }
  assert.equal(state.phase, 'result');
  return { state, ground, result: state.battle, land };
}

function strikes(result) {
  return result.strikes.map(({ side, hp }) => [side, hp]);
}

// Korean PS2 recording, 10:57–11:04 — cLaQgcnxUOc.
{
  const { ground, result, land } = battle({ attacker: 'skeleton', defender: 'fighter', support: true });
  assert.deepEqual(ground, { hp: 0, attack: 10, defense: 0 });
  assert.deepEqual([result.attackST, result.defendST], [40, 40]);
  assert.deepEqual(result.startHP, [40, 40]);
  assert.deepEqual(strikes(result), [[0, [40, 0]]]);
  assert.deepEqual(result.finalHP, [40, 0]);
  assert.equal(result.won, true);
  assert.equal(land.owner, 0);
  assert.equal(land.unit.id, id('skeleton'));
}

// Japanese PS2 replay, 12:31–12:56 — QZI6ucWaaok. Camouflage and the base
// value reproduce the visible +40 HP and 720G toll in the test board.
{
  const { ground, result, land, state } = battle({
    attacker: 'woodfolk', defender: 'skeleton', attackGear: 'megarodon', defendGear: 'leatherarmor',
    terrain: 1, level: 4, base: 150, enchant: 'camouflage', support: true, cash: [150, 245], recordReplay: true
  });
  assert.deepEqual(ground, { hp: 40, attack: 10, defense: 0 });
  assert.deepEqual([result.attackST, result.defendST], [90, 30]);
  assert.deepEqual(result.startHP, [80, 100]);
  assert.deepEqual(strikes(result), [[0, [80, 10]], [1, [50, 10]]]);
  assert.deepEqual(result.finalHP, [50, 40]);
  assert.deepEqual(result.settled?.hp, [30, 40]);
  assert.deepEqual(result.settled?.st, [40, 30]);
  assert.deepEqual(state.replay.steps.at(-1).battle.settled, result.settled);
  assert.equal(result.won, false);
  assert.equal(land.owner, 1);
  assert.deepEqual(land.unit, { id: id('skeleton'), hp: 40, enchant: 'camouflage' });
  assert.deepEqual(state.players.map(player => player.hand.map(cardId => C.combo.key(C.cards[cardId]))), [['woodfolk'], []]);
  assert.deepEqual(state.players.map(player => player.cash), [20, 245]);
  assert.equal(C.owedToll(state, land), 720);
  assert.ok(C.play(state, ['continue']));
  assert.deepEqual(state.players.map(player => player.cash), [-700, 965]);
  assert.equal(state.phase, 'sell');
  assert.equal(state.debtor, 0);
}

// Culdscience PS2 tests, §3.3. Check the ten known transformation groups
// with an item from each group, including a recyclable tool and a scroll.
const eggs = {
  'prismaticwand': 'carbuncle', 'wingedboots': 'cockatrice', 'boomerang': 'cyclops',
  'watershield': 'dragonfly', 'nuclearfusion': 'firegiant', 'belloflaw': 'giantamoeba',
  'windshield': 'goblin', 'thehand': 'nightmare', 'goldengoose': 'sprite', 'leatherarmor': 'cyclops',
  'claymore': 'stormgiant'
};
for (const [gear, form] of Object.entries(eggs)) {
  const { result, state } = battle({ attacker: 'mysticegg', defender: 'goblin', attackGear: gear });
  assert.equal(result.forms[0], id(form), gear);
  assert.equal(result.attackST, C.cards[id(form)].st, `${gear} stat should be consumed`);
  assert.equal(state.players[0].hand.includes(id(gear)), false, `${gear} cannot return to hand`);
  assert.equal(state.players[0].book[0] === id(gear), false, `${gear} cannot recycle to top of book`);
}
{
  const theft = battle({ attacker: 'mysticegg', defender: 'goblin', attackGear: 'thehand', defendGear: 'longsword' });
  assert.equal(theft.result.forms[0], id('firegiant'));
  assert.equal(theft.result.defendST, 20);
  const destruction = battle({ attacker: 'mysticegg', defender: 'gremlin', attackGear: 'longsword' });
  assert.equal(destruction.result.forms[0], id('mysticegg'));
}

console.log('PS2 footage: 2 battle fixtures; Culdscience §3.3: 11 item samples and 2 order tests');
