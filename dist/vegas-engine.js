'use strict';
const Vegas=(()=>{
  const denominations=[6,8,8,6,6,5,5,5,5];
  const total=values=>values.reduce((a,b)=>a+b,0);
  function start(levels){
    const deck=denominations.flatMap((count,i)=>Array(count).fill(i+1));
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const g={players:[null,...levels].map(level=>({level,bills:[],left:8})),deck,round:0,starter:0};
    next(g);return g;
  }
  function next(g){
    if(g.round&&g.phase!=='settled')return;
    if(g.round)g.starter=(g.starter+1)%g.players.length;
    g.round++;g.turn=g.starter;g.phase='roll';g.roll=[];g.message='';g.players.forEach(p=>p.left=8);
    g.casinos=Array.from({length:6},()=>{
      const notes=[];while(total(notes)<5)notes.push(g.deck.shift());
      return {notes:notes.sort((a,b)=>b-a),counts:g.players.map(()=>0),winners:[]};
    });
  }
  function roll(g){
    if(g.phase!=='roll')return;
    g.roll=Array.from({length:g.players[g.turn].left},()=>Math.floor(Math.random()*6));
    g.phase='place';
  }
  function order(counts){
    return counts.map((n,i)=>i).filter(i=>counts[i]&&counts.indexOf(counts[i])===counts.lastIndexOf(counts[i])).sort((a,b)=>counts[b]-counts[a]);
  }
  function place(g,face){
    if(g.phase!=='place'||!g.roll.includes(face))return;
    const n=g.roll.filter(x=>x===face).length;
    g.casinos[face].counts[g.turn]+=n;g.players[g.turn].left-=n;
    g.message=(g.turn?'AI '+(g.turn+1):'나')+' · 카지노 '+(face+1)+'에 '+n+'개 배치';
    g.roll=[];
    if(g.players.every(p=>!p.left)){
      for(const c of g.casinos){
        c.winners=order(c.counts).slice(0,c.notes.length);
        c.winners.forEach((seat,i)=>g.players[seat].bills.push(c.notes[i]));
        g.deck.push(...c.notes.slice(c.winners.length));
      }
      g.phase=g.round===4?'over':'settled';return;
    }
    do{g.turn=(g.turn+1)%g.players.length;}while(!g.players[g.turn].left);
    g.phase='roll';
  }
  function choose(g){
    const faces=[...new Set(g.roll)],level=g.players[g.turn].level;
    if(level==='Easy')return faces[Math.floor(Math.random()*faces.length)];
    const samples=level==='Hell'?120:level==='Hard'?40:1;
    // Compare the same possible future placements for every legal choice.
    const values=faces.map(()=>0);
    for(let k=0;k<samples;k++){
      const future=g.casinos.map(c=>c.counts.slice());
      if(samples>1)g.players.forEach((p,i)=>{
        if(i!==g.turn)for(let d=0;d<p.left;d++)future[Math.floor(Math.random()*6)][i]++;
      });
      faces.forEach((face,f)=>{
        const c=g.casinos[face],counts=future[face],n=g.roll.filter(v=>v===face).length;
        const value=()=>{const ranks=order(counts);return ranks.reduce((v,i,r)=>v+(c.notes[r]||0)*(i===g.turn?1:-0.3),0);};
        const before=value();counts[g.turn]+=n;values[f]+=value()-before+0.25*Math.min(3,n)-0.12*n;counts[g.turn]-=n;
      });
    }
    return faces[values.indexOf(Math.max(...values))];
  }
  function ranking(g){return g.players.map((p,i)=>({i,cash:total(p.bills),notes:p.bills.length})).sort((a,b)=>b.cash-a.cash||b.notes-a.notes);}
  return {start,next,roll,place,choose,ranking,total};
})();
if(typeof module!=='undefined')module.exports=Vegas;
