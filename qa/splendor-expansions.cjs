const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=['data','engine','expansions'].map(n=>fs.readFileSync(path.join(__dirname,'../dist/splendor-'+n+'.js'),'utf8')).join('\n');
const {newGame,chooseMove,apply,rankings,catalog,guildTurn,cityEligible,guildBills}=Function(src+';return {newGame,chooseMove,apply,rankings,catalog,guildTurn,cityEligible,guildBills}')();
assert.equal(catalog.length,120);
for(const mode of ['cities','posts','orient','forts'])for(const seats of [2,3,4]){
 let seed=411+seats;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const g=newGame(Array(seats-1).fill('Medium'),rand,mode),replay=structuredClone(g);
 const supply=g.bank.slice();let n=0;
 while(!g.over&&n++<600){
   const a=chooseMove(g,['Medium','Hard','Hell','Easy'][g.turn]);assert(a,mode+' stalled');
   assert(apply(g,a));assert(apply(replay,a));assert.deepEqual(replay,g);
   for(let i=0;i<6;i++)assert.equal(g.bank[i]+g.players.reduce((v,p)=>v+p.tokens[i],0),supply[i]);
   assert(g.players.every(p=>p.tokens.reduce((v,n)=>v+n,0)<=10&&p.tokens.every(n=>n>=0)&&p.held.length<=3));
   if(g.forts)for(let i=0;i<seats;i++)assert(Object.entries(g.forts).filter(([id,f])=>f.seat===i).every(([id])=>g.market.flat().includes(+id)));
 }
 assert(g.over,mode+' unfinished');assert.equal(g.turn,0);if(g.cities)assert(rankings(g)[0].city);
 console.log(mode,seats,n);
}

// Exercise expansion decisions independently of which cards a random match exposes.
const city=newGame(['Medium'],()=>.4,'cities'),p=city.players[0];
p.cards=catalog.filter(c=>c.vp===5).slice(0,3).map(c=>c.id);p.bonus=[0,0,4,0,0];
assert.equal(cityEligible(p,8),false);p.bonus[0]=4;assert(cityEligible(p,8));
const post=newGame(['Medium'],()=>.4,'posts').players[0];
post.posts=[2];post.tokens=[0,0,0,0,0,1];
assert(guildBills(post,{cost:[2,0,0,0,0]}).length);assert.equal(guildBills(post,{cost:[1,1,0,0,0]}).length,0);
const east=newGame(['Medium'],()=>.4,'orient'),merchant=east.players[0];
merchant.cards=[95];assert(guildBills(merchant,{cost:[1,1,0,0,0]}).some(b=>b.bars===1));
east.market[3]=[90];merchant.tokens=[2,2,2,3,1,0];
assert.equal(guildTurn(east,{kind:'buy',i:90},true),null);merchant.bonus[2]=1;
const paired=guildTurn(east,{kind:'buy',i:90},true).board.players[0];assert.equal(paired.bonus[2],2);
const fort=newGame(['Medium'],()=>.4,'forts'),id=fort.market[0][0];fort.forts[id]={seat:1,n:3};
assert.equal(guildTurn(fort,{kind:'reserve',i:id},true),null);
fort.forts[id].seat=0;fort.players[0].bonus=[5,5,5,5,5];
const result=guildTurn(fort,{kind:'take',i:0,take:[0,1,2]},true).board;
assert(result.players[0].cards.includes(id));assert(!result.forts[id]);
