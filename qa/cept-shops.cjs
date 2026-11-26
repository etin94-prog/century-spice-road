const assert = require('node:assert/strict');
const C = require('../dist/cept-engine');

// Map stage, traced tile, shelf order and prices from the PS2 Official Perfect Guide.
const shelves = [
  [34,5,'magicbolt:50 dispelmagic:10 blackorb:30 chainmail:10'],
  [34,37,'skeleton:30 feast:20 rayoflaw:80 longsword:10'],
  [35,12,'fireexplosion:80 quintessence:60 corruption:90 firebolt:40'],
  [35,17,'removecurse:10 antielement:60 marfolk:20 watershield:25'],
  [37,32,'sharazad:55 holyword3:10 skeleton:30 fireamulet:30'],
  [37,52,'holyword1:20 teleport:10 windofhope:40 icicle:10'],
  [38,49,'holyword6:10 lifestream:50 pressure:70 glaive:40'],
  [39,39,'holyword1:20 mistletoe:20 teleport:10 foresight:40'],
  [40,16,'haste:50 magicbolt:50 shatter:20 scalearmor:30'],
  [40,38,'holywordx:30 landtransfer:20 crayidol:60 battleaxe:30']
];

function approach(stage,at,remaining=1){
  const game=C.start(4,4,5000,'ps2-'+stage);
  game.phase='fork';game.remaining=remaining;
  Object.assign(game.players[0],{pos:C.board(game).links[at][0],previous:null,cash:500,hand:[]});
  return game;
}

for(const [stage,at,expected] of shelves){
  const game=approach(stage,at);
  assert.equal(C.routePreview(game,['route',at]).phase,'shop');
  assert.ok(C.play(game,['route',at]));
  assert.equal(game.phase,'shop');
  const stock=C.shopStock(game);
  assert.deepEqual(stock.map(id=>C.combo.key(C.cards[id])+':'+C.cards[id].cost),expected.split(' '));
  for(const id of stock){
    const visit=structuredClone(game),p=visit.players[0],price=C.cards[id].cost;
    const book=p.book.slice(),template=p.template.slice();
    p.cash=price-1;
    assert.ok(!C.play(visit,['buyCard',id]));
    p.cash=price;
    assert.ok(C.play(visit,['buyCard',id]));
    assert.deepEqual([p.cash,p.hand,visit.turn],[0,[id],1]);
    assert.deepEqual(p.book,book);assert.deepEqual(p.template,template);
    assert.ok(!C.play(visit,['buyCard',id]));
  }
  assert.equal(C.ai(game)[0],'buyCard');
  game.players[0].cash=0;
  assert.deepEqual(C.choices(game),[['leaveShop']]);
  assert.deepEqual(C.ai(game),['leaveShop']);
  assert.ok(C.play(game,['leaveShop']));
  assert.equal(game.phase,'land');
  assert.ok(!C.play(game,['buyCard',stock[0]]));

  const pass=approach(stage,at,2);
  assert.ok(C.play(pass,['route',at]));
  assert.notEqual(pass.phase,'shop');
  assert.deepEqual(pass.players[0].hand,[]);
}

const overflow=approach(35,17);
assert.ok(C.play(overflow,['route',17]));
const p=overflow.players[0],offered=C.shopStock(overflow)[2];
p.hand=Array(6).fill(0);
assert.ok(C.play(overflow,['buyCard',offered]));
assert.equal(overflow.turn,0);assert.equal(overflow.phase,'discard');
const reloaded=JSON.parse(JSON.stringify(overflow));
assert.ok(C.play(reloaded,['discard',0]));
assert.equal(reloaded.players[0].hand.length,6);
assert.ok(reloaded.players[0].hand.includes(offered));
assert.equal(reloaded.turn,1);

// Teleport skips the die and uses the same landing facility as movement.
const warp=approach(34,37),teleporter=warp.players[0];
warp.phase='spell';warp.remaining=0;
teleporter.pos=20;
teleporter.hand=[C.cards.findIndex(card=>C.combo.key(card)==='teleport')];
assert.ok(C.play(warp,['cast',0]));
assert.equal(teleporter.pos,37);assert.equal(warp.phase,'shop');
assert.equal(C.shopStock(warp).length,4);

for(let stage=1;stage<=40;stage++){
  const game=C.start(2,2,5000,'ps2-'+stage);
  const actual=game.tiles.flatMap((tile,index)=>tile.type==='카드 상점'?[index]:[]);
  assert.deepEqual(actual,shelves.filter(row=>row[0]===stage).map(row=>row[1]));
  delete game.layoutRevision;
  for(const index of actual)assert.deepEqual(C.shopStock(game,index),[]);
}
console.log('PS2 shops OK: 6 maps, 10 locations, 40 official offers, purchase limits, passage, AI and saved hand overflow');
