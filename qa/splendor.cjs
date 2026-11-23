const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict');
const scripts=['splendor-data.js','splendor-engine.js'].map(f=>fs.readFileSync(path.join(__dirname,'../dist',f),'utf8')).join('\n');
vm.runInNewContext(scripts+` 
assert.equal(catalog.length,90);assert.equal(patrons.length,10);
for(const seats of [2,3,4])for(const level of ['Easy','Medium','Hard','Hell']){
  const g=newGame(Array(seats-1).fill(level));assert.equal(g.nobles.length,seats+1);
  const start=JSON.stringify(g),base=g.bank.slice(),actions=[];
  while(!g.over){
    assert(actions.length<500);const a=chooseMove(g,level);assert(a&&apply(g,a));actions.push(a);
    const cards=[...g.market.flat(),...g.decks.flat(),...g.players.flatMap(p=>[...p.cards,...p.held])];
    assert.equal(cards.length,90);assert.equal(new Set(cards).size,90);
    for(let i=0;i<6;i++)assert.equal(base[i],g.bank[i]+sum(g.players.map(p=>p.tokens[i])));
    for(const p of g.players){assert(sum(p.tokens)<=10);assert(p.held.length<=3);}
  }
  const replay=JSON.parse(start);for(const a of actions)assert(apply(replay,a));assert.equal(JSON.stringify(g),JSON.stringify(replay));
  assert.equal(g.turn,0);assert(rankings(g)[0].points>=15);console.log(seats,level,actions.length);
}
const g=newGame(),p=g.players[0];p.tokens=[2,2,2,2,2,0];
const blind={kind:'blind',i:0};assert.equal(apply(g,blind),false);const top=g.decks[0].at(-1),row=g.market[0].join();
assert(apply(g,{...blind,drop:[1,0,0,0,0,0]}));assert.equal(g.market[0].join(),row);assert.equal(p.held[0],top);
g.turn=0;p.bonus=[5,5,5,5,5];const noble=g.nobles.at(-1);assert(apply(g,{kind:'held',i:top,noble}));assert.equal(p.nobles[0],noble);
`,{assert,console});
