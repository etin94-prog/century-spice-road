"use strict";
const levels=['Easy','Medium','Hard','Hell'];
const total=a=>a.reduce((s,n)=>s+n,0);
const blank=()=>[0,0,0,0];
const combine=(a,b,m=1)=>a.map((v,i)=>v+b[i]*m);
const fits=(a,b)=>a.every((v,i)=>v>=b[i]);
const value=a=>a.reduce((s,v,i)=>s+(i+1)*v,0);
const minPaid=(bag,count,order=[])=>{
  const left=bag.slice(),paid=[];
  for(let i=0;i<count;i++){
    const t=order[i]??left.findIndex(x=>x>0);
    if(!Number.isInteger(t)||t<0||t>3||!left[t])return null;
    left[t]--;paid.push(t);
  }
  return {left,paid};
};
function shuffle(list,rng){
  const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
function newExpedition(edition,roles,rng=Math.random){
  const players=[null,...roles].map((level,i)=>({level,bag:unitBag(['000','0000','0000','0001'][i]),won:[],bonus:[],explored:[],tracks:blank(),boat:-1,crew:roles.length===1?7:6,ready:roles.length===1?7:6}));
  const g={edition,players,turn:0,round:1,over:false,log:[],tiles:[],deck:[],ports:[],stocks:[],closed:-1};
  if(edition===2){
    const markets=shuffle(seaRoutes.flatMap((row,suit)=>shuffle(row,rng).slice(0,5).map(recipe=>({suit,recipe}))),rng);
    g.deck=shuffle(portOrders,rng);
    for(let col=0;col<5;col++){
      const height=[4,5,6,5,4][col];
      for(let j=0;j<height;j++){
        const port=(col===0||col===4)&&(j===0||j===height-1);
        const tile={col,y:2*j+6-height,pile:blank(),owners:[],...(port?{port:true,order:g.deck.pop()}:markets.pop())};
        if(port)g.ports.push(g.tiles.length);g.tiles.push(tile);
      }
    }
    const top=shuffle([...g.deck.splice(-5),null],rng);g.deck.push(...top);
    g.departures=[0,1,2,3];g.turn=players.length-1;players.forEach(p=>p.bag=blank());
    g.stocks=[4,4,4,4,4];
  }else{
    g.deck=shuffle(colonyOrders.filter(c=>(c[5]||2)<=players.length),rng);
    const bonuses=shuffle(['fixed','crew','crew','icon3','icon3',...['00','00','11','11','02','12','01','01','13','23','03'].map(s=>'pair'+s),'crew'],rng);
    for(let i=0;i<4;i++)g.tiles.push({fort:true,order:g.deck.pop(),stacks:Array.from({length:i>=2?2:1},()=>bonuses.splice(0,[4,3,2,2][i])),need:[1,1,2,3][i],industry:3,help:2});
    const covers=shuffle(['points','points','crew','crew','12','03','icon0','icon1','icon2','icon3'],rng);
    const region=Math.floor(rng()*3);g.region='DEF'[region]+'1';
    const trades=[...regionTrades[region],['11/22',2],['22/33',2]].map(([recipe,need],i)=>['교역소 '+(i+1),need,2,recipe,2,-1,i>=4?'cover':'']);
    [...colonyLocations,...trades].forEach(([name,need,industry,recipe,help,tool,mark])=>g.tiles.push({name,need,industry,recipe,help,tool:tool??-1,cover:mark==='cover'||(mark==='small'&&players.length<4)?covers.pop():null}));
  }
  return g;
}
const neighbors=(g,a,b)=>{const t=g.tiles[a],u=g.tiles[b];return t&&u&&(t.col===u.col?Math.abs(t.y-u.y)===2:Math.abs(t.col-u.col)===1&&Math.abs(t.y-u.y)===1);};
function seaPath(g,from,to){
  const queue=[[from]],seen=new Set([from]);
  for(let n=0;n<queue.length;n++){const path=queue[n],last=path.at(-1);if(last===to)return path.slice(1);
    g.tiles.forEach((t,i)=>{if(!seen.has(i)&&neighbors(g,last,i)){seen.add(i);queue.push([...path,i]);}});}
  return [];
}
function seaArrival(g,i,options={},seat=g.turn){
  const p=g.players[seat],t=g.tiles[i],path=options.path??seaPath(g,p.boat,i);
  const free=1+p.bonus.filter(x=>x==='move').length;
  if(!Array.isArray(path)||path.length>free+total(p.bag)||(path.at(-1)??p.boat)!==i)return null;
  let prev=p.boat;for(const next of path){if(!Number.isInteger(next)||!neighbors(g,prev,next))return null;prev=next;}
  const drops=path.slice(free-1,-1);
  const others=path.length&&!t.port?g.players.map((q,j)=>j!==seat&&q.boat===i?j:-1).filter(j=>j>=0):[];
  const pay=minPaid(p.bag,drops.length+others.length,options.pay);if(!pay)return null;
  const pickup=options.collect!==false?t.pile.slice():blank();
  if(options.collect!==false)drops.forEach((site,j)=>{if(site===i)pickup[pay.paid[j]]++;});
  return {bag:combine(pay.left,pickup),path,drops,others,paid:pay.paid};
}
const bonTypes=['move','upgrade','harvest','cargo','points'];
function workerCost(p,t){
  const base=t.occupant?t.occupant.n+1:t.need;
  return Math.max(1,base-p.won.filter(c=>c[2]===0&&c[3]===t.help).length);
}
function upgradeOptions(bag,steps){
  const outputs=new Map();
  function visit(b,path){
    if(path.length)outputs.set(b.join(),{bag:b,steps:path});
    if(path.length===steps)return;
    for(let i=0;i<3;i++)if(b[i]){const next=b.slice();next[i]--;next[i+1]++;visit(next,[...path,i]);}
  }
  visit(bag,[]);return [...outputs.values()];
}
function actionsAt(g,i,options={},base=false){
  if(g.combo&&!base)return mixOptions(g,i,options);
  const p=g.players[g.turn],t=g.tiles[i],list=[];
  if(!t)return list;
  const add=(kind,bag,details={})=>list.push({kind,i,bag,...details});
  if(g.departures){
    if(!t.port)g.departures.forEach(k=>add('depart',unitBag(cargoes[k]),{pack:k}));
    return list;
  }
  function trade(raw,recipe,details){
    const [cost,gain]=recipe.split('/').map(unitBag);
    const limit=Math.min(...cost.map((n,j)=>n?Math.floor(raw[j]/n):Infinity));
    for(let n=1;n<=limit;n++)add('trade',combine(combine(raw,cost,-n),gain,n),{...details,n});
  }
  if(g.edition===2){
    const arrival=seaArrival(g,i,options);if(!arrival)return list;
    const raw=arrival.bag;
    add('harvest',combine(raw,[2,p.bonus.filter(x=>x==='harvest').length,0,0]));
    if(arrival.path.length)add('sail',raw);
    if(t.port){
      if(t.order&&fits(raw,unitBag(t.order[0])))add('order',combine(raw,unitBag(t.order[0]),-1));
    }else if(t.owners.includes(g.turn))trade(raw,t.recipe,{});
    else{
      const price=t.owners.length*(g.players.length===2?2:1),paid=minPaid(raw,price,options.buildPay);
      if(paid){
        const tracks=p.tracks.slice();tracks[t.suit]++;
        const prizes=Math.min(...tracks)>Math.min(...p.tracks)?bonTypes.filter((x,k)=>g.stocks[k]>0):[''];
        for(const prize of prizes){
          const upgrades=p.bonus.filter(x=>x==='upgrade').length+(prize==='upgrade'?1:0);
          for(const choice of [{bag:paid.left,steps:[]},...upgradeOptions(paid.left,upgrades)]){
            const details={build:true,prize,steps:choice.steps};
            add('build',choice.bag,details);trade(choice.bag,t.recipe,details);
          }
        }
      }
    }
  }else{
    if(t.cover||t.occupant?.seat===g.turn||workerCost(p,t)>p.ready)return list;
    const raw=p.bag.slice();p.won.filter(c=>c[2]===1&&c[3]===(g.combo?t.help:t.tool)).forEach(c=>raw[c[4]||0]++);
    if(t.fort){
      const stacks=p.bonus.length<3?t.stacks.map((s,j)=>s.length?j:-1).filter(j=>j>=0):[];
      for(const stack of stacks)add('bonus',raw,{stack});
      if(t.order&&fits(raw,unitBag(t.order[0]))){
        const bag=combine(raw,unitBag(t.order[0]),-1);
        const explores=t.order[2]===3?g.tiles.map((x,j)=>x.cover?j:-1).filter(j=>j>=0):[];
        for(const explore of explores.length?explores:[-1])for(const stack of [-1,...stacks]){
          const cover=g.tiles[explore]?.cover;
          add('order',cover&&/^\d+$/.test(cover)?combine(bag,unitBag(cover)):bag,{explore,stack});
        }
      }
    }else if(t.industry===0)add('produce',combine(raw,unitBag(t.recipe)));
    else if(t.industry===1){
      for(const op of upgradeOptions(raw,+t.recipe))add('upgrade',op.bag,{steps:op.steps});
      add('upgrade',raw,{steps:[]});
    }
    else trade(raw,t.recipe,{});
  }
  return list;
}
const capacity=p=>10+3*p.bonus.filter(x=>x==='cargo').length;
function trimBag(bag,limit,discard){
  const n=Math.max(0,total(bag)-limit);
  if(discard&&(!Array.isArray(discard)||discard.length!==n))return null;
  return minPaid(bag,n,discard)?.left;
}
function expScore(g,p){
  if(g.combo)return mixScore(g,p);
  const remaining=total(p.bag.slice(1));
  if(g.edition===2)return remaining+total(p.won.map(c=>c[1]))+total(p.tracks.map(n=>[0,0,1,3,5,8][n]))+total(p.bonus.map(b=>typeof b==='number'?b:b==='upgrade'?2:b==='harvest'?1:0));
  const icons=blank();p.won.forEach(c=>icons[c[2]]++);p.explored.filter(x=>x.startsWith('icon')).forEach(x=>icons[+x.at(-1)]++);
  return remaining+total(p.won.map(c=>c[1]))+3*p.explored.filter(x=>x==='points').length+total(p.bonus.map(b=>b==='fixed'?3:b==='crew'?Math.floor(p.crew/2):b.startsWith('icon')?2*icons[+b.at(-1)]:3*(b[4]===b[5]?Math.floor(icons[+b[4]]/2):Math.min(icons[+b[4]],icons[+b[5]]))));
}
const expRanks=g=>g.players.map((p,i)=>({i,points:expScore(g,p)})).sort((a,b)=>b.points-a.points||b.i-a.i);
const actNames={depart:'출항 준비',sail:'항해만',trade:'교역',harvest:'수확',build:'교역소 건설',order:'납품',rest:'일꾼 회수',bonus:'보너스 획득',upgrade:'승급',produce:'생산'};
function validPriority(order){
  return Array.isArray(order)&&order.length===4&&new Set(order).size===4&&order.every(t=>[0,1,2,3].includes(t));
}
function receiveToll(p,t){
  p.bag[t]++;
  if(total(p.bag)>capacity(p)){
    const first=(p.priority||[0,1,2,3]).find(k=>p.bag[k]>0);p.bag[first]--;
  }
}
function apply(g,a,base=false){
  if(g.combo&&!base)return mixApply(g,a);
  if(!a||g.over||a.edition!==g.edition||!Number.isInteger(a.i))return false;
  if(a.priority&&!validPriority(a.priority))return false;
  const actor=g.turn,p=g.players[actor],t=g.tiles[a.i];let points=0;
  if(g.departures){
    if(a.kind!=='depart'||!t||t.port||!Number.isInteger(a.option)||a.option<0||a.option>=g.departures.length)return false;
    const pack=g.departures.splice(a.option,1)[0];p.boat=a.i;p.bag=unitBag(cargoes[pack]);
    if(a.priority)p.priority=a.priority.slice();
    g.log.unshift({who:actor,round:0,site:a.i,kind:'depart',msg:'출항지 선택'});
    if(actor===0)delete g.departures;else g.turn--;
    return true;
  }
  if(a.kind==='rest'){
    if(g.edition!==3||!g.tiles.some(t=>t.occupant?.seat===actor))return false;
    for(const t of g.tiles)if(t.occupant?.seat===actor)delete t.occupant;p.ready=p.crew;
  }else{
    if(!t||!Number.isInteger(a.option)||a.option<0)return false;
    const choice=actionsAt(g,a.i,a)[a.option];if(!choice||choice.kind!==a.kind)return false;
    const bag=trimBag(choice.bag,capacity(p)+(choice.prize==='cargo'?3:0),a.discard);if(!bag)return false;
    if(g.edition===2){
      const ar=seaArrival(g,a.i,a);
      ar.drops.forEach((site,j)=>g.tiles[site].pile[ar.paid[j]]++);
      ar.others.forEach((seat,k)=>receiveToll(g.players[seat],ar.paid[ar.drops.length+k]));
      if(a.collect!==false)t.pile=blank();p.boat=a.i;
      if(choice.build){t.owners.push(actor);p.tracks[t.suit]++;
        if(choice.prize){const k=bonTypes.indexOf(choice.prize);p.bonus.push(choice.prize==='points'?2+g.stocks[k]:choice.prize);g.stocks[k]--;}
      }
      if(a.kind==='order'){p.won.push(t.order);points=t.order[1];const next=g.deck.pop()??null;
        if(g.closed>=0){g.tiles[g.closed].order=next;t.order=null;g.closed=a.i;}
        else{t.order=next;if(!next)g.closed=a.i;}
      }
    }else{
      const need=workerCost(p,t);p.ready-=need;
      if(t.occupant)g.players[t.occupant.seat].ready+=t.occupant.n;
      t.occupant={seat:actor,n:need};
      if(choice.stack>=0)p.bonus.push(t.stacks[choice.stack].pop());
      if(a.kind==='order'){
        const card=t.order;p.won.push(card);points=card[1];
        let recruit=card[2]===2?card[3]:0;
        if(choice.explore>=0){const e=g.tiles[choice.explore];p.explored.push(e.cover);if(e.cover==='crew')recruit++;e.cover=null;}
        recruit=Math.min(12-p.crew,recruit);p.crew+=recruit;p.ready+=recruit;
        for(let j=a.i;j<3;j++)g.tiles[j].order=g.tiles[j+1].order;g.tiles[3].order=g.deck.pop()||null;
      }
    }
    p.bag=bag;
  }
  if(a.priority)p.priority=a.priority.slice();
  g.log.unshift({who:actor,round:g.round,site:a.i,kind:a.kind,msg:actNames[a.kind]+(points?' · '+points+'점':'')});g.log.length=Math.min(40,g.log.length);
  g.turn=(actor+1)%g.players.length;
  if(!g.turn){g.over=g.players.some(q=>q.won.length>=expeditionInfo[g.edition].goal);if(!g.over)g.round++;}
  return true;
}
