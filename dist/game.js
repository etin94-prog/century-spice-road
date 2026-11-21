"use strict";
const zeros = () => [0,0,0,0];
const sum = a => a.reduce((x,y) => x+y,0);
const add = (a,b,k=1) => a.map((v,i) => v+k*b[i]);
const covers = (a,b) => a.every((v,i) => v>=b[i]);
const shuffled = entries => {
  const a = entries.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
};
const levels=['Easy','Medium','Hard','Hell'];
const target=g=>g.players.length===4?5:6;
const standings=g=>g.players.map((p,i)=>({p,i,points:score(p)})).sort((a,b)=>b.points-a.points||b.i-a.i);
function newGame(opponents=['Medium']){
  const merchants=shuffled(MERCHANTS.map(c=>({...c,pile:zeros()})));
  const orders=shuffled(POINTS);
  const starts=[[3,0,0,0],[4,0,0,0],[4,0,0,0],[3,1,0,0]];
  const players=starts.slice(0,1+opponents.length).map((bag,i)=>({bag,level:i?opponents[i-1]:null,hand:[
    {cost:zeros(),gain:[2,0,0,0],up:0},{cost:zeros(),gain:zeros(),up:2}
  ],used:[],won:[],gold:0,silver:0}));
  return {players,market:merchants.splice(0,6),orders:orders.splice(0,5),merchants,deck:orders,gold:players.length*2,silver:players.length*2,turn:0,round:1,over:false,log:[]};
}
function bonus(g,i){return i===0&&g.gold?'gold':i===(g.gold?1:0)&&g.silver?'silver':null;}
function score(p){return sum(p.won.map(c=>c.vp))+3*p.gold+p.silver+sum(p.bag.slice(1));}
function effect(p,a,g){
  let bag=p.bag.slice();
  if(a.kind==='rest') return p.used.length?bag:null;
  if(a.kind==='order'){
    const c=g.orders[a.i]; return c&&covers(bag,c.cost)?add(bag,c.cost,-1):null;
  }
  if(a.kind==='buy'){
    const c=g.market[a.i];
    if(!c||a.pay.length!==a.i)return null;
    for(const t of a.pay){if(!Number.isInteger(t)||t<0||t>3||--bag[t]<0)return null;}
    return add(bag,c.pile);
  }
  const c=p.hand[a.i]; if(!c||a.kind!=='play')return null;
  if(c.up){
    if(!a.steps?.length||a.steps.length>c.up)return null;
    for(const t of a.steps){if(!Number.isInteger(t)||t<0||t>2||--bag[t]<0)return null;bag[t+1]++;}
    return bag;
  }
  const n=a.n??1;
  if(!Number.isInteger(n)||n<1||(!sum(c.cost)&&n!==1)||!covers(bag,c.cost.map(x=>x*n)))return null;
  return add(add(bag,c.cost,-n),c.gain,n);
}
function apply(g,a){
  if(g.over)return false;
  const p=g.players[g.turn], raw=effect(p,a,g);
  if(!raw)return false;
  const drop=a.drop??zeros();
  if(drop.length!==4||!drop.every(x=>Number.isInteger(x)&&x>=0)||!covers(raw,drop)||sum(drop)!==Math.max(0,sum(raw)-10))return false;
  p.bag=add(raw,drop,-1);
  let msg;
  if(a.kind==='rest'){p.hand.push(...p.used.splice(0));msg='휴식 · 사용 카드 회수';}
  if(a.kind==='play'){
    const c=p.hand.splice(a.i,1)[0];p.used.push(c);msg=c.up?'향신료 승급 '+a.steps.length+'회':sum(c.cost)?'향신료 교환 '+(a.n||1)+'회':'향신료 생산';
  }
  if(a.kind==='order'){
    const coin=bonus(g,a.i),c=g.orders.splice(a.i,1)[0];
    if(coin){g[coin]--;p[coin]++;}
    p.won.push(c);if(g.deck.length)g.orders.push(g.deck.pop());
    msg=c.vp+'점 주문 달성'+(coin==='gold'?' · 금화 +3점':coin?' · 은화 +1점':'');
  }
  if(a.kind==='buy'){
    a.pay.forEach((t,i)=>g.market[i].pile[t]++);
    const c=g.market.splice(a.i,1)[0];p.hand.push({...c,pile:zeros()});
    if(g.merchants.length)g.market.push(g.merchants.pop());msg='상인 영입 · 시장 '+(a.i+1)+'번째 카드';
  }
  g.log.unshift({round:g.round,who:g.turn,msg});g.log.length=Math.min(40,g.log.length);
  g.turn=(g.turn+1)%g.players.length;
  if(!g.turn){g.over=g.players.some(p=>p.won.length>=target(g));if(!g.over)g.round++;}
  return true;
}
function playOptions(p){
  const moves=[];
  p.hand.forEach((c,i)=>{
    if(c.up){
      const explore=(bag,steps)=>{
        if(steps.length)moves.push({kind:'play',i,steps});
        if(steps.length===c.up)return;
        for(let t=0;t<3;t++)if(bag[t]){const next=bag.slice();next[t]--;next[t+1]++;explore(next,[...steps,t]);}
      };explore(p.bag,[]);
    }else{
      for(let n=1;n<=10;n++){const a={kind:'play',i,n};if(!effect(p,a))break;moves.push(a);if(!sum(c.cost))break;}
    }
  });
  if(p.used.length)moves.push({kind:'rest'});
  return moves;
}
function goalValue(bag,g){
  return Math.max(...g.orders.map((c,i)=>{
    const lack=c.cost.reduce((v,x,t)=>v+Math.max(0,x-bag[t])*(1+t*.65),0);
    return c.vp*.15+(bonus(g,i)==='gold'?.55:0)-lack*2;
  })) +bag.reduce((v,x,t)=>v+x*(1+t)*.12,0);
}
function fitBag(raw,g){
  const drop=zeros(),bag=raw.slice();
  while(sum(bag)>10){
    let best=-Infinity,index=0;
    for(let t=0;t<4;t++)if(bag[t]){bag[t]--;const v=goalValue(bag,g);bag[t]++;if(v>best){best=v;index=t;}}
    bag[index]--;drop[index]++;
  }return {bag,drop};
}
function medium(g,depthLimit=4,width=12){
  const p=g.players[g.turn];
  const orders=g.orders.map((c,i)=>({kind:'order',i,value:c.vp+({gold:3,silver:1}[bonus(g,i)]||0)}))
    .filter(a=>effect(p,a,g)).sort((a,b)=>b.value-a.value);
  if(orders.length)return orders[0];
  let beam=[{p,first:null}],best=null,bestValue=-Infinity;
  for(let depth=0;depth<depthLimit;depth++){
    const next=new Map();
    for(const node of beam){
      const q=node.p, moves=playOptions(q);
      if(depth===0&&q.hand.length+q.used.length<7){
        const pool=q.bag.flatMap((n,t)=>Array(n).fill(t));
        g.market.forEach((c,i)=>{if(i<=pool.length)moves.push({kind:'buy',i,pay:pool.slice(0,i)});});
      }
      for(const a of moves){
        const {bag,drop}=fitBag(effect(q,a,g),g),hand=q.hand.slice(),used=q.used.slice();
        if(a.kind==='rest')hand.push(...used.splice(0));
        else if(a.kind==='buy')hand.push(g.market[a.i]);
        else used.push(hand.splice(a.i,1)[0]);
        const ready=g.orders.some(c=>covers(bag,c.cost));
        const value=goalValue(bag,g)+(ready?60:0)-depth*.75+hand.length*.12+(hand.length+used.length)*.42;
        const first=node.first??{...a,drop};
        if(value>bestValue){bestValue=value;best=first;}
        const key=bag.join(',')+'/'+hand.map(c=>c.cost.join('')+c.gain.join('')+c.up).sort().join('.');
        if(!next.has(key)||next.get(key).value<value)next.set(key,{p:{bag,hand,used},first,value});
      }
    }
    beam=[...next.values()].sort((a,b)=>b.value-a.value).slice(0,width);
    if(bestValue>40)break;
  }return best;
}
