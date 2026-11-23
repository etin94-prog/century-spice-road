"use strict";
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const zeros=(n=6)=>Array(n).fill(0);
const score=p=>sum(p.cards.map(id=>catalog[id].vp))+3*p.nobles.length;
function shuffled(values,random){
  const a=values.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function newGame(roles=['Medium'],random=Math.random){
  const decks=[0,1,2].map(t=>shuffled(catalog.filter(c=>c.tier===t).map(c=>c.id),random));
  const players=['나',...roles].map(level=>({level,tokens:zeros(),bonus:zeros(5),cards:[],held:[],nobles:[]}));
  return {edition:4,decks,market:decks.map(d=>d.splice(0,4)),bank:[...Array(5).fill([4,5,7][roles.length-1]),5],
    nobles:shuffled(patrons.map((_,i)=>i),random).slice(0,players.length+1),players,turn:0,round:1,last:false,over:false,log:[]};
}
function payment(p,c){
  const due=c.cost.map((v,i)=>Math.max(0,v-p.bonus[i]));
  const gems=due.map((v,i)=>Math.min(v,p.tokens[i]));
  return [...gems,sum(due)-sum(gems)];
}
function takeOptions(bank){
  const colors=[0,1,2,3,4].filter(i=>bank[i]>0);
  const options=colors.filter(i=>bank[i]>=4).map(i=>[i,i]);
  if(colors.length<=3){if(colors.length)options.push(colors);}
  else for(const a of colors)for(const b of colors.filter(i=>i>a))for(const c of colors.filter(i=>i>b))options.push([a,b,c]);
  return options;
}
function preview(g,a){
  if(g.over||!a||!Number.isInteger(a.i)||a.i<0)return null;
  const p=g.players[g.turn],tokens=p.tokens.slice(),bonus=p.bonus.slice();
  let id=null,tier=-1,slot=-1;
  if(a.kind==='take'){
    if(!Array.isArray(a.take)||!takeOptions(g.bank).some(opt=>opt.length===a.take.length&&opt.every((v,i)=>v===a.take[i])))return null;
    for(const color of a.take)tokens[color]++;
  }else if(['reserve','blind','buy','held'].includes(a.kind)){
    tier=a.kind==='blind'?a.i:g.market.findIndex(row=>row.includes(a.i));
    slot=a.kind==='blind'?-1:(g.market[tier]?.indexOf(a.i)??-1);
    id=a.kind==='blind'?g.decks[tier]?.at(-1):a.i;
    if(id==null||(a.kind==='held'?!p.held.includes(id):tier<0))return null;
    if(a.kind==='reserve'||a.kind==='blind'){
      if(p.held.length>=3)return null;
      if(g.bank[5])tokens[5]++;
    }else{
      const card=catalog[id],bill=a.pay??payment(p,card);
      if(!Array.isArray(bill)||bill.length!==6||bill.some((v,i)=>!Number.isInteger(v)||v<0||v>tokens[i]))return null;
      const due=card.cost.map((v,i)=>Math.max(0,v-p.bonus[i]));
      if(bill.slice(0,5).some((v,i)=>v>due[i])||sum(bill)!==sum(due))return null;
      bill.forEach((v,i)=>tokens[i]-=v);bonus[card.color]++;
    }
  }else return null;
  return {id,tier,slot,tokens,bonus,excess:Math.max(0,sum(tokens)-10),
    visits:g.nobles.filter(n=>patrons[n].every((v,i)=>v<=bonus[i]))};
}
function apply(g,a){
  const next=preview(g,a);if(!next)return false;
  const {id,tier,slot,tokens,bonus,excess,visits}=next,p=g.players[g.turn],drop=a.drop??zeros();
  if(!Array.isArray(drop)||drop.length!==6||drop.some((v,i)=>!Number.isInteger(v)||v<0||v>tokens[i])||sum(drop)!==excess)return false;
  const noble=a.noble??visits[0];
  if(visits.length?!visits.includes(noble):noble!=null)return false;
  if(slot>=0){
    const row=g.market[tier],draw=g.decks[tier].pop();
    if(draw===undefined)row.splice(slot,1);else row[slot]=draw;
  }
  if(a.kind==='blind')g.decks[tier].pop();
  if(a.kind==='reserve'||a.kind==='blind')p.held.push(id);
  if(a.kind==='held')p.held.splice(p.held.indexOf(id),1);
  if(a.kind==='buy'||a.kind==='held')p.cards.push(id);
  if(noble!=null){p.nobles.push(noble);g.nobles.splice(g.nobles.indexOf(noble),1);}
  tokens.forEach((v,i)=>{const end=v-drop[i];g.bank[i]+=p.tokens[i]-end;p.tokens[i]=end;});p.bonus=bonus;
  const msg={take:'보석 '+(a.take||[]).map(i=>gemNames[i]).join(' · ')+' 획득',blind:'덱에서 카드 예약',reserve:'공개 카드 예약',buy:'개발 카드 구매',held:'예약 카드 구매'}[a.kind];
  const detail=id!=null&&a.kind!=='blind'?' · '+gemNames[catalog[id].color]+' '+catalog[id].vp+'점':'';
  g.log.unshift({actor:g.turn,msg:msg+detail+(noble!=null?' · 귀족 방문 +3점':'')});
  g.last||=score(p)>=15;g.turn=(g.turn+1)%g.players.length;
  if(!g.turn){if(g.last)g.over=true;else g.round++;}
  return true;
}
function rankings(g){
  const rows=g.players.map((p,i)=>({i,points:score(p),cards:p.cards.length})).sort((a,b)=>b.points-a.points||a.cards-b.cards);
  rows.forEach((r,i)=>{const prev=rows[i-1];r.rank=prev&&r.points===prev.points&&r.cards===prev.cards?prev.rank:i+1;});return rows;
}
// Estimate turns to visible purchases using both total demand and the slowest colour.
// Hidden decks and rival reservations never enter this evaluation.
function expertMove(g){
  const p=g.players[g.turn],market=g.market.flat(),targets=[...market,...p.held];
  const points=score(p),late=points>=10||g.players.some(q=>score(q)>=12);
  const threat=new Map();
  for(const id of market){
    const c=catalog[id];
    for(const q of g.players){
      if(q===p||payment(q,c)[5]>q.tokens[5])continue;
      const visit=g.nobles.some(n=>patrons[n].every((v,i)=>v<=q.bonus[i]+Number(i===c.color)));
      if(score(q)+c.vp+3*Number(visit)>=15)threat.set(id,true);
    }
  }
  function prospects(tokens,bonus,exclude){
    let first=0,second=0;
    for(const id of targets){
      if(id===exclude)continue;
      const c=catalog[id],need=c.cost.map((n,i)=>Math.max(0,n-bonus[i]-tokens[i]));
      let gold=tokens[5];
      while(gold-->0){const k=need.indexOf(Math.max(...need));if(!need[k])break;need[k]--;}
      const scarce=need.some((n,i)=>n>g.bank[i]);
      const turns=Math.max(Math.ceil(sum(need)/3),...need.map((n,i)=>g.bank[i]>=4?Math.ceil(n/2):n));
      const value=(2.5+c.vp*3.4+Number(points+c.vp>=15)*6)/(1+turns+.65*Number(scarce));
      if(value>first){second=first;first=value;}else second=Math.max(second,value);
    }
    return first+.35*second;
  }
  const moves=[...targets.map(i=>({kind:p.held.includes(i)?'held':'buy',i})),
    ...takeOptions(g.bank).map(take=>({kind:'take',take,i:0})),...market.map(i=>({kind:'reserve',i}))];
  let best=null,high=-Infinity;
  for(const a of moves){
    const next=preview(g,a);if(!next)continue;
    const buying=a.kind==='buy'||a.kind==='held',c=buying?catalog[a.i]:null;
    const after=next.tokens.slice();a.drop=zeros();
    for(let n=0;n<next.excess;n++){
      let bestDrop=-Infinity,color=0;
      after.forEach((count,i)=>{if(!count)return;after[i]--;const v=prospects(after,next.bonus,null)+after[5]*.6;after[i]++;if(v>bestDrop){bestDrop=v;color=i;}});
      after[color]--;a.drop[color]++;
    }
    const gained=(c?.vp||0)+(next.visits.length?3:0);
    let value=prospects(after,next.bonus,buying?a.i:null)+sum(after)*.48+after[5]*.8+gained*4;
    if(c){
      const useful=targets.filter(id=>catalog[id].cost[c.color]>p.bonus[c.color]).length;
      const noble=Math.max(0,...g.nobles.filter(n=>patrons[n][c.color]>p.bonus[c.color]).map(n=>
        1/sum(patrons[n].map((v,i)=>Math.max(0,v-p.bonus[i])))));
      value+=(late?1.4:3.8)+Math.min(1.8,useful*.19)+noble*4;
    }
    if(a.kind==='reserve')value-=1.25+p.held.length*.9;
    if(a.kind!=='take'&&threat.has(a.i))value+=18;
    if(points+gained>=15||g.last)value+=gained*12+(points+gained>=15?70:0);
    if(value>high){high=value;best=a;}
  }
  return best;
}
function chooseMove(g,level=g.players[g.turn].level){
  if(level==='Hell')return expertMove(g);
  const p=g.players[g.turn],market=g.market.flat(),ids=market.concat(p.held);
  function distance(c,tokens){return Math.max(0,sum(c.cost.map((v,i)=>Math.max(0,v-p.bonus[i]-tokens[i])))-tokens[5]);}
  function worth(c){
    const demand=ids.filter(id=>catalog[id].cost[c.color]>p.bonus[c.color]).length;
    const noble=Math.max(0,...g.nobles.filter(n=>patrons[n][c.color]>p.bonus[c.color]).map(n=>1/(sum(patrons[n].map((v,i)=>Math.max(0,v-p.bonus[i])))||1)));
    return 2+c.vp*2.7+demand*.15+7*noble;
  }
  function potential(tokens){return Math.max(...ids.map(id=>worth(catalog[id])/(1+distance(catalog[id],tokens))));}
  const options=[];
  for(const a of [...ids.map(i=>({kind:p.held.includes(i)?'held':'buy',i})),...takeOptions(g.bank).map(take=>({kind:'take',take,i:0})),...market.map(i=>({kind:'reserve',i}))]){
    const v=preview(g,a);if(!v)continue;
    const after=v.tokens.slice();a.drop=zeros();
    for(let j=0;j<v.excess;j++){
      let best=-Infinity,color=0;
      after.forEach((n,i)=>{if(n){after[i]--;const x=potential(after)-i*.00001;after[i]++;if(x>best){best=x;color=i;}}});
      after[color]--;a.drop[color]++;
    }
    let value=potential(after)-potential(p.tokens);
    if(['buy','held'].includes(a.kind))value=7+worth(catalog[a.i])+(level==='Hell'&&score(p)+catalog[a.i].vp>=15?25:0);
    if(a.kind==='reserve'){
      const c=catalog[a.i];value+=c.vp/(2+distance(c,after))-.9-p.held.length;
      if(['Hard','Hell'].includes(level))value+=Math.min(4,c.vp)*g.players.filter((q,i)=>i!==g.turn&&payment(q,c)[5]<=q.tokens[5]).length*(level==='Hell'?1.2:.6);
    }
    if(a.kind==='take')value+=.45*(sum(after)-sum(p.tokens));
    value+=v.visits.length?8:0;
    value+=Math.random()*({Easy:9,Medium:1.8,Hard:.65,Hell:.15}[level]??1);
    options.push({a,value});
  }
  return options.sort((a,b)=>b.value-a.value)[0]?.a;
}
