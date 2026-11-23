// Build reference rooms exclusively from the immutable prior Pages release.
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const path=require('node:path'),assert=require('node:assert/strict');
const revision='529ed3c0c4098bf798b9bfd46d502381e23f65e8',cache=new Map();
function oldSource(name){
  if(!cache.has(name))cache.set(name,execFileSync('git',['show',revision+':dist/'+name+'.js'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}));
  return cache.get(name);
}
function snapshot(board,ranks){
  const {log,...position}=board;
  return {hash:createHash('sha256').update(JSON.stringify(position)).digest('hex'),ranks:ranks.map(({i,points})=>[i,points])};
}
function legacyRoom(mode){
  const splendor=mode===4,spice=mode===1;
  const files=spice?['cards','game','strategy']:splendor?['splendor-data','splendor-engine']:['cards','expedition-data','expedition-engine','combinations','combination-ai','expedition-ai'];
  const create=spice||splendor?'newGame':mode<10?'(roles,rng)=>newExpedition('+mode+',roles,rng)':'(roles,rng)=>newMix('+mode+',roles,rng)';
  const {setup,apply,chooseMove,ranks}=Function('Math',files.map(oldSource).join('\n')+';return {setup:'+create+',apply,chooseMove,ranks:'+(spice?'standings':splendor?'rankings':'expRanks')+'}')(Object.assign(Object.create(Math),{random:rng(73)}));
  const seed=2300+mode,g=setup(['친구'],rng(seed)),moves=[],states=[snapshot(g,ranks(g))];
  while(!g.over){
    const a=chooseMove(g,'Medium');a.i??=0;assert(moves.length<600&&apply(g,a));
    moves.push({n:moves.length,action:JSON.stringify(a)});states.push(snapshot(g,ranks(g)));
  }
  return {seed,moves,states};
}
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
module.exports={legacyRoom,snapshot};
