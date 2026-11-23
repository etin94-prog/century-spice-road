"use strict";
function mixAI(g,level='Medium',considerRefresh=true){
  const actor=g.turn,p=g.players[actor];
  const sites=mixSites(g),orders=g.tiles.map((t,i)=>t.order?{cost:unitBag(t.order[0]),vp:t.order[1],i}:null).filter(Boolean);
  if(g.departures){
    const i=g.tiles.findIndex(t=>t.recipe&&(t.recipe.startsWith('00/')||t.recipe.startsWith('01/')));
    return {edition:g.edition,combo:g.combo,i:i<0?g.tiles.findIndex(t=>t.recipe):i,kind:'depart',option:(actor+1)%g.departures.length};
  }
  const experienced=level==='Hard'||level==='Hell',expert=level==='Hell';
  const recent=g.log.filter(x=>x.who===actor).slice(0,expert?8:5);
  const evaluate=(bag,boat)=>{
    let best=-100;for(const o of orders){
      const missing=total(o.cost.map((n,j)=>Math.max(0,n-bag[j])*(1+j*.48)));
      const distance=g.combo===12?Math.max(Math.abs(g.tiles[boat].col-g.tiles[o.i].col),Math.abs(g.tiles[boat].y-g.tiles[o.i].y)/2):0;
      best=Math.max(best,(missing===0?10:0)-missing*3-distance*(missing===0?2:.25)+o.vp*.12);
    }return best+value(bag)*.28;
  };
  const ranked=[];
  for(const [i,t] of sites.entries())for(const [option,c] of mixOptions(g,i).entries()){
    if(c.kind==='refresh')continue;
    const boat=g.combo===12&&!t.special?i:p.boat,bag=trimBag(c.bag,capacity(p));
    let score=evaluate(bag,boat);
    if(c.kind==='order')score+=150+g.tiles[i].order[1]*.7;
    if(c.build)score+=2.2+(c.prize?4:0);
    if(c.kind==='recover')score+=g.combo===12?(p.used.length+p.discards.length)*1.2-p.hand.length:2-p.ready*.6;
    if(c.kind==='buyCard')score+=Math.max(-4,5-(p.hand.length+p.used.length+p.discards.length)*.6);
    if(c.kind==='extend')score+=p.route.length<2?3:0;
    if(c.reward>=0||c.kind==='bonus')score+=2;
    if(experienced&&g.combo!==12&&t.need)score-=workerCost(p,t)*.25;
    const repeat=recent.filter(x=>x.kind===c.kind&&x.site===i).length;
    score-=repeat*(experienced?2.1:1.6);
    // Vary equally useful actions across rounds without using wall time in replay.
    score+=((Math.sin((g.round*3+actor*11+i)*78.21)*3197)%1)*(level==='Easy'?1.8:.45);
    ranked.push({a:{edition:g.edition,combo:g.combo,i,kind:c.kind,option},score});
  }
  ranked.sort((a,b)=>b.score-a.score);
  if(!ranked.length)throw Error('선택할 수 있는 행동이 없습니다.');
  if(considerRefresh&&g.combo!==12&&level!=='Easy'&&ranked[0].a.kind!=='order'&&p.ready>=3){
    const preview=structuredClone(g);
    if(refreshMarket(preview)){
      const after=mixAI(preview,level,false),trial=structuredClone(preview);
      if(mixApply(trial,after)){
        const net=evaluate(trial.players[actor].bag,p.boat);
        if(after.kind==='order'||after.kind==='useMerchant'&&net>ranked[0].score+2)return {...after,refresh:true};
      }
    }
  }
  if(!experienced||ranked[0].a.kind==='order')return ranked[0].a;
  let best=ranked[0].a,max=-Infinity;
  for(const item of ranked.slice(0,expert?5:3)){
    const next=structuredClone(g);mixApply(next,item.a);next.turn=actor;
    let future=-Infinity;
    for(const [i,t] of mixSites(next).entries())for(const c of mixOptions(next,i)){
      if(c.kind==='refresh')continue;
      future=Math.max(future,c.kind==='order'?90:evaluate(trimBag(c.bag,capacity(p)),g.combo===12&&!t.special?i:next.players[actor].boat));
    }
    const score=item.score+.52*future;if(score>max){max=score;best=item.a;}
  }
  return best;
}

