'use strict';
const Hula=(()=>{
  const {rank,suit,deck,seat}=typeof module==='undefined'?CardTable:require('./card-table-engine.js');
  const points=cards=>cards.reduce((s,c)=>s+rank(c),0);
  function run(cards){
    if(!cards.every(c=>suit(c)===suit(cards[0])))return false;
    const ranks=cards.map(rank).sort((a,b)=>a-b);
    const consecutive=v=>v.every((r,i)=>!i||r===v[i-1]+1);
    return consecutive(ranks)||(ranks[0]===1&&consecutive([...ranks.slice(1),14]));
  }
  function meld(cards){
    if(!cards.length||new Set(cards).size!==cards.length)return false;
    if(cards.length===1)return rank(cards[0])===7;
    return cards.length>=3&&(cards.every(c=>rank(c)===rank(cards[0]))||run(cards));
  }
  function fits(group,card){return group.length===1?run([...group,card]):(group.length===2?run([...group,card]):meld([...group,card]));}
  function groups(cards){
    const out=[];
    for(let mask=1;mask<2**cards.length;mask++){const set=cards.filter((_,i)=>mask&(1<<i));if(meld(set))out.push(set);}
    return out.sort((a,b)=>b.length-a.length||points(b)-points(a));
  }
  function start(count){const g={players:Array.from({length:count},()=>({wins:0})),round:0};deal(g);return g;}
  function deal(g){
    g.deck=deck();g.round++;g.turn=(g.round-1)%g.players.length;g.phase='draw';g.discard=[];g.groups=[];g.last='';g.reason='';
    for(const p of g.players){p.cards=g.deck.splice(-7);p.open=false;}
  }
  function thanks(g){
    if(g.phase!=='draw'||!g.discard.length)return [];
    const top=g.discard.at(-1);
    return groups([...g.players[g.turn].cards,top]).filter(m=>m.length>=3&&m.includes(top));
  }
  function finish(g,reason,winners){
    g.phase='result';g.reason=reason;
    if(!winners){const scores=g.players.map(p=>points(p.cards)),best=Math.min(...scores);winners=scores.flatMap((s,i)=>s===best?[i]:[]);}
    g.winners=winners;winners.forEach(i=>g.players[i].wins++);
  }
  function canStop(g){const p=g.players[g.turn];return g.phase==='draw'&&p.open&&points(p.cards)<=[0,0,7,10,15][g.players.length];}
  function play(g,a){
    const p=g.players[g.turn],chosen=a.cards||[],owns=chosen.every(c=>p.cards.includes(c))&&new Set(chosen).size===chosen.length;
    if(g.phase==='draw'){
      if(a.kind==='stop'&&canStop(g)){finish(g,'스톱');return true;}
      if(a.kind==='draw'&&g.deck.length){p.cards.push(g.deck.pop());g.phase='arrange';}
      else if(a.kind==='thanks'&&owns&&chosen.length>=2&&g.discard.length&&meld([...chosen,g.discard.at(-1)])){
        g.groups.push({owner:g.turn,cards:[...chosen,g.discard.pop()]});p.cards=p.cards.filter(c=>!chosen.includes(c));p.open=true;g.phase='arrange';
      }else return false;
    }else if(g.phase==='arrange'&&owns){
      if(a.kind==='meld'&&meld(chosen)){g.groups.push({owner:g.turn,cards:chosen.slice()});p.open=true;}
      else if(a.kind==='attach'&&chosen.length===1&&p.open&&g.groups[a.group]&&fits(g.groups[a.group].cards,chosen[0]))g.groups[a.group].cards.push(chosen[0]);
      else if(a.kind==='discard'&&chosen.length===1)g.discard.push(chosen[0]);
      else return false;
      p.cards=p.cards.filter(c=>!chosen.includes(c));
    }else return false;
    const names={draw:'한 장 받기',thanks:'땡큐 등록',meld:'등록',attach:'붙이기',discard:'한 장 버리기'};
    g.last=seat(g.turn)+' · '+names[a.kind];
    if(!p.cards.length)finish(g,'훌라',[g.turn]);
    else if(a.kind==='discard'){
      if(!g.deck.length)finish(g,'더미 소진');
      else{g.turn=(g.turn+1)%g.players.length;g.phase='draw';}
    }
    return true;
  }
  function ai(g){
    const p=g.players[g.turn];
    if(g.phase==='draw'){if(canStop(g)&&points(p.cards)<=6)return {kind:'stop'};const best=thanks(g)[0];return best?{kind:'thanks',cards:best.filter(c=>c!==g.discard.at(-1))}:{kind:'draw'};}
    const best=groups(p.cards)[0];if(best)return {kind:'meld',cards:best};
    if(p.open)for(const c of p.cards){const group=g.groups.findIndex(m=>fits(m.cards,c));if(group>=0)return {kind:'attach',cards:[c],group};}
    const value=c=>rank(c)-p.cards.filter(d=>d!==c&&(rank(d)===rank(c)||suit(d)===suit(c)&&Math.abs(rank(d)-rank(c))<=2)).length*5;
    return {kind:'discard',cards:[p.cards.slice().sort((a,b)=>value(b)-value(a))[0]]};
  }
  return {start,deal,play,ai,groups,thanks,canStop,points,rank,meld,fits};
})();
if(typeof module!=='undefined')module.exports=Hula;
