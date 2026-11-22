const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const code = ['cards','game','strategy'].map(name =>
  fs.readFileSync(path.join(__dirname,'../dist',name+'.js'),'utf8')).join('\n');
const {newGame, apply, score, standings, bonus, chooseMove, target, MERCHANTS, POINTS} =
  Function(code+'\nreturn {newGame,apply,score,standings,bonus,chooseMove,target,MERCHANTS,POINTS}')();
function seeded(seed) {
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}
function setup(n=2,seed=1) {return newGame(Array(n-1).fill('Medium'),seeded(seed));}
function rules() {
  assert.equal(MERCHANTS.length,43);
  assert.equal(POINTS.length,36);
  // Unordered multisets checked against century_env/cards.py (including duplicate cards).
  const digest=rows=>require('node:crypto').createHash('sha256')
    .update(rows.map(row=>row.join(',')).sort().join('|')).digest('hex');
  assert.equal(digest(MERCHANTS.map(c=>[c.up,...c.cost,...c.gain])),'3a5eddb0a449f12da408ec701a64321d82cf402a5e508a6255ef4fa877244600');
  assert.equal(digest(POINTS.map(c=>[c.vp,...c.cost])),'8a344937430bba9222d8f6787bfd0ace5f9d421ae693e2e298608ffae2a071d0');
  for(const n of [2,3,4]){
    const g=setup(n);
    assert.equal(g.market.length,6);assert.equal(g.orders.length,5);
    assert.deepEqual(g.players.map(p=>p.bag),[[3,0,0,0],[4,0,0,0],[4,0,0,0],[3,1,0,0]].slice(0,n));
    assert.equal(g.gold,2*n);assert.equal(g.silver,2*n);
    assert.equal(target(g),n===4?5:6);
    const p=g.players[0];p.won=Array.from({length:target(g)-1},()=>({vp:6}));p.bag=g.orders[0].cost.slice();
    assert(apply(g,{kind:'order',i:0}));assert(!g.over);
    for(let i=1;i<n;i++)assert(apply(g,{kind:'play',i:0}));
    assert(g.over);assert.equal(g.turn,0);
    const tie=setup(n);tie.players.forEach(p=>p.bag=[0,0,0,0]);assert.equal(standings(tie)[0].i,n-1);
  }
  const market=setup();market.market[2].pile=[0,1,0,0];const picked=market.market[2];
  assert(apply(market,{kind:'buy',i:2,pay:[0,0]}));assert.deepEqual(market.players[0].hand.at(-1),{...picked,pile:[0,0,0,0]});
  assert.deepEqual(market.market.slice(0,2).map(c=>c.pile),[[1,0,0,0],[1,0,0,0]]);assert.deepEqual(market.players[0].bag,[1,1,0,0]);
  const trade=setup();const trader=trade.players[0];trader.hand=[{up:0,cost:[2,0,0,0],gain:[0,0,1,0]}];trader.bag=[6,0,0,0];
  assert(apply(trade,{kind:'play',i:0,n:3}));assert.deepEqual(trader.bag,[0,0,3,0]);
  for(const steps of [[0],[0,1],[0,0]]){const game=setup();assert(apply(game,{kind:'play',i:1,steps}));assert.equal(game.players[0].used.length,1);}
  const cap=setup();cap.players[0].bag=[8,2,0,0];assert(!apply(cap,{kind:'play',i:0}));assert(apply(cap,{kind:'play',i:0,drop:[1,1,0,0]}));assert.deepEqual(cap.players[0].bag,[9,1,0,0]);
  const coins=setup();coins.gold=1;for(const coin of ['gold','silver']){assert.equal(bonus(coins,0),coin);const p=coins.players[coins.turn],c=coins.orders[0];p.bag=c.cost.slice();assert(apply(coins,{kind:'order',i:0}));assert.equal(score(p),c.vp+(coin==='gold'?3:1));}
  for(const n of [2,3,4]){
    const game=setup(n,2026), replay=setup(n,2026);
    let turns=0;
    while(!game.over){
      const action=chooseMove(game,'Medium');
      assert(apply(game,action));
      assert(apply(replay,structuredClone(action)));
      assert.deepEqual(replay,game);
      assert(++turns<500);
    }
    console.log(n+' seats replayed through '+turns+' turns');
  }
  console.log('Rules passed');
}
function tournament() {
  const levels=['Easy','Medium','Hard','Hell'];
  const wins=Object.fromEntries(levels.map(l=>[l,0]));
  for(const [i,a] of levels.entries())for(const b of levels.slice(i+1)) {
    const pair={[a]:0,[b]:0};
    const offset=Number(process.env.QA_SEED_OFFSET||0);
    for(const seed of [17,81,125,303,419,503,607,719])for(const order of [[a,b],[b,a]]) {
      const g=setup(2,seed+offset);let turns=0;
      while(!g.over){assert(++turns<500);const move=chooseMove(g,order[g.turn]);assert(apply(g,move));}
      const winner=order[standings(g)[0].i];pair[winner]++;wins[winner]++;
    }
    console.log(pair);
  }
  console.log('96 games',wins);
}
rules();if(process.argv.includes('--tournament'))tournament();
