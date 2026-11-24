const CepterMaps=(()=>{
  const ring=[[1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1]];
  function map(name,position,types,forts,base,die,edges,areas,bonus=200){
    const links=position.map(()=>[]);
    for(const [a,b] of edges){links[a].push(b);links[b].push(a);}
    return {name,position,types,forts,base,die,links,areas,bonus,rows:Math.max(...position.map(p=>p[0])),cols:Math.max(...position.map(p=>p[1]))};
  }
  const loop=n=>Array.from({length:n},(_,i)=>[i,(i+1)%n]);
  const types=['성',0,1,2,'북쪽 요새',3,0,1,2,3,0,1,'남쪽 요새',2,3,0];
  const classic=map('두 요새의 회랑',ring,types,[4,12],80,6,loop(16),types.map(()=>0));
  const market=map('쌍문 신전 · 창작 지도',[...ring,[2,3],[3,3],[4,3]], [...types,1,'신전',2],[4,12],100,6,
    [...loop(16),[2,16],[16,17],[17,18],[18,10]], [...ring,[2,3],[3,3],[4,3]].map(([,col])=>col>=4?1:0));
  const dunnanPositions=[[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1]];
  const dunnan=map('듀난',dunnanPositions,['성',2,2,2,2,3,3,3,3,'남쪽 요새',0,0,0,0,1,1,1,1],[9],80,6,loop(18),Array(18).fill(0));
  dunnan.fortBonus=100;
  return {classic,dunnan,market};
})();
if(typeof module!=='undefined')module.exports=CepterMaps;