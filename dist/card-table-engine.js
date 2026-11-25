'use strict';
const CardTable=(()=>{
  const seat=i=>i?'AI '+i:'나';
  const rank=id=>id%13+1;
  const suit=id=>Math.floor(id/13);
  function deck(){
    const d=Array.from({length:52},(_,i)=>i);
    for(let i=51;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
    return d;
  }
  function after(g,i,test){
    for(let k=1;k<=g.players.length;k++){const j=(i+k)%g.players.length;if(test(g.players[j],j))return j;}
    return -1;
  }
  return {seat,rank,suit,deck,after};
})();
if(typeof module!=='undefined')module.exports=CardTable;
