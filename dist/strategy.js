"use strict";
const worth = bag=>bag.reduce((total,n,t)=>total+n*(t+1),0);
const coinPoints=(g,i)=>({gold:3,silver:1}[bonus(g,i)]||0);

// Acquisitions, plays and rests are public, so available opponent cards
// can be reconstructed without sampling the unrevealed decks.
function raceTimes(g,hell){
  const times=g.orders.map(()=>Infinity);
  g.players.forEach((r,seat)=>{
    if(seat===g.turn)return;
    const bags=[r.bag];
    if(hell)for(const a of playOptions(r)){
      if(a.kind==='play')bags.push(effect(r,a,g));
    }
    g.orders.forEach((c,i)=>{
      if(covers(r.bag,c.cost))times[i]=0;
      else if(bags.some(b=>covers(b,c.cost)))times[i]=Math.min(times[i],1);
    });
  });
  return times;
}
function engineStrength(c){
  if(c.up)return c.up*.9;
  if(!sum(c.cost))return worth(c.gain)*1.35;
  return 1.5+(worth(c.gain)-worth(c.cost))*.7+2/sum(c.cost);
}
function buyOptions(q,g,hell){
  const moves=[];
  g.market.forEach((c,i)=>{
    if(i>sum(q.bag))return;
    const orders=[null,...(hell?g.orders:[])],seen=new Set();
    for(const order of orders){
      const pay=[],left=q.bag.slice();
      while(pay.length<i){
        let choice=-1,lowest=Infinity;
        for(let t=0;t<4;t++)if(left[t]){
          const cost=t+(order&&left[t]<=order.cost[t]?5:0);
          if(cost<lowest){lowest=cost;choice=t;}
        }
        pay.push(choice);left[choice]--;
      }
      const key=left.join();if(seen.has(key))continue;
      seen.add(key);moves.push({kind:'buy',i,pay});
    }
  });
  return moves;
}
// Value repeatable conversions by the inputs this caravan can actually
// generate. Productive cycles still matter after a single order is gone.
function engineFit(card,cards){
  const supply=[0,0,0,0];
  for(const c of cards){
    for(let t=0;t<4;t++)supply[t]=Math.max(supply[t],c.gain[t]*(sum(c.cost)?0.46:1));
  }
  if(card.up)return card.up*1.4;
  if(!sum(card.cost)){
    let diversity=0;
    for(let t=0;t<4;t++)if(card.gain[t])diversity+=card.gain[t]*(t+1)/(1+supply[t]);
    return worth(card.gain)*1.9+diversity;
  }
  const batches=Math.min(...card.cost.map((n,t)=>n?(supply[t]+.3)/n:Infinity));
  return 1+Math.min(2.5,batches)*(2+worth(card.gain)-worth(card.cost));
}
function expert(g,hell){
  const p=g.players[g.turn],rivals=g.players.filter(x=>x!==p);
  const finish=target(g),remaining=finish-Math.max(...g.players.map(x=>x.won.length));
  const race=raceTimes(g,hell),locked=remaining===0;
  const likelyLast=hell&&rivals.some(r=>r.won.length===finish-1&&g.orders.some(c=>covers(r.bag,c.cost)));
  const last=locked||likelyLast;
  const rivalScore=Math.max(...rivals.map(score));
  let frontier=[{p,first:null,investment:0}],best=null,bestValue=-Infinity;
  const remember=(value,first)=>{if(value>bestValue){bestValue=value;best=first;}};
  const horizon=last?1:hell?7:5;
  for(let depth=0;depth<horizon;depth++){
    const next=new Map();
    for(const node of frontier){
      const q=node.p;
      g.orders.forEach((c,i)=>{
        if(!covers(q.bag,c.cost))return;
        const net=c.vp+coinPoints(g,i),after=add(q.bag,c.cost,-1);
        const terminal=last||p.won.length+1===finish;
        const lead=score(p)-sum(p.bag.slice(1))+net+sum(after.slice(1))-rivalScore;
        const risk=depth>race[i]?(hell?14:4):0;
        let value=net+worth(after)*.38+node.investment+10-depth*2.6-risk;
        if(hell){
          // An opponent who can deliver now may remove this order before our next turn.
          if(depth===0&&race[i]===0)value+=net*.45;
          // Keeping a productive card ready can save an entire rest after delivery.
          const readyPower=q.hand.reduce((v,c)=>v+(!sum(c.cost)?worth(c.gain):c.up||Math.min(4,worth(c.gain)-worth(c.cost))),0);
          value+=Math.min(12,readyPower)*.27;
          // A nearby delivery frees the caravan and starts the next scoring cycle sooner.
          value+=net/(depth+1)*.75;
        }
        if(terminal)value+=lead>=0?14:-5;
        if(last)value=net+sum(after.slice(1));
        remember(value,node.first||{kind:'order',i});
      });
      const moves=playOptions(q);
      if(!depth&&(last||q.hand.length+q.used.length<9))moves.push(...buyOptions(q,g,hell));
      for(const a of moves){
        const {bag,drop}=fitBag(effect(q,a,g),g);
        const first=node.first||{...a,drop};
        if(last){remember(sum(bag.slice(1)),first);continue;}
        const hand=q.hand.slice(),used=q.used.slice();
        let investment=node.investment;
        if(a.kind==='rest')hand.push(...used.splice(0));
        else if(a.kind==='play')used.push(hand.splice(a.i,1)[0]);
        else{
          const card=g.market[a.i],owned=hand.length+used.length;
          const sameOutput=[...hand,...used].some(c=>c.gain.join()===card.gain.join()&&c.up===card.up);
          investment=((hell?engineFit(card,[...hand,...used]):engineStrength(card))-(sameOutput?2:0)-Math.max(0,owned-4)*1.6)*Math.min(1,remaining/3);
          hand.push(card);
        }
        let pursuit=-Infinity;
        g.orders.forEach((c,i)=>{
          let missing=0,surplus=0;
          for(let t=0;t<4;t++){
            const delta=bag[t]-c.cost[t];
            missing+=Math.max(0,-delta)*(1+t*.55);
            surplus+=Math.max(0,delta)*(t+1);
          }
          const risk=depth>=race[i]?(hell?9:2):0;
          pursuit=Math.max(pursuit,(c.vp+coinPoints(g,i))*.64-1.55*missing+surplus*.26-risk);
        });
        const position=pursuit+worth(bag)*.21+investment+hand.length*.20;
        const value=position-depth*1.65;
        remember(value,first);
        const key=bag.join()+'/'+hand.map(c=>c.cost.join('')+c.gain.join('')+c.up).sort().join('.');
        if(!next.has(key)||next.get(key).position<position)
          next.set(key,{p:{bag,hand,used},first,investment,position});
      }
    }
    frontier=[...next.values()].sort((a,b)=>b.position-a.position).slice(0,hell?24:10);
  }
  return best;
}
function chooseMove(g,level=g.players[g.turn].level||'Medium'){
  if(level==='Easy')return medium(g,1,1);
  if(level==='Hard'||level==='Hell')return expert(g,level==='Hell');
  return medium(g);
}
