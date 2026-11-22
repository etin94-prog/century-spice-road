"use strict";
function candidates(g){
  const p=g.players[g.turn],out=[];
  g.tiles.forEach((t,i)=>actionsAt(g,i).forEach((c,option)=>out.push({a:{edition:g.edition,kind:c.kind,i,option},c})));
  if(g.edition===3&&p.ready<p.crew)out.push({a:{edition:3,kind:'rest',i:0},c:{bag:p.bag}});
  return out;
}
function prospect(g,item,seat){
  const p=g.players[seat],{a,c}=item,bag=trimBag(c.bag,capacity(p));
  if(a.kind==='order')return 125+g.tiles[a.i].order[1]+(c.stack>=0?3:0)+value(bag)*.15;
  let best=-Infinity;
  for(const [i,t] of g.tiles.entries())if(t.order){
    const cost=unitBag(t.order[0]);
    let deficit=0;for(let j=0;j<4;j++)deficit+=Math.max(0,cost[j]-bag[j])*(1+j*.55);
    const distance=g.edition===2?Math.max(Math.abs(g.tiles[a.i].col-t.col),Math.abs(g.tiles[a.i].y-t.y)/2):0;
    best=Math.max(best,16-deficit*3.2-distance*.45+t.order[1]*.16);
  }
  if(a.kind==='rest')best+=p.ready<=1?5:-(p.ready+1);
  if(c.build)best+=2.8+(c.prize?3:0);
  if(a.kind==='bonus')best+=1.5;
  const repeat=g.log.filter(x=>x.who===seat).slice(0,4).filter(x=>x.kind===a.kind&&x.site===a.i).length;
  return best+value(bag)*.34+total(bag)*.14-repeat*.65;
}
function chooseMove(g,level=g.players[g.turn].level||'Medium'){
  if(g.departures){
    const i=g.tiles.findIndex(t=>!t.port&&t.recipe==='00/2');
    return {edition:2,kind:'depart',i:i>=0?i:g.tiles.findIndex(t=>!t.port),option:(g.turn+1)%g.departures.length};
  }
  const seat=g.turn,ranked=candidates(g).map(x=>({...x,rank:prospect(g,x,seat)})).sort((a,b)=>b.rank-a.rank);
  if(!ranked.length)throw Error('진행할 행동이 없습니다.');
  if(ranked[0].a.kind==='order'||level==='Easy')return ranked[0].a;
  const width=level==='Hell'?8:level==='Hard'?5:2;
  let best=ranked[0].a,highest=-Infinity;
  for(const x of ranked.slice(0,width)){
    const next=structuredClone(g);apply(next,x.a);next.turn=seat;
    const future=candidates(next).reduce((max,item)=>Math.max(max,prospect(next,item,seat)),-Infinity);
    let rating=x.rank+.77*future;
    if(level==='Hell'&&g.edition===3&&x.a.kind!=='rest'){
      const prev=g.tiles[x.a.i].occupant;if(prev)rating-=prev.n*.55;
      if(g.tiles[x.a.i].fort&&g.players.some((q,j)=>j!==seat&&fits(q.bag,unitBag(g.tiles[x.a.i].order?.[0]||''))))rating+=2;
    }
    if(rating>highest){best=x.a;highest=rating;}
  }
  return best;
}
